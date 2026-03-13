import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CLUB_ID = "31846fb2-b120-4815-bd48-e1120342d52e";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Fetch recent draws
  const { data: draws, error } = await supabase
    .from("draws")
    .select("*")
    .eq("club_id", CLUB_ID)
    .order("drawn_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Failed to fetch draws:", error);
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
  }

  if (!draws || draws.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // For each draw, get the winner info from payouts
  const results = [];
  for (const draw of draws) {
    const { data: payouts } = await supabase
      .from("payouts")
      .select("recipient_type, recipient_name, recipient_profile_id, amount_pence, winning_number")
      .eq("draw_id", draw.id)
      .in("recipient_type", ["winner_1st", "winner_2nd", "winner_3rd"])
      .order("recipient_type", { ascending: true });

    // If payouts have names, use them. Otherwise try to look up from number_selections
    const winners = [];
    if (payouts) {
      for (const p of payouts) {
        let name = p.recipient_name || "Unknown";
        
        // If no name in payout, try to find from number_selections assigned_names
        if (name === "Unknown" && p.winning_number && p.recipient_profile_id) {
          const { data: sels } = await supabase
            .from("number_selections")
            .select("assigned_names")
            .eq("profile_id", p.recipient_profile_id)
            .eq("club_id", CLUB_ID)
            .limit(1)
            .single();
          
          if (sels?.assigned_names?.[String(p.winning_number)]) {
            name = sels.assigned_names[String(p.winning_number)];
          } else if (name === "Unknown") {
            // Fall back to profile name
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", p.recipient_profile_id)
              .single();
            if (profile?.full_name) name = profile.full_name;
          }
        }

        winners.push({
          place: p.recipient_type.replace("winner_", ""),
          number: p.winning_number,
          name,
          prize: p.amount_pence,
        });
      }
    }

    results.push({
      draw_number: draw.draw_number,
      drawn_at: draw.drawn_at,
      drawn_numbers: draw.drawn_numbers,
      total_entries: draw.total_entries,
      pot_amount: draw.pot_amount,
      winners,
    });
  }

  return NextResponse.json({ results });
}
