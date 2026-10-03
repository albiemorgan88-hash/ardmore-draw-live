import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const title = "Remembering Raymond “Reg” Hargan";
const description = "The players and officials of Ardmore Cricket Club were deeply saddened by the passing of Raymond “Reg” Hargan.";
const imagePath = "/images/news/reg-hargan/at-the-ground.jpg";

export const metadata: Metadata = {
  title: `${title} — Ardmore Cricket Club`,
  description,
  alternates: { canonical: "https://ardmorecricket.com/news/reg-hargan" },
  openGraph: {
    title,
    description,
    url: "https://ardmorecricket.com/news/reg-hargan",
    siteName: "Ardmore Cricket Club",
    type: "article",
    publishedTime: "2026-10-03",
    images: [{ url: imagePath, width: 1280, height: 553, alt: "Two friends smiling at the cricket ground, from the photographs shared in memory of Reg Hargan" }],
  },
  twitter: { card: "summary_large_image", title, description, images: [imagePath] },
};

const photographs = [
  { src: "bowling.jpg", height: 853, alt: "A bowling moment from the photographs shared in memory of Reg Hargan" },
  { src: "club-memories.jpg", height: 1017, alt: "Two friends pictured together indoors, from the photographs shared in memory of Reg Hargan" },
  { src: "watching-cricket.jpg", height: 444, alt: "Two spectators at the cricket ground, from the photographs shared in memory of Reg Hargan" },
];

export default function RegHarganTributePage() {
  return (
    <>
      <header className="bg-navy py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-gold text-sm font-medium mb-4">In memory</p>
          <h1 className="font-heading text-3xl sm:text-5xl font-bold text-white leading-tight">{title}</h1>
          <time dateTime="2026-10-03" className="block text-white/70 text-sm mt-5">3 October 2026</time>
        </div>
      </header>
      <section className="py-8 sm:py-12 bg-cream">
        <article className="max-w-4xl mx-auto px-4 sm:px-6">
          <Image
            src={imagePath}
            alt="Two friends smiling at the cricket ground, from the photographs shared in memory of Reg Hargan"
            width={1280}
            height={553}
            sizes="(max-width: 896px) 100vw, 848px"
            className="w-full h-auto rounded-lg"
            priority
          />
          <div className="max-w-2xl mx-auto py-8 sm:py-12 space-y-6 text-lg leading-relaxed text-navy/85">
            <p>The players and officials of Ardmore Cricket Club were deeply saddened by the passing of Raymond “Reg” Hargan.</p>
            <p>Reg was a great friend of the club over the years, both as a player and an avid spectator. He played in a number of cup- and league-winning teams with the second and third elevens, as well as the midweek team.</p>
            <p>A friend to all, Reg was a greatly valued member of the club.</p>
            <p>Rest in peace, Reg.</p>
          </div>
          <div className="space-y-6">
            {photographs.map(photo => (
              <Image
                key={photo.src}
                src={`/images/news/reg-hargan/${photo.src}`}
                alt={photo.alt}
                width={1280}
                height={photo.height}
                sizes="(max-width: 896px) 100vw, 848px"
                className="w-full h-auto rounded-lg"
              />
            ))}
          </div>
          <div className="mt-10 pt-6 border-t border-navy/10">
            <Link href="/news" className="text-navy font-medium text-sm hover:underline">← Back to Club News</Link>
          </div>
        </article>
      </section>
    </>
  );
}
