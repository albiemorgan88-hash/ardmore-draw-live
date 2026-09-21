import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "From the Archives: Ardmore in the Papers — Ardmore Cricket Club",
  description:
    "Fifteen Ardmore Cricket Club archive photographs and newspaper clippings, including Ardmore 2nd XI, Raman Lamba and trophy presentations.",
  openGraph: {
    title: "From the Archives: Ardmore in the Papers",
    description:
      "A small selection of Ardmore Cricket Club archive photographs and newspaper clippings.",
    url: "https://ardmorecricket.com/news/ardmore-archive-clippings",
    siteName: "Ardmore Cricket Club",
    images: [
      {
        url: "https://ardmorecricket.com/images/archive/ardmore-2nd-xi-1991-sentinel.jpg",
        width: 800,
        height: 518,
        alt: "Ardmore 2nd XI newspaper clipping",
      },
    ],
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "From the Archives: Ardmore in the Papers",
    description: "Fifteen archive photographs and newspaper clippings from Ardmore Cricket Club.",
    images: ["https://ardmorecricket.com/images/archive/ardmore-2nd-xi-1991-sentinel.jpg"],
  },
};

const clippings = [
  {
    src: "/images/archive/ardmore-2nd-xi-1991-sentinel.jpg",
    alt: "The Ardmore 2nd XI newspaper clipping from The Sentinel, 28 June 1991",
    title: "Ardmore 2nd XI — The Sentinel, June 28, 1991",
    caption:
      "The Ardmore 2nd XI who played the Glendermott 2nd XI in Division 5 of the North West Cricket League on Saturday.",
  },
  {
    src: "/images/archive/raman-lamba-holywood-schweppes.jpg",
    alt: "Raman Lamba bowling for Ardmore against Holywood at the Bleach Green",
    title: "Raman Lamba at the Bleach Green",
    caption:
      "Raman Lamba, of Ardmore, clean bowls Shannon, of Holywood, during the local’s Schweppes second round victory over Holywood at the Bleach Green. (28/5 D16)",
  },
  {
    src: "/images/archive/raman-lamba-man-of-match-george-gillen-stumping.jpg",
    alt: "Raman Lamba receiving a Schweppes Man of the Match award and George Gillen collecting an Ardmore return at the stumps",
    title: "Raman Lamba award and George Gillen at the stumps",
    caption:
      "North-West umpire John Devine, the adjudicator for the Schweppes' Man of the Match, presents Ardmore's professional, Raman Lamba, with the award. Lamba scored 117. (28/5/D15) Head down for the Holywood batsman as George Gillen, the wicket-keeper, jumps to collect an Ardmore return at the stumps. (28/5/D17)",
  },
  {
    src: "/images/archive/raman-lamba-welcomed-bleach-green.jpg",
    alt: "Raman Lamba being welcomed to the Bleach Green by Ardmore officials",
    title: "Raman Lamba welcomed to the Bleach Green",
    caption:
      "Former Indian test cricket star Raman Lamba is welcomed to the Bleach Green by Ardmore's Secretary Bobby Brolly. Also pictured are on right, Paddy Semple, Club captain and Dermot Ward, Chairman. (18/4/D50)",
  },
  {
    src: "/images/archive/eddie-gallagher-holywood-boundary-catch.jpg",
    alt: "Eddie Gallagher taking a catch on the boundary for Ardmore against Holywood",
    title: "Eddie Gallagher boundary catch",
    caption:
      "Eddie Gallagher, of Ardmore, shows a safe pair of hands as he clutches a massive Holywood hit right on the boundary. (28/5/D18)",
  },
  {
    src: "/images/archive/bobby-brolly-charlie-mcgowan-1986-intermediate-cup.jpg",
    alt: "Bobby Brolly and Charlie McGowan walking out to field for Ardmore Cricket Club in 1986",
    title: "Bobby Brolly and Charlie McGowan — Derry Journal, 29 July 1986",
    caption:
      "Bobby Brolly, on left, and Charlie McGowan, Ardmore Cricket Club, going out to field on Saturday in the final of the North-West Intermediate Cricket Cup against Glendermott II's at Burndennett. Bobby has been playing cricket for 45 years and Charlie for 35-years. Between them they have notched up 36 cup final appearances from junior to senior level.",
  },
  {
    src: "/images/archive/ardmore-v-bready-division-one-1991.jpg",
    alt: "Ardmore team photograph before playing Bready in Division One at Magheramason in 1991",
    title: "Ardmore v Bready — The Sentinel, May 9, 1991",
    caption:
      "The Ardmore team which played Bready in division one of the North West Cricket League at Magheramason on Saturday. 197LS2K",
  },
  {
    src: "/images/archive/brigade-v-ardmore-paul-brolly-paddy-semple.jpg",
    alt: "Brigade players celebrating wickets against Ardmore, including Paul Brolly and Paddy Semple",
    title: "Brigade v Ardmore — Paul Brolly and Paddy Semple",
    caption:
      "Doug Huey of Brigade celebrates the dismissal of Ardmore's Paul Brolly. (13/9/D27) A direct throw from Smyth of Brigade hits the wicket to run out Paddy Semple of Ardmore. (13/9/D28)",
  },
  {
    src: "/images/archive/ardmore-intermediate-cup-victory-drummond.jpg",
    alt: "Ardmore Intermediate side with cup after victory over Drummond",
    title: "Ardmore Intermediate cup victory over Drummond",
    caption:
      "Ardmore Intermediate side proudly show off the cup following their victory over Drummond on Saturday. Back row from left are S. Ward, E. Donnelly, N. Ward, B. O'Neill, D. Elliot, E. King, R. McGinley and B. Brolly, president. Front row from left, D. McAllister, M. Gormley, C. McAllister, D. Ward, captain, C. Ward and K. Semple. (9/7/D11)",
  },
  {
    src: "/images/archive/cyril-ward-man-of-the-match-intermediate-b-cup-final.jpg",
    alt: "Cyril Ward receiving Man of the Match award after the Intermediate B Cup final",
    title: "Cyril Ward — Man of the Match",
    caption:
      "Cyril Ward of Ardmore being presented with the ‘Man of the Match’ award following the Intermediate B Cup final by North West umpires, Jim Kilgore and Jim Finlay. (9/7/D12)",
  },
  {
    src: "/images/archive/ardmore-v-strabane-senior-league.jpg",
    alt: "Ardmore team photograph before meeting Strabane in the North West Senior League",
    title: "Ardmore v Strabane — North West Senior League",
    caption:
      "The Ardmore team which met Strabane in the North West Senior League on Saturday. 15TLS26K",
  },
  {
    src: "/images/archive/ardmore-presentation-dinner-award-winners.jpg",
    alt: "Ardmore Cricket Club presentation dinner award winners at the White Horse",
    title: "Presentation dinner award winners",
    caption:
      "Award winners pictured at the Ardmore C.C. presentation dinner held at the White Horse. Front (left to right) Martin Gormley (newcomer), Bobby Brolly (secretary), Eddie Donnelly (newcomer), back (left to right) David Cooke (batting), Paddy Semple (clubman), Nigel Thompson (bowling). (22/9 E23P)",
  },
  {
    src: "/images/archive/denis-ward-intermediate-division-v-trophy.jpg",
    alt: "Ardmore captain Denis Ward receiving the Intermediate Division V trophy from Jim Lindsay",
    title: "Intermediate Division V trophy",
    caption:
      "Ardmore captain, Denis Ward, receives the Intermediate Division V trophy from Jim Lindsay, secretary of the N.W.C.U. (10/9/D6)",
  },
  {
    src: "/images/archive/ardmore-archive-team-photograph.jpg",
    alt: "Ardmore Cricket Club archive team photograph",
    title: "Archive team photograph",
    caption:
      "Ardmore Cricket Club archive team photograph. No printed caption is visible on this copy.",
  },
  {
    src: "/images/archive/ardmore-trophy-team-archive-photograph.jpg",
    alt: "Ardmore Cricket Club trophy team archive photograph",
    title: "Trophy team archive photograph",
    caption:
      "Ardmore Cricket Club trophy team archive photograph. No printed caption is visible on this copy.",
  },
];

export default function ArdmoreArchiveClippingsPage() {
  return (
    <>
      <section className="bg-navy py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="mb-4">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              History
            </span>
          </div>
          <h1 className="font-heading text-3xl sm:text-5xl font-bold text-white mb-3">
            From the Archives: Ardmore in the Papers
          </h1>
          <p className="text-gold text-lg">
            Archive photographs and newspaper clippings from the club archive
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <article className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 sm:p-10">
            <div className="prose prose-lg max-w-none text-navy/80">
              <p className="text-lg leading-relaxed">
                A small selection from the Ardmore Cricket Club archive — preserving the original captions shown on the clippings.
              </p>
            </div>

            <div className="mt-8 space-y-10">
              {clippings.map((clipping) => (
                <figure
                  key={clipping.src}
                  className="rounded-xl border border-gray-100 bg-cream/60 p-4 sm:p-5"
                >
                  <div className="relative mx-auto overflow-hidden rounded-lg bg-white shadow-sm">
                    <Image
                      src={clipping.src}
                      alt={clipping.alt}
                      width={1000}
                      height={760}
                      className="h-auto w-full object-contain"
                      sizes="(max-width: 768px) 100vw, 896px"
                    />
                  </div>
                  <figcaption className="mt-4">
                    <h2 className="font-heading text-xl font-bold text-navy">
                      {clipping.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-navy/70">
                      {clipping.caption}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <a
                href="/news"
                className="text-gold font-medium text-sm hover:underline inline-flex items-center gap-1"
              >
                ← Back to Club News
              </a>
              <a
                href="/archive"
                className="text-gold font-medium text-sm hover:underline inline-flex items-center gap-1"
              >
                View the full archive →
              </a>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
