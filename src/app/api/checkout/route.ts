import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";

const CLUB_ID = "31846fb2-b120-4815-bd48-e1120342d52e";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { numbers, userId, userEmail, names } = body as {
      numbers: number[];
      userId: string;
      userEmail: string;
      names: Record<number, string>;
    };

    if (!numbers?.length || !userId) {
      return NextResponse.json({ error: "Missing numbers or user" }, { status: 400 });
    }

    // Check which numbers are already taken
    const supabase = createServiceClient();
    const { data: existing } = await supabase
      .from("number_selections")
      .select("numbers")
      .eq("club_id", CLUB_ID)
      .eq("status", "active");

    const takenSet = new Set<number>();
    if (existing) {
      for (const row of existing) {
        if (row.numbers) row.numbers.forEach((n: number) => takenSet.add(n));
      }
    }

    const conflicts = numbers.filter((n) => takenSet.has(n));
    if (conflicts.length > 0) {
      return NextResponse.json({ error: `Numbers already taken: ${conflicts.join(", ")}` }, { status: 409 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
