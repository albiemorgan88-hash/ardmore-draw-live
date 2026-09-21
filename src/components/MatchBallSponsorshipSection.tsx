"use client";

import { FormEvent, useState } from "react";

export default function MatchBallSponsorshipSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [asset, setAsset] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const sponsorName = name.trim();
    const sponsorEmail = email.trim();

    if (!sponsorName || !sponsorEmail) {
      setError("Please enter the sponsor name and email.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", sponsorName);
      formData.append("email", sponsorEmail);
      formData.append("message", message.trim());

      if (asset) {
        formData.append("asset", asset);
      }

      const response = await fetch("/api/match-ball-sponsorship", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not start sponsorship checkout");
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("Checkout link missing");
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Something went wrong";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <section
      id="match-ball-sponsorship"
      className="py-12 bg-white border-t border-b border-gray-200"
    >
      <div className="max-w-5xl mx-auto px-4 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-start">
        <div>
          <span className="inline-flex items-center rounded-full bg-gold/15 text-navy px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            New Fundraiser
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy mt-4 mb-3">
            Sponsor the Match Ball for £30
          </h2>
          <p className="text-navy/70 text-lg leading-relaxed max-w-2xl">
            Support Ardmore Cricket Club with a simple one-off match ball
            sponsorship. Add your name or business, leave a short message,
            upload a logo or photo, and we&apos;ll send the club the details
            straight after payment.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            <div className="rounded-xl bg-cream border border-gray-200 p-4">
              <div className="text-2xl mb-2">🏏</div>
              <h3 className="font-semibold text-navy mb-1">One-off £30</h3>
              <p className="text-sm text-navy/60">
                Quick sponsorship checkout, no account needed.
              </p>
            </div>
            <div className="rounded-xl bg-cream border border-gray-200 p-4">
              <div className="text-2xl mb-2">🖼️</div>
              <h3 className="font-semibold text-navy mb-1">Logo or photo</h3>
              <p className="text-sm text-navy/60">
                Attach a business logo, player photo, or family picture.
              </p>
            </div>
            <div className="rounded-xl bg-cream border border-gray-200 p-4">
              <div className="text-2xl mb-2">📧</div>
              <h3 className="font-semibold text-navy mb-1">
                Club gets notified
              </h3>
              <p className="text-sm text-navy/60">
                The club receives the sponsor details and image after payment.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-navy-dark text-white p-6 sm:p-8 shadow-lg">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <p className="text-sm text-gold uppercase tracking-wide font-semibold">
                Match Ball Sponsor
              </p>
              <h3 className="font-heading text-2xl font-bold">£30</h3>
            </div>
            <div className="text-right text-sm text-gray-300">
              <p>One-off payment</p>
              <p>No login needed</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="sponsor-name"
                className="block text-sm font-medium mb-1"
              >
                Name or business name
              </label>
              <input
                id="sponsor-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Kelly's Bar or Patrick McLaughlin"
                className="w-full rounded-lg border border-navy-light bg-navy px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-gold"
                required
              />
            </div>

            <div>
              <label
                htmlFor="sponsor-email"
                className="block text-sm font-medium mb-1"
              >
                Email
              </label>
              <input
                id="sponsor-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-navy-light bg-navy px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-gold"
                required
              />
            </div>

            <div>
              <label
                htmlFor="sponsor-message"
                className="block text-sm font-medium mb-1"
              >
                Short message (optional)
              </label>
              <textarea
                id="sponsor-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Sponsored by..., In memory of..., Good luck Ardmore..."
                rows={3}
                maxLength={220}
                className="w-full rounded-lg border border-navy-light bg-navy px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-gold resize-none"
              />
            </div>

            <div>
              <label
                htmlFor="sponsor-asset"
                className="block text-sm font-medium mb-1"
              >
                Logo or photo (optional)
              </label>
              <input
                id="sponsor-asset"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(event) => setAsset(event.target.files?.[0] || null)}
                className="w-full rounded-lg border border-dashed border-navy-light bg-navy px-4 py-3 text-sm text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-2 file:text-sm file:font-semibold file:text-navy hover:file:bg-gold-light"
              />
              <p className="text-xs text-gray-400 mt-2">
                PNG, JPG, WEBP or SVG, up to 5MB.
              </p>
            </div>

            {error ? (
              <p className="text-sm text-red-300">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-gold text-navy px-5 py-3 font-bold hover:bg-gold-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Starting checkout..." : "Sponsor the Match Ball for £30"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
