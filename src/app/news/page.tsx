"use client";

import { useState } from "react";

type Article = {
  id: number;
  title: string;
  date: string;
  category: string;
  excerpt: string;
  body: string;
  source?: string;
  link?: string;
};

const articles: Article[] = [
  {
    id: 7,
    title: "The All-Time Ardmore XI",
    date: "March 2025",
    category: "History",
    excerpt: "Former player, international umpire and NW President Connie McAllister selects his all-time greatest Ardmore XI from 147 years of cricket at The Bleach Green.",
    body: "",
    link: "/news/all-time-ardmore-xi",
    source: "CricketEurope",
  },
  {
    id: 6,
    title: "Ardmore Cricket Club AGM 2026",
    date: "March 2026",
    category: "Club News",
    excerpt: "Officers elected and positive plans discussed for the upcoming season at Thursday's Annual General Meeting.",
    body: "",
    link: "/news/agm-2026",
  },
  {
    id: 1,
    title: "2026 Championship Season Ahead",
    date: "March 2026",
    category: "Preview",
    excerpt: "Ardmore target an immediate bounce-back to the Premiership with two new overseas signings and the core squad intact.",
    body: "Ardmore will compete in the NW Championship for 2026, targeting an immediate bounce-back to the Premiership. With two new overseas signings in Kasun Abeyrathne and Matt Cuffe, plus the core squad intact under captain Harry Zimmerman, the Bleach Green faithful have reason for optimism heading into the new campaign. Training resumes Tuesdays and Fridays from April.",
  },
  {
    id: 2,
    title: "Double Signing Boost for Ardmore",
    date: "February 2026",
    category: "Transfer News",
    excerpt: "Two overseas signings unveiled as Ardmore look to bounce back to the Premiership at the first attempt.",
    body: "Ardmore have unveiled two overseas signings as they attempt to bounce back to the Premiership at the first attempt. Their new professional is 27-year-old Sri Lankan Kasun Abeyrathne, a middle-order batsman who keeps wicket and bowls occasional leg-spin. He has six centuries across 47 first-class matches in Sri Lanka. Joining him is Irish passport-holding South African Matt Cuffe, a 20-year-old leg-spin bowler from Pirates CC in Johannesburg who has taken 16 wickets in their Presidents A League.",
    source: "CricketEurope",
  },
  {
    id: 3,
    title: "NW Senior Cup Draw — Ardmore vs Bonds Glen",
    date: "February 2026",
    category: "Cup Draw",
    excerpt: "Ardmore have been drawn against Bonds Glen in the first round of the NW Senior Cup for 2026.",
    body: "Ardmore have been drawn against Bonds Glen in the first round of the NW Senior Cup for 2026.",
    source: "CricketEurope",
  },
  {
    id: 4,
    title: "Hayden Melly Moves to Cliftonville Academy",
    date: "January 2026",
    category: "Transfer News",
    excerpt: "Ardmore's Hayden Melly has joined Cliftonville Academy for the 2026 season.",
    body: "Ardmore's Hayden Melly has joined Cliftonville Academy for the 2026 season.",
    source: "CricketEurope",
  },
  {
    id: 5,
    title: "2025 Season Review",
    date: "October 2025",
    category: "Season Review",
    excerpt: "A challenging Premiership campaign saw Ardmore survive relegation through a play-off win over St Johnston.",
    body: "A challenging 2025 Premiership campaign saw Ardmore fight to avoid relegation. Having won the NW Senior League title in 2023, the club survived relegation only through a play-off win over St Johnston. The season highlighted the need for squad strengthening heading into 2026, where the club will compete in the Championship with sights set on an immediate return to the Premiership.",
  },
];

const categories = ["All", ...Array.from(new Set(articles.map(a => a.category)))];

const categoryColors: Record<string, string> = {
  "Transfer News": "bg-sky-100 text-sky-800",
  "Season Review": "bg-amber-100 text-amber-800",
  "Cup Draw": "bg-emerald-100 text-emerald-800",
  "Preview": "bg-violet-100 text-violet-800",
  "Club News": "bg-emerald-100 text-emerald-800",
  "History": "bg-amber-100 text-amber-800",
};

export default function NewsPage() {
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = filter === "All" ? articles : articles.filter(a => a.category === filter);

  return (
    <>
      {/* Hero */}
      <section className="bg-navy py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-3">Club News</h1>
          <p className="text-gold text-lg">The latest from The Bleach Green</p>
        </div>
      </section>

      {/* Filter */}
      <section className="bg-cream border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === cat
                    ? "bg-navy text-white"
                    : "bg-white text-navy/70 hover:bg-navy/10 border border-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="py-12 bg-cream min-h-[60vh]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map(article => (
              <article
                key={article.id}
                className={`bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden transition-all ${
                  article.id === 7 || article.id === 6 || article.id === 1 || article.id === 2 ? "md:col-span-2" : ""
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${categoryColors[article.category] || "bg-gray-100 text-gray-700"}`}>
                      {article.category}
                    </span>
                    <span className="text-sm text-navy/40">{article.date}</span>
                  </div>
                  <h2 className="font-heading text-xl sm:text-2xl font-bold text-navy mb-3">{article.title}</h2>
                  {article.link ? (
                    <>
                      <p className="text-navy/70 leading-relaxed mb-4">{article.excerpt}</p>
                      <a
                        href={article.link}
                        className="text-gold font-medium text-sm hover:underline"
                      >
                        Read more →
                      </a>
                    </>
                  ) : expanded === article.id ? (
                    <>
                      <p className="text-navy/70 leading-relaxed mb-4">{article.body}</p>
                      {article.source && (
                        <p className="text-sm text-navy/40 italic mb-3">Source: {article.source}</p>
                      )}
                      <button
                        onClick={() => setExpanded(null)}
                        className="text-gold font-medium text-sm hover:underline"
                      >
                        Show less
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-navy/70 leading-relaxed mb-4">{article.excerpt}</p>
                      {article.body !== article.excerpt && (
                        <button
                          onClick={() => setExpanded(article.id)}
                          className="text-gold font-medium text-sm hover:underline"
                        >
                          Read more →
                        </button>
                      )}
                      {article.source && !article.body.includes(article.excerpt) && (
                        <p className="text-sm text-navy/40 italic mt-2">Source: {article.source}</p>
                      )}
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Team Sheet Placeholder */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-heading text-3xl font-bold text-navy mb-4">Team Sheets</h2>
          <p className="text-navy/60 mb-8 max-w-2xl mx-auto">
            Team sheets for upcoming matches will be posted here each week during the season.
          </p>
          <div className="bg-cream rounded-lg p-10 border-2 border-dashed border-gray-300">
            <div className="text-4xl mb-3">🏏</div>
            <p className="text-navy/50 font-medium">Season starts April 2026</p>
            <p className="text-sm text-navy/40 mt-1">Check back for weekly team selections</p>
          </div>
        </div>
      </section>
    </>
  );
}
