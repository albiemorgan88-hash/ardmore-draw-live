import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * GET /api/connect/claim-info?token=xxx
 * 
 * Returns claim token details (prize, amount, status) without auth.
 * Used by the /claim page to show prize info.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: claim, error } = await supabase
    .from("claim_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !claim) {
    return NextResponse.json({ error: "Invalid or expired claim token" }, { status: 404 });
  }

  if (claim.status === "expired" || new Date(claim.expires_at) < new Date()) {
    return NextResponse.json({ error: "This claim link has expired" }, { status: 400 });
  }

  // Check if already has a connected account
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_id, stripe_connect_status")
    .eq("id", claim.profile_id)
    .single();

  return NextResponse.json({
    place: claim.prize_place,
    amount_pence: claim.amount_pence,
    winning_number: claim.winning_number,
    status: claim.status === "claimed" || profile?.stripe_connect_status === "active" ? "claimed" : "pending",
    expires_at: claim.expires_at,
  });
}
