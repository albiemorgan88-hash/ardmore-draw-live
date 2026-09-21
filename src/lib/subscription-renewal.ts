import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { reconcileNumberSelections } from "./draw-entries";
import { sendRenewalConfirmation } from "./email";

export type RenewalInvoice = Stripe.Invoice & { subscription?: string | null; payment_intent?: string | null };
export type SubscriptionWithPeriods = Stripe.Subscription & { current_period_start?: number; current_period_end?: number };

export function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status) {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "incomplete") return "past_due";
  if (status === "unpaid") return "unpaid";
  return "cancelled";
}

export function renewalPayment(invoice: RenewalInvoice, sub: { user_id: string; club_id: string; numbers: number[]; assigned_names?: Record<string, string> }) {
  if (invoice.status !== "paid" || invoice.billing_reason !== "subscription_cycle" || invoice.currency !== "gbp"
      || !Number.isSafeInteger(invoice.amount_paid) || invoice.amount_paid < 0) {
    throw new Error("Renewal invoice is not a verified paid GBP subscription renewal");
  }
  return {
    profile_id: sub.user_id, club_id: sub.club_id,
    stripe_payment_intent_id: invoice.payment_intent || invoice.id,
    stripe_invoice_id: invoice.id,
    amount: invoice.amount_paid,
    platform_fee: Math.round(invoice.amount_paid * 0.075),
    currency: "gbp", status: "succeeded",
    ...(invoice.status_transitions?.paid_at ? { created_at: new Date(invoice.status_transitions.paid_at * 1000).toISOString() } : {}),
    metadata: { numbers: sub.numbers, names: sub.assigned_names, type: "subscription_renewal", stripe_invoice_id: invoice.id },
  };
}

export async function processSubscriptionRenewal(
  db: SupabaseClient, stripe: Stripe, invoice: RenewalInvoice, options: { notify: boolean; recovery?: boolean },
) {
  const reference = invoice.parent?.subscription_details?.subscription || invoice.subscription;
  const subscriptionId = typeof reference === "string" ? reference : reference?.id;
  if (!subscriptionId) throw new Error("Renewal invoice has no subscription");
  const { data: sub, error: readError } = await db.from("draw_subscriptions").select("*")
    .eq("stripe_subscription_id", subscriptionId).maybeSingle();
  if (readError || !sub) throw new Error(`Renewal subscription unavailable: ${readError?.message || subscriptionId}`);
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (sub.stripe_customer_id !== customerId) throw new Error("Renewal invoice customer does not match subscription");
  const payload = renewalPayment(invoice, sub);
  if (options.recovery) {
    // Historical number/name assignments cannot be inferred from today's
    // subscription. Keep the historical financial record tied to its invoice.
    Object.assign(payload, { metadata: { type: "subscription_renewal", stripe_invoice_id: invoice.id, recovered_at: new Date().toISOString() } });
  }
  // An old paid invoice must not reactivate a subscription cancelled since then.
  const current = await stripe.subscriptions.retrieve(subscriptionId) as SubscriptionWithPeriods;
  const item = current.items.data[0];
  const start = current.current_period_start || item?.current_period_start || current.start_date;
  const end = current.current_period_end || item?.current_period_end;
  const status = mapStripeSubscriptionStatus(current.status);
  const { error: updateError } = await db.from("draw_subscriptions").update({
    status,
    current_period_start: start ? new Date(start * 1000).toISOString() : null,
    current_period_end: end ? new Date(end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", sub.id);
  if (updateError) throw new Error(`Renewal period update failed: ${updateError.message}`);
  await reconcileNumberSelections(db, sub.club_id, sub.user_id);

  const { data: existing, error: findError } = await db.from("payments")
    .select("id,amount,profile_id,club_id")
    .or(`stripe_payment_intent_id.eq.${payload.stripe_payment_intent_id},stripe_invoice_id.eq.${invoice.id}`);
  if (findError) throw new Error(`Renewal payment lookup failed: ${findError.message}`);
  if (existing?.some(row => row.amount !== payload.amount || row.profile_id !== sub.user_id || row.club_id !== sub.club_id)) {
    throw new Error("Existing payment does not match verified renewal invoice");
  }
  if (!existing?.length) {
    const { error } = await db.from("payments").insert(payload);
    if (error && error.code !== "23505") throw new Error(`Renewal payment recording failed: ${error.message}`);
    if (error?.code === "23505") {
      const { data, error: recheck } = await db.from("payments").select("amount,profile_id,club_id")
        .eq("stripe_payment_intent_id", payload.stripe_payment_intent_id).single();
      if (recheck || data?.amount !== payload.amount || data?.profile_id !== sub.user_id || data?.club_id !== sub.club_id) {
        throw new Error("Concurrent renewal payment did not match the invoice");
      }
    }
  }
  if (options.notify && status === "active") {
    if (!process.env.RESEND_API_KEY) throw new Error("Renewal email provider is not configured");
    const customer = await stripe.customers.retrieve(sub.stripe_customer_id);
    const email = "email" in customer ? customer.email : null;
    if (!email) throw new Error("Renewal customer has no receipt email address");
    await sendRenewalConfirmation(email, sub.numbers, invoice.amount_paid, sub.assigned_names, `ardmore-renewal:${invoice.id}`);
  }
  return { invoiceId: invoice.id, amountPaid: invoice.amount_paid, subscriptionStatus: status, notificationRequested: options.notify && status === "active" };
}
