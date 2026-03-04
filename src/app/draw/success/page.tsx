"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const mode = params.get("mode"); // "subscription" or "one-off"
  const [numbers, setNumbers] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("purchased_numbers");
    if (stored) {
      setNumbers(JSON.parse(stored));
      localStorage.removeItem("purchased_numbers");
      localStorage.removeItem("optimistic_purchased");
    }
  }, []);

  const isSubscription = mode === "subscription";

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://ardmorecricket.com/draw");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-cream px-4 py-12 relative overflow-hidden">
      {/* CSS Confetti */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full animate-confetti"
            style={{
              left: `${5 + Math.random() * 90}%`,
              top: `-5%`,
              backgroundColor: ["#C8A951", "#1B2A4A", "#87CEEB", "#FF6B6B", "#4CAF50"][i % 5],
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2.5 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center relative z-10">
        <div className="text-5xl mb-4">🏏</div>
        <h1 className="font-heading text-3xl font-bold text-navy mb-3">You&apos;re In!</h1>
        <p className="text-navy/60 mb-6">
          {isSubscription
            ? "Your numbers auto-enter every Friday's draw!"
            : "Your numbers are in this Friday's draw!"}
        </p>

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
            {isSubscription
              ? "✅ Subscription active. Your numbers enter automatically every week."
              : "✅ Payment confirmed. Draw is every Friday at 7PM."}
          </p>
        </div>

        {/* What Happens Next */}
        <div className="bg-navy/5 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-navy text-sm mb-3">What happens next?</h3>
          <ul className="space-y-2 text-sm text-navy/70">
            <li className="flex items-start gap-2">
              <span className="text-gold mt-0.5">🎯</span>
              <span>Draw takes place <strong>every Friday at 7PM</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold mt-0.5">📧</span>
              <span>Winners are notified by email after each draw</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold mt-0.5">📋</span>
              <span>Manage your numbers anytime from <a href="/draw/manage" className="text-gold font-semibold hover:underline">My Numbers</a></span>
            </li>
            {isSubscription && (
              <li className="flex items-start gap-2">
                <span className="text-gold mt-0.5">🔄</span>
                <span>Cancel your subscription anytime — no lock-in</span>
              </li>
            )}
          </ul>
        </div>

        {/* Share Section */}
        <div className="border-t border-navy/10 pt-5 mb-6">
          <p className="text-sm text-navy/60 mb-3">Tell a mate about the draw 👇</p>
          <button
            onClick={handleCopyLink}
            className="w-full bg-navy/5 hover:bg-navy/10 text-navy font-medium px-4 py-3 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
          >
            {copied ? (
              <>✅ Link copied!</>
            ) : (
              <>📋 Copy link to share</>
            )}
          </button>
        </div>

        {sessionId && (
          <p className="text-xs text-navy/30 mb-4">Ref: {sessionId.slice(0, 20)}...</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="/draw/manage"
            className="flex-1 inline-block bg-navy text-white font-semibold px-6 py-3 rounded-md hover:bg-navy-light transition-colors text-sm"
          >
            My Numbers
          </a>
          <a
            href="/draw"
            className="flex-1 inline-block bg-gold text-navy font-semibold px-6 py-3 rounded-md hover:bg-gold-light transition-colors text-sm"
          >
            Pick More Numbers
          </a>
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(80vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti-fall linear infinite;
        }
      `}</style>
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
