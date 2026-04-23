'use client';

import { useState, useEffect } from 'react';

interface Match {
  id: string;
  shortTitle: string;
  startDateTime: string;
  startDateFormatted: string;
  competitionName: string;
  team1Name: string;
  team1Club: string;
  team1Image: string;
  team2Name: string;
  team2Club: string;
  team2Image: string;
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

function TeamLogo({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold text-white/50 border border-white/20">
        {alt?.charAt(0) || '?'}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width={56}
      height={56}
      className="w-14 h-14 rounded-full object-cover bg-white border-2 border-white/30"
      onError={() => setError(true)}
    />
  );
}

function formatCountdown(dateStr: string): string {
  const now = new Date();
  const match = new Date(dateStr);
  const diff = match.getTime() - now.getTime();
  if (diff <= 0) return 'Match Day!';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} to go`;
  return `${hours} hour${hours !== 1 ? 's' : ''} to go`;
}

export default function NextMatch() {
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNext() {
      try {
        const res = await fetch('/api/fixtures');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        const now = new Date();
        const ardmoreUpcoming = (data.matches || [])
          .filter((m: Match) => isArdmoreMatch(m) && new Date(m.startDateTime) > now)
          .sort((a: Match, b: Match) =>
            new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
          );
        if (ardmoreUpcoming.length > 0) {
          setMatch(ardmoreUpcoming[0]);
        }
      } catch (err) {
        console.error('Failed to load next match:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchNext();
  }, []);

  if (loading) {
    return (
      <section className="py-10 bg-navy">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-block w-6 h-6 border-3 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </section>
    );
  }

  if (!match) return null;

  const isHome = isArdmoreHome(match);
  const ardmoreName = isHome ? match.team1Name : match.team2Name;
  const ardmoreLogo = isHome ? match.team1Image : match.team2Image;
  const opponentName = isHome ? match.team2Name : match.team1Name;
  const opponentLogo = isHome ? match.team2Image : match.team1Image;

  const matchDate = new Date(match.startDateTime);
  const dateStr = matchDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const timeStr = matchDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <section className="py-12 sm:py-16 bg-navy">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-6">
          <p className="text-gold font-medium tracking-[0.2em] uppercase text-xs mb-1">Next Match</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white">Up Next</h2>
        </div>

        <div className="bg-navy-dark/50 border border-navy-light rounded-xl p-6 sm:p-8">
          {/* Competition */}
          <div className="text-center mb-6">
            <span className="inline-block bg-gold/15 text-gold text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
              {match.competitionName}
            </span>
          </div>

          {/* Teams */}
          <div className="flex items-center justify-center gap-4 sm:gap-8 mb-6">
            <div className="flex flex-col items-center gap-2 flex-1">
              <TeamLogo src={ardmoreLogo} alt="Ardmore" />
              <span className="text-white font-semibold text-sm sm:text-base text-center leading-tight">{ardmoreName}</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl sm:text-3xl font-heading font-bold text-gold">vs</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isHome ? 'bg-green-900/40 text-green-300' : 'bg-blue-900/40 text-blue-300'
              }`}>
                {isHome ? '🏠 Home' : '✈️ Away'}
              </span>
            </div>

            <div className="flex flex-col items-center gap-2 flex-1">
              <TeamLogo src={opponentLogo} alt={opponentName} />
              <span className="text-white font-semibold text-sm sm:text-base text-center leading-tight">{opponentName}</span>
            </div>
          </div>

          {/* Date, Time, Venue */}
          <div className="flex flex-col items-center gap-2 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span>{dateStr}</span>
              <span className="text-gray-500">·</span>
              <span>{timeStr}</span>
            </div>
            {match.venueName && (
              <div className="flex items-center gap-2">
                <span>📍</span>
                <span>{match.venueName}{match.venueCity ? `, ${match.venueCity}` : ''}</span>
              </div>
            )}
            <div className="mt-2">
              <span className="text-gold font-semibold text-sm">{formatCountdown(match.startDateTime)}</span>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <a
            href="/fixtures"
            className="inline-block bg-gold text-navy font-semibold px-6 py-3 rounded-md hover:bg-gold-light transition-colors"
          >
            View All Fixtures →
          </a>
        </div>
      </div>
    </section>
  );
}
