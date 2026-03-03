import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";
import { sendPurchaseConfirmation } from "@/lib/email";

function getNextFriday(): string {
  const now = new Date();
  const day = now.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + (day === 5 && now.getHours() < 19 ? 0 : daysUntilFriday));
  return next.toISOString().split("T")[0];
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (webhookSecret && webhookSecret !== "whsec_placeholder" && sig) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else {
    event = JSON.parse(body) as Stripe.Event;
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription") {
        await handleSubscriptionCreated(supabase, session);
      } else {
        await handleOneOffPayment(supabase, session);
      }
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as any;
      // Skip the first invoice (handled by checkout.session.completed)
      if (invoice.billing_reason === "subscription_cycle") {
        await handleSubscriptionRenewal(supabase, invoice);
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as any;
      if (invoice.parent?.subscription_details?.subscription || invoice.subscription) {
        await supabase
          .from("draw_subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", ((invoice.parent?.subscription_details?.subscription || invoice.subscription) as string));
        console.log(`Subscription ${invoice.subscription} payment failed — marked past_due`);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from("draw_subscriptions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", sub.id);
      console.log(`Subscription ${sub.id} cancelled — numbers released`);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function handleOneOffPayment(supabase: any, session: Stripe.Checkout.Session) {
  const meta = session.metadata!;
  const userId = meta.user_id;
  const clubId = meta.club_id;
  const numbers: number[] = JSON.parse(meta.numbers);
  const names: Record<string, string> = JSON.parse(meta.names || "{}");

  // Check if user already has selections — merge if so
  const { data: existing } = await supabase
    .from("number_selections")
    .select("id, numbers")
    .eq("club_id", clubId)
    .eq("profile_id", userId)
    .eq("status", "active")
    .single();

  if (existing) {
    const merged = [...new Set([...existing.numbers, ...numbers])];
    const { error: selError } = await supabase
      .from("number_selections")
      .update({ numbers: merged, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (selError) console.error("Error updating selection:", selError);
  } else {
    const { error: selError } = await supabase.from("number_selections").insert({
      club_id: clubId,
      profile_id: userId,
      numbers: numbers,
      status: "active",
      stripe_subscription_id: session.id,
    });
    if (selError) console.error("Error inserting selection:", selError);
  }

  const { error: payError } = await supabase.from("payments").insert({
    profile_id: userId,
    club_id: clubId,
    stripe_payment_intent_id: (session.payment_intent as string) || session.id,
    amount: session.amount_total || numbers.length * 100,
    platform_fee: Math.round((session.amount_total || numbers.length * 100) * 0.075),
    currency: "gbp",
    status: "succeeded",
    metadata: { numbers, names, stripe_session_id: session.id },
  });
  if (payError) console.error("Error inserting payment:", payError);

  // Send purchase confirmation email
  const customerEmail = session.customer_details?.email || session.customer_email;
  if (customerEmail && process.env.RESEND_API_KEY) {
    try {
      await sendPurchaseConfirmation(customerEmail, numbers, session.amount_total || numbers.length * 100);
    } catch (err) {
      console.error("Failed to send purchase confirmation:", err);
    }
  }
}

async function handleSubscriptionCreated(supabase: any, session: Stripe.Checkout.Session) {
  const meta = session.metadata!;
  const userId = meta.user_id;
  const clubId = meta.club_id;
  const numbers: number[] = JSON.parse(meta.numbers);
  const names: Record<string, string> = JSON.parse(meta.names || "{}");
  const subscriptionId = session.subscription as string;

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;

  // Period dates moved to items in newer Stripe API versions
  const item = subscription.items?.data?.[0];
  const periodStart = subscription.current_period_start || item?.current_period_start || subscription.start_date;
  const periodEnd = subscription.current_period_end || item?.current_period_end;

  // Create subscription record
  const { error: subError } = await supabase.from("draw_subscriptions").insert({
    club_id: clubId,
    user_id: userId,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: session.customer as string,
    numbers: numbers,
    assigned_names: names,
    amount_pence: numbers.length * 100,
    status: "active",
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : new Date().toISOString(),
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  });
  if (subError) console.error("Error inserting subscription:", subError);

  // Also enter numbers for current week
  const { error: selError } = await supabase.from("number_selections").insert({
    club_id: clubId,
    profile_id: userId,
    numbers: numbers,
    status: "active",
    stripe_subscription_id: subscriptionId,
  });
  if (selError) console.error("Error inserting initial selection:", selError);

  // Record initial payment
  const { error: payError } = await supabase.from("payments").insert({
    profile_id: userId,
    club_id: clubId,
    stripe_payment_intent_id: subscriptionId + "_initial",
    amount: numbers.length * 100,
    platform_fee: Math.round(numbers.length * 100 * 0.075),
    currency: "gbp",
    status: "succeeded",
    metadata: { numbers, names, stripe_session_id: session.id, type: "subscription_initial" },
  });
  if (payError) console.error("Error inserting subscription payment:", payError);

  // Send purchase confirmation email
  const customerEmail = session.customer_details?.email || session.customer_email;
  if (customerEmail && process.env.RESEND_API_KEY) {
    try {
      await sendPurchaseConfirmation(customerEmail, numbers, numbers.length * 100);
    } catch (err) {
      console.error("Failed to send subscription confirmation:", err);
    }
  }
}

async function handleSubscriptionRenewal(supabase: any, invoice: any) {
  const subscriptionId = ((invoice.parent?.subscription_details?.subscription || invoice.subscription) as string);

  // Get subscription record from our DB
  const { data: sub } = await supabase
    .from("draw_subscriptions")
    .select("*")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (!sub) {
    console.error("No subscription found for", subscriptionId);
    return;
  }

  // Update subscription period
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
  const renewalItem = stripeSubscription.items?.data?.[0];
  const renewalStart = stripeSubscription.current_period_start || renewalItem?.current_period_start || stripeSubscription.start_date;
  const renewalEnd = stripeSubscription.current_period_end || renewalItem?.current_period_end;
  await supabase
    .from("draw_subscriptions")
    .update({
      status: "active",
      current_period_start: renewalStart ? new Date(renewalStart * 1000).toISOString() : new Date().toISOString(),
      current_period_end: renewalEnd ? new Date(renewalEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  // Enter numbers for the new week
  const { error: selError } = await supabase.from("number_selections").insert({
    club_id: sub.club_id,
    profile_id: sub.user_id,
    numbers: sub.numbers,
    status: "active",
    stripe_subscription_id: subscriptionId,
  });
  if (selError) console.error("Error inserting renewal selection:", selError);

  // Record renewal payment
  const { error: payError } = await supabase.from("payments").insert({
    profile_id: sub.user_id,
    club_id: sub.club_id,
    stripe_payment_intent_id: invoice.payment_intent as string || invoice.id,
    amount: sub.amount_pence,
    platform_fee: Math.round(sub.amount_pence * 0.075),
    currency: "gbp",
    status: "succeeded",
    metadata: {
      numbers: sub.numbers,
      names: sub.assigned_names,
      type: "subscription_renewal",
      draw_week: getNextFriday(),
    },
  });
  if (payError) console.error("Error inserting renewal payment:", payError);

  console.log(`Subscription ${subscriptionId} renewed — numbers ${sub.numbers.join(", ")} entered for week ${getNextFriday()}`);
}
