import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    
    // Get the user's Stripe customer ID from their subscription
    const { data: subscription } = await supabase
      .from("draw_subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!subscription) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    // Get the Stripe subscription to find the customer ID
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    const customerId = stripeSubscription.customer as string;

    // Create a billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/draw/manage`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Error creating billing portal session:", error);
    return NextResponse.json({ error: "Failed to create billing portal session" }, { status: 500 });
  }
}