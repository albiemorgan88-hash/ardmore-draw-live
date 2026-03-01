import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("draw_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subscriptions: data });
}

export async function DELETE(req: NextRequest) {
  const { subscriptionId, userId } = await req.json();
  if (!subscriptionId || !userId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify ownership
  const { data: sub } = await supabase
    .from("draw_subscriptions")
    .select("*")
    .eq("stripe_subscription_id", subscriptionId)
    .eq("user_id", userId)
    .single();

  if (!sub) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  // Cancel in Stripe
  await stripe.subscriptions.cancel(subscriptionId);

  // Update our DB
  await supabase
    .from("draw_subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscriptionId);

  return NextResponse.json({ success: true });
}
