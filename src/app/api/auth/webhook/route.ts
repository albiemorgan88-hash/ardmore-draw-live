import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.DRAW_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, record } = body;

    if (type === "INSERT" && record?.email) {
      const name = record.raw_user_meta_data?.full_name || record.raw_user_meta_data?.name || "";
      await sendWelcomeEmail(record.email, name);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Auth webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
