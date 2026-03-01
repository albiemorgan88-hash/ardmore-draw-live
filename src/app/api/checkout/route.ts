import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";

const CLUB_ID = "31846fb2-b120-4815-bd48-e1120342d52e";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { numbers, userId, userEmail, names, paymentMode } = body as {
      numbers: number[];
      userId: string;
      userEmail: string;
      names: Record<number, string>;
      paymentMode?: "one-off" | "subscription";
    };

    if (!numbers?.length || !userId) {
      return NextResponse.json({ error: "Missing numbers or user" }, { status: 400 });
    }

    const isSubscription = paymentMode === "subscription";

    // Check which numbers are already taken
    const supabase = createServiceClient();
    const { data: existing } = await supabase
      .from("number_selections")
      .select("numbers")
      .eq("club_id", CLUB_ID)
      .eq("status", "active");

    // Also check subscribed (reserved) numbers
    const { data: subscribed } = await supabase
      .from("draw_subscriptions")
      .select("numbers")
      .eq("club_id", CLUB_ID)
      .in("status", ["active", "past_due"]);

    const takenSet = new Set<number>();
    if (existing) {
      for (const row of existing) {
        if (row.numbers) row.numbers.forEach((n: number) => takenSet.add(n));
      }
    }
    if (subscribed) {
      for (const row of subscribed) {
        if (row.numbers) row.numbers.forEach((n: number) => takenSet.add(n));
      }
    }

    const conflicts = numbers.filter((n) => takenSet.has(n));
    if (conflicts.length > 0) {
      return NextResponse.json({ error: `Numbers already taken: ${conflicts.join(", ")}` }, { status: 409 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    if (isSubscription) {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        customer_email: userEmail,
        line_items: [
          {
            price_data: {
              currency: "gbp",
              unit_amount: 100,
              recurring: { interval: "week" },
              product_data: {
                name: `Ardmore CC Draw – ${numbers.length} Number${numbers.length > 1 ? "s" : ""}`,
                description: `Weekly draw entry: numbers ${numbers.join(", ")}`,
              },
            },
            quantity: numbers.length,
          },
        ],
        metadata: {
          user_id: userId,
          club_id: CLUB_ID,
          numbers: JSON.stringify(numbers),
          names: JSON.stringify(names),
          mode: "subscription",
        },
        subscription_data: {
          metadata: {
            user_id: userId,
            club_id: CLUB_ID,
            numbers: JSON.stringify(numbers),
            names: JSON.stringify(names),
          },
        },
        success_url: `${siteUrl}/draw/success?session_id={CHECKOUT_SESSION_ID}&mode=subscription`,
        cancel_url: `${siteUrl}/draw`,
      });

      return NextResponse.json({ url: session.url });
    }

    // One-off payment mode (existing)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: userEmail,
      line_items: numbers.map((n) => ({
        price_data: {
          currency: "gbp",
          product_data: {
            name: `Draw Number ${n}`,
            description: names[n] ? `Assigned to: ${names[n]}` : "Weekly Draw Entry",
          },
          unit_amount: 100,
        },
        quantity: 1,
      })),
      metadata: {
        user_id: userId,
        club_id: CLUB_ID,
        numbers: JSON.stringify(numbers),
        names: JSON.stringify(names),
        mode: "one-off",
      },
      success_url: `${siteUrl}/draw/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/draw`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
