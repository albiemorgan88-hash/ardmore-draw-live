import { NextResponse } from 'next/server';

export const revalidate = 3600; // Cache for 1 hour

const ARDMORE_FIXTURE_DELAY_DAYS = 7;

interface FixtureMatch {
  team1Name?: string;
  team2Name?: string;
  team1Club?: string;
  team2Club?: string;
  hasScores?: boolean;
  result?: string;
  startDateTime: string;
  startDateFormatted?: string;
  [key: string]: unknown;
}

interface FixturesResponse {
  matches?: FixtureMatch[];
  counts?: unknown;
}

function isArdmoreMatch(match: FixtureMatch) {
  return (
    (match.team1Name || '').includes('Ardmore') ||
    (match.team2Name || '').includes('Ardmore') ||
    (match.team1Club || '').includes('Ardmore') ||
    (match.team2Club || '').includes('Ardmore')
  );
}

function shiftDateByDays(dateStr: string, days: number) {
  const date = new Date(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export async function GET() {
  try {
    const res = await fetch('https://stumpstats.com/api/fixtures?union=nwcu', {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch fixtures' }, { status: 502 });
    }

    const data = (await res.json()) as FixturesResponse;
    const now = new Date();

    // Temporary override: Ardmore fixtures were pushed back a week locally,
    // but the upstream StumpStats feed has not caught up yet.
    const matches = (data.matches || [])
      .filter((match) => isArdmoreMatch(match))
      .map((match) => {
        const isUpcomingFixture = !match.hasScores && !match.result && new Date(match.startDateTime) > now;

        if (!isUpcomingFixture) return match;

        return {
          ...match,
          startDateTime: shiftDateByDays(match.startDateTime, ARDMORE_FIXTURE_DELAY_DAYS),
          startDateFormatted: match.startDateFormatted || shiftDateByDays(match.startDateTime, ARDMORE_FIXTURE_DELAY_DAYS),
        };
      });

    return NextResponse.json({ matches, counts: data.counts });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch fixtures' }, { status: 500 });
  }
}
