import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth";

const CLUB_ID = "31846fb2-b120-4815-bd48-e1120342d52e";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Checkout failed";
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { numbers, names, paymentMode } = body as {
      numbers: number[];
      names: Record<number, string>;
      paymentMode?: "one-off" | "subscription";
    };

    // Use verified user identity, never trust client-supplied userId/email
    const userId = user.id;
    const userEmail = user.email!;

    if (!numbers?.length) {
      return NextResponse.json({ error: "Missing numbers" }, { status: 400 });
    }

    const normalizedNumbers = numbers.map((n) => Number(n));
    const duplicateRequestNumbers = normalizedNumbers.filter((n, i) => normalizedNumbers.indexOf(n) !== i);
    if (duplicateRequestNumbers.length > 0) {
      return NextResponse.json(
        { error: `Duplicate numbers in request: ${[...new Set(duplicateRequestNumbers)].join(", ")}` },
        { status: 400 }
      );
    }

    if (normalizedNumbers.some((n) => !Number.isInteger(n) || n < 1 || n > 500)) {
      return NextResponse.json({ error: "Numbers must be between 1 and 500" }, { status: 400 });
    }

    const isSubscription = paymentMode === "subscription";

    // Check which numbers are already paid into the draw.
    const supabase = createServiceClient();
    const { data: existing, error: selectionError } = await supabase
      .from("number_selections")
      .select("numbers")
      .eq("club_id", CLUB_ID)
      .eq("status", "active");

    // Also check active subscriptions in case a webhook has not rebuilt number_selections yet.
    const { data: subscribed, error: subscriptionError } = await supabase
      .from("draw_subscriptions")
      .select("numbers")
      .eq("club_id", CLUB_ID)
      .in("status", ["active", "past_due"]);

    if (selectionError || subscriptionError) {
      return NextResponse.json({ error: "We could not check number availability. Please try again shortly." }, { status: 503 });
    }

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

    const conflicts = normalizedNumbers.filter((n) => takenSet.has(n));
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
                name: `Ardmore CC Draw – ${normalizedNumbers.length} Number${normalizedNumbers.length > 1 ? "s" : ""}`,
                description: `Weekly draw entry: numbers ${normalizedNumbers.join(", ")}`,
              },
            },
            quantity: normalizedNumbers.length,
          },
        ],
        metadata: {
          user_id: userId,
          club_id: CLUB_ID,
          numbers: JSON.stringify(normalizedNumbers),
          names: JSON.stringify(names),
          mode: "subscription",
        },
        subscription_data: {
          metadata: {
            user_id: userId,
            club_id: CLUB_ID,
            numbers: JSON.stringify(normalizedNumbers),
            names: JSON.stringify(names),
          },
        },
        // Stripe automatically sends invoice emails for subscriptions
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
      payment_intent_data: {
        receipt_email: userEmail,
      },
      line_items: normalizedNumbers.map((n) => ({
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
        numbers: JSON.stringify(normalizedNumbers),
        names: JSON.stringify(names),
        mode: "one-off",
      },
      success_url: `${siteUrl}/draw/success?session_id={CHECKOUT_SESSION_ID}&mode=one-off`,
      cancel_url: `${siteUrl}/draw`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
