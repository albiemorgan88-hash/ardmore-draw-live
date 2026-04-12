"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

const CLUB_ID = "31846fb2-b120-4815-bd48-e1120342d52e";

interface PotData {
  totalPence: number;
  totalPounds: string;
  totalNumbers: number;
  first: string;
  second: string;
  third: string;
  members: number;
  progress: number;
}

function getNextFriday7PM(): Date {
  const now = new Date();
  const day = now.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + (day === 5 && now.getHours() < 19 ? 0 : daysUntilFriday));
  next.setHours(19, 0, 0, 0);
  return next;
}

function useCountdown(target: Date) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target.getTime() - now.getTime());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

export default function DrawPageClient({ initialPotData }: { initialPotData: PotData }) {
  const nextDraw = useMemo(() => getNextFriday7PM(), []);
  const countdown = useCountdown(nextDraw);
  const { user } = useAuth();

  const [selectedNumbers, setSelectedNumbers] = useState<Map<number, string>>(new Map());
  const [takenNumbers, setTakenNumbers] = useState<Set<number>>(new Set());
  const [gridPage, setGridPage] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"subscription" | "one-off">("subscription");
  const [showOneOffOption, setShowOneOffOption] = useState(false);

  // Use server-rendered pot data as initial state
  const [potData, setPotData] = useState<PotData>(initialPotData);

  const numbersPerPage = 100;
  const totalPages = 5;
  const pageStart = gridPage * numbersPerPage + 1;

  // Fetch taken numbers from draw_subscriptions (paid only)
  useEffect(() => {
    const fetchTaken = async () => {
      const { data: subs } = await supabase
        .from("draw_subscriptions")
        .select("numbers")
        .eq("club_id", CLUB_ID)
        .in("status", ["active", "past_due"]);

      const taken = new Set<number>();
      if (subs) {
        subs.forEach((row: { numbers: number[] }) => {
          if (row.numbers) row.numbers.forEach((n) => taken.add(n));
        });
      }

      // Clear any stale optimistic data
      localStorage.removeItem("optimistic_purchased");
      setTakenNumbers(taken);
    };
    fetchTaken();
  }, []);

  // Optionally refresh pot data client-side (for real-time updates)
  useEffect(() => {
    fetch("/api/pot")
      .then((r) => r.json())
      .then((data) => setPotData(data))
      .catch(() => {});
  }, []);

  const potPounds = potData.totalPounds;
  const totalSold = potData.totalNumbers;

  const toggleNumber = (n: number) => {
    if (takenNumbers.has(n)) return;
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setSelectedNumbers((prev) => {
      const next = new Map(prev);
      if (next.has(n)) next.delete(n);
      else next.set(n, "");
      return next;
    });
  };

  const setName = (n: number, name: string) => {
    setSelectedNumbers((prev) => {
      const next = new Map(prev);
      next.set(n, name);
      return next;
    });
  };

  const handleCheckout = useCallback(async () => {
    if (!user || selectedNumbers.size === 0) return;
    setCheckoutLoading(true);

    const nums = Array.from(selectedNumbers.keys());
    const names = Object.fromEntries(selectedNumbers.entries());

    localStorage.setItem("purchased_numbers", JSON.stringify(nums));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          numbers: nums,
          names,
          paymentMode,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Checkout failed");
        setCheckoutLoading(false);
      }
    } catch {
      alert("Something went wrong");
      setCheckoutLoading(false);
    }
  }, [user, selectedNumbers, paymentMode]);

  const [drawResults, setDrawResults] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/draw/results")
      .then((r) => r.json())
      .then((data) => {
        if (data.results) setDrawResults(data.results);
      })
      .catch(() => {});
  }, []);

  const previousResults = drawResults.length > 0
    ? drawResults.map((d: any) => {
        const w = d.winners || [];
        const getWinner = (place: string) => w.find((x: any) => x.place === place);
        const w1 = getWinner("1st");
        const w2 = getWinner("2nd");
        const w3 = getWinner("3rd");
        return {
          date: new Date(d.drawn_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          first: d.drawn_numbers?.[0] ?? "?",
          second: d.drawn_numbers?.[1] ?? "?",
          third: d.drawn_numbers?.[2] ?? "?",
          firstName: w1?.name || "",
          secondName: w2?.name || "",
          thirdName: w3?.name || "",
          firstPrize: w1 ? "£" + (w1.prize / 100).toFixed(2) : "",
          secondPrize: w2 ? "£" + (w2.prize / 100).toFixed(2) : "",
          thirdPrize: w3 ? "£" + (w3.prize / 100).toFixed(2) : "",
          pot: "£" + (d.pot_amount / 100).toFixed(2),
        };
      })
    : [
        { date: "Coming soon", first: "?", second: "?", third: "?", firstName: "", secondName: "", thirdName: "", firstPrize: "", secondPrize: "", thirdPrize: "", pot: "TBD" },
      ];

  return (
    <>
      {/* Hero */}
      <section className="relative py-16 sm:py-20">
        <Image src="/images/ground-3.jpg" alt="The Bleach Green" fill className="object-cover" />
        <div className="absolute inset-0 bg-navy-dark/85" />
        <div className="relative max-w-4xl mx-auto px-4 text-center text-white">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-3">Weekly Draw</h1>
          <p className="text-xl text-gray-300 mb-8">Pick your numbers. Support your club. Win prizes.</p>
          <div className="flex justify-center gap-4 sm:gap-6 mb-8">
            <CountdownUnit value={countdown.days} label="Days" />
            <CountdownUnit value={countdown.hours} label="Hours" />
            <CountdownUnit value={countdown.minutes} label="Mins" />
            <CountdownUnit value={countdown.seconds} label="Secs" />
          </div>
          <p className="text-gold text-sm">Next draw: Friday at 7:00 PM</p>
        </div>
      </section>

      {/* Current Pot */}
      <section className="bg-navy text-white py-8">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-gold text-sm uppercase tracking-wider font-medium">Current Pot</p>
            {totalSold > 0 ? (
              <>
                <p className="font-heading text-4xl font-bold">£{potPounds}</p>
                <p className="text-sm text-gray-400">{totalSold} numbers sold this week</p>
              </>
            ) : (
              <>
                <p className="font-heading text-3xl font-bold">Building...</p>
                <p className="text-sm text-gray-400">Be the first to pick this week!</p>
              </>
            )}
          </div>
          <div className="flex gap-8 text-center">
            <div>
              <p className="text-sm text-gray-400">1st Prize (25%)</p>
              <p className="font-heading text-xl font-bold text-gold">£{potData.first}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">2nd Prize (15%)</p>
              <p className="font-heading text-xl font-bold text-gold">£{potData.second}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">3rd Prize (10%)</p>
              <p className="font-heading text-xl font-bold text-gold">£{potData.third}</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 bg-cream">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-heading text-2xl font-bold text-navy text-center mb-4">How It Works</h2>
          <p className="text-navy/60 max-w-2xl mx-auto mb-8 text-left sm:text-center">Every Friday at 7PM, we draw 3 winning numbers from 500. Pick yours for just £1 each — 50% of the pot goes to winners, and 50% goes straight to the club.</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Pick Numbers", desc: "Choose from 500 available numbers" },
              { step: "2", title: "Pay £1 Each", desc: "Per number, per week" },
              { step: "3", title: "Friday 7PM Draw", desc: "3 winning numbers drawn" },
              { step: "4", title: "Win Prizes!", desc: "50% of the pot goes to winners" },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-gold text-navy font-bold text-lg flex items-center justify-center mx-auto mb-3">{s.step}</div>
                <h3 className="font-semibold text-navy mb-1">{s.title}</h3>
                <p className="text-sm text-navy/60">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prize Breakdown */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-heading text-xl font-bold text-navy text-center mb-4">Where Your Money Goes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
            <div className="bg-gold/10 rounded-lg p-3"><p className="font-bold text-navy text-lg">25%</p><p className="text-navy/60">1st Prize</p></div>
            <div className="bg-gold/10 rounded-lg p-3"><p className="font-bold text-navy text-lg">15%</p><p className="text-navy/60">2nd Prize</p></div>
            <div className="bg-gold/10 rounded-lg p-3"><p className="font-bold text-navy text-lg">10%</p><p className="text-navy/60">3rd Prize</p></div>
            <div className="bg-green-50 rounded-lg p-3"><p className="font-bold text-green-700 text-lg">50%</p><p className="text-green-600/70">Club Funds</p></div>
          </div>
        </div>
      </section>

      {/* Number Grid */}
      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
            <h2 className="font-heading text-2xl font-bold text-navy">Pick Your Numbers</h2>
            {!user && (
              <a href="/login" className="bg-gold text-navy font-semibold px-6 py-2.5 rounded-md hover:bg-gold-light transition-colors text-sm">
                Sign In to Pick Numbers
              </a>
            )}
          </div>

          {/* Page Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setGridPage(i)}
                className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  gridPage === i ? "bg-navy text-white" : "bg-gray-100 text-navy/70 hover:bg-gray-200"
                }`}
              >
                {i * numbersPerPage + 1}–{(i + 1) * numbersPerPage}
              </button>
            ))}
          </div>

          {/* Grid */}
          {!user && (
            <div className="bg-navy/5 border-2 border-dashed border-navy/20 rounded-xl p-8 text-center mb-6">
              <p className="text-2xl mb-2">🏏</p>
              <p className="font-heading text-xl font-bold text-navy mb-2">Ready to pick your numbers?</p>
              <p className="text-navy/60 text-sm mb-4">Sign in or create an account — takes 30 seconds</p>
              <a href="/login" className="inline-block bg-gold text-navy font-bold px-8 py-3 rounded-md hover:bg-gold-light transition-colors">
                Sign In to Play
              </a>
              <p className="text-xs text-navy/40 mt-3">Don&apos;t have an account? <a href="/signup" className="text-gold font-semibold hover:underline">Sign up free</a></p>
            </div>
          )}
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-1.5">
            {Array.from({ length: numbersPerPage }, (_, i) => {
              const num = pageStart + i;
              const taken = takenNumbers.has(num);
              const selected = selectedNumbers.has(num);
              return (
                <button
                  key={num}
                  onClick={() => toggleNumber(num)}
                  disabled={taken}
                  title={taken ? "Taken" : "Available"}
                  className={`aspect-square rounded text-sm sm:text-sm font-medium transition-all min-h-[44px] ${
                    taken
                      ? "bg-pink-100 text-pink-400 cursor-not-allowed"
                      : selected
                      ? "bg-gold text-navy ring-2 ring-gold-light scale-105"
                      : "bg-white text-navy border border-gray-200 hover:bg-gray-50 cursor-pointer"
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 sm:gap-6 mt-4 text-sm text-navy/60 justify-center">
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-white border border-gray-200" /> Available</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-pink-100" /> Taken</div>
          </div>

          {/* Selected summary with name inputs */}
          {selectedNumbers.size > 0 && (
            <div className="mt-6 bg-cream rounded-lg p-4">
              <h3 className="font-semibold text-navy mb-4">Your Numbers</h3>
              <div className="space-y-3">
                {Array.from(selectedNumbers.entries())
                  .sort(([a], [b]) => a - b)
                  .map(([num, name]) => (
                    <div key={num} className="flex items-center gap-3">
                      <span className="bg-gold text-navy text-sm font-bold w-12 h-8 rounded-full flex items-center justify-center shrink-0">
                        {num}
                      </span>
                      <input
                        type="text"
                        placeholder="Name (optional, e.g. 'Christopher')"
                        value={name}
                        onChange={(e) => setName(num, e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-gold focus:border-gold outline-none"
                      />
                      <button
                        onClick={() => toggleNumber(num)}
                        className="text-red-400 hover:text-red-600 text-lg"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>

              {/* Payment Mode Toggle */}
              <div className="mt-5 pt-4 border-t border-navy/10">
                <div className="space-y-3 mb-4">
                  <button
                    onClick={() => setPaymentMode("subscription")}
                    className={`w-full rounded-2xl border-2 text-left transition-all ${
                      paymentMode === "subscription"
                        ? "border-gold bg-gradient-to-br from-gold/20 via-white to-gold/10 shadow-lg shadow-gold/10"
                        : "border-gold/40 bg-gold/5 hover:border-gold hover:bg-gold/10"
                    }`}
                  >
                    <div className="p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            paymentMode === "subscription" ? "border-gold" : "border-gold/50"
                          }`}>
                            {paymentMode === "subscription" && <div className="w-2.5 h-2.5 rounded-full bg-gold" />}
                          </div>
                          <div>
                            <div className="inline-flex items-center rounded-full bg-navy text-white text-[11px] font-bold px-2.5 py-1 mb-2 tracking-wide">BEST VALUE</div>
                            <p className="font-bold text-navy text-lg sm:text-xl">Subscribe weekly</p>
                            <p className="text-sm text-navy/70 mt-1">Keep your numbers live every Friday without having to come back and re-enter.</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl sm:text-2xl font-bold text-navy">£{selectedNumbers.size}.00<span className="text-sm font-medium text-navy/60">/week</span></p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2 text-sm text-navy/75">
                        <div className="rounded-xl bg-white/80 border border-gold/20 px-3 py-2">✓ Auto-enters every weekly draw</div>
                        <div className="rounded-xl bg-white/80 border border-gold/20 px-3 py-2">✓ Keep the same lucky numbers</div>
                      </div>

                      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="text-sm text-green-700 font-medium">Set it and forget it — cancel anytime.</p>
                        <span className="inline-flex items-center justify-center rounded-full bg-navy text-white px-4 py-2 text-sm font-semibold">Recommended for regular supporters</span>
                      </div>
                    </div>
                  </button>

                  <div className="rounded-xl border border-dashed border-navy/15 bg-white/60">
                    <button
                      type="button"
                      onClick={() => {
                        setShowOneOffOption((prev) => !prev);
                        setPaymentMode("one-off");
                      }}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm text-navy/65 hover:text-navy transition-colors"
                    >
                      <span>Or buy a one-off entry for this week only</span>
                      <span className="text-xs font-semibold text-navy/40">{showOneOffOption || paymentMode === "one-off" ? "Hide" : "Show"}</span>
                    </button>

                    {(showOneOffOption || paymentMode === "one-off") && (
                      <button
                        onClick={() => setPaymentMode("one-off")}
                        className={`m-3 mt-0 w-[calc(100%-1.5rem)] px-4 py-3 rounded-lg border text-left transition-all ${
                          paymentMode === "one-off"
                            ? "border-gold bg-gold/10"
                            : "border-gray-200 bg-white/80 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            paymentMode === "one-off" ? "border-gold" : "border-gray-300"
                          }`}>
                            {paymentMode === "one-off" && <div className="w-2 h-2 rounded-full bg-gold" />}
                          </div>
                          <div>
                            <p className="font-semibold text-navy text-sm">Pay once</p>
                            <p className="text-xs text-navy/50">£{selectedNumbers.size}.00 · This week only</p>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-navy font-medium">
                  Total: £{selectedNumbers.size}.00{paymentMode === "subscription" ? "/week" : ""}
                </p>
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="bg-navy text-white font-semibold px-8 py-3 rounded-md hover:bg-navy-light transition-colors w-full sm:w-auto disabled:opacity-50"
                >
                  {checkoutLoading
                    ? "Redirecting to Stripe..."
                    : paymentMode === "subscription"
                    ? `Subscribe — £${selectedNumbers.size}.00/week`
                    : `Pay £${selectedNumbers.size}.00`}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Previous Results */}
      <section className="py-12 bg-cream">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-heading text-2xl font-bold text-navy text-center mb-8">Previous Results</h2>
          <div className="space-y-4">
            {previousResults.map((r, i) => (
              <div key={i} className="bg-white rounded-lg p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-navy/60 text-sm">{r.date}</p>
                  <p className="text-navy/60 text-sm">Pot: {r.pot}</p>
                </div>
                <div className="flex gap-4 sm:gap-6">
                  <div className="text-center">
                    <p className="text-xs text-navy/50 mb-1">🏆 1st</p>
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold text-navy font-bold text-lg">{r.first}</span>
                    {r.firstName && <p className="text-xs text-navy font-semibold mt-1 max-w-[80px] truncate">{r.firstName}</p>}
                    {r.firstPrize && <p className="text-xs text-navy/60">{r.firstPrize}</p>}
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-navy/50 mb-1">🥈 2nd</p>
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sky text-navy font-bold text-lg">{r.second}</span>
                    {r.secondName && <p className="text-xs text-navy font-semibold mt-1 max-w-[80px] truncate">{r.secondName}</p>}
                    {r.secondPrize && <p className="text-xs text-navy/60">{r.secondPrize}</p>}
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-navy/50 mb-1">🥉 3rd</p>
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-navy-light text-white font-bold text-lg">{r.third}</span>
                    {r.thirdName && <p className="text-xs text-navy font-semibold mt-1 max-w-[80px] truncate">{r.thirdName}</p>}
                    {r.thirdPrize && <p className="text-xs text-navy/60">{r.thirdPrize}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection />
    </>
  );
}

const faqItems = [
  {
    q: "What is the Weekly Draw?",
    a: "A weekly numbers draw to raise funds for Ardmore Cricket Club. Pick your lucky numbers for just £1 each — 50% of the pot goes to 3 lucky winners, and 50% goes directly to supporting the club.",
  },
  {
    q: "How does it work?",
    a: "Pick numbers from 1–500, pay £1 per number per week. Every Friday at 7PM, 3 winning numbers are drawn using a provably fair system. Winners are notified by email.",
  },
  {
    q: "How are winners chosen?",
    a: "We use a cryptographically secure random number generator (SHA-256) to ensure every draw is provably fair and transparent.",
  },
  {
    q: "How do I get paid if I win?",
    a: "Winners are contacted by email after each draw. Prizes are paid out by the club committee directly.",
  },
  {
    q: "Can I subscribe weekly?",
    a: "Yes! Choose \"Subscribe weekly\" at checkout and your numbers will automatically enter every Friday's draw. You can cancel anytime.",
  },
  {
    q: "What happens to the club's 50%?",
    a: "Every penny goes directly to Ardmore Cricket Club — ground maintenance, equipment, youth development, and running costs.",
  },
  {
    q: "Is it legal?",
    a: "Yes. This is a small society lottery registered with Derry City & Strabane District Council, run in accordance with the Gambling Act 2005 and Betting, Gaming, Lotteries and Amusements (NI) Order 1985.",
  },
];

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-12 bg-white">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="font-heading text-2xl font-bold text-navy text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqItems.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i} className="border border-navy/10 rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left bg-navy/[0.02] hover:bg-navy/[0.05] transition-colors"
                >
                  <span className="font-semibold text-navy pr-4">{item.q}</span>
                  <svg
                    className={`w-5 h-5 text-gold shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  className="overflow-hidden transition-all duration-200 ease-out"
                  style={{ maxHeight: isOpen ? "200px" : "0px", opacity: isOpen ? 1 : 0 }}
                >
                  <div className="px-5 pb-4 pt-1 text-navy/70 text-sm leading-relaxed">
                    {item.a}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="bg-white/10 backdrop-blur rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border border-white/20">
        <span className="font-heading text-2xl sm:text-3xl font-bold">{String(value).padStart(2, "0")}</span>
      </div>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}
