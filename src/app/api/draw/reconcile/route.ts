import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { reconcileAllDrawSelections } from "@/lib/draw-entries";

export const dynamic = "force-dynamic";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Draw reconciliation failed";
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const querySecret = req.nextUrl.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET || process.env.DRAW_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET/DRAW_SECRET environment variable not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (bearerToken !== cronSecret && querySecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const result = await reconcileAllDrawSelections(supabase);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    console.error("Draw reconciliation failed:", err);
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
