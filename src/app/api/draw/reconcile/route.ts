import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { reconcileAllDrawSelections } from "@/lib/draw-entries";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    if (req.nextUrl.searchParams.get("dryRun") === "true") {
      const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
      const [failures, stalled] = await Promise.all([
        supabase.from("stripe_events").select("id", { head: true, count: "exact" }).eq("status", "failed").gte("created_at", since),
        supabase.from("stripe_events").select("id", { head: true, count: "exact" }).eq("status", "processing").lt("updated_at", cutoff),
      ]);
      if (failures.error || stalled.error) throw new Error("Webhook health evidence is unavailable");
      return NextResponse.json({ dryRun: true, recentFailedEvents: failures.count, stalledEvents: stalled.count },
        { status: failures.count || stalled.count ? 503 : 200 });
    }
    const result = await reconcileAllDrawSelections(supabase);
    console.log(JSON.stringify({ event: "draw_reconciliation", reconciledUsers: result.reconciledUsers, failedUsers: result.failedUsers }));
    return NextResponse.json({ success: result.failedUsers === 0, ...result }, { status: result.failedUsers ? 500 : 200 });
  } catch (err: unknown) {
    console.error("Draw reconciliation failed:", err);
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
