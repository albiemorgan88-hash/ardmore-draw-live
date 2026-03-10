"use client";

import Link from "next/link";

export default function ClaimSuccessPage() {
  return (
    <section className="py-16 bg-cream min-h-screen">
      <div className="max-w-lg mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-navy p-6 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h1 className="font-heading text-2xl font-bold text-gold">Bank Account Connected!</h1>
          </div>

          <div className="p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-navy mb-3">You&apos;re All Set</h2>
            <p className="text-navy/70 mb-6 leading-relaxed">
              Your bank account has been securely connected via Stripe. 
              Your prize will be transferred shortly — funds typically arrive within 1-2 business days.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                <strong>Future winnings?</strong> You&apos;re automatically set up. 
                If your number comes up again, the prize goes straight to your bank.
              </p>
            </div>
            <Link
              href="/draw"
              className="inline-block bg-navy text-white font-semibold px-8 py-3 rounded-lg hover:bg-navy/90 transition-colors"
            >
              Back to Draw →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
