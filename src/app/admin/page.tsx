"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { isAdminEmail } from "@/lib/admin";

const adminLinks = [
  {
    href: "/admin/draw-entries",
    title: "Draw Entries",
    description: "View active weekly draw numbers and export the draw list.",
  },
  {
    href: "/admin/memberships",
    title: "Membership Fees",
    description: "View paid, expired, and unpaid website membership checkout sessions.",
  },
  {
    href: "/admin/payouts",
    title: "Payouts",
    description: "Review draw payouts and monthly platform fee summaries.",
  },
];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const isAdmin = isAdminEmail(user?.email);

  if (loading) {
    return (
      <section className="min-h-screen bg-cream px-4 py-12">
        <div className="max-w-5xl mx-auto text-navy/50">Loading admin...</div>
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
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="font-heading text-3xl font-bold text-navy">Admin</h1>
          <p className="text-sm text-navy/50 mt-1">Ardmore Cricket Club management tools</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm hover:border-gold transition-colors"
            >
              <h2 className="font-heading text-xl font-bold text-navy">{link.title}</h2>
              <p className="text-sm text-navy/55 mt-2">{link.description}</p>
              <span className="inline-block text-sm text-gold font-semibold mt-5">Open</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
