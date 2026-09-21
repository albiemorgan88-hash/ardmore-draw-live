import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { fetchActiveDrawEntryReport } from "@/lib/admin-draw-entries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const report = await fetchActiveDrawEntryReport(createServiceClient());
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch draw entries" },
      { status: 500 }
    );
  }
}
