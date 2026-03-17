"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Subscription {
  id: string;
  stripe_subscription_id: string;
  numbers: number[];
  assigned_names: Record<string, string>;
  amount_pence: number;
  status: string;
  current_period_end: string;
  created_at: string;
}

export default function ManageSubscriptionsPage() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [managingPayment, setManagingPayment] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetch("/api/subscriptions", {
        headers: { "Authorization": `Bearer ${session?.access_token}` },
      })
        .then((r) => r.json())
        .then((d) => {
          setSubscriptions(d.subscriptions || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [user]);

  const handleCancel = async (stripeSubId: string) => {
    if (!user) return;
    if (!confirm("Are you sure? Your numbers will be released and someone else can buy them.")) return;

    setCancelling(stripeSubId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/subscriptions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ subscriptionId: stripeSubId }),
      });
      if (res.ok) {
        setSubscriptions((prev) =>
          prev.map((s) =>
            s.stripe_subscription_id === stripeSubId ? { ...s, status: "cancelled" } : s
          )
        );
      } else {
        alert("Failed to cancel subscription");
      }
    } catch {
      alert("Something went wrong");
    }
    setCancelling(null);
  };

  const handleManagePayment = async (subscriptionId: string) => {
    if (!user) return;
    
    setManagingPayment(subscriptionId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/billing-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
      });
      
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        alert("Failed to open payment management");
      }
    } catch {
      alert("Something went wrong");
    }
    setManagingPayment(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-navy/60 mb-4">Sign in to manage your subscriptions</p>
          <a href="/login" className="text-gold font-semibold hover:underline">Sign in →</a>
        </div>
      </div>
    );
  }

  return (
    <section className="py-12 bg-cream min-h-screen">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading text-3xl font-bold text-navy">My Subscriptions</h1>
          <Link href="/draw" className="text-sm text-gold font-semibold hover:underline">
            ← Back to Draw
          </Link>
        </div>

        {loading ? (
          <p className="text-navy/50">Loading...</p>
        ) : subscriptions.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center shadow-sm">
            <p className="text-navy/60 mb-4">You don&apos;t have any subscriptions yet.</p>
            <Link href="/draw" className="inline-block bg-navy text-white font-semibold px-6 py-3 rounded-md hover:bg-navy-light transition-colors">
              Pick Numbers →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="bg-white rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow border border-gray-100 cursor-pointer">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        sub.status === "active"
                          ? "bg-green-100 text-green-700"
                          : sub.status === "past_due"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {sub.status === "active" ? "Active" : sub.status === "past_due" ? "Past Due" : "Cancelled"}
                      </span>
                      <span className="text-sm text-navy/50">
                        £{(sub.amount_pence / 100).toFixed(2)}/week
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {sub.numbers.map((n) => (
                        <span key={n} className="inline-flex items-center justify-center w-10 h-8 rounded-full bg-gold/20 text-navy text-sm font-bold hover:bg-gold/30 transition-colors">
                          {n}
                        </span>
                      ))}
                    </div>
                    {sub.current_period_end && sub.status === "active" && (
                      <p className="text-xs text-navy/40">
                        Next renewal: {new Date(sub.current_period_end).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      </p>
                    )}
                    <p className="text-xs text-navy/30">
                      Since {new Date(sub.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  {sub.status === "active" && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleManagePayment(sub.stripe_subscription_id);
                        }}
                        disabled={managingPayment === sub.stripe_subscription_id}
                        className="text-sm text-navy bg-gold/20 hover:bg-gold/30 font-medium rounded-md px-4 py-2 transition-colors disabled:opacity-50 border border-gold/30"
                      >
                        {managingPayment === sub.stripe_subscription_id ? "Opening..." : "Manage Payment"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancel(sub.stripe_subscription_id);
                        }}
                        disabled={cancelling === sub.stripe_subscription_id}
                        className="text-sm text-red-500 hover:text-red-700 font-medium border border-red-200 rounded-md px-4 py-2 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {cancelling === sub.stripe_subscription_id ? "Cancelling..." : "Cancel"}
                      </button>
                    </div>
                  )}
                  {sub.status === "past_due" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleManagePayment(sub.stripe_subscription_id);
                      }}
                      disabled={managingPayment === sub.stripe_subscription_id}
                      className="text-sm text-white bg-yellow-500 hover:bg-yellow-600 font-medium rounded-md px-4 py-2 transition-colors disabled:opacity-50"
                    >
                      {managingPayment === sub.stripe_subscription_id ? "Opening..." : "Update Payment"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
