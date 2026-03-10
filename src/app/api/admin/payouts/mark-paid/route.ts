import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth";

const ADMIN_EMAILS = ["contact@bluecanvas.ai", "ardmorecc1879@hotmail.com"];

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { payout_id, manually_paid, notes } = await req.json();
  if (!payout_id) {
    return NextResponse.json({ error: "payout_id required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("payouts")
    .update({
      manually_paid: !!manually_paid,
      manually_paid_at: manually_paid ? new Date().toISOString() : null,
      manually_paid_by: manually_paid ? (user.email || "") : null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payout_id);

  if (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
