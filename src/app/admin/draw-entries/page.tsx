"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin";

type DrawEntryNumberRow = {
  number: number;
  assigned_name: string;
  owner_name: string;
  owner_email: string;
  entry_type: "subscription" | "one_off";
  selection_status: string;
  selection_id: string;
  profile_id: string;
  stripe_reference: string;
  selection_created_at: string;
  selection_updated_at: string;
  duplicate_count: number;
};

type DrawEntryReport = {
  generated_at: string;
  summary: {
    active_selections: number;
    active_numbers: number;
    unique_numbers: number;
    duplicate_numbers: number[];
    subscription_numbers: number;
    one_off_numbers: number;
  };
  number_rows: DrawEntryNumberRow[];
};

type FilterMode = "all" | "duplicates" | "subscription" | "one_off";

export default function AdminDrawEntriesPage() {
  const { user, loading: authLoading } = useAuth();
  const [report, setReport] = useState<DrawEntryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [exporting, setExporting] = useState(false);

  const isAdmin = isAdminEmail(user?.email);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  };

  const fetchEntries = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    setError("");
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/draw-entries", { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load draw entries");
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load draw entries");
    }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }
    fetchEntries();
  }, [authLoading, fetchEntries, isAdmin, user]);

  const filteredRows = useMemo(() => {
    const rows = report?.number_rows || [];
    const normalisedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "duplicates" && row.duplicate_count > 1) ||
        row.entry_type === filter;

      if (!matchesFilter) return false;
      if (!normalisedQuery) return true;

      return [
        row.number,
        row.assigned_name,
        row.owner_name,
        row.owner_email,
        row.stripe_reference,
      ].some((value) => String(value).toLowerCase().includes(normalisedQuery));
    });
  }, [filter, query, report]);

  const downloadCsv = async () => {
    setExporting(true);
    setError("");

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/draw-entries/export", { headers });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to export draw entries");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `ardmore-active-draw-list-${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export draw entries");
    }

    setExporting(false);
  };

  if (authLoading || loading) {
    return (
      <section className="min-h-screen bg-cream px-4 py-12">
        <div className="max-w-6xl mx-auto text-navy/50">Loading draw entries...</div>
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
            <h1 className="font-heading text-3xl font-bold text-navy">Draw Entries</h1>
            <p className="text-sm text-navy/50 mt-1">Ardmore Cricket Club Weekly Draw</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin" className="text-sm text-gold font-semibold hover:underline self-center">
              Admin
            </Link>
            <Link href="/admin/memberships" className="text-sm text-gold font-semibold hover:underline self-center">
              Memberships
            </Link>
            <Link href="/admin/payouts" className="text-sm text-gold font-semibold hover:underline self-center">
              Payouts
            </Link>
            <button
              onClick={fetchEntries}
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
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
              <SummaryCard label="Selections" value={report.summary.active_selections} />
              <SummaryCard label="Numbers" value={report.summary.active_numbers} />
              <SummaryCard label="Unique" value={report.summary.unique_numbers} />
              <SummaryCard label="Duplicates" value={report.summary.duplicate_numbers.length} tone={report.summary.duplicate_numbers.length ? "warning" : "default"} />
              <SummaryCard label="Subscriptions" value={report.summary.subscription_numbers} />
              <SummaryCard label="One-off" value={report.summary.one_off_numbers} />
            </div>

            {report.summary.duplicate_numbers.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
                <p className="text-sm text-amber-800">
                  Duplicate number: {report.summary.duplicate_numbers.join(", ")}. Shared winners are split by the draw payout logic.
                </p>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
              <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search number, name, email, Stripe ref"
                  className="w-full md:max-w-md px-4 py-2.5 border border-gray-200 rounded-md focus:ring-2 focus:ring-gold focus:border-gold outline-none text-sm"
                />
                <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1">
                  {(["all", "duplicates", "subscription", "one_off"] as FilterMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setFilter(mode)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                        filter === mode ? "bg-navy text-white" : "text-navy/60 hover:text-navy"
                      }`}
                    >
                      {mode === "one_off" ? "One-off" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-navy/60 font-semibold">Number</th>
                      <th className="text-left py-3 px-4 text-navy/60 font-semibold">Assigned</th>
                      <th className="text-left py-3 px-4 text-navy/60 font-semibold">Owner</th>
                      <th className="text-left py-3 px-4 text-navy/60 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 text-navy/60 font-semibold">Type</th>
                      <th className="text-left py-3 px-4 text-navy/60 font-semibold">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={`${row.selection_id}-${row.number}`} className="border-b border-gray-100 hover:bg-gray-50/70">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center justify-center min-w-10 h-9 rounded-full text-sm font-bold ${
                            row.duplicate_count > 1 ? "bg-amber-100 text-amber-800" : "bg-gold/20 text-navy"
                          }`}>
                            {row.number}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-navy">{row.assigned_name || "-"}</td>
                        <td className="py-3 px-4 font-medium text-navy">{row.owner_name || "-"}</td>
                        <td className="py-3 px-4 text-navy/70">{row.owner_email || "-"}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            row.entry_type === "subscription" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {row.entry_type === "subscription" ? "Subscription" : "One-off"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-navy/50">
                          {row.selection_updated_at
                            ? new Date(row.selection_updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredRows.length === 0 && (
                <p className="text-center text-navy/40 py-8 text-sm">No entries match the current filters.</p>
              )}
            </div>

            <p className="text-xs text-navy/40">
              Last loaded: {new Date(report.generated_at).toLocaleString("en-GB")}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function SummaryCard({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warning" }) {
  return (
    <div className={`rounded-lg p-4 border ${
      tone === "warning" ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100"
    }`}>
      <p className="text-[10px] uppercase font-semibold tracking-wide text-navy/50">{label}</p>
      <p className="text-2xl font-bold text-navy mt-1">{value}</p>
    </div>
  );
}
