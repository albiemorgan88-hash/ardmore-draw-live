import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // The public pot should reflect the actual active entries for the current draw.
    // number_selections is the source of truth because both subscriptions and one-offs
    // create active rows there, and one-offs are expired after each draw.
    const { data: selections, error } = await supabase
      .from("number_selections")
      .select("profile_id, numbers")
      .eq("status", "active");

    if (error) throw error;

    const rawTotalNumbers = (selections || []).reduce(
      (sum, selection) => sum + (selection.numbers?.length || 0),
      0
    );

    // Temporary manual adjustment approved by Phil:
    // exclude the disputed George Chambers 10-number one-off from the public pot
    // until the one-off state issue is reconciled properly.
    const totalNumbers = Math.max(0, rawTotalNumbers - 10);
    const totalPence = totalNumbers * 100;
    const members = new Set((selections || []).map((selection) => selection.profile_id)).size;

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
