import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AGM 2026 — Ardmore Cricket Club",
  description:
    "Ardmore Cricket Club held its Annual General Meeting on 6th March 2026. New captains appointed and positive plans for the season ahead.",
  openGraph: {
    title: "Ardmore Cricket Club AGM 2026",
    description:
      "New captains appointed, positive plans for the season ahead, and a change of Club Secretary at Ardmore's 2026 AGM.",
    url: "https://ardmorecricket.com/news/agm-2026",
    siteName: "Ardmore Cricket Club",
    images: [
      {
        url: "https://ardmorecricket.com/ardmore-og.png",
        width: 512,
        height: 512,
        alt: "Ardmore Cricket Club Crest",
      },
    ],
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "Ardmore Cricket Club AGM 2026",
    description:
      "New captains appointed and positive plans for the season ahead at Ardmore's 2026 AGM.",
    images: ["https://ardmorecricket.com/ardmore-og.png"],
  },
};

export default function AGM2026Page() {
  return (
    <>
      {/* Hero */}
      <section className="bg-navy py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="mb-4">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Club News
            </span>
          </div>
          <h1 className="font-heading text-3xl sm:text-5xl font-bold text-white mb-3">
            Ardmore Cricket Club AGM 2026
          </h1>
          <p className="text-gold text-lg">6th March 2026</p>
        </div>
      </section>

      {/* Article Body */}
      <section className="py-12 sm:py-16 bg-cream">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <article className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 sm:p-10">
            <div className="prose prose-lg max-w-none text-navy/80">
              <p>
                Ardmore Cricket Club held its Annual General Meeting on Thursday
                6th March 2026 at The Bleach Green. It was an encouraging evening,
                with positive plans discussed for the upcoming season and a strong
                sense of optimism around the club.
              </p>

              <h2 className="font-heading text-2xl font-bold text-navy mt-8 mb-4">
                Change of Club Secretary
              </h2>
              <p>
                Among the election of officers, George Brolly Junior has stepped
                down as Club Secretary and is replaced in the role by Kevin Brolly.
                George goes with the Club&apos;s sincere thanks and best wishes for
                his dedicated and excellent service over the years. We wish Kevin
                every success in his new role.
              </p>

              <h2 className="font-heading text-2xl font-bold text-navy mt-8 mb-4">
                2026 Captaincy Appointments
              </h2>
              <p>
                The captaincy positions for the 2026 season were confirmed as
                follows:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                {[
                  {
                    team: "1st XI",
                    captain: "Mark Chambers",
                    vice: "Conor King",
                  },
                  {
                    team: "2nd XI",
                    captain: "Matt Rowlands",
                    vice: "Derish Joseph",
                  },
                  {
                    team: "3rd XI",
                    captain: "Steven Barrow",
                    vice: "David Bradley",
                  },
                ].map((t) => (
                  <div
                    key={t.team}
                    className="bg-cream rounded-lg p-4 border-l-4 border-gold"
                  >
                    <div className="text-gold font-heading text-lg font-bold">
                      {t.team}
                    </div>
                    <div className="text-navy font-semibold mt-1">
                      Captain: {t.captain}
                    </div>
                    <div className="text-navy/70 text-sm">
                      Vice Captain: {t.vice}
                    </div>
                  </div>
                ))}
              </div>

              <h2 className="font-heading text-2xl font-bold text-navy mt-8 mb-4">
                Looking Ahead
              </h2>
              <p>
                The Committee also discussed plans to improve and augment the
                Club&apos;s playing facilities and ground, with investment planned
                for the months ahead. The continued development of Youth Cricket
                remains a key priority, with the club committed to encouraging and
                nurturing the next generation of Ardmore cricketers.
              </p>
              <p>
                It promises to be an exciting season ahead at The Bleach Green.
                We look forward to seeing everyone down at the ground.
              </p>
            </div>

            {/* Back link */}
            <div className="mt-10 pt-6 border-t border-gray-100">
              <a
                href="/news"
                className="text-gold font-medium text-sm hover:underline inline-flex items-center gap-1"
              >
                ← Back to Club News
              </a>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
