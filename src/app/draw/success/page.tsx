"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [numbers, setNumbers] = useState<number[]>([]);

  useEffect(() => {
    // Try to get numbers from localStorage (set before redirect)
    const stored = localStorage.getItem("purchased_numbers");
    if (stored) {
      setNumbers(JSON.parse(stored));
      localStorage.removeItem("purchased_numbers");
      localStorage.removeItem("optimistic_purchased");
    }
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-cream px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="text-5xl mb-4">🏏</div>
        <h1 className="font-heading text-3xl font-bold text-navy mb-3">You&apos;re In!</h1>
        <p className="text-navy/60 mb-6">Your numbers are in this week&apos;s draw!</p>

        {numbers.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-navy/50 mb-3">Your numbers:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {numbers.sort((a, b) => a - b).map((n) => (
                <span key={n} className="bg-gold text-navy text-lg font-bold px-4 py-2 rounded-full">
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-700 text-sm font-medium">
            ✅ Payment confirmed. Draw is every Friday at 7PM.
          </p>
        </div>

        {sessionId && (
          <p className="text-xs text-navy/30 mb-4">Ref: {sessionId.slice(0, 20)}...</p>
        )}

        <a
          href="/draw"
          className="inline-block bg-navy text-white font-semibold px-8 py-3 rounded-md hover:bg-navy-light transition-colors"
        >
          Back to Draw
        </a>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><p>Loading...</p></div>}>
      <SuccessContent />
    </Suspense>
  );
}
