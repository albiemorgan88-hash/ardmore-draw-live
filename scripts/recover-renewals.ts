// Explicit manual repair only. No Stripe mutation, draw, payout or email calls.
// Use --execute only after reviewing the private evidence plan and deployment.
import { readFile } from "node:fs/promises";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { processSubscriptionRenewal, type RenewalInvoice } from "../src/lib/subscription-renewal";
import { claimStripeEvent, finishStripeEvent } from "../src/lib/stripe-event-lease";
import { selectRecoveryInvoices, type PlannedInvoice } from "./recovery-plan";

type RecentEvent = { invoice_id: string; event_id: string; amount_paid: number; subscription_id: string };

async function main() {
  const args=process.argv.slice(2);
  if (args.some(arg => !arg.startsWith("--plan=") && !arg.startsWith("--events=") && arg!=="--execute" && arg!=="--sample")) {
    throw new Error("Unknown recovery argument; use --sample for the one-invoice check");
  }
  const planPath=args.find(x=>x.startsWith("--plan="))?.slice(7);
  const eventsPath=args.find(x=>x.startsWith("--events="))?.slice(9);
  if (!planPath || !eventsPath) throw new Error("A reviewed invoice plan and recent event evidence are required");
  const plan=JSON.parse(await readFile(planPath,"utf8")) as PlannedInvoice[];
  const eventEvidence=JSON.parse(await readFile(eventsPath,"utf8")) as { events: RecentEvent[] };
  const recent=new Map(eventEvidence.events.map(event=>[event.invoice_id,event]));
  const sample=args.includes("--sample");
  const selected=selectRecoveryInvoices(plan,new Set(recent.keys()),sample);
  const execute=args.includes("--execute");
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY!);
  if ((await stripe.accounts.retrieve()).id!=="acct_1T69pRASm3u8i3nl") throw new Error("Wrong Stripe account");
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (new URL(url).hostname!=="smhzgkvatlwbaxlyhnbm.supabase.co") throw new Error("Wrong database");
  const db=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  let verified=0, processed=0, paidPence=0, recentEventsCompleted=0;
  for (const item of selected) {
    const invoice=await stripe.invoices.retrieve(item.invoice_id) as RenewalInvoice;
    const reference=invoice.parent?.subscription_details?.subscription || invoice.subscription;
    const subscriptionId=typeof reference==="string" ? reference : reference?.id;
    if (subscriptionId!==item.subscription_id || invoice.amount_paid!==item.amount_paid || invoice.currency!=="gbp"
        || invoice.status!=="paid" || !invoice.livemode || invoice.status_transitions.paid_at!==item.paid_at) {
      throw new Error("Current invoice does not match the reviewed recovery plan");
    }
    const {data:sub,error}=await db.from("draw_subscriptions").select("user_id,club_id")
      .eq("stripe_subscription_id",item.subscription_id).single();
    if (error || sub?.user_id!==item.user_id || sub?.club_id!=="31846fb2-b120-4815-bd48-e1120342d52e") throw new Error("Recovery owner mismatch");
    const eventPlan=recent.get(item.invoice_id);
    let event: Stripe.Event | null=null;
    if (eventPlan) {
      event=await stripe.events.retrieve(eventPlan.event_id);
      if (!event.livemode || event.type!=="invoice.paid" || (event.data.object as Stripe.Invoice).id!==item.invoice_id) throw new Error("Recovery event mismatch");
    }
    verified++; paidPence+=invoice.amount_paid;
    if (!execute) continue;
    const claim=event ? await claimStripeEvent(db,event) : null;
    if (claim && !claim.claimed && !claim.processed) throw new Error("Renewal is already being processed; retry the repair later");
    // Use the audited event's original key where available, matching the old
    // application's convention. Invoice ID is also recorded for deduplication.
    invoice.payment_intent=item.payment_key.startsWith("pi_") ? item.payment_key : null;
    try {
      await processSubscriptionRenewal(db,stripe,invoice,{notify:false,recovery:true});
      if (claim?.claimed && event) { await finishStripeEvent(db,event.id,claim.token); recentEventsCompleted++; }
      processed++;
    } catch (error) {
      if (claim?.claimed && event) await finishStripeEvent(db,event.id,claim.token,error instanceof Error ? error.message : "Recovery failed");
      throw error;
    }
    if (processed % 12===0) console.log(JSON.stringify({processed,mode:"execute",emailsSent:0}));
  }
  console.log(JSON.stringify({mode:execute?"execute":"dry-run",sample,selected:selected.length,verified,processed,paidPence,recentEventsCompleted,emailsSent:0,stripeMutations:0}));
}
main().catch(error=>{console.error(error instanceof Error ? error.message : "Recovery failed");process.exitCode=1;});
