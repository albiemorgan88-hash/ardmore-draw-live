import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await handleCheckoutComplete(session);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const supabase = createServiceClient();
  const meta = session.metadata!;
  const userId = meta.user_id;
  const clubId = meta.club_id;
  const numbers: number[] = JSON.parse(meta.numbers);
  const names: Record<string, string> = JSON.parse(meta.names || "{}");

  // Create number_selections entry with the numbers array
  const { error: selError } = await supabase.from("number_selections").insert({
    club_id: clubId,
    profile_id: userId,
    numbers: numbers,
    status: "active",
    stripe_subscription_id: session.id, // reusing field for session tracking
  });

  if (selError) console.error("Error inserting selection:", selError);

  // Record payment using existing payments table schema
  const { error: payError } = await supabase.from("payments").insert({
    profile_id: userId,
    club_id: clubId,
    stripe_payment_intent_id: session.payment_intent as string || session.id,
    amount: session.amount_total || numbers.length * 100,
    platform_fee: Math.round((session.amount_total || numbers.length * 100) * 0.075),
    currency: "gbp",
    status: "succeeded",
    metadata: { numbers, names, stripe_session_id: session.id },
  });

  if (payError) console.error("Error inserting payment:", payError);
}
