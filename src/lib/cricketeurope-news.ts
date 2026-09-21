export type CricketEuropeArticle = {
  id: string;
  title: string;
  date: string;
  category: string;
  excerpt: string;
  body: string;
  source: "CricketEurope";
  sourceUrl: string;
  featured?: boolean;
  publishedAt: string;
};

const CRICKET_EUROPE_BASE = "https://www.cricketeurope.com";
const DEFAULT_NEWS_CUTOFF_ISO = "2026-05-26T09:45:00Z";
const INDEX_URLS = [
  "https://www.cricketeurope.com/NEWSROOM/NEWS/ALL/index.shtml",
  "https://www.cricketeurope.com/NEWSROOM/NEWS/NORTHWEST/index.shtml",
];

function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&hellip;/g, "...")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-");
}

function cleanHtml(value: string) {
  return decodeEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function parseCricketEuropeDate(raw: string, rawTime?: string) {
  const [month, day, year] = raw.split("-").map(Number);
  if (!month || !day || !year) return { display: raw, iso: raw };

  const time = rawTime?.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  let hour = 12;
  let minute = 0;
  if (time) {
    hour = Number(time[1]);
    minute = Number(time[2]);
    const period = time[3].toLowerCase();
    if (period === "pm" && hour !== 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
  }

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return {
    display: date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }),
    iso: date.toISOString(),
  };
}

function classifyArticle(title: string, excerpt: string) {
  const text = `${title} ${excerpt}`.toLowerCase();
  if (text.includes("photo")) return "Photos";
  if (text.includes("cup")) return "Cup";
  if (text.includes("win") || text.includes("victor") || text.includes("beat") || text.includes("defeat")) {
    return "Match Reports";
  }
  if (text.includes("signing") || text.includes("joins") || text.includes("switch")) return "Transfer News";
  return "CricketEurope";
}

async function fetchIndex(url: string) {
  const response = await fetch(url, {
    headers: { "user-agent": "ArdmoreCricket.com news updater" },
    next: { revalidate: 60 * 30 },
    signal: AbortSignal.timeout(3500),
  });

  if (!response.ok) throw new Error(`CricketEurope ${response.status} for ${url}`);
  const buffer = await response.arrayBuffer();
  return new TextDecoder("windows-1252").decode(buffer);
}

function parseIndex(html: string): CricketEuropeArticle[] {
  const articles: CricketEuropeArticle[] = [];
  const articlePattern =
    /<div class\s*=\s*"articleSummary">([\s\S]*?)(?=<div class\s*=\s*"articleSummary">|<div class\s*=\s*"twoColLeft">|$)/g;

  for (const match of html.matchAll(articlePattern)) {
    const block = match[1];
    const headline = block.match(/<a class\s*=\s*"headline" href\s*=\s*"([^"]+)">\s*([\s\S]*?)<\/a>/);
    const date = block.match(/writeDate\("([^"]+)"\)/);
    const time = block.match(/ZZZZ\s*([^Z]+?)\s*ZZZZ/);
    const story = block.match(/<div class\s*=\s*"story">\s*([\s\S]*?)<\/div>/);

    if (!headline || !date || !story) continue;

    const [, href, rawTitle] = headline;
    const rawDate = date[1];
    const rawTime = time?.[1];
    const rawStory = story[1];
    const title = cleanHtml(rawTitle);
    const excerpt = cleanHtml(rawStory);
    const haystack = `${title} ${excerpt}`.toLowerCase();

    if (!haystack.includes("ardmore")) continue;

    const url = new URL(href, CRICKET_EUROPE_BASE).toString();
    const parsedDate = parseCricketEuropeDate(rawDate, rawTime);
    articles.push({
      id: `cricketeurope-${url.split("/").filter(Boolean).pop()?.replace(/\W+/g, "-") || articles.length}`,
      title,
      date: parsedDate.display,
      category: classifyArticle(title, excerpt),
      excerpt,
      body: excerpt,
      source: "CricketEurope",
      sourceUrl: url,
      featured: true,
      publishedAt: parsedDate.iso,
    });
  }

  return articles;
}

export async function getCricketEuropeArdmoreArticles(limit = 8) {
  try {
    const cutoffIso = process.env.CRICKETEUROPE_NEWS_CUTOFF || DEFAULT_NEWS_CUTOFF_ISO;
    const cutoffTime = Date.parse(cutoffIso);
    const pages = await Promise.allSettled(INDEX_URLS.map(fetchIndex));
    const byUrl = new Map<string, CricketEuropeArticle>();

    for (const page of pages) {
      if (page.status !== "fulfilled") {
        console.error("Failed to fetch CricketEurope news:", page.reason);
        continue;
      }
      for (const article of parseIndex(page.value)) {
        byUrl.set(article.sourceUrl, article);
      }
    }

    return [...byUrl.values()]
      .filter((article) => Number.isNaN(cutoffTime) || Date.parse(article.publishedAt) > cutoffTime)
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
      .slice(0, limit);
  } catch (error) {
    console.error("CricketEurope feed failed:", error);
    return [];
  }
}
