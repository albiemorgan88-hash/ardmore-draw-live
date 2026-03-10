import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth";

const ADMIN_EMAILS = ["contact@bluecanvas.ai", "ardmorecc1879@hotmail.com"];

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

  // Get draw
  const { data: draw } = await supabase
    .from("draws")
    .select("*")
    .eq("id", drawId)
    .single();

  if (!draw) {
    return NextResponse.json({ error: "Draw not found" }, { status: 404 });
  }

  // Get payouts with profile names
  const { data: payouts } = await supabase
    .from("payouts")
    .select("*")
    .eq("draw_id", drawId)
    .order("created_at", { ascending: true });

  // Get profile names for winner payouts
  const profileIds = (payouts || [])
    .filter((p) => p.recipient_profile_id)
    .map((p) => p.recipient_profile_id);

  let nameMap = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", profileIds);
    if (profiles) {
      for (const p of profiles) {
        nameMap.set(p.id, p.full_name || p.email || "Unknown");
      }
    }
  }

  const formatPence = (p: number) => (p / 100).toFixed(2);
  const drawDate = new Date(draw.drawn_at).toLocaleDateString("en-GB");

  const recipientLabels: Record<string, string> = {
    winner_1st: "1st Prize",
    winner_2nd: "2nd Prize",
    winner_3rd: "3rd Prize",
    club: "Ardmore CC (Club Fund)",
    platform: "Blue Canvas (Platform Fee)",
  };

  // Build CSV
  const rows = [
    ["Ardmore Cricket Club - Weekly Draw Report"],
    [`Draw #${draw.draw_number}`, `Date: ${drawDate}`],
    [`Total Pot: £${formatPence(draw.pot_amount)}`, `Entries: ${draw.total_entries}`],
    [`Winning Numbers: ${draw.drawn_numbers.join(", ")}`],
    [],
    ["Recipient", "Type", "Number", "Amount (£)", "Status", "Manually Paid", "Paid At", "Notes"],
  ];

  for (const p of payouts || []) {
    const name = p.recipient_name || nameMap.get(p.recipient_profile_id) || recipientLabels[p.recipient_type] || p.recipient_type;
    rows.push([
      name,
      recipientLabels[p.recipient_type] || p.recipient_type,
      p.winning_number ? String(p.winning_number) : "",
      formatPence(p.amount_pence),
      p.status,
      p.manually_paid ? "Yes" : "No",
      p.manually_paid_at ? new Date(p.manually_paid_at).toLocaleDateString("en-GB") : "",
      p.notes || "",
    ]);
  }

  rows.push([]);
  rows.push(["Summary"]);
  rows.push(["Winners (50%)", `£${formatPence(draw.prize_pool)}`]);
  rows.push(["Club Fund (40%)", `£${formatPence(draw.club_share)}`]);
  rows.push(["Platform Fee (7.5%)", `£${formatPence(draw.platform_fee)}`]);
  rows.push(["Stripe Fees (2.5%)", `£${formatPence(Math.round(draw.pot_amount * 0.025))}`]);

  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="ardmore-draw-${draw.draw_number}-${drawDate.replace(/\//g, "-")}.csv"`,
    },
  });
}
