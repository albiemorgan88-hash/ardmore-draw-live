"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { isAdminEmail } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

type MembershipPaymentRow = {
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

type MembershipReport = {
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

type FilterMode = "all" | "paid" | "unpaid";

function formatPence(amount: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminMembershipsPage() {
  const { user, loading: authLoading } = useAuth();
  const [report, setReport] = useState<MembershipReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [exporting, setExporting] = useState(false);

  const isAdmin = isAdminEmail(user?.email);

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  }, []);

  const fetchMemberships = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    setError("");
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/memberships", { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load memberships");
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load memberships");
    }
    setLoading(false);
  }, [getAuthHeaders, isAdmin]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }
    fetchMemberships();
  }, [authLoading, fetchMemberships, isAdmin, user]);

  const filteredRows = useMemo(() => {
    const rows = report?.memberships || [];
    const normalisedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "paid" && row.paid) ||
        (filter === "unpaid" && !row.paid);

      if (!matchesFilter) return false;
      if (!normalisedQuery) return true;

      return [
        row.member_name,
        row.payer_name,
        row.payer_email,
        row.membership_type,
        row.membership_name,
        row.checkout_status,
        row.payment_status,
        row.session_id,
      ].some((value) => String(value).toLowerCase().includes(normalisedQuery));
    });
  }, [filter, query, report]);

  const downloadCsv = async () => {
    setExporting(true);
    setError("");

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/memberships/export", { headers });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to export memberships");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `ardmore-memberships-${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export memberships");
    }

    setExporting(false);
  };

  if (authLoading || loading) {
    return (
      <section className="min-h-screen bg-cream px-4 py-12">
        <div className="max-w-6xl mx-auto text-navy/50">Loading memberships...</div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-cream px-4">
        <div className="text-center">
          <p className="text-navy/60 mb-4">Admin access required</p>
          <a href="/login" className="text-gold font-semibold hover:underline">Sign in</a>
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-cream px-4">
        <p className="text-red-600">You don&apos;t have admin access.</p>
      </section>
    );
  }

  return (
    <section className="py-8 bg-cream min-h-screen">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="font-heading text-3xl font-bold text-navy">Membership Fees</h1>
            <p className="text-sm text-navy/50 mt-1">
              Website Stripe checkout sessions for the current season
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin" className="text-sm text-gold font-semibold hover:underline self-center">
              Admin
            </Link>
            <Link href="/admin/draw-entries" className="text-sm text-gold font-semibold hover:underline self-center">
              Draw Entries
            </Link>
            <button
              onClick={fetchMemberships}
              className="bg-white border border-gray-200 text-navy px-4 py-2 rounded-md text-sm font-semibold hover:border-gold transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={downloadCsv}
              disabled={exporting}
              className="bg-navy text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-navy-light transition-colors disabled:opacity-50"
            >
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
            {error}
          </div>
        )}

        {report && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <SummaryCard label="Paid" value={report.summary.paid_sessions} tone="success" />
              <SummaryCard label="Unpaid/expired" value={report.summary.unpaid_sessions} tone="warning" />
              <SummaryCard label="Total sessions" value={report.summary.total_sessions} />
              <SummaryCard
                label="Total paid"
                value={formatPence(report.summary.total_paid_pence)}
                tone="success"
              />
            </div>

            <div className="bg-white border border-gray-100 rounded-lg px-4 py-3 mb-6">
              <p className="text-sm text-navy/60">
                Season: {formatDate(report.season_start)} to {formatDate(report.season_end)}.
                Manual cash or bank payments are not included unless they went through the website Stripe checkout.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
              <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search member, payer, email, membership, Stripe session"
                  className="w-full md:max-w-md px-4 py-2.5 border border-gray-200 rounded-md focus:ring-2 focus:ring-gold focus:border-gold outline-none text-sm"
                />
                <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1">
                  {(["all", "paid", "unpaid"] as FilterMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setFilter(mode)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                        filter === mode ? "bg-navy text-white" : "text-navy/60 hover:text-navy"
                      }`}
                    >
                      {mode === "unpaid" ? "Unpaid/expired" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-navy/60 font-semibold">Member</th>
                      <th className="text-left py-3 px-4 text-navy/60 font-semibold">Payer email</th>
                      <th className="text-left py-3 px-4 text-navy/60 font-semibold">Membership</th>
                      <th className="text-left py-3 px-4 text-navy/60 font-semibold">Amount</th>
                      <th className="text-left py-3 px-4 text-navy/60 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 text-navy/60 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.session_id} className="border-b border-gray-100 hover:bg-gray-50/70">
                        <td className="py-3 px-4 font-medium text-navy">
                          {row.member_name || row.payer_name || "-"}
                        </td>
                        <td className="py-3 px-4 text-navy/70">{row.payer_email || "-"}</td>
                        <td className="py-3 px-4 text-navy">{row.membership_name || row.membership_type || "-"}</td>
                        <td className="py-3 px-4 font-semibold text-navy">
                          {formatPence(row.amount_pence, row.currency)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            row.paid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"
                          }`}>
                            {row.paid ? "Paid" : `${row.checkout_status || "unknown"} / ${row.payment_status || "unknown"}`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-navy/70">{formatDate(row.created_at)}</td>
                      </tr>
                    ))}
                    {filteredRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-navy/40">
                          No memberships match this view.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning";
}) {
  const styles = {
    default: "bg-white border-gray-100 text-navy",
    success: "bg-green-50 border-green-100 text-green-800",
    warning: "bg-amber-50 border-amber-100 text-amber-800",
  };

  return (
    <div className={`rounded-lg border p-4 ${styles[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
