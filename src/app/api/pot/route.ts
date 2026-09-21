import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { fetchActiveDrawSelections, summarizeDrawSelections } from "@/lib/draw-entries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const selections = await fetchActiveDrawSelections(supabase);
    return NextResponse.json(summarizeDrawSelections(selections));
  } catch (err) {
    console.error("Pot API error:", err);
    return NextResponse.json({ error: "The current draw pot is temporarily unavailable." }, { status: 503 });
  }
}
