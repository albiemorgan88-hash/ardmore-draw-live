import Image from "next/image";
import JackpotSection from "@/components/JackpotSection";
import NextMatch from "@/components/NextMatch";
import { getCricketEuropeArdmoreArticles } from "@/lib/cricketeurope-news";

const newsCategoryColors: Record<string, string> = {
  Coaching: "text-emerald-800 bg-emerald-100",
  Photos: "text-sky-800 bg-sky-100",
  History: "text-amber-800 bg-amber-100",
  "Match Reports": "text-sky-800 bg-sky-100",
  CricketEurope: "text-sky-800 bg-sky-100",
  Cup: "text-emerald-800 bg-emerald-100",
};

type LatestNewsCard = {
  href: string;
  external?: boolean;
  category: string;
  date: string;
  title: string;
  excerpt: string;
};

export default async function HomePage() {
  const cricketEuropeArticles = await getCricketEuropeArdmoreArticles(2);
  const latestNewsCards: LatestNewsCard[] = [
    ...cricketEuropeArticles.map((article) => ({
      href: article.sourceUrl,
      external: true,
      category: article.category,
      date: article.date,
      title: article.title,
      excerpt: article.excerpt,
    })),
    {
      href: "/news",
      category: "Coaching",
      date: "May 2026",
      title: "Junior coaching on Friday nights",
      excerpt: "U11s from 6:00pm, ages 11+ from 7:00-8:00pm. All young players welcome.",
    },
    {
      href: "/news",
      category: "Photos",
      date: "May 2026",
      title: "Photos: Bonds Glen v Ardmore",
      excerpt: "CricketEurope have posted photos from the 18 May match, with a few Ardmore faces in the gallery.",
    },
    {
      href: "/news/all-time-ardmore-xi",
      category: "History",
      date: "March 2025",
      title: "The All-Time Ardmore XI",
      excerpt: "Connie McAllister selects his all-time greatest Ardmore XI from 147 years of cricket at The Bleach Green.",
    },
  ].slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="relative h-[85vh] min-h-[500px] flex items-center justify-center">
        <Image
          src="/images/ground-2.jpg"
          alt="The Bleach Green with the Faughan Valley"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-dark/70 via-navy-dark/50 to-navy-dark/80" />
        <div className="relative text-center text-white px-4 max-w-3xl">
          <p className="text-gold font-medium tracking-[0.3em] uppercase text-sm mb-4">Established 1879</p>
          <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl font-bold mb-4 leading-tight">
            Ardmore<br />Cricket Club
          </h1>
          <p className="text-lg sm:text-xl text-gray-200 mb-8 max-w-xl mx-auto">
            <span className="hidden sm:inline">The Bleach Green, Ardmore, Co. Derry — </span>Home of cricket in the North West since 1879
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/draw" className="bg-gold text-navy font-semibold px-8 py-3 rounded-md hover:bg-gold-light transition-colors text-lg">
              Join the Weekly Draw
            </a>
            <a href="/about" className="border-2 border-white text-white font-semibold px-8 py-3 rounded-md hover:bg-white/10 transition-colors text-lg">
              About the Club
            </a>
          </div>
        </div>
      </section>

      <NextMatch />

      {/* About Snippet */}
      <section className="py-16 sm:py-20 bg-cream">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy mb-6">Welcome to The Bleach Green</h2>
          <p className="text-lg text-navy/70 leading-relaxed max-w-3xl mx-auto mb-8 text-left sm:text-center">
            Nestled beneath the Faughan Valley in Ardmore, Co. Derry, our club has been the heart of cricket in the North West since 1879. From senior league champions to thriving youth teams, Ardmore Cricket Club is built on community, competition, and a love of the game.
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-6 mt-10">
            <Stat value="1879" label="Founded" />
            <Stat value="6" label="Teams" />
            <Stat value="55" label="Honours" />
          </div>
        </div>
      </section>

      {/* Weekly Draw CTA */}
      <section className="relative py-20">
        <Image
          src="/images/ground-3.jpg"
          alt="The Bleach Green"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-navy-dark/85" />
        <JackpotSection />
      </section>

      {/* Photo Gallery */}
      <section className="py-16 sm:py-20 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy text-center mb-10">Life at Ardmore</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <GalleryImage src="/images/trophy-1.jpg" alt="Team celebrating with trophy" className="sm:col-span-2 lg:col-span-1 lg:row-span-2" tall />
            <GalleryImage src="/images/team-1.jpg" alt="Cup-winning squad photo" />
            <GalleryImage src="/images/ground-3.jpg" alt="The Bleach Green with clubhouse" />
            <GalleryImage src="/images/team-2.jpg" alt="Squad photo" />
          </div>
        </div>
      </section>

      {/* Latest News */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy mb-8 text-center">Latest News</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {latestNewsCards.map((article) => {
              const categoryClass = newsCategoryColors[article.category] || "text-gray-700 bg-gray-100";
              return (
                <a
                  key={`${article.href}-${article.title}`}
                  href={article.href}
                  target={article.external ? "_blank" : undefined}
                  rel={article.external ? "noopener noreferrer" : undefined}
                  className="bg-cream rounded-lg p-6 border border-gray-100 hover:shadow-md transition-shadow block"
                >
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${categoryClass}`}>{article.category}</span>
                  <span className="text-xs text-navy/40 ml-2">{article.date}</span>
                  <h3 className="font-heading text-lg font-bold text-navy mt-3 mb-2">{article.title}</h3>
                  <p className="text-sm text-navy/70 leading-relaxed">{article.excerpt}</p>
                </a>
              );
            })}
          </div>
          <div className="text-center">
            <a href="/news" className="bg-navy text-white px-6 py-3 rounded-md hover:bg-navy-light transition-colors font-medium">
              View All News
            </a>
          </div>
        </div>
      </section>


      {/* Kit Shop */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-flex items-center rounded-full bg-navy/10 text-navy px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            Club Kit
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy mt-4 mb-4">Ardmore Kit Shop</h2>
          <p className="text-navy/60 mb-8 max-w-2xl mx-auto">
            Browse official Ardmore Cricket Club kit and training wear through the club shop at O&apos;Neills.
          </p>
          <a
            href="https://www.oneills.com/shop-by-team/cricket/ardmore-cricket-club.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-navy text-white font-semibold px-8 py-3 rounded-md hover:bg-navy-light transition-colors"
          >
            Shop Now at O&apos;Neills
          </a>
        </div>
      </section>

      {/* Sponsors */}
      <section className="py-16 bg-cream">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy mb-4">Sponsor Your Club</h2>
          <p className="text-navy/60 mb-8 max-w-2xl mx-auto">Partner with Ardmore Cricket Club and connect your brand with over 145 years of sporting heritage in the North West.</p>
          <a href="/sponsors" className="inline-block bg-gold text-navy font-semibold px-8 py-3 rounded-md hover:bg-gold-light transition-colors">
            Sponsorship Packages
          </a>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-heading text-3xl sm:text-4xl font-bold text-gold">{value}</div>
      <div className="text-sm text-navy/60 mt-1">{label}</div>
    </div>
  );
}

function GalleryImage({ src, alt, className = "", tall = false }: { src: string; alt: string; className?: string; tall?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-lg group ${tall ? "h-80 sm:h-full min-h-[300px]" : "h-56 sm:h-64"} ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-navy-dark/0 group-hover:bg-navy-dark/30 transition-colors duration-300" />
    </div>
  );
}
