import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 60; // Revalidate every 60 seconds

export async function GET() {
  try {
    // Source of truth: draw_subscriptions with status='active'
    // These are paid, recurring subscriptions that should be in the draw
    const { data: subscriptions, error } = await supabase
      .from("draw_subscriptions")
      .select("user_id, numbers")
      .eq("status", "active");

    if (error) throw error;

    const totalNumbers = (subscriptions || []).reduce(
      (sum, sub) => sum + (sub.numbers?.length || 0),
      0
    );
    const totalPence = totalNumbers * 100;
    const members = new Set((subscriptions || []).map((sub) => sub.user_id)).size;

    // Prize split: 50% to prizes (25% 1st, 15% 2nd, 10% 3rd), 50% to club
    const prizePot = totalPence / 2;
    const first = Math.floor(totalPence * 25 / 100);
    const second = Math.floor(totalPence * 15 / 100);
    const third = Math.floor(totalPence * 10 / 100);

    // Target pot (500 numbers × £1 = £500)
    const targetPence = 50000;
    const progress = Math.min(100, Math.round((totalPence / targetPence) * 100));

    return NextResponse.json({
      totalPence,
      totalPounds: (totalPence / 100).toFixed(2),
      prizePotPounds: (prizePot / 100).toFixed(2),
      first: (first / 100).toFixed(2),
      second: (second / 100).toFixed(2),
      third: (third / 100).toFixed(2),
      totalNumbers,
      members,
      progress,
      targetPounds: "500.00",
    });
  } catch (err) {
    console.error("Pot API error:", err);
    return NextResponse.json(
      { totalPounds: "0.00", first: "0.00", second: "0.00", third: "0.00", progress: 0, members: 0, totalNumbers: 0, targetPounds: "500.00" },
      { status: 200 }
    );
  }
}
