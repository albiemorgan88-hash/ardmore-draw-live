import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth";

const ADMIN_EMAILS = ["contact@bluecanvas.ai", "ardmorecc1879@hotmail.com"];
const CLUB_ID = "31846fb2-b120-4815-bd48-e1120342d52e";

/**
 * POST /api/draw/payout
 * 
 * Admin-only. Executes payouts for a draw.
 * Body: { draw_id: string }
 * 
 * Flow:
 * 1. Verify admin
 * 2. Get draw + payout records
 * 3. For each pending payout with a connected account → create Stripe Transfer
 * 4. Mark payouts without connected accounts as "unclaimed"
 * 5. Update draw status to "paid"
 */
export async function POST(req: NextRequest) {
  // Admin auth
  const user = await getAuthenticatedUser(req);
  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
    return NextResponse.json({ error: "Unauthorized — admin only" }, { status: 403 });
  }

  const { draw_id } = await req.json();
  if (!draw_id) {
    return NextResponse.json({ error: "draw_id required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Get draw
  const { data: draw, error: drawErr } = await supabase
    .from("draws")
    .select("*")
    .eq("id", draw_id)
    .single();

  if (drawErr || !draw) {
    return NextResponse.json({ error: "Draw not found" }, { status: 404 });
  }

  if (draw.status === "paid") {
    return NextResponse.json({ error: "Draw already paid out" }, { status: 400 });
  }

  // Get all payouts for this draw
  const { data: payouts, error: payErr } = await supabase
    .from("payouts")
    .select("*")
    .eq("draw_id", draw_id)
    .in("status", ["pending", "unclaimed"]);

  if (payErr || !payouts || payouts.length === 0) {
    return NextResponse.json({ error: "No payouts found for this draw" }, { status: 400 });
  }

  const transferGroup = `draw_${draw.draw_number}`;
  const results: Array<{ id: string; type: string; status: string; amount: number; error?: string }> = [];

  for (const payout of payouts) {
    // Platform share stays in our Stripe balance — no transfer needed
    if (payout.recipient_type === "platform") {
      await supabase.from("payouts").update({ 
        status: "paid", 
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      }).eq("id", payout.id);
      results.push({ id: payout.id, type: payout.recipient_type, status: "paid", amount: payout.amount_pence });
      continue;
    }

    // Check for connected account
    let connectId = payout.recipient_connect_id;

    if (!connectId && payout.recipient_profile_id) {
      // Try to get it fresh from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_connect_id, stripe_connect_status")
        .eq("id", payout.recipient_profile_id)
        .single();

      if (profile?.stripe_connect_id && profile?.stripe_connect_status === "active") {
        connectId = profile.stripe_connect_id;
      }
    }

    // For club payouts, check the clubs table
    if (!connectId && payout.recipient_type === "club") {
      const { data: club } = await supabase
        .from("clubs")
        .select("stripe_connect_id")
        .eq("id", CLUB_ID)
        .single();
      connectId = club?.stripe_connect_id;
    }

    if (!connectId) {
      // No connected account — mark as unclaimed
      await supabase.from("payouts").update({ 
        status: "unclaimed",
        updated_at: new Date().toISOString() 
      }).eq("id", payout.id);
      results.push({ id: payout.id, type: payout.recipient_type, status: "unclaimed", amount: payout.amount_pence });
      continue;
    }

    // Execute Stripe Transfer
    try {
      const transfer = await stripe.transfers.create({
        amount: payout.amount_pence,
        currency: "gbp",
        destination: connectId,
        transfer_group: transferGroup,
        metadata: {
          draw_id: draw_id,
          draw_number: String(draw.draw_number),
          payout_id: payout.id,
          recipient_type: payout.recipient_type,
          ...(payout.winning_number ? { winning_number: String(payout.winning_number) } : {}),
        },
      });

      await supabase.from("payouts").update({
        status: "paid",
        stripe_transfer_id: transfer.id,
        transfer_group: transferGroup,
        recipient_connect_id: connectId,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", payout.id);

      results.push({ id: payout.id, type: payout.recipient_type, status: "paid", amount: payout.amount_pence });
    } catch (err: any) {
      console.error(`Transfer failed for payout ${payout.id}:`, err.message);

      await supabase.from("payouts").update({
        status: "failed",
        error_message: err.message,
        updated_at: new Date().toISOString(),
      }).eq("id", payout.id);

      results.push({ id: payout.id, type: payout.recipient_type, status: "failed", amount: payout.amount_pence, error: err.message });
    }
  }

  // Check if all payouts are complete (paid or skipped)
  const allDone = results.every(r => r.status === "paid" || r.status === "skipped");
  const anyPaid = results.some(r => r.status === "paid");

  if (allDone) {
    await supabase.from("draws").update({ status: "paid" }).eq("id", draw_id);
  } else if (anyPaid) {
    // Partial payout — some unclaimed or failed
    await supabase.from("draws").update({ status: "paid" }).eq("id", draw_id);
  }

  return NextResponse.json({
    success: true,
    draw_number: draw.draw_number,
    transfer_group: transferGroup,
    results,
    summary: {
      total: results.length,
      paid: results.filter(r => r.status === "paid").length,
      unclaimed: results.filter(r => r.status === "unclaimed").length,
      failed: results.filter(r => r.status === "failed").length,
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
  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
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
