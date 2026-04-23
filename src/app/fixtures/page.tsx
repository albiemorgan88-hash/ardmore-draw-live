'use client';

import Image from "next/image";
import { useState, useEffect } from "react";

interface Match {
  id: string;
  title: string;
  shortTitle: string;
  startDateTime: string;
  startDateFormatted: string;
  competitionName: string;
  team1Name: string;
  team1Club: string;
  team1Image: string;
  team1Scores: string | null;
  team2Name: string;
  team2Club: string;
  team2Image: string;
  team2Scores: string | null;
  venueName: string;
  venueCity: string;
  result: string;
  hasScores: boolean;
  status: string;
}

function isArdmoreMatch(match: Match): boolean {
  return (
    match.team1Club?.toLowerCase().includes('ardmore') ||
    match.team2Club?.toLowerCase().includes('ardmore') ||
    match.team1Name?.toLowerCase().includes('ardmore') ||
    match.team2Name?.toLowerCase().includes('ardmore')
  );
}

function isArdmoreHome(match: Match): boolean {
  return (
    match.team1Club?.toLowerCase().includes('ardmore') ||
    match.team1Name?.toLowerCase().includes('ardmore')
  );
}

function getTeamXI(match: Match): string {
  const ardmoreName = isArdmoreHome(match) ? match.team1Name : match.team2Name;
  if (ardmoreName.includes('2nd') || ardmoreName.includes('2 ')) return '2nd XI';
  if (ardmoreName.includes('3rd') || ardmoreName.includes('3 ')) return '3rd XI';
  return '1st XI';
}

function getOpponent(match: Match): { name: string; logo: string } {
  if (isArdmoreHome(match)) {
    return { name: match.team2Name, logo: match.team2Image };
  }
  return { name: match.team1Name, logo: match.team1Image };
}

function getArdmoreLogo(match: Match): string {
  if (isArdmoreHome(match)) return match.team1Image;
  return match.team2Image;
}

function formatMatchDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatMatchTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getMonthYear(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function groupByMonth(matches: Match[]): Record<string, Match[]> {
  const groups: Record<string, Match[]> = {};
  for (const match of matches) {
    const key = getMonthYear(match.startDateTime);
    if (!groups[key]) groups[key] = [];
    groups[key].push(match);
  }
  return groups;
}

function TeamLogo({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-navy/50">
        {alt?.charAt(0) || '?'}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width={40}
      height={40}
      className="w-10 h-10 rounded-full object-cover bg-white border border-gray-200"
      onError={() => setError(true)}
    />
  );
}

function MatchCard({ match }: { match: Match }) {
  const isHome = isArdmoreHome(match);
  const opponent = getOpponent(match);
  const ardmoreLogo = getArdmoreLogo(match);
  const isCompleted = match.hasScores || match.result;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
      {/* Competition & Date */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-navy/50 uppercase tracking-wider">
          {match.competitionName}
        </span>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
          isHome ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {isHome ? '🏠 Home' : '✈️ Away'}
        </span>
      </div>

      {/* Teams */}
      <div className="flex items-center gap-3 mb-3">
        <TeamLogo src={ardmoreLogo} alt="Ardmore" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-navy truncate">
              {isHome ? match.team1Name : match.team2Name}
            </span>
          </div>
          <div className="text-xs text-gray-400 font-medium">vs</div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-navy truncate">
              {isHome ? match.team2Name : match.team1Name}
            </span>
          </div>
        </div>
        <TeamLogo src={opponent.logo} alt={opponent.name} />
      </div>

      {/* Result (if completed) */}
      {isCompleted && match.result && (
        <div className="bg-gold/10 border border-gold/20 rounded-md p-2 mb-3 text-center">
          <span className="text-sm font-semibold text-navy">{match.result}</span>
        </div>
      )}

      {/* Scores */}
      {match.hasScores && (match.team1Scores || match.team2Scores) && (
        <div className="flex justify-between items-center bg-cream rounded-md px-3 py-2 mb-3 text-sm font-semibold text-navy">
          <span>{match.team1Scores || '-'}</span>
          <span className="text-gray-400">—</span>
          <span>{match.team2Scores || '-'}</span>
        </div>
      )}

      {/* Date, Time, Venue */}
      <div className="flex flex-col gap-1 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span>{formatMatchDate(match.startDateTime)}</span>
          <span className="text-gray-400">·</span>
          <span>{formatMatchTime(match.startDateTime)}</span>
        </div>
        {match.venueName && (
          <div className="flex items-center gap-2">
            <span>📍</span>
            <span>{match.venueName}{match.venueCity ? `, ${match.venueCity}` : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}

type TabFilter = 'All' | '1st XI' | '2nd XI' | '3rd XI';
type ViewMode = 'fixtures' | 'results';

export default function FixturesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('fixtures');

  useEffect(() => {
    async function fetchFixtures() {
      try {
        const res = await fetch('/api/fixtures');
        if (!res.ok) throw new Error('Failed to fetch fixtures');
        const data = await res.json();
        const ardmoreMatches = (data.matches || []).filter(isArdmoreMatch);
        // Sort by date
        ardmoreMatches.sort((a: Match, b: Match) =>
          new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
        );
        setMatches(ardmoreMatches);
      } catch (err) {
        setError('Unable to load fixtures. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchFixtures();
  }, []);

  // Filter by team
  const filteredByTeam = activeTab === 'All'
    ? matches
    : matches.filter(m => getTeamXI(m) === activeTab);

  // Split into fixtures and results
  const upcomingMatches = filteredByTeam.filter(m => !m.hasScores && !m.result);
  const completedMatches = filteredByTeam.filter(m => m.hasScores || m.result).reverse();

  const displayMatches = viewMode === 'fixtures' ? upcomingMatches : completedMatches;
  const grouped = groupByMonth(displayMatches);

  const tabs: TabFilter[] = ['All', '1st XI', '2nd XI', '3rd XI'];

  return (
    <>
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[300px] flex items-center justify-center">
        <Image src="/images/ground-2.jpg" alt="The Bleach Green cricket ground" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-navy-dark/60" />
        <div className="relative text-center text-white px-4">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-2">Fixtures & Results 2026</h1>
          <p className="text-gold text-lg">All Ardmore Cricket Club matches · Powered by StumpStats</p>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Fixtures / Results Toggle */}
          <div className="flex items-center justify-center gap-2 py-3 border-b border-gray-100">
            <button
              onClick={() => setViewMode('fixtures')}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                viewMode === 'fixtures'
                  ? 'bg-navy text-white'
                  : 'bg-gray-100 text-navy/60 hover:bg-gray-200'
              }`}
            >
              Fixtures
            </button>
            <button
              onClick={() => setViewMode('results')}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                viewMode === 'results'
                  ? 'bg-navy text-white'
                  : 'bg-gray-100 text-navy/60 hover:bg-gray-200'
              }`}
            >
              Results
            </button>
          </div>

          {/* Team Tabs */}
          <div className="flex items-center gap-2 py-3 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'bg-gold text-navy'
                    : 'bg-cream text-navy/60 hover:bg-gold/20'
                }`}
              >
                {tab}
              </button>
            ))}
            <div className="ml-auto text-sm text-gray-400">
              {displayMatches.length} match{displayMatches.length !== 1 ? 'es' : ''}
            </div>
          </div>
        </div>
      </section>

      {/* Fixtures List */}
      <section className="py-10 bg-cream min-h-[400px]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {loading && (
            <div className="text-center py-16">
              <div className="inline-block w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-navy/60">Loading fixtures...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-navy/60">{error}</p>
            </div>
          )}

          {!loading && !error && displayMatches.length === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">{viewMode === 'fixtures' ? '🏏' : '📊'}</div>
              <p className="text-navy font-heading text-xl font-bold mb-2">
                {viewMode === 'fixtures' ? 'No Upcoming Fixtures' : 'No Results Yet'}
              </p>
              <p className="text-navy/60">
                {viewMode === 'fixtures'
                  ? 'Check back soon for updated fixtures.'
                  : 'Results will appear here once matches are completed.'}
              </p>
            </div>
          )}

          {!loading && !error && Object.entries(grouped).map(([month, monthMatches]) => (
            <div key={month} className="mb-10">
              <h3 className="font-heading text-2xl font-bold text-navy mb-4 flex items-center gap-3">
                <span className="w-1 h-8 bg-gold rounded-full" />
                {month}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {monthMatches.map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Links */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h3 className="font-heading text-2xl font-bold text-navy mb-6">Useful Links</h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://stumpstats.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-navy text-white px-6 py-3 rounded-lg font-semibold hover:bg-navy-light transition-colors"
            >
              StumpStats
            </a>
            <a
              href="https://northwestcricket.com/clubs/ardmore-cricket-club/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gold text-navy px-6 py-3 rounded-lg font-semibold hover:bg-gold-light transition-colors"
            >
              Our NWCU Profile
            </a>
            <a
              href="/about"
              className="border border-navy text-navy px-6 py-3 rounded-lg font-semibold hover:bg-navy hover:text-white transition-colors"
            >
              About the Club
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
