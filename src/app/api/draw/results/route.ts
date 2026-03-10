import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CLUB_ID = "31846fb2-b120-4815-bd48-e1120342d52e";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("draws")
    .select("*")
    .eq("club_id", CLUB_ID)
    .in("status", ["drawn", "pending_payout", "paid"])
    .order("drawn_at", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
  }

  return NextResponse.json({ results: data || [] });
}
