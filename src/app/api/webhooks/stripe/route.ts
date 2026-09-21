import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { claimStripeEvent, finishStripeEvent } from "@/lib/stripe-event-lease";
import { processSubscriptionRenewal, mapStripeSubscriptionStatus } from "@/lib/subscription-renewal";

export const maxDuration = 60;
import { createServiceClient } from "@/lib/supabase";
import {
  sendAdminMatchBallSponsorNotification,
  sendAdminNewEntryNotification,
  sendMatchBallSponsorConfirmation,
  sendMembershipNotification,
  sendPurchaseConfirmation,
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
    return claim.processed
      ? NextResponse.json({ received: true, duplicate: true })
      : NextResponse.json({ error: "Event processing is already in progress" }, { status: 503, headers: { "Retry-After": "30" } });
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
        } else if (session.metadata?.club_id !== "31846fb2-b120-4815-bd48-e1120342d52e") {
          // The account also receives other checkout types. A completed session
          // without Ardmore draw metadata must not be interpreted as an entry.
          console.log(JSON.stringify({ event: "checkout_outside_draw_scope", sessionId: session.id }));
        } else if (session.payment_status !== "paid") {
          throw new Error("Ardmore draw checkout has not been paid");
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
          await processSubscriptionRenewal(supabase, stripe, invoice, {
            // Provider idempotency expires after 24 hours. Historical recovery
            // repairs the ledger without sending a stale draw confirmation.
            notify: Date.now() / 1000 - event.created < 24 * 60 * 60,
          });
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
        await handleSubscriptionStatusUpdated(supabase, await stripe.subscriptions.retrieve(sub.id));
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

    await finishStripeEvent(supabase, event.id, claim.token);
    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = errorMessage(err);
    console.error(`Stripe webhook ${event.id} failed:`, message);
    await finishStripeEvent(supabase, event.id, claim.token, message).catch((failure) => console.error("Stripe event failure could not be recorded:", errorMessage(failure)));
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

async function upsertNumberSelections(supabase: SupabaseClient, clubId: string, userId: string) {
  return reconcileNumberSelections(supabase, clubId, userId);
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
    await reconcileNumberSelections(supabase, updated.club_id, updated.user_id);
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

  await upsertNumberSelections(supabase, clubId, userId);

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
