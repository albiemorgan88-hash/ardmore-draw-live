import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth";

const ADMIN_EMAILS = ["contact@bluecanvas.ai", "ardmorecc1879@hotmail.com"];
const CLUB_ID = "31846fb2-b120-4815-bd48-e1120342d52e";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = createServiceClient();

  // Get all draws ordered by date
  const { data: draws } = await supabase
    .from("draws")
    .select("id, draw_number, drawn_at, pot_amount, prize_pool, club_share, platform_fee, total_entries, status")
    .eq("club_id", CLUB_ID)
    .order("drawn_at", { ascending: false });

  if (!draws) {
    return NextResponse.json({ months: [] });
  }

  // Group by month
  const monthMap = new Map<string, {
    month: string;
    label: string;
    draws: typeof draws;
    totalPot: number;
    totalPrizes: number;
    totalClub: number;
    totalPlatform: number;
    totalStripeFees: number;
    drawCount: number;
  }>();

  for (const draw of draws) {
    const date = new Date(draw.drawn_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        month: monthKey,
        label,
        draws: [],
        totalPot: 0,
        totalPrizes: 0,
        totalClub: 0,
        totalPlatform: 0,
        totalStripeFees: 0,
        drawCount: 0,
      });
    }

    const m = monthMap.get(monthKey)!;
    m.draws.push(draw);
    m.totalPot += draw.pot_amount;
    m.totalPrizes += draw.prize_pool;
    m.totalClub += draw.club_share;
    m.totalPlatform += draw.platform_fee;
    m.totalStripeFees += Math.round(draw.pot_amount * 0.025);
    m.drawCount += 1;
  }

  const months = Array.from(monthMap.values()).map(({ draws: monthDraws, ...rest }) => ({
    ...rest,
    draws: monthDraws.map((d) => ({
      draw_number: d.draw_number,
      drawn_at: d.drawn_at,
      pot_amount: d.pot_amount,
      platform_fee: d.platform_fee,
      status: d.status,
    })),
  }));

  return NextResponse.json({ months });
}
