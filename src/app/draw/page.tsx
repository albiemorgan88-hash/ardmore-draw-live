"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";

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
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

// Mock data
const takenNumbers = new Set([3, 7, 12, 23, 42, 55, 77, 88, 100, 123, 150, 175, 200, 234, 256, 300, 333, 350, 400, 420, 444, 456, 475, 490, 500]);

const previousResults = [
  { date: "21 Feb 2026", first: 234, second: 77, third: 456, pot: "£420" },
  { date: "14 Feb 2026", first: 100, second: 333, third: 12, pot: "£385" },
  { date: "7 Feb 2026", first: 42, second: 175, third: 490, pot: "£410" },
];

export default function DrawPage() {
  const nextDraw = useMemo(() => getNextFriday7PM(), []);
  const countdown = useCountdown(nextDraw);
  const [selectedNumbers, setSelectedNumbers] = useState<Set<number>>(new Set());
  const [gridPage, setGridPage] = useState(0);
  const numbersPerPage = 100;
  const totalPages = 5;

  const toggleNumber = (n: number) => {
    if (takenNumbers.has(n)) return;
    setSelectedNumbers(prev => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const pageStart = gridPage * numbersPerPage + 1;
  const pageEnd = pageStart + numbersPerPage - 1;

  return (
    <>
      {/* Hero */}
      <section className="relative py-16 sm:py-20">
        <Image src="/images/ground-3.jpg" alt="The Bleach Green" fill className="object-cover" />
        <div className="absolute inset-0 bg-navy-dark/85" />
        <div className="relative max-w-4xl mx-auto px-4 text-center text-white">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-3">Weekly Draw</h1>
          <p className="text-xl text-gray-300 mb-8">Pick your numbers. Support your club. Win prizes.</p>
          
          {/* Countdown */}
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
            <p className="font-heading text-4xl font-bold">£450</p>
          </div>
          <div className="flex gap-8 text-center">
            <div>
              <p className="text-sm text-gray-400">1st Prize (25%)</p>
              <p className="font-heading text-xl font-bold text-gold">£112.50</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">2nd Prize (15%)</p>
              <p className="font-heading text-xl font-bold text-gold">£67.50</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">3rd Prize (10%)</p>
              <p className="font-heading text-xl font-bold text-gold">£45.00</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 bg-cream">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-heading text-2xl font-bold text-navy text-center mb-8">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Pick Numbers", desc: "Choose from 500 available numbers" },
              { step: "2", title: "Pay £1 Each", desc: "Per number, per week" },
              { step: "3", title: "Friday 7PM Draw", desc: "3 winning numbers drawn" },
              { step: "4", title: "Win Prizes!", desc: "50% of the pot goes to winners" },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-gold text-navy font-bold text-lg flex items-center justify-center mx-auto mb-3">{s.step}</div>
                <h3 className="font-semibold text-navy mb-1">{s.title}</h3>
                <p className="text-sm text-navy/60">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Number Grid */}
      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
            <h2 className="font-heading text-2xl font-bold text-navy">Pick Your Numbers</h2>
            {selectedNumbers.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-navy/70 text-sm">{selectedNumbers.size} selected · £{selectedNumbers.size}.00/week</span>
                <button className="bg-gold text-navy font-semibold px-6 py-2 rounded-md hover:bg-gold-light transition-colors">
                  Checkout
                </button>
              </div>
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
          <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
            {Array.from({ length: numbersPerPage }, (_, i) => {
              const num = pageStart + i;
              const taken = takenNumbers.has(num);
              const selected = selectedNumbers.has(num);
              return (
                <button
                  key={num}
                  onClick={() => toggleNumber(num)}
                  disabled={taken}
                  className={`aspect-square rounded text-xs sm:text-sm font-medium transition-all ${
                    taken
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : selected
                      ? "bg-gold text-navy ring-2 ring-gold-light scale-105"
                      : "bg-sky/20 text-navy hover:bg-sky/40 cursor-pointer"
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-6 mt-4 text-sm text-navy/60 justify-center">
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-sky/20" /> Available</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-gold" /> Selected</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-gray-200" /> Taken</div>
          </div>

          {/* Selected summary */}
          {selectedNumbers.size > 0 && (
            <div className="mt-6 bg-cream rounded-lg p-4">
              <h3 className="font-semibold text-navy mb-2">Your Numbers</h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedNumbers).sort((a, b) => a - b).map(n => (
                  <span key={n} className="bg-gold text-navy text-sm font-semibold px-3 py-1 rounded-full">{n}</span>
                ))}
              </div>
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-navy font-medium">Total: £{selectedNumbers.size}.00 per week</p>
                <button className="bg-navy text-white font-semibold px-8 py-3 rounded-md hover:bg-navy-light transition-colors w-full sm:w-auto">
                  Continue to Checkout
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
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-xs text-navy/50 mb-1">1st</p>
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold text-navy font-bold text-lg">{r.first}</span>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-navy/50 mb-1">2nd</p>
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sky text-navy font-bold text-lg">{r.second}</span>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-navy/50 mb-1">3rd</p>
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-navy-light text-white font-bold text-lg">{r.third}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
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
