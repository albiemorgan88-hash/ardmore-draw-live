import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";

const CLUB_ID = "31846fb2-b120-4815-bd48-e1120342d52e";
const PROCESSING_STALE_AFTER_MS = 15 * 60 * 1000;

type PayoutRow = {
  id: string;
  draw_id: string;
  recipient_type: string;
  recipient_profile_id: string | null;
  recipient_connect_id: string | null;
  amount_pence: number;
  status: string;
  winning_number: number | null;
};

type DrawRow = {
  id: string;
  draw_number: number;
  status: string;
};

type PayoutResult = {
  id: string;
  type: string;
  status: string;
  amount: number;
  error?: string;
  stripe_transfer_id?: string;
};

type PayoutSummaryRow = {
  id: string;
  recipient_type: string;
  status: string;
  amount_pence: number;
  error_message: string | null;
  stripe_transfer_id: string | null;
};

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function transferIdempotencyKey(drawId: string, payoutId: string) {
  return `ardmore-draw-${drawId}-payout-${payoutId}`;
}

async function resolveConnectId(supabase: SupabaseClient, payout: PayoutRow) {
  if (payout.recipient_connect_id) return payout.recipient_connect_id;

  if (payout.recipient_profile_id) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("stripe_connect_id, stripe_connect_status")
      .eq("id", payout.recipient_profile_id)
      .maybeSingle();

    if (error) throw new Error(`Failed to check winner Connect account: ${error.message}`);
    if (profile?.stripe_connect_id && profile?.stripe_connect_status === "active") {
      return profile.stripe_connect_id;
    }
  }

  if (payout.recipient_type === "club") {
    const { data: club, error } = await supabase
      .from("clubs")
      .select("stripe_connect_id")
      .eq("id", CLUB_ID)
      .maybeSingle();

    if (error) throw new Error(`Failed to check club Connect account: ${error.message}`);
    return club?.stripe_connect_id || null;
  }

  return null;
}

async function claimPayoutForProcessing(
  supabase: SupabaseClient,
  payout: PayoutRow,
  updates: Record<string, unknown>
): Promise<PayoutRow | null> {
  const staleBefore = new Date(Date.now() - PROCESSING_STALE_AFTER_MS).toISOString();
  const { data, error } = await supabase
    .from("payouts")
    .update({
      ...updates,
      status: "processing",
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payout.id)
    .or(`status.in.(pending,unclaimed,failed),and(status.eq.processing,updated_at.lt.${staleBefore})`)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(`Failed to claim payout ${payout.id}: ${error.message}`);
  return data as PayoutRow | null;
}

async function markPayout(
  supabase: SupabaseClient,
  payoutId: string,
  status: string,
  updates: Record<string, unknown> = {}
) {
  const { error } = await supabase
    .from("payouts")
    .update({
      ...updates,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payoutId);

  if (error) throw new Error(`Failed to mark payout ${payoutId} ${status}: ${error.message}`);
}

async function updateDrawPayoutStatus(supabase: SupabaseClient, drawId: string) {
  const { data: payouts, error } = await supabase
    .from("payouts")
    .select("status")
    .eq("draw_id", drawId);

  if (error) throw new Error(`Failed to refresh payout statuses: ${error.message}`);

  const statuses = (payouts || []).map((p: { status: string }) => p.status);
  const allComplete = statuses.length > 0 && statuses.every((status: string) => status === "paid" || status === "skipped");
  const drawStatus = allComplete ? "paid" : "pending_payout";

  const { error: drawError } = await supabase
    .from("draws")
    .update({ status: drawStatus })
    .eq("id", drawId);

  if (drawError) throw new Error(`Failed to update draw payout status: ${drawError.message}`);
  return drawStatus;
}

async function getCurrentPayoutSummary(supabase: SupabaseClient, drawId: string) {
  const { data: payouts, error } = await supabase
    .from("payouts")
    .select("id, recipient_type, status, amount_pence, error_message, stripe_transfer_id")
    .eq("draw_id", drawId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch payout summary: ${error.message}`);

  return ((payouts || []) as PayoutSummaryRow[]).map((p) => ({
    id: p.id,
    type: p.recipient_type,
    status: p.status,
    amount: p.amount_pence,
    ...(p.error_message ? { error: p.error_message } : {}),
    ...(p.stripe_transfer_id ? { stripe_transfer_id: p.stripe_transfer_id } : {}),
  })) as PayoutResult[];
}

/**
 * POST /api/draw/payout
 *
 * Admin-only. Executes payouts for a draw.
 * Body: { draw_id: string }
 *
 * Safety guarantees:
 * - each payout row is atomically claimed before transfer work starts;
 * - Stripe transfers use a stable idempotency key per draw+payout;
 * - draw status is only "paid" when every payout is complete;
 * - failed/unclaimed/stale-processing payouts stay retryable.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized — admin only" }, { status: 403 });
  }

  const { draw_id } = await req.json();
  if (!draw_id) {
    return NextResponse.json({ error: "draw_id required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: draw, error: drawErr } = await supabase
    .from("draws")
    .select("id, draw_number, status")
    .eq("id", draw_id)
    .maybeSingle();

  if (drawErr || !draw) {
    return NextResponse.json({ error: "Draw not found" }, { status: 404 });
  }

  const drawRow = draw as DrawRow;
  const transferGroup = `draw_${drawRow.draw_number}`;

  const { data: payouts, error: payErr } = await supabase
    .from("payouts")
    .select("*")
    .eq("draw_id", draw_id)
    .in("status", ["pending", "unclaimed", "failed", "processing"])
    .order("created_at", { ascending: true });

  if (payErr) {
    return NextResponse.json({ error: "Failed to fetch payouts", details: payErr.message }, { status: 500 });
  }

  if (!payouts || payouts.length === 0) {
    try {
      const results = await getCurrentPayoutSummary(supabase, draw_id);
      const drawStatus = await updateDrawPayoutStatus(supabase, draw_id);
      return NextResponse.json({
        success: true,
        already_settled: drawStatus === "paid",
        draw_number: drawRow.draw_number,
        transfer_group: transferGroup,
        results,
        summary: {
          total: results.length,
          paid: results.filter((r) => r.status === "paid").length,
          unclaimed: results.filter((r) => r.status === "unclaimed").length,
          failed: results.filter((r) => r.status === "failed").length,
        },
      });
    } catch (err) {
      return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
    }
  }

  const results: PayoutResult[] = [];

  for (const payout of payouts as PayoutRow[]) {
    try {
      if (payout.amount_pence <= 0) {
        await markPayout(supabase, payout.id, "skipped", { error_message: "Zero or negative payout amount" });
        results.push({ id: payout.id, type: payout.recipient_type, status: "skipped", amount: payout.amount_pence });
        continue;
      }

      if (payout.recipient_type === "platform") {
        const claimed = await claimPayoutForProcessing(supabase, payout, { transfer_group: transferGroup });
        if (!claimed) {
          results.push({ id: payout.id, type: payout.recipient_type, status: "skipped", amount: payout.amount_pence, error: "Already being processed" });
          continue;
        }

        await markPayout(supabase, payout.id, "paid", {
          transfer_group: transferGroup,
          paid_at: new Date().toISOString(),
        });
        results.push({ id: payout.id, type: payout.recipient_type, status: "paid", amount: payout.amount_pence });
        continue;
      }

      const connectId = await resolveConnectId(supabase, payout);
      if (!connectId) {
        await markPayout(supabase, payout.id, "unclaimed", { recipient_connect_id: null });
        results.push({ id: payout.id, type: payout.recipient_type, status: "unclaimed", amount: payout.amount_pence });
        continue;
      }

      const claimed = await claimPayoutForProcessing(supabase, payout, {
        recipient_connect_id: connectId,
        transfer_group: transferGroup,
      });
      if (!claimed) {
        results.push({ id: payout.id, type: payout.recipient_type, status: "skipped", amount: payout.amount_pence, error: "Already being processed" });
        continue;
      }

      const transfer = await stripe.transfers.create(
        {
          amount: payout.amount_pence,
          currency: "gbp",
          destination: connectId,
          transfer_group: transferGroup,
          metadata: {
            draw_id,
            draw_number: String(drawRow.draw_number),
            payout_id: payout.id,
            recipient_type: payout.recipient_type,
            ...(payout.winning_number ? { winning_number: String(payout.winning_number) } : {}),
          },
        },
        { idempotencyKey: transferIdempotencyKey(draw_id, payout.id) }
      );

      await markPayout(supabase, payout.id, "paid", {
        stripe_transfer_id: transfer.id,
        transfer_group: transferGroup,
        recipient_connect_id: connectId,
        paid_at: new Date().toISOString(),
      });

      results.push({
        id: payout.id,
        type: payout.recipient_type,
        status: "paid",
        amount: payout.amount_pence,
        stripe_transfer_id: transfer.id,
      });
    } catch (err) {
      const message = errorMessage(err);
      console.error(`Payout ${payout.id} failed:`, message);

      try {
        await markPayout(supabase, payout.id, "failed", { error_message: message });
      } catch (markErr) {
        console.error(`Failed to persist payout failure for ${payout.id}:`, markErr);
      }

      results.push({
        id: payout.id,
        type: payout.recipient_type,
        status: "failed",
        amount: payout.amount_pence,
        error: message,
      });
    }
  }

  let drawStatus = "pending_payout";
  try {
    drawStatus = await updateDrawPayoutStatus(supabase, draw_id);
  } catch (err) {
    console.error("Failed to update final draw payout status:", err);
  }

  return NextResponse.json({
    success: results.every((r) => r.status === "paid" || r.status === "skipped"),
    draw_number: drawRow.draw_number,
    draw_status: drawStatus,
    transfer_group: transferGroup,
    results,
    summary: {
      total: results.length,
      paid: results.filter((r) => r.status === "paid").length,
      unclaimed: results.filter((r) => r.status === "unclaimed").length,
      failed: results.filter((r) => r.status === "failed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
    },
  });
}

/**
 * GET /api/draw/payout?draw_id=xxx
 *
 * Admin-only. Get payout status for a draw.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const drawId = req.nextUrl.searchParams.get("draw_id");
  if (!drawId) {
    return NextResponse.json({ error: "draw_id required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: payouts, error } = await supabase
    .from("payouts")
    .select("*")
    .eq("draw_id", drawId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch payouts" }, { status: 500 });
  }

  return NextResponse.json({ payouts: payouts || [] });
}
