"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Draw {
  id: string;
  draw_number: number;
  status: string;
  drawn_at: string;
  drawn_numbers: number[];
  pot_amount: number;
  prize_pool: number;
  club_share: number;
  platform_fee: number;
  total_entries: number;
}

interface Payout {
  id: string;
  draw_id: string;
  recipient_type: string;
  recipient_profile_id: string | null;
  recipient_connect_id: string | null;
  recipient_name: string | null;
  amount_pence: number;
  status: string;
  winning_number: number | null;
  stripe_transfer_id: string | null;
  error_message: string | null;
  paid_at: string | null;
  manually_paid: boolean;
  manually_paid_at: string | null;
  manually_paid_by: string | null;
  notes: string | null;
}

interface MonthSummary {
  month: string;
  label: string;
  totalPot: number;
  totalPrizes: number;
  totalClub: number;
  totalPlatform: number;
  totalStripeFees: number;
  drawCount: number;
  draws: Array<{
    draw_number: number;
    drawn_at: string;
    pot_amount: number;
    platform_fee: number;
    status: string;
  }>;
}

const ADMIN_EMAILS = ["contact@bluecanvas.ai", "ardmorecc1879@hotmail.com"];

type Tab = "draws" | "monthly";

export default function AdminPayoutsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("draws");
  const [draws, setDraws] = useState<Draw[]>([]);
  const [selectedDraw, setSelectedDraw] = useState<Draw | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [months, setMonths] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payResult, setPayResult] = useState<any>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  const isAdmin = user && ADMIN_EMAILS.includes(user.email?.toLowerCase() || "");

  useEffect(() => {
    if (!isAdmin) return;
    fetchDraws();
    fetchMonthly();
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  };

  const fetchDraws = async () => {
    const { data } = await supabase
      .from("draws")
      .select("*")
      .order("draw_number", { ascending: false })
      .limit(50);
    setDraws(data || []);
    setLoading(false);
  };

  const fetchMonthly = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/payouts/monthly", { headers });
      const data = await res.json();
      setMonths(data.months || []);
    } catch {
      // silent
    }
  };

  const fetchPayouts = useCallback(async (drawId: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/draw/payout?draw_id=${drawId}`, { headers });
    const data = await res.json();
    setPayouts(data.payouts || []);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectDraw = (draw: Draw) => {
    setSelectedDraw(draw);
    setPayResult(null);
    fetchPayouts(draw.id);
  };

  const executePayout = async () => {
    if (!selectedDraw) return;
    if (!confirm(`Execute payouts for Draw #${selectedDraw.draw_number}? This will transfer real money.`)) return;

    setPaying(true);
    setPayResult(null);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/draw/payout", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ draw_id: selectedDraw.id }),
      });
      const data = await res.json();
      setPayResult(data);
      fetchPayouts(selectedDraw.id);
      fetchDraws();
    } catch (err: any) {
      setPayResult({ error: err.message });
    }
    setPaying(false);
  };

  const toggleManuallyPaid = async (payout: Payout) => {
    setMarkingPaid(payout.id);
    try {
      const headers = await getAuthHeaders();
      await fetch("/api/admin/payouts/mark-paid", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          payout_id: payout.id,
          manually_paid: !payout.manually_paid,
        }),
      });
      // Update local state
      setPayouts((prev) =>
        prev.map((p) =>
          p.id === payout.id
            ? {
                ...p,
                manually_paid: !p.manually_paid,
                manually_paid_at: !p.manually_paid ? new Date().toISOString() : null,
                manually_paid_by: !p.manually_paid ? user?.email || "" : null,
              }
            : p
        )
      );
    } catch {
      alert("Failed to update payment status");
    }
    setMarkingPaid(null);
  };

  const downloadCSV = async () => {
    if (!selectedDraw) return;
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/payouts/export?draw_id=${selectedDraw.id}`, { headers });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ardmore-draw-${selectedDraw.draw_number}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <p className="text-navy/60 mb-4">Admin access required</p>
          <a href="/login" className="text-gold font-semibold hover:underline">Sign in →</a>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="text-red-600">You don&apos;t have admin access.</p>
      </div>
    );
  }

  const formatPence = (p: number) => `£${(p / 100).toFixed(2)}`;

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      unclaimed: "bg-orange-100 text-orange-800",
      skipped: "bg-gray-100 text-gray-500",
      pending_payout: "bg-yellow-100 text-yellow-800",
      drawn: "bg-blue-100 text-blue-800",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] || "bg-gray-100 text-gray-600"}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  const recipientLabel = (type: string) => {
    const labels: Record<string, string> = {
      winner_1st: "🥇 1st Prize",
      winner_2nd: "🥈 2nd Prize",
      winner_3rd: "🥉 3rd Prize",
      club: "🏏 Ardmore CC (40%)",
      platform: "💻 Blue Canvas (7.5%)",
    };
    return labels[type] || type;
  };

  const winnerPayouts = payouts.filter((p) => p.recipient_type.startsWith("winner_"));
  const allWinnersPaid = winnerPayouts.length > 0 && winnerPayouts.every((p) => p.manually_paid || p.status === "paid");

  return (
    <section className="py-8 bg-cream min-h-screen">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-3xl font-bold text-navy">Payout Management</h1>
            <p className="text-sm text-navy/50 mt-1">Ardmore Cricket Club Weekly Draw</p>
          </div>
          <Link href="/draw" className="text-sm text-gold font-semibold hover:underline">
            ← Back to Draw
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 shadow-sm w-fit">
          <button
            onClick={() => setTab("draws")}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
              tab === "draws" ? "bg-navy text-white" : "text-navy/60 hover:text-navy"
            }`}
          >
            Draw Payouts
          </button>
          <button
            onClick={() => setTab("monthly")}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
              tab === "monthly" ? "bg-navy text-white" : "text-navy/60 hover:text-navy"
            }`}
          >
            Monthly Summary
          </button>
        </div>

        {tab === "monthly" ? (
          <MonthlySummaryTab months={months} formatPence={formatPence} />
        ) : loading ? (
          <p className="text-navy/50">Loading draws...</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Draw list (left sidebar) */}
            <div className="md:col-span-1">
              <h2 className="font-semibold text-navy mb-3">Draw History</h2>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {draws.map((draw) => (
                  <button
                    key={draw.id}
                    onClick={() => selectDraw(draw)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedDraw?.id === draw.id
                        ? "bg-navy text-white border-navy"
                        : "bg-white border-gray-200 hover:border-gold"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Draw #{draw.draw_number}</span>
                      {statusBadge(draw.status)}
                    </div>
                    <div className={`text-xs mt-1 flex justify-between ${selectedDraw?.id === draw.id ? "text-white/70" : "text-navy/50"}`}>
                      <span>
                        {new Date(draw.drawn_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span className="font-semibold">{formatPence(draw.pot_amount)}</span>
                    </div>
                    <div className={`flex gap-1.5 mt-1.5 ${selectedDraw?.id === draw.id ? "" : ""}`}>
                      {draw.drawn_numbers?.map((n, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                            selectedDraw?.id === draw.id
                              ? "bg-gold text-navy"
                              : "bg-gold/20 text-navy"
                          }`}
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
                {draws.length === 0 && (
                  <p className="text-navy/40 text-sm text-center py-4">No draws yet</p>
                )}
              </div>
            </div>

            {/* Draw detail + payouts (right panel) */}
            <div className="md:col-span-2">
              {selectedDraw ? (
                <>
                  {/* Draw header card */}
                  <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-heading text-xl font-bold text-navy">
                        Draw #{selectedDraw.draw_number}
                      </h2>
                      <div className="flex items-center gap-3">
                        {statusBadge(selectedDraw.status)}
                        <button
                          onClick={downloadCSV}
                          className="text-xs bg-navy/10 hover:bg-navy/20 text-navy px-3 py-1.5 rounded-md font-medium transition-colors"
                          title="Download CSV report"
                        >
                          📥 Export CSV
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-navy/50 mb-4">
                      {new Date(selectedDraw.drawn_at).toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {" · "}
                      {selectedDraw.total_entries} entries
                    </p>

                    {/* Winning numbers */}
                    <div className="flex gap-3 mb-5">
                      {selectedDraw.drawn_numbers.map((n, i) => (
                        <div key={n} className="text-center">
                          <div className="w-14 h-14 rounded-full bg-gold flex items-center justify-center text-navy font-bold text-xl shadow-md">
                            {n}
                          </div>
                          <span className="text-xs text-navy/50 mt-1 block font-medium">
                            {["1st", "2nd", "3rd"][i]}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Financial breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-2">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-navy/50 font-medium uppercase tracking-wide">Total Pot</p>
                        <p className="text-lg font-bold text-navy">{formatPence(selectedDraw.pot_amount)}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-green-600 font-medium uppercase tracking-wide">1st (25%)</p>
                        <p className="text-lg font-bold text-green-800">{formatPence(Math.round(selectedDraw.pot_amount * 0.25))}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-green-600 font-medium uppercase tracking-wide">2nd (15%)</p>
                        <p className="text-lg font-bold text-green-800">{formatPence(Math.round(selectedDraw.pot_amount * 0.15))}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-green-600 font-medium uppercase tracking-wide">3rd (10%)</p>
                        <p className="text-lg font-bold text-green-800">{formatPence(Math.round(selectedDraw.pot_amount * 0.10))}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wide">Club (40%)</p>
                        <p className="text-lg font-bold text-blue-800">{formatPence(selectedDraw.club_share)}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-purple-600 font-medium uppercase tracking-wide">Platform (7.5%)</p>
                        <p className="text-lg font-bold text-purple-800">{formatPence(selectedDraw.platform_fee)}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-navy/30 text-right">
                      Stripe processing: {formatPence(Math.round(selectedDraw.pot_amount * 0.025))} (2.5%)
                    </p>
                  </div>

                  {/* Payout tracking card */}
                  <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-heading text-lg font-semibold text-navy">Payout Tracker</h3>
                      {allWinnersPaid && winnerPayouts.length > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                          ✅ All winners paid
                        </span>
                      )}
                    </div>

                    {payouts.length === 0 ? (
                      <p className="text-navy/50 text-sm">No payout records yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b-2 border-gray-200">
                              <th className="text-left py-2.5 text-navy/60 font-medium">Recipient</th>
                              <th className="text-left py-2.5 text-navy/60 font-medium">Winner</th>
                              <th className="text-center py-2.5 text-navy/60 font-medium">No.</th>
                              <th className="text-right py-2.5 text-navy/60 font-medium">Amount</th>
                              <th className="text-center py-2.5 text-navy/60 font-medium">Status</th>
                              <th className="text-center py-2.5 text-navy/60 font-medium">Paid ✓</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payouts.map((p) => (
                              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                <td className="py-3 font-medium">{recipientLabel(p.recipient_type)}</td>
                                <td className="py-3 text-navy/70">
                                  {p.recipient_name || (p.recipient_type === "club" ? "Ardmore CC" : p.recipient_type === "platform" ? "Blue Canvas" : "—")}
                                </td>
                                <td className="py-3 text-center">
                                  {p.winning_number ? (
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gold/20 text-navy text-xs font-bold">
                                      {p.winning_number}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="py-3 text-right font-bold text-navy">{formatPence(p.amount_pence)}</td>
                                <td className="py-3 text-center">{statusBadge(p.status)}</td>
                                <td className="py-3 text-center">
                                  {p.recipient_type.startsWith("winner_") ? (
                                    <button
                                      onClick={() => toggleManuallyPaid(p)}
                                      disabled={markingPaid === p.id}
                                      className={`w-7 h-7 rounded-md border-2 transition-all flex items-center justify-center mx-auto ${
                                        p.manually_paid
                                          ? "bg-green-500 border-green-500 text-white"
                                          : "border-gray-300 hover:border-green-400"
                                      } ${markingPaid === p.id ? "opacity-50" : ""}`}
                                      title={
                                        p.manually_paid
                                          ? `Marked paid${p.manually_paid_at ? ` on ${new Date(p.manually_paid_at).toLocaleDateString("en-GB")}` : ""}`
                                          : "Mark as paid"
                                      }
                                    >
                                      {p.manually_paid ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      ) : null}
                                    </button>
                                  ) : p.recipient_type === "platform" ? (
                                    <span className="text-[10px] text-navy/30">invoiced</span>
                                  ) : (
                                    <span className="text-[10px] text-navy/30">auto</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Notes for treasurer */}
                    {winnerPayouts.length > 0 && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-800">
                          <strong>📋 Treasurer note:</strong> Use the checkboxes above to track which winners you&apos;ve paid.
                          Platform fee ({formatPence(selectedDraw.platform_fee)}) is invoiced monthly to Ardmore by Blue Canvas.
                          Stripe processing ({formatPence(Math.round(selectedDraw.pot_amount * 0.025))}) is deducted automatically.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Execute Stripe Payout button */}
                  {(selectedDraw.status === "pending_payout" || selectedDraw.status === "drawn") && (
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
                      <h3 className="font-heading text-lg font-semibold text-navy mb-3">Stripe Transfers</h3>
                      <button
                        onClick={executePayout}
                        disabled={paying}
                        className="w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-lg"
                      >
                        {paying ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                            Processing...
                          </span>
                        ) : (
                          "💰 Execute Stripe Transfers"
                        )}
                      </button>
                      <p className="text-xs text-navy/40 mt-2 text-center">
                        Transfers to connected Stripe accounts. Winners without Stripe will be marked unclaimed.
                      </p>
                    </div>
                  )}

                  {/* Pay result toast */}
                  {payResult && (
                    <div className={`p-4 rounded-xl ${payResult.error ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
                      {payResult.error ? (
                        <p className="text-red-700">{payResult.error}</p>
                      ) : (
                        <div>
                          <p className="text-green-800 font-semibold mb-2">✅ Payouts processed</p>
                          <div className="flex gap-4 text-sm">
                            <span className="text-green-700">Paid: {payResult.summary?.paid || 0}</span>
                            <span className="text-orange-600">Unclaimed: {payResult.summary?.unclaimed || 0}</span>
                            <span className="text-red-600">Failed: {payResult.summary?.failed || 0}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <div className="text-4xl mb-3">🏏</div>
                  <p className="text-navy/50 font-medium">Select a draw to view payout details</p>
                  <p className="text-navy/30 text-sm mt-1">Choose from the draw history on the left</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Monthly Summary Tab ─── */
function MonthlySummaryTab({
  months,
  formatPence,
}: {
  months: MonthSummary[];
  formatPence: (p: number) => string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (months.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <p className="text-navy/50">No draw data yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-6 mb-2">
        <h2 className="font-heading text-xl font-bold text-navy mb-1">Monthly Platform Fee Summary</h2>
        <p className="text-sm text-navy/50">
          Blue Canvas invoices Ardmore CC 7.5% of each draw pot as a monthly platform fee.
        </p>
      </div>

      {months.map((m) => (
        <div key={m.month} className="bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === m.month ? null : m.month)}
            className="w-full text-left p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div>
              <h3 className="font-heading text-lg font-bold text-navy">{m.label}</h3>
              <p className="text-sm text-navy/50">{m.drawCount} draw{m.drawCount !== 1 ? "s" : ""}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-navy/40">Total Pot</p>
                  <p className="font-bold text-navy">{formatPence(m.totalPot)}</p>
                </div>
                <div className="border-l border-gray-200 pl-4">
                  <p className="text-xs text-purple-600 font-medium">Platform Fee Due</p>
                  <p className="text-xl font-bold text-purple-700">{formatPence(m.totalPlatform)}</p>
                </div>
              </div>
            </div>
          </button>

          {expanded === m.month && (
            <div className="border-t border-gray-100 p-5">
              {/* Summary row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-navy/50 font-medium uppercase">Total Pot</p>
                  <p className="text-lg font-bold text-navy">{formatPence(m.totalPot)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-green-600 font-medium uppercase">Winners</p>
                  <p className="text-lg font-bold text-green-800">{formatPence(m.totalPrizes)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-blue-600 font-medium uppercase">Club</p>
                  <p className="text-lg font-bold text-blue-800">{formatPence(m.totalClub)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-purple-600 font-medium uppercase">Platform</p>
                  <p className="text-lg font-bold text-purple-800">{formatPence(m.totalPlatform)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-navy/50 font-medium uppercase">Stripe Fees</p>
                  <p className="text-lg font-bold text-navy/60">{formatPence(m.totalStripeFees)}</p>
                </div>
              </div>

              {/* Individual draws */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-navy/60 font-medium">Draw</th>
                    <th className="text-left py-2 text-navy/60 font-medium">Date</th>
                    <th className="text-right py-2 text-navy/60 font-medium">Pot</th>
                    <th className="text-right py-2 text-navy/60 font-medium">Platform Fee</th>
                    <th className="text-center py-2 text-navy/60 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {m.draws.map((d) => (
                    <tr key={d.draw_number} className="border-b border-gray-50">
                      <td className="py-2 font-semibold">#{d.draw_number}</td>
                      <td className="py-2 text-navy/60">
                        {new Date(d.drawn_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </td>
                      <td className="py-2 text-right">{formatPence(d.pot_amount)}</td>
                      <td className="py-2 text-right font-semibold text-purple-700">{formatPence(d.platform_fee)}</td>
                      <td className="py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          d.status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {d.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td colSpan={2} className="py-3 font-bold text-navy">Total</td>
                    <td className="py-3 text-right font-bold">{formatPence(m.totalPot)}</td>
                    <td className="py-3 text-right font-bold text-purple-700">{formatPence(m.totalPlatform)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>

              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-xs text-purple-800">
                  <strong>Invoice note:</strong> Blue Canvas will invoice Ardmore CC for{" "}
                  <strong>{formatPence(m.totalPlatform)}</strong> for {m.label} platform fees ({m.drawCount} draws).
                </p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
