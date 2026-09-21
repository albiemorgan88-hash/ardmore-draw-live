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
    return NextResponse.json(
      {
        totalPence: 0,
        totalPounds: "0.00",
        prizePotPounds: "0.00",
        first: "0.00",
        second: "0.00",
        third: "0.00",
        progress: 0,
        members: 0,
        totalNumbers: 0,
        targetPounds: "500.00",
        oneOffNumbers: 0,
        subscriptionNumbers: 0,
      },
      { status: 200 }
    );
  }
}
