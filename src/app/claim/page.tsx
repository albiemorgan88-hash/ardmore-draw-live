"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ClaimContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  const [loading, setLoading] = useState(false);
  const [claimInfo, setClaimInfo] = useState<{
    place: string;
    amount_pence: number;
    winning_number: number;
    status: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fetchingInfo, setFetchingInfo] = useState(!!token);

  useEffect(() => {
    if (!token) return;

    // Fetch claim info
    fetch(`/api/connect/claim-info?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setErrorMsg(data.error);
        } else {
          setClaimInfo(data);
        }
        setFetchingInfo(false);
      })
      .catch(() => {
        setErrorMsg("Failed to load claim information");
        setFetchingInfo(false);
      });
  }, [token]);

  useEffect(() => {
    if (error === "incomplete") {
      setErrorMsg("Onboarding was not completed. Please try again.");
    } else if (error === "stripe_error") {
      setErrorMsg("Something went wrong with Stripe. Please try again.");
    } else if (error === "missing_params") {
      setErrorMsg("Invalid link. Please use the link from your email.");
    }
  }, [error]);

  const handleClaim = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/connect/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_token: token }),
      });

      const data = await res.json();

      if (data.already_onboarded) {
        setClaimInfo((prev) => prev ? { ...prev, status: "claimed" } : prev);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMsg(data.error || "Failed to start onboarding");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  if (!token) {
    return (
      <section className="py-16 bg-cream min-h-screen">
        <div className="max-w-lg mx-auto px-4 text-center">
          <h1 className="font-heading text-3xl font-bold text-navy mb-4">Claim Your Prize</h1>
          <p className="text-navy/60">
            Use the link from your winning notification email to claim your prize.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-cream min-h-screen">
      <div className="max-w-lg mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-navy p-6 text-center">
            <div className="text-4xl mb-2">🏏</div>
            <h1 className="font-heading text-2xl font-bold text-gold">Claim Your Prize</h1>
            <p className="text-sky-300 text-sm mt-1">Ardmore Cricket Club Draw</p>
          </div>

          <div className="p-6">
            {fetchingInfo ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy mx-auto mb-4" />
                <p className="text-navy/50">Loading...</p>
              </div>
            ) : errorMsg ? (
              <div className="text-center py-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-700">{errorMsg}</p>
                </div>
                {error === "incomplete" && token && (
                  <button
                    onClick={handleClaim}
                    disabled={loading}
                    className="bg-gold text-navy font-bold px-8 py-3 rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Loading..." : "Try Again →"}
                  </button>
                )}
              </div>
            ) : claimInfo?.status === "claimed" ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-xl font-bold text-navy mb-2">Already Claimed!</h2>
                <p className="text-navy/60">
                  Your bank account is connected. Your prize of{" "}
                  <strong>£{(claimInfo.amount_pence / 100).toFixed(2)}</strong> will be sent automatically.
                </p>
              </div>
            ) : claimInfo ? (
              <div className="text-center">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <p className="text-green-700 font-semibold text-lg mb-1">
                    {claimInfo.place} Prize — Number {claimInfo.winning_number}
                  </p>
                  <p className="text-green-800 text-3xl font-bold">
                    £{(claimInfo.amount_pence / 100).toFixed(2)}
                  </p>
                </div>

                <p className="text-navy/70 mb-6 text-sm leading-relaxed">
                  Connect your bank account securely via Stripe to receive this prize. 
                  It takes about 2 minutes. Once set up, future winnings are paid automatically.
                </p>

                <button
                  onClick={handleClaim}
                  disabled={loading}
                  className="w-full bg-gold text-navy font-bold px-8 py-4 rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50 text-lg"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-navy" />
                      Connecting...
                    </span>
                  ) : (
                    "Connect Bank Account & Claim →"
                  )}
                </button>

                <p className="text-navy/40 text-xs mt-4">
                  Powered by Stripe. Your bank details are handled securely — we never see them.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ClaimPage() {
  return (
    <Suspense
      fallback={
        <section className="py-16 bg-cream min-h-screen">
          <div className="max-w-lg mx-auto px-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy mx-auto" />
          </div>
        </section>
      }
    >
      <ClaimContent />
    </Suspense>
  );
}
