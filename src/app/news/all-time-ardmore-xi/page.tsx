import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All-Time Ardmore XI — Ardmore Cricket Club",
  description:
    "Former player, international umpire and NW President Connie McAllister selects his all-time greatest Ardmore XI from 147 years of cricket at The Bleach Green.",
  openGraph: {
    title: "All-Time Ardmore XI",
    description:
      "Connie McAllister picks his all-time greatest Ardmore XI — from Bobby Baird to Decker Curry, 147 years of cricket legends at The Bleach Green.",
    url: "https://ardmorecricket.com/news/all-time-ardmore-xi",
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
    title: "All-Time Ardmore XI — Ardmore Cricket Club",
    description:
      "Connie McAllister picks his all-time greatest Ardmore XI from 147 years of Bleach Green cricket.",
    images: ["https://ardmorecricket.com/ardmore-og.png"],
  },
};

const players = [
  {
    name: "Bobby Baird",
    description:
      "A fearsome opening pace bowler who once took 100 wickets in a season. I can only wish we had the likes of him now. A very modest man who had tons of ability.",
  },
  {
    name: "Cyril Ward (jun)",
    description:
      "A great and very stylish left-handed batsman who could score very quickly. He was part of the NW Guinness Cup winning side in the first year of the interpros and for many years afterwards. He could be a little talkative but second to none as a superb opening batsman.",
  },
  {
    name: "Sanjeev Sharma (pro)",
    description:
      "Probably the best all-rounder to have ever played for Ardmore. He was a very prolific wicket-taker and could be devastating with his pacy inswinging Yorkers. He also scored heavily and consistently. He of course played Test cricket for India and you don\u2019t do that unless you are exceptional, which he certainly was. He just edged out Raman Lamba in my choice, given Raman was only here one season.",
  },
  {
    name: "Patsy McDermott (w/k)",
    description:
      "His selection may come as a surprise but I have my reasons. He had the best attitude to competitions I ever saw. He had a great attitude and never gave up no matter what the match situation. He was an inspiration to younger members of the side. He would never let you down.",
  },
  {
    name: "Decker Curry",
    description:
      "One of the greatest big hitters of all-time whose century scoring feats are legendary \u2014 99 in his career. A delight to watch in full flow \u2014 as long as you weren\u2019t bowling to him. He was also a very useful spinner and had bucket hands in the slips. He also had a great attitude \u2014 he was a winner and that rubbed off on others. He should have won more than 50 caps for Ireland. He was a class act.",
  },
  {
    name: "Willie Dunlop",
    description:
      "A great cricketer who loved to pass on his knowledge to younger players. He was a very talented batsman in the 1950s and 60s and also a more than useful spin option when called upon.",
  },
  {
    name: "Jackie Laird",
    description:
      "One of the best all-rounders Ardmore ever had. I remember as a young boy watching him score a century against Eglinton in a Faughan Valley Cup game on the first night, and the following night when the game resumed he took a hat-trick. A remarkable feat, and one that I can\u2019t recall happening since in a senior game. A miraculous performance.",
  },
  {
    name: "Nigel Thompson",
    description:
      "To date the only captain from Ardmore to bring home the Senior Cup. Without doubt the proudest moment for the club who to that point had lost eight finals and many thought that the so called \u2018Gypsy curse\u2019 would never be broken. An excellent all-rounder who represented Ireland on many occasions.",
  },
  {
    name: "Brendan McAllister",
    description:
      "I hesitated to include my brother Brendan in case I\u2019d leave myself open to accusations of nepotism. But I remembered talking with Tommy Harpur of Sion Mills a few years ago and he was of the opinion that Brendan was the best all-rounder Ardmore had ever produced. That was good enough for me. Brendan was another excellent all-rounder, and like many of the team left-handed, and was a quite superb fielder. His catch to dismiss Hanif Mohammed at Strabane for the North West was one of the best ever seen.",
  },
  {
    name: "Bobby Brolly",
    description:
      "An opening bat of distinction and probably the best clubman Ardmore ever had. He will go down in the annals of the club history as \u2018Mr Cricket\u2019 in the Ardmore area. He was dedicated to the club for all of his life and at times held the club together through some very tough passages. He almost single-handedly kept youth cricket going at the Green when it seemed to be on the brink.",
  },
  {
    name: "George Brolly",
    description:
      "I\u2019ve saved my old friend George to last. A great bowler who again was part of the inaugural NW Guinness Cup winning side. George had some legendary performances taking nine wickets in a senior game at least twice to my knowledge. He was also a very useful attacking middle-order batsman.",
  },
];

export default function AllTimeArdmoreXIPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-navy py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="mb-4">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              History
            </span>
          </div>
          <h1 className="font-heading text-3xl sm:text-5xl font-bold text-white mb-3">
            The All-Time Ardmore XI
          </h1>
          <p className="text-gold text-lg">
            Selected by Connie McAllister — March 2025
          </p>
        </div>
      </section>

      {/* Article Body */}
      <section className="py-12 sm:py-16 bg-cream">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <article className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 sm:p-10">
            <div className="prose prose-lg max-w-none text-navy/80">
              <p className="text-lg leading-relaxed">
                We continue our series of club all-time greatest XI&apos;s and
                this time it&apos;s the turn of Ardmore. Former player,
                international umpire and NW President Connie McAllister selects
                his side and as always it&apos;s given him plenty of food for
                thought.
              </p>
              <p>
                Our &lsquo;rules&rsquo; don&apos;t allow for judges to include
                themselves, otherwise Connie himself would have come in for
                serious consideration as the left-arm spinner is one of, if not
                the leading senior wicket taker for the Bleachgreen club formed
                in 1879.
              </p>

              <h2 className="font-heading text-2xl font-bold text-navy mt-10 mb-6">
                The XI
              </h2>

              <div className="space-y-6">
                {players.map((player, i) => (
                  <div
                    key={player.name}
                    className="bg-cream rounded-lg p-5 border-l-4 border-gold"
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="text-gold font-heading text-lg font-bold shrink-0">
                        {i + 1}.
                      </span>
                      <div>
                        <h3 className="font-heading text-lg font-bold text-navy uppercase tracking-wide">
                          {player.name}
                        </h3>
                        <p className="text-navy/70 mt-2 leading-relaxed text-base">
                          {player.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <h2 className="font-heading text-2xl font-bold text-navy mt-10 mb-4">
                Honourable Mentions
              </h2>
              <p>
                Of course there have been a lot of great cricketers at the club
                over the last 147 years and I&apos;d like to give some of them
                honourable mentions in my deliberations.
              </p>
              <p>
                The Cooke brothers were exceptionally talented cricketers but
                their nomadic nature meant they were only at the club a short
                while. For the same reason I discounted Mark Gillespie who was
                only at the club for a very successful year back in 2002,
                helping them to two trophies, and has already been included in
                the all-time Strabane XI chosen by Joe Doherty.
              </p>
              <p>
                Tom McDermott was another given serious consideration as was
                Charlie McGowan. Charlie was a lion-hearted man who would never
                let you down. Gerard Brolly was another who came very close to
                selection. I was a little concerned though about his temperament
                which could if things didn&apos;t go his way upset team harmony.
              </p>
              <p>
                Others who came close to making the cut were Gerard Ward, George
                Gillen and Marcus Taylor. Marcus was one of the cricketers that
                I played with that I admired the most and was a member of the
                All-Ireland Junior Cup winning side when we beat Tramore down in
                Dublin. Eamon McLaughlin was an excellent bat, while Willie
                Elliott was a great cricketer who I&apos;m guessing not many
                know also played soccer with Bohemians in Dublin — a very
                talented all-round sportsman.
              </p>
              <p>
                Paul Brolly was another, who has continued in the same vein as
                his father, keeping the Brolly legacy very much alive in
                Ardmore. Together with his two sons and others are very
                enthusiastic about getting excellent pitches prepared and the
                ground looking as well as it can be.
              </p>
              <p>
                Ardmore have been blessed with some great club people down the
                years with the likes of Dermot and Noel Ward too.
              </p>

              <h2 className="font-heading text-2xl font-bold text-navy mt-10 mb-4">
                Champagne Moment
              </h2>
              <p>
                If I was allowed to have a champagne moment for a player it
                would have to be Edwin &lsquo;Ding&rsquo; Gallagher for his
                display in winning the Faughan Valley Cup against Donemana in
                the early 90&apos;s. We needed 45 off four overs with not many
                wickets left. Thanks to Ding&apos;s unbeaten 34 off 10 balls we
                won it with an over to spare! He also caught a great catch that
                day — the Man of the Match trophy when it was thrown at him in
                the post-match presentation&hellip;
              </p>

              <div className="bg-cream rounded-lg p-6 border border-gold/30 mt-8">
                <p className="text-navy font-medium italic">
                  &ldquo;I&apos;ve no doubt the side I&apos;ve selected would
                  score 300 plus every week and with five fast bowlers and three
                  spinners would have little trouble bowling sides out too. Just
                  as importantly as far as I&apos;m concerned it&apos;s well
                  balanced in terms of entertainment afterwards in the bar with
                  singers, comedians and jokers!!&rdquo;
                </p>
                <p className="text-navy/60 mt-2 text-sm">— Connie McAllister</p>
              </div>
            </div>

            {/* Source Credit */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <a
                href="/news"
                className="text-gold font-medium text-sm hover:underline inline-flex items-center gap-1"
              >
                ← Back to Club News
              </a>
              <p className="text-sm text-navy/40 italic">
                Originally published on{" "}
                <a
                  href="https://www.cricketeurope.com/DATABASE/ARTICLES2025/articles/000027/002706.shtml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-navy/60 hover:underline"
                >
                  CricketEurope
                </a>
              </p>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
