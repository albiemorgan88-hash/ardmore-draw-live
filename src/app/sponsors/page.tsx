import Image from "next/image";
import MatchBallSponsorshipSection from "@/components/MatchBallSponsorshipSection";

const sponsors = [
  {
    name: "GR Scaffolding Ltd",
    tier: "Gold Sponsor",
    logo: "/sponsors/gr-scaffolding-ltd.jpg",
    services: "Erect - Dismantle - Hire",
  },
  {
    name: "SHEQ Management Services Ltd",
    tier: "Bronze Sponsor",
    logo: "/sponsors/sheq-management-services.png",
    url: "https://sheqmanagementservices.com/",
  },
];

export default function SponsorsPage() {
  return (
    <>
      <section className="relative py-16">
        <Image src="/images/ground-2.jpg" alt="The Bleach Green" fill className="object-cover" />
        <div className="absolute inset-0 bg-navy-dark/75" />
        <div className="relative text-center text-white px-4">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-2">Our Sponsors</h1>
          <p className="text-gold text-lg">Supporting cricket in the community</p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="inline-flex items-center rounded-full bg-gold/20 text-navy px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              Club Sponsors
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy mt-4 mb-3">Gold Sponsors</h2>
            <p className="text-navy/60 max-w-2xl mx-auto">
              Thanks to the local businesses backing Ardmore Cricket Club this season.
            </p>
          </div>

          <div className="mb-12">
            {sponsors.filter((sponsor) => sponsor.tier === "Gold Sponsor").map((sponsor) => (
              <div
                key={sponsor.name}
                className="rounded-xl border-2 border-gold bg-cream p-4 text-center shadow-md sm:p-6"
              >
                <div className="relative mx-auto mb-5 aspect-[2/1] w-full max-w-3xl overflow-hidden rounded-lg bg-white">
                  <Image
                    src={sponsor.logo}
                    alt={`${sponsor.name} sponsor artwork`}
                    fill
                    sizes="(min-width: 1024px) 768px, 90vw"
                    className="object-contain"
                  />
                </div>
                <h3 className="font-heading text-xl font-bold text-navy">{sponsor.name}</h3>
                <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-gold">{sponsor.tier}</p>
                <p className="mt-3 text-sm font-medium uppercase tracking-wide text-navy/60">{sponsor.services}</p>
              </div>
            ))}
          </div>

          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-navy mb-6 text-center">Bronze Sponsors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sponsors.filter((sponsor) => sponsor.tier === "Bronze Sponsor").map((sponsor) => (
              <a
                key={sponsor.name}
                href={sponsor.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visit ${sponsor.name}`}
                className="group rounded-xl border border-gray-200 bg-cream p-6 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gold"
              >
                <div className="relative mx-auto mb-5 h-32 w-full overflow-hidden rounded-lg bg-white p-4">
                  <Image
                    src={sponsor.logo}
                    alt={`${sponsor.name} logo`}
                    fill
                    sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 90vw"
                    className="object-contain"
                  />
                </div>
                <h3 className="font-heading text-xl font-bold text-navy">{sponsor.name}</h3>
                <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-gold">{sponsor.tier}</p>
                <p className="mt-3 text-sm text-navy/60 group-hover:text-navy">Visit website</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-cream">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-heading text-2xl font-bold text-navy mb-4">Join Our Sponsors</h2>
          <p className="text-navy/60 mb-6">We&apos;re building our sponsor family for the 2026 season. Be among the first to partner with Ardmore Cricket Club and get premium visibility across matchdays, digital platforms, and our community of members and supporters.</p>
        </div>
      </section>

      <MatchBallSponsorshipSection />

      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-heading text-3xl font-bold text-navy mb-4">Become a Sponsor</h2>
          <p className="text-navy/70 text-lg mb-8 leading-relaxed">
            Partner with Ardmore Cricket Club and connect your brand with over 145 years of sporting heritage. 
            Our sponsorship packages offer visibility across matchdays, social media, and our digital platforms.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            <div className="bg-cream rounded-lg p-6 border border-gray-200">
              <h3 className="font-heading text-xl font-bold text-navy mb-2">Bronze</h3>
              <p className="text-gold font-heading text-2xl font-bold mb-3">£250<span className="text-sm text-navy/50 font-body">/season</span></p>
              <ul className="text-sm text-navy/70 space-y-1 text-left">
                <li>• Website logo placement</li>
                <li>• Social media mention</li>
              </ul>
            </div>
            <div className="bg-cream rounded-lg p-6 border-2 border-gold relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-navy text-xs font-bold px-3 py-1 rounded-full">Popular</span>
              <h3 className="font-heading text-xl font-bold text-navy mb-2">Silver</h3>
              <p className="text-gold font-heading text-2xl font-bold mb-3">£500<span className="text-sm text-navy/50 font-body">/season</span></p>
              <ul className="text-sm text-navy/70 space-y-1 text-left">
                <li>• Everything in Bronze</li>
                <li>• Kit branding</li>
                <li>• Matchday signage</li>
              </ul>
            </div>
            <div className="bg-cream rounded-lg p-6 border border-gray-200">
              <h3 className="font-heading text-xl font-bold text-navy mb-2">Gold</h3>
              <p className="text-gold font-heading text-2xl font-bold mb-3">£1000<span className="text-sm text-navy/50 font-body">/season</span></p>
              <ul className="text-sm text-navy/70 space-y-1 text-left">
                <li>• Everything in Silver</li>
                <li>• Main kit sponsor</li>
                <li>• Ground naming rights</li>
                <li>• VIP matchday access</li>
              </ul>
            </div>
          </div>
          <a href="mailto:ardmorecricketclub@gmail.com" className="bg-gold text-navy font-bold px-10 py-4 rounded-md text-lg hover:bg-gold-light transition-colors inline-block">
            Get in Touch
          </a>
        </div>
      </section>
    </>
  );
}
