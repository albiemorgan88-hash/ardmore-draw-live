import type Stripe from "stripe";

export type MembershipPaymentRow = {
  session_id: string;
  member_name: string;
  payer_name: string;
  payer_email: string;
  membership_type: string;
  membership_name: string;
  amount_pence: number;
  currency: string;
  checkout_status: string;
  payment_status: string;
  paid: boolean;
  created_at: string;
};

export type MembershipReport = {
  generated_at: string;
  season_start: string;
  season_end: string;
  summary: {
    total_sessions: number;
    paid_sessions: number;
    unpaid_sessions: number;
    total_paid_pence: number;
  };
  memberships: MembershipPaymentRow[];
};

function defaultSeasonStart(now = new Date()) {
  const year = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return new Date(Date.UTC(year, 3, 1));
}

function seasonEnd(seasonStart: Date) {
  return new Date(Date.UTC(seasonStart.getUTCFullYear() + 1, 2, 31, 23, 59, 59, 999));
}

function parseSeasonStart(value: string | null) {
  if (!value) return defaultSeasonStart();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return defaultSeasonStart();
  return parsed;
}

function isMembershipSession(session: Stripe.Checkout.Session) {
  return session.metadata?.category === "membership" || Boolean(session.metadata?.membershipType);
}

export async function fetchMembershipReport(
  stripe: Stripe,
  seasonStartValue: string | null = null
): Promise<MembershipReport> {
  const start = parseSeasonStart(seasonStartValue);
  const end = seasonEnd(start);
  const rows: MembershipPaymentRow[] = [];
  let startingAfter: string | undefined;

  do {
    const page = await stripe.checkout.sessions.list({
      limit: 100,
      created: {
        gte: Math.floor(start.getTime() / 1000),
        lte: Math.floor(end.getTime() / 1000),
      },
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const session of page.data) {
      if (!isMembershipSession(session)) continue;

      const paymentStatus = session.payment_status || "";
      const checkoutStatus = session.status || "";

      rows.push({
        session_id: session.id,
        member_name: session.metadata?.memberName || session.customer_details?.name || "",
        payer_name: session.customer_details?.name || "",
        payer_email: session.customer_details?.email || session.customer_email || "",
        membership_type: session.metadata?.membershipType || "",
        membership_name: session.metadata?.membershipName || session.metadata?.membershipType || "",
        amount_pence: session.amount_total || 0,
        currency: (session.currency || "gbp").toUpperCase(),
        checkout_status: checkoutStatus,
        payment_status: paymentStatus,
        paid: checkoutStatus === "complete" && paymentStatus === "paid",
        created_at: new Date(session.created * 1000).toISOString(),
      });
    }

    startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
  } while (startingAfter);

  rows.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  return {
    generated_at: new Date().toISOString(),
    season_start: start.toISOString(),
    season_end: end.toISOString(),
    summary: {
      total_sessions: rows.length,
      paid_sessions: rows.filter((row) => row.paid).length,
      unpaid_sessions: rows.filter((row) => !row.paid).length,
      total_paid_pence: rows.filter((row) => row.paid).reduce((sum, row) => sum + row.amount_pence, 0),
    },
    memberships: rows,
  };
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function membershipReportToCsv(report: MembershipReport) {
  const rows: unknown[][] = [
    ["Ardmore Cricket Club - Membership Fees"],
    ["Generated at", report.generated_at],
    ["Season start", report.season_start],
    ["Season end", report.season_end],
    ["Paid memberships", report.summary.paid_sessions],
    ["Unpaid/expired sessions", report.summary.unpaid_sessions],
    ["Total paid", (report.summary.total_paid_pence / 100).toFixed(2)],
    [],
    [
      "Member name",
      "Payer name",
      "Payer email",
      "Membership type",
      "Membership name",
      "Amount",
      "Currency",
      "Paid",
      "Checkout status",
      "Payment status",
      "Created at",
      "Stripe session",
    ],
  ];

  for (const membership of report.memberships) {
    rows.push([
      membership.member_name,
      membership.payer_name,
      membership.payer_email,
      membership.membership_type,
      membership.membership_name,
      (membership.amount_pence / 100).toFixed(2),
      membership.currency,
      membership.paid ? "Yes" : "No",
      membership.checkout_status,
      membership.payment_status,
      membership.created_at,
      membership.session_id,
    ]);
  }

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}
