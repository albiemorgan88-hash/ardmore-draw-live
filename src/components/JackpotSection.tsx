"use client";

import { useEffect, useState } from "react";

interface PotData {
  totalPounds: string;
  first: string;
  second: string;
  third: string;
  progress: number;
  members: number;
  totalNumbers: number;
  targetPounds: string;
}

export default function JackpotSection() {
  const [pot, setPot] = useState<PotData | null>(null);

  useEffect(() => {
    fetch("/api/pot")
      .then((r) => r.json())
      .then(setPot)
      .catch(() => {});
  }, []);

  const total = pot ? `£${parseFloat(pot.totalPounds).toFixed(0)}` : "£...";
  const first = pot ? `£${parseFloat(pot.first).toFixed(0)}` : "...";
  const second = pot ? `£${parseFloat(pot.second).toFixed(0)}` : "...";
  const third = pot ? `£${parseFloat(pot.third).toFixed(0)}` : "...";
  const progress = pot?.progress ?? 0;
  const members = pot?.members ?? 0;

  return (
    <div className="relative max-w-4xl mx-auto px-4 text-center text-white">
      <p className="text-gold text-sm uppercase tracking-wider font-semibold mb-2">
        This Week&apos;s Jackpot
      </p>
      <p className="font-heading text-5xl sm:text-6xl font-bold mb-2">{total}</p>
      <p className="text-gray-400 text-sm mb-4">
        Growing every week · {members} member{members !== 1 ? "s" : ""} and counting
      </p>

      {/* Progress bar to target */}
      <div className="max-w-xs mx-auto mb-6">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Current pot</span>
          <span>Target: £500</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold to-gold-light rounded-full transition-all duration-1000"
            style={{ width: `${Math.max(2, progress)}%` }}
          />
        </div>
      </div>

      <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-3">
        Support Your Club
      </h2>
      <p className="text-gray-400 mb-4 max-w-2xl mx-auto">
        Pick your lucky numbers for just £1 each per week. Three prizes drawn
        every Friday at 7PM.
      </p>
      <div className="flex justify-center gap-6 mb-6 text-center">
        <div>
          <p className="font-heading text-2xl font-bold text-gold">{first}</p>
          <p className="text-xs text-gray-400">1st Prize</p>
        </div>
        <div>
          <p className="font-heading text-2xl font-bold text-gold">{second}</p>
          <p className="text-xs text-gray-400">2nd Prize</p>
        </div>
        <div>
          <p className="font-heading text-2xl font-bold text-gold">{third}</p>
          <p className="text-xs text-gray-400">3rd Prize</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <a
          href="/draw"
          className="bg-gold text-navy font-bold px-10 py-4 rounded-md text-lg hover:bg-gold-light transition-colors"
        >
          Pick Your Numbers
        </a>
        <span className="text-gray-400 text-sm">
          500 numbers · Draws every Friday 7PM
        </span>
      </div>
    </div>
  );
}
