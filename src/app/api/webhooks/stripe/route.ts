import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";
import {
  sendAdminMatchBallSponsorNotification,
  sendAdminNewEntryNotification,
  sendMatchBallSponsorConfirmation,
  sendMembershipNotification,
  sendPurchaseConfirmation,
  sendRenewalConfirmation,
} from "@/lib/email";
import {
  reconcileNumberSelections,
  reconcileNumberSelectionsForSubscription,
} from "@/lib/draw-entries";

type DbError = {
  message: string;
  code?: string | null;
};

type DbResult<T> = {
  data: T;
  error: DbError | null;
};

type StripeInvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | null;
  payment_intent?: string | null;
  parent?: {
    subscription_details?: {
      subscription?: string | null;
    } | null;
  } | null;
};

type StripeSubscriptionWithPeriods = Stripe.Subscription & {
  current_period_start?: number | null;
  current_period_end?: number | null;
  start_date?: number | null;
  items?: {
    data?: Array<{
      current_period_start?: number | null;
      current_period_end?: number | null;
    }>;
  };
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getWebhookSecrets() {
  return [
    { name: "STRIPE_WEBHOOK_SECRET", value: process.env.STRIPE_WEBHOOK_SECRET },
    {
      name: "STRIPE_WEBHOOK_SECRET_TEST",
      value: process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_TEST_WEBHOOK_SECRET,
    },
  ].filter((secret): secret is { name: string; value: string } => Boolean(secret.value));
}

function constructStripeEvent(body: string, sig: string) {
  const errors: string[] = [];

  for (const secret of getWebhookSecrets()) {
    try {
      return {
        event: stripe.webhooks.constructEvent(body, sig, secret.value),
        secretName: secret.name,
      };
    } catch (err: unknown) {
      errors.push(`${secret.name}: ${errorMessage(err)}`);
    }
  }

  throw new Error(errors.join(" | ") || "No Stripe webhook signing secrets configured");
}

function getNextFriday(): string {
  const now = new Date();
  const day = now.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + (day === 5 && now.getHours() < 19 ? 0 : daysUntilFriday));
  return next.toISOString().split("T")[0];
}

async function claimStripeEvent(supabase: SupabaseClient, event: Stripe.Event) {
  const { error: insertError } = await supabase.from("stripe_events").insert({
    id: event.id,
    type: event.type,
    status: "processing",
  });

  if (!insertError) return { claimed: true, duplicate: false };

  if (insertError.code !== "23505") {
    throw new Error(`Failed to claim Stripe event ${event.id}: ${insertError.message}`);
  }

  const { data: existing, error: fetchError } = await supabase
    .from("stripe_events")
    .select("status")
    .eq("id", event.id)
    .maybeSingle();

  if (fetchError) throw new Error(`Failed to inspect Stripe event ${event.id}: ${fetchError.message}`);

  if (existing?.status === "failed") {
    const { data: retry, error: retryError } = await supabase
      .from("stripe_events")
      .update({ status: "processing", error_message: null, updated_at: new Date().toISOString() })
      .eq("id", event.id)
      .eq("status", "failed")
      .select("id")
      .maybeSingle();

    if (retryError) throw new Error(`Failed to retry Stripe event ${event.id}: ${retryError.message}`);
    return { claimed: Boolean(retry), duplicate: !retry };
  }

  return { claimed: false, duplicate: true };
}

async function markStripeEventProcessed(supabase: SupabaseClient, event: Stripe.Event) {
  const { error } = await supabase
    .from("stripe_events")
    .update({
      status: "processed",
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", event.id);

  if (error) throw new Error(`Failed to mark Stripe event ${event.id} processed: ${error.message}`);
}

async function markStripeEventFailed(supabase: SupabaseClient, event: Stripe.Event, err: unknown) {
  const { error } = await supabase
    .from("stripe_events")
    .update({
      status: "failed",
      error_message: errorMessage(err),
      updated_at: new Date().toISOString(),
    })
    .eq("id", event.id);

  if (error) console.error(`Failed to mark Stripe event ${event.id} failed:`, error);
}

async function requireDb<T>(label: string, result: DbResult<T>) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function insertPaymentIfMissing(supabase: SupabaseClient, payload: Record<string, unknown>) {
  const paymentId = payload.stripe_payment_intent_id as string | undefined;
  if (!paymentId) throw new Error("Payment idempotency key missing");

  const { data: existing, error: existingError } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_payment_intent_id", paymentId)
    .maybeSingle();

  if (existingError) throw new Error(`Failed to check existing payment ${paymentId}: ${existingError.message}`);
  if (existing) return { inserted: false };

  const { error } = await supabase.from("payments").insert(payload);
  if (error) throw new Error(`Error inserting payment ${paymentId}: ${error.message}`);
  return { inserted: true };
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  const webhookSecrets = getWebhookSecrets();
  if (!webhookSecrets.length) {
    console.error("No Stripe webhook signing secrets are configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (!sig) {
    console.error("Webhook received without stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  let secretName: string;

  try {
    ({ event, secretName } = constructStripeEvent(body, sig));
  } catch (err: unknown) {
    console.error("Webhook signature verification failed:", errorMessage(err));
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!event.livemode && process.env.STRIPE_ALLOW_TEST_WEBHOOK_PROCESSING !== "true") {
    console.log(`Acknowledged Stripe test webhook ${event.id} (${event.type}) via ${secretName} without processing`);
    return NextResponse.json({ received: true, ignored: "test_mode" });
  }

  const supabase = createServiceClient();

  let claim;
  try {
    claim = await claimStripeEvent(supabase, event);
  } catch (err: unknown) {
    const message = errorMessage(err);
    console.error("Stripe event claim failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!claim.claimed) {
    return NextResponse.json({ received: true, duplicate: claim.duplicate });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.type === "match_ball_sponsorship") {
          await handleMatchBallSponsorship(supabase, session);
        } else if (session.metadata?.membershipType) {
          const customerEmail = session.customer_details?.email || session.customer_email || "unknown";
          await sendMembershipNotification(
            customerEmail,
            session.metadata.membershipType,
            session.metadata.membershipName || session.metadata.membershipType,
            session.metadata.memberName || session.customer_details?.name || undefined,
            session.amount_total || 0,
            session.id
          );
          console.log(`Membership notification sent for ${session.metadata.membershipName} to ${customerEmail}`);
        } else if (session.mode === "subscription") {
          await handleSubscriptionCreated(supabase, session);
        } else {
          await handleOneOffPayment(supabase, session);
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as StripeInvoiceWithSubscription;
        // Skip the first invoice (handled by checkout.session.completed)
        if (invoice.billing_reason === "subscription_cycle") {
          await handleSubscriptionRenewal(supabase, invoice);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as StripeInvoiceWithSubscription;
        const subscriptionId = (invoice.parent?.subscription_details?.subscription || invoice.subscription) as string | undefined;
        if (subscriptionId) {
          await requireDb(
            `Failed to mark subscription ${subscriptionId} past_due`,
            await supabase
              .from("draw_subscriptions")
              .update({ status: "past_due", updated_at: new Date().toISOString() })
              .eq("stripe_subscription_id", subscriptionId)
          );
          await reconcileNumberSelectionsForSubscription(supabase, subscriptionId);
          console.log(`Subscription ${subscriptionId} payment failed — marked past_due`);
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionStatusUpdated(supabase, sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const cancelled = await requireDb(
          `Failed to cancel subscription ${sub.id}`,
          await supabase
            .from("draw_subscriptions")
            .update({ status: "cancelled", updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", sub.id)
            .select("club_id,user_id")
            .maybeSingle()
        );
        if (cancelled?.club_id && cancelled?.user_id) {
          await reconcileNumberSelections(supabase, cancelled.club_id, cancelled.user_id);
        }
        console.log(`Subscription ${sub.id} cancelled — numbers reconciled`);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Checkout session expired: ${session.id}`);
        break;
      }
    }

    await markStripeEventProcessed(supabase, event);
    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = errorMessage(err);
    console.error(`Stripe webhook ${event.id} failed:`, message);
    await markStripeEventFailed(supabase, event, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleMatchBallSponsorship(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
) {
  const meta = session.metadata || {};
  const sponsorName =
    meta.sponsor_name || session.customer_details?.name || "Match Ball Sponsor";
  const sponsorEmail =
    meta.sponsor_email || session.customer_details?.email || session.customer_email;
  const sponsorMessage = meta.sponsor_message || "";
  const assetBucket = meta.asset_bucket;
  const assetPath = meta.asset_path;
  const assetName = meta.asset_name || "";

  let assetUrl = "";

  if (assetBucket && assetPath) {
    const { data, error } = await supabase.storage
      .from(assetBucket)
      .createSignedUrl(assetPath, 60 * 60 * 24 * 30);
    if (error) throw new Error(`Failed to sign sponsor asset URL: ${error.message}`);
    assetUrl = data?.signedUrl || "";
  }

  if (sponsorEmail && process.env.RESEND_API_KEY) {
    await sendMatchBallSponsorConfirmation(
      sponsorEmail,
      sponsorName,
      sponsorMessage,
      assetUrl || undefined
    );
    await sendAdminMatchBallSponsorNotification(
      sponsorEmail,
      sponsorName,
      sponsorMessage,
      assetUrl || undefined,
      assetName || undefined
    );
  }
}

async function upsertNumberSelections(supabase: SupabaseClient, clubId: string, userId: string, currentSubId: string) {
  return reconcileNumberSelections(supabase, clubId, userId, currentSubId);
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status) {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "incomplete") return "past_due";
  if (status === "unpaid") return "unpaid";
  return "cancelled";
}

async function handleSubscriptionStatusUpdated(supabase: SupabaseClient, subscription: Stripe.Subscription) {
  const status = mapStripeSubscriptionStatus(subscription.status);
  const sub = subscription as StripeSubscriptionWithPeriods;
  const item = sub.items?.data?.[0];
  const periodStart = sub.current_period_start || item?.current_period_start || sub.start_date;
  const periodEnd = sub.current_period_end || item?.current_period_end;

  const updated = await requireDb(
    `Failed to update subscription status ${subscription.id}`,
    await supabase
      .from("draw_subscriptions")
      .update({
        status,
        current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id)
      .select("club_id,user_id")
      .maybeSingle()
  );

  if (updated?.club_id && updated?.user_id) {
    await reconcileNumberSelections(supabase, updated.club_id, updated.user_id, subscription.id);
  }

  console.log(`Subscription ${subscription.id} status updated to ${status} — numbers reconciled`);
}

async function handleOneOffPayment(supabase: SupabaseClient, session: Stripe.Checkout.Session) {
  const meta = session.metadata!;
  const userId = meta.user_id;
  const clubId = meta.club_id;
  const numbers: number[] = JSON.parse(meta.numbers);
  const names: Record<string, string> = JSON.parse(meta.names || "{}");

  const existingSelection = await requireDb(
    `Failed to check one-off selection ${session.id}`,
    await supabase
      .from("number_selections")
      .select("id")
      .eq("stripe_subscription_id", session.id)
      .maybeSingle()
  );

  if (!existingSelection) {
    await requireDb(
      `Error inserting one-off selection ${session.id}`,
      await supabase.from("number_selections").insert({
        club_id: clubId,
        profile_id: userId,
        numbers,
        assigned_names: names,
        status: "active",
        stripe_subscription_id: session.id,
      })
    );
  }

  await insertPaymentIfMissing(supabase, {
    profile_id: userId,
    club_id: clubId,
    stripe_payment_intent_id: (session.payment_intent as string) || session.id,
    amount: session.amount_total || numbers.length * 100,
    platform_fee: Math.round((session.amount_total || numbers.length * 100) * 0.075),
    currency: "gbp",
    status: "succeeded",
    metadata: { numbers, names, stripe_session_id: session.id },
  });

  const customerEmail = session.customer_details?.email || session.customer_email;
  if (customerEmail && process.env.RESEND_API_KEY) {
    await sendPurchaseConfirmation(customerEmail, numbers, session.amount_total || numbers.length * 100, names);
    await sendAdminNewEntryNotification(
      customerEmail,
      session.customer_details?.name || undefined,
      numbers,
      session.amount_total || numbers.length * 100,
      names,
      false
    );
  }
}

async function handleSubscriptionCreated(supabase: SupabaseClient, session: Stripe.Checkout.Session) {
  const meta = session.metadata!;
  const userId = meta.user_id;
  const clubId = meta.club_id;
  const numbers: number[] = JSON.parse(meta.numbers);
  const names: Record<string, string> = JSON.parse(meta.names || "{}");
  const subscriptionId = session.subscription as string;

  const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as StripeSubscriptionWithPeriods;

  const item = subscription.items?.data?.[0];
  const periodStart = subscription.current_period_start || item?.current_period_start || subscription.start_date;
  const periodEnd = subscription.current_period_end || item?.current_period_end;

  const existingSub = await requireDb(
    `Failed to check subscription ${subscriptionId}`,
    await supabase
      .from("draw_subscriptions")
      .select("id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle()
  );

  if (existingSub) {
    await requireDb(
      `Failed to update subscription ${subscriptionId}`,
      await supabase
        .from("draw_subscriptions")
        .update({
          stripe_customer_id: session.customer as string,
          numbers,
          assigned_names: names,
          amount_pence: numbers.length * 100,
          status: "active",
          current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : new Date().toISOString(),
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscriptionId)
    );
  } else {
    await requireDb(
      `Error inserting subscription ${subscriptionId}`,
      await supabase.from("draw_subscriptions").insert({
        club_id: clubId,
        user_id: userId,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: session.customer as string,
        numbers,
        assigned_names: names,
        amount_pence: numbers.length * 100,
        status: "active",
        current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : new Date().toISOString(),
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      })
    );
  }

  await upsertNumberSelections(supabase, clubId, userId, subscriptionId);

  await insertPaymentIfMissing(supabase, {
    profile_id: userId,
    club_id: clubId,
    stripe_payment_intent_id: `${subscriptionId}_initial`,
    amount: numbers.length * 100,
    platform_fee: Math.round(numbers.length * 100 * 0.075),
    currency: "gbp",
    status: "succeeded",
    metadata: { numbers, names, stripe_session_id: session.id, type: "subscription_initial" },
  });

  const customerEmail = session.customer_details?.email || session.customer_email;
  if (customerEmail && process.env.RESEND_API_KEY) {
    await sendPurchaseConfirmation(customerEmail, numbers, numbers.length * 100, names);
    await sendAdminNewEntryNotification(
      customerEmail,
      session.customer_details?.name || undefined,
      numbers,
      numbers.length * 100,
      names,
      true
    );
  }
}

async function handleSubscriptionRenewal(supabase: SupabaseClient, invoice: StripeInvoiceWithSubscription) {
  const subscriptionId = ((invoice.parent?.subscription_details?.subscription || invoice.subscription) as string);

  const sub = await requireDb(
    `Failed to fetch subscription ${subscriptionId}`,
    await supabase
      .from("draw_subscriptions")
      .select("*")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle()
  );

  if (!sub) {
    throw new Error(`No subscription found for ${subscriptionId}`);
  }

  const stripeSubscription = (await stripe.subscriptions.retrieve(subscriptionId)) as StripeSubscriptionWithPeriods;
  const renewalItem = stripeSubscription.items?.data?.[0];
  const renewalStart = stripeSubscription.current_period_start || renewalItem?.current_period_start || stripeSubscription.start_date;
  const renewalEnd = stripeSubscription.current_period_end || renewalItem?.current_period_end;
  await requireDb(
    `Failed to update renewal period for ${subscriptionId}`,
    await supabase
      .from("draw_subscriptions")
      .update({
        status: "active",
        current_period_start: renewalStart ? new Date(renewalStart * 1000).toISOString() : new Date().toISOString(),
        current_period_end: renewalEnd ? new Date(renewalEnd * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscriptionId)
  );

  await upsertNumberSelections(supabase, sub.club_id, sub.user_id, subscriptionId);

  await insertPaymentIfMissing(supabase, {
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

  const stripeCustomer = await stripe.customers.retrieve(sub.stripe_customer_id || stripeSubscription.customer as string);
  const customerEmail = "email" in stripeCustomer ? stripeCustomer.email : undefined;
  if (customerEmail && process.env.RESEND_API_KEY) {
    await sendRenewalConfirmation(customerEmail, sub.numbers, sub.amount_pence, sub.assigned_names);
    console.log(`Renewal email sent to ${customerEmail}`);
  }

  console.log(`Subscription ${subscriptionId} renewed — numbers ${sub.numbers.join(", ")} entered for week ${getNextFriday()}`);
}
