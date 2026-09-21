import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { fetchMembershipReport, membershipReportToCsv } from "@/lib/admin-memberships";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const seasonStart = req.nextUrl.searchParams.get("season_start");
    const report = await fetchMembershipReport(stripe, seasonStart);
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(membershipReportToCsv(report), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="ardmore-memberships-${date}.csv"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to export memberships" },
      { status: 500 }
    );
  }
}
