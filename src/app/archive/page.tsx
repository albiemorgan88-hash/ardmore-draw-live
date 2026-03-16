"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useMemo } from "react";

type Category = "all" | "teams" | "supporters" | "professional";

interface ArchivePhoto {
  src: string;
  alt: string;
  caption: string;
  year?: string;
  category: "teams" | "supporters" | "professional";
}

const photos: ArchivePhoto[] = [
  // ── Teams & Players ──
  {
    src: "/images/archive/trophy-team.jpg",
    alt: "Ardmore CC archive photo",
    caption:
      "Back row: Mark Gillen, Dean Chambers, George Chambers, Michael Dalton, Phil Patterson, Damien Gallagher, Faye Gallagher. Front row: Tom Martin, Caolan Young, Steven Barrow, Steven McDermott, Mark Gillen, Dessie McCourt",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/phil-simmons.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Peter Harrigan Sr, Gavin Dalton, Phil Simmons, Dermot Ward, Michael Dalton",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/team-celebration.jpg",
    alt: "Ardmore CC archive photo",
    caption: "2023 NWCU League Winners — Sabin Babu, Aneesh Anilkumar, Mark Chambers, Tim Harris, Conor Brolly, Conor King, Ryan Brolly, George Dalton, Dermot Ward, Edrees Kharotai, Caolan Young, Harry Zimmermann, Rachit Gaur, Bobby Brolly, Dhram Singh",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/debut-cap-brolly.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Harry Zimmermann presents Bobby Brolly with his debut cap, Emerging Warriors",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/team-group.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Versus Eglinton, 2025 — Edrees Kharotai, Derish Joseph, Phil Patterson, Conor Brolly, George Dalton, Dermot Ward, Aneesh Anilkumar, Akash Jayumkilar, Junaid Ali, Harry Zimmermann, Vimal Diwali, Bobby Brolly",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/team-classic.jpg",
    alt: "Ardmore CC archive photo",
    caption: "1994 Senior Cup Winners — DW Caldwell, Bobby Brolly, Dessie McCourt, Eddie O'Kane, Sanjeev Sharma, Paul Brolly, Dermot Ward, Edwin Gallagher, Gerard Brolly, Reggie McCarron, Alan Wallace, Gordon Cooke, David Cooke, Nigel Thompson, George Gillen, Paddy Semple",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/dermot-ward-batting.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Club Chairman, Dermot Ward, plays a straight bat",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/mayoral-reception-2023.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Mayoral Reception for NWCU 2023 League Win",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/archive-team-1.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Ardmore CC through the years",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/archive-team-2.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Ardmore CC through the years",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/archive-team-3.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Ardmore CC through the years",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/archive-team-4.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Ardmore CC through the years",
    year: "",
    category: "teams",
  },

  // ── Supporters ──
  {
    src: "/images/archive/brolly-family.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Kevin Brolly, Paul Brolly, Joseph Brolly",
    year: "",
    category: "supporters",
  },
  {
    src: "/images/archive/chambers-duddy.jpg",
    alt: "Ardmore CC archive photo",
    caption: "NWCU League Winners 2023. Mark Chambers pictured with Conor Duddy, Ardmore Primary",
    year: "",
    category: "supporters",
  },
  {
    src: "/images/archive/gormley-brolly-ward.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Pat Gormley, Paul Brolly, Dermot Ward — NWCU Awards Dinner",
    year: "",
    category: "supporters",
  },
  {
    src: "/images/archive/founders-bench.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Brendan Feeny, Joe Donnelly, Tommy Curley, Hugo McDermott, Connie Miller, Jim Chambers Sen. — Old Guard in green Hut",
    year: "",
    category: "supporters",
  },
  {
    src: "/images/archive/peter-harrigan-wicket.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Peter Harrigan Sr prepares the wicket",
    year: "",
    category: "supporters",
  },
  {
    src: "/images/archive/noel-ward-flag.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Noel Ward, who sponsored the flag and pole, with President George Chambers",
    year: "",
    category: "supporters",
  },
  {
    src: "/images/archive/glyn-shane-king.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Glyn and Shane King",
    year: "",
    category: "supporters",
  },
  {
    src: "/images/archive/brolly-patterson.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Thomas Brolly, Phil Patterson",
    year: "",
    category: "supporters",
  },
  {
    src: "/images/archive/george-brolly-snr-jnr.jpg",
    alt: "Ardmore CC archive photo",
    caption: "George Brolly Senior and Junior",
    year: "",
    category: "supporters",
  },
  {
    src: "/images/archive/conor-king-tom-martin.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Conor King, Tom Martin",
    year: "",
    category: "supporters",
  },
  {
    src: "/images/archive/george-michael-dalton.jpg",
    alt: "Ardmore CC archive photo",
    caption: "George and Michael Dalton",
    year: "",
    category: "supporters",
  },
  // ── Professionals ──
  {
    src: "/images/archive/junaid-ali-1.jpg",
    alt: "Junaid Ali",
    caption: "Junaid Ali",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/junaid-ali-2.jpg",
    alt: "Junaid Ali",
    caption: "Junaid Ali",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/aviwe-mjigima-1.jpg",
    alt: "Aviwe Mjigima",
    caption: "Aviwe Mjigima",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/aviwe-mjigima-2.jpg",
    alt: "Aviwe Mjigima",
    caption: "Aviwe Mjigima",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/azeem-ghunmann-1.jpg",
    alt: "Azeem Ghunmann",
    caption: "Azeem Ghunmann",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/azeem-ghunmann-2.jpg",
    alt: "Azeem Ghunmann",
    caption: "Azeem Ghunmann",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/peet-pienaar-1.jpg",
    alt: "Peet Pienaar",
    caption: "Peet Pienaar",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/peet-pienaar-2.jpg",
    alt: "Peet Pienaar",
    caption: "Peet Pienaar",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/marlo-jardine-1.jpg",
    alt: "Marlo Jardine",
    caption: "Marlo Jardine",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/marlo-jardine-2.jpg",
    alt: "Marlo Jardine",
    caption: "Marlo Jardine",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/rameez-alam-1.jpg",
    alt: "Rameez Alam",
    caption: "Rameez Alam",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/rameez-alam-2.jpg",
    alt: "Rameez Alam",
    caption: "Rameez Alam",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/grant-moekena-1.jpg",
    alt: "Grant Moekena",
    caption: "Grant Moekena",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/grant-moekena-2.jpg",
    alt: "Grant Moekena",
    caption: "Grant Moekena",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/foster-mttiziwara-1.jpg",
    alt: "Foster Mttiziwara",
    caption: "Foster Mttiziwara",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/foster-mttiziwara-2.jpg",
    alt: "Foster Mttiziwara",
    caption: "Foster Mttiziwara",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/rizwan-aslam-1.jpg",
    alt: "Rizwan Aslam",
    caption: "Rizwan Aslam",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/rizwan-aslam-2.jpg",
    alt: "Rizwan Aslam",
    caption: "Rizwan Aslam",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/austin-richards-1.jpg",
    alt: "Austin Richards",
    caption: "Austin Richards",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/austin-richards-2.jpg",
    alt: "Austin Richards",
    caption: "Austin Richards",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/iftikhar-hussain-1.jpg",
    alt: "Iftikhar Hussain",
    caption: "Iftikhar Hussain",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/iftikhar-hussain-2.jpg",
    alt: "Iftikhar Hussain",
    caption: "Iftikhar Hussain",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/raman-lamba-1.jpg",
    alt: "Raman Lamba",
    caption: "Raman Lamba",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/raman-lamba-2.jpg",
    alt: "Raman Lamba",
    caption: "Raman Lamba",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/sanjeev-sharma-1.jpg",
    alt: "Sanjeev Sharma",
    caption: "Sanjeev Sharma",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/sanjeev-sharma-2.jpg",
    alt: "Sanjeev Sharma",
    caption: "Sanjeev Sharma",
    year: "",
    category: "professional",
  },
  {
    src: "/images/archive/carlitos-lopez-1.jpg",
    alt: "Carlitos Lopez",
    caption: "Carlitos Lopez",
    year: "",
    category: "professional",
  },
  // ── New batch — March 2026 ──
  {
    src: "/images/archive/celebrating-nwcu-premiership.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Celebrating NWCU Premiership",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/celebrating-2023-dressing-room.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Celebrating 2023",
    year: "2023",
    category: "teams",
  },
  {
    src: "/images/archive/celebrating-2023-pitch.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Celebrating 2023",
    year: "2023",
    category: "teams",
  },
  {
    src: "/images/archive/celebrating-2023-team-and-supporters.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Celebrating 2023",
    year: "2023",
    category: "supporters",
  },
  {
    src: "/images/archive/george-brolly-senior-and-junior.jpg",
    alt: "Ardmore CC archive photo",
    caption: "George Brolly Senior and Junior",
    year: "",
    category: "supporters",
  },
  {
    src: "/images/archive/george-brolly-and-connie-mcallister.jpg",
    alt: "Ardmore CC archive photo",
    caption: "George Brolly and Connie McAllister",
    year: "",
    category: "supporters",
  },
  {
    src: "/images/archive/connie-and-george.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Connie and George",
    year: "",
    category: "supporters",
  },
  {
    src: "/images/archive/george-noel-and-connie.jpg",
    alt: "Ardmore CC archive photo",
    caption: "George, Noel and Connie",
    year: "",
    category: "supporters",
  },
  {
    src: "/images/archive/teams-through-the-years-01.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Teams Through the Years",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/teams-through-the-years-02.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Teams Through the Years",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/teams-through-the-years-03.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Teams Through the Years",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/teams-through-the-years-04.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Teams Through the Years",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/teams-through-the-years-05.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Teams Through the Years",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/teams-through-the-years-06.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Teams Through the Years",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/teams-through-the-years-07.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Teams Through the Years",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/teams-through-the-years-08.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Teams Through the Years",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/teams-through-the-years-09.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Teams Through the Years",
    year: "",
    category: "teams",
  },
  {
    src: "/images/archive/trophy-presentation-harry-henderson.jpg",
    alt: "Ardmore CC archive photo",
    caption: "Back: George Brolly, Dessie Brolly, Eddie O'Kane, Harry Henderson, Barry Chambers, Barry O'Neill, Dermot Ward. Front: Faisal Rehman, Peter Harigan Snr, Dean Martin, Keith Hamilton, Lee Brolly",
    year: "",
    category: "teams",
  },
];

const tabs: { key: Category; label: string; count?: number }[] = [
  { key: "all", label: "All Photos" },
  { key: "teams", label: "Teams & Players" },
  { key: "supporters", label: "Supporters" },
  { key: "professional", label: "Professionals" },
];

export default function ArchivePage() {
  const [activeTab, setActiveTab] = useState<Category>("all");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (activeTab === "all") return photos;
    return photos.filter((p) => p.category === activeTab);
  }, [activeTab]);

  const close = useCallback(() => setLightbox(null), []);

  const prev = useCallback(
    () =>
      setLightbox((i) =>
        i !== null ? (i - 1 + filtered.length) % filtered.length : null
      ),
    [filtered.length]
  );

  const next = useCallback(
    () =>
      setLightbox((i) =>
        i !== null ? (i + 1) % filtered.length : null
      ),
    [filtered.length]
  );

  useEffect(() => {
    if (lightbox === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [lightbox, close, prev, next]);

  // Close lightbox when switching tabs
  useEffect(() => {
    setLightbox(null);
  }, [activeTab]);

  return (
    <>
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[300px] flex items-center justify-center bg-navy-dark overflow-hidden">
        {/* Collage background */}
        <div className="absolute inset-0 grid grid-cols-2 opacity-20">
          {photos.map((p, i) => (
            <div key={i} className="relative">
              <Image src={p.src} alt="" fill className="object-cover" />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-navy-dark/70" />
        <div className="relative text-center text-white px-4">
          <div className="inline-block mb-4">
            <svg className="w-10 h-10 text-gold mx-auto mb-2 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-3">Club Archive</h1>
          <p className="text-gold text-lg font-body">Memories from The Bleach Green</p>
          <p className="text-gray-300 text-sm mt-2 max-w-lg mx-auto">
            A collection of photographs celebrating the history and spirit of Ardmore Cricket Club.
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-16 bg-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-bold text-navy mb-2">Through the Years</h2>
            <div className="w-16 h-0.5 bg-gold mx-auto mb-8" />

            {/* Tab Navigation */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {tabs.map((tab) => {
                const count =
                  tab.key === "all"
                    ? photos.length
                    : photos.filter((p) => p.category === tab.key).length;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-md text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-navy text-white shadow-md"
                        : "bg-white text-navy/70 hover:bg-navy/10 border border-gray-200"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`ml-1.5 text-xs ${
                        isActive ? "text-gold" : "text-navy/40"
                      }`}
                    >
                      {`(${count})`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {filtered.map((photo, index) => (
              <div
                key={photo.src}
                className="group cursor-pointer"
                onClick={() => setLightbox(index)}
              >
                <div className="relative overflow-hidden rounded-lg shadow-md bg-white border border-gray-100">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 50vw"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-navy/0 group-hover:bg-navy/20 transition-colors duration-300 flex items-center justify-center">
                      <svg
                        className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                        />
                      </svg>
                    </div>
                  </div>
                  {/* Caption */}
                  <div className="p-4 bg-white">
                    {photo.year && (
                      <span className="text-gold font-heading text-sm font-semibold">{photo.year}</span>
                    )}
                    <p className="text-navy/70 text-sm leading-relaxed">{photo.caption}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Call to action */}
          <div className="mt-16 text-center bg-white rounded-lg p-8 shadow-sm border border-gray-100">
            <h3 className="font-heading text-2xl font-bold text-navy mb-2">
              Have old photos or memories?
            </h3>
            <p className="text-navy/60 mb-4 max-w-md mx-auto">
              We&apos;d love to add your photos to the archive. If you have any old photographs, programmes, 
              or memorabilia from the club&apos;s history, please get in touch.
            </p>
            <a
              href="mailto:Ardmorecc1879@hotmail.com?subject=Archive%20Photo%20Submission"
              className="inline-block bg-gold text-navy font-semibold px-8 py-3 rounded-md hover:bg-gold-light transition-colors"
            >
              Share Your Memories
            </a>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={close}
        >
          {/* Close button */}
          <button
            onClick={close}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors z-10"
            aria-label="Close"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Prev */}
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors z-10 p-2"
            aria-label="Previous photo"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors z-10 p-2"
            aria-label="Next photo"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Image + Caption */}
          <div
            className="max-w-4xl w-full mx-4 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full" style={{ maxHeight: "75vh" }}>
              <Image
                src={filtered[lightbox].src}
                alt={filtered[lightbox].alt}
                width={1200}
                height={800}
                className="object-contain max-h-[75vh] w-auto mx-auto rounded"
                priority
              />
            </div>
            <div className="mt-4 text-center max-w-2xl">
              {filtered[lightbox].year && (
                <span className="text-gold font-heading text-sm font-semibold block mb-1">
                  {filtered[lightbox].year}
                </span>
              )}
              <p className="text-white/80 text-sm leading-relaxed">
                {filtered[lightbox].caption}
              </p>
            </div>
            <div className="mt-3 text-white/40 text-xs">
              {lightbox + 1} / {filtered.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
