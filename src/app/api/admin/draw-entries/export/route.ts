import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { drawEntryReportToCsv, fetchActiveDrawEntryReport } from "@/lib/admin-draw-entries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const report = await fetchActiveDrawEntryReport(createServiceClient());
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(drawEntryReportToCsv(report), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="ardmore-active-draw-list-${date}.csv"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to export draw entries" },
      { status: 500 }
    );
  }
}
