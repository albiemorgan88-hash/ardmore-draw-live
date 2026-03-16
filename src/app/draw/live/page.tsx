"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// Types
interface Winner {
  place: string;
  number: number;
  name: string;
  prize: number;
}

interface DrawResult {
  draw_number: number;
  drawn_at: string;
  drawn_numbers: number[];
  pot_amount: number;
  winners: Winner[];
}

interface PotData {
  totalPounds: string;
  first: string;
  second: string;
  third: string;
}

// Get next Friday 7PM
function getNextFriday7PM(): Date {
  const now = new Date();
  const day = now.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + (day === 5 && now.getHours() < 19 ? 0 : daysUntilFriday));
  next.setHours(19, 0, 0, 0);
  return next;
}

// Countdown hook
function useCountdown(target: Date) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const diff = Math.max(0, target.getTime() - now.getTime());
  return {
    hours: Math.floor(diff / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    finished: diff === 0
  };
}

export default function LiveDrawPage() {
  const [potData, setPotData] = useState<PotData | null>(null);
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);
  const [lastKnownDraw, setLastKnownDraw] = useState<number>(0);
  const [animationStage, setAnimationStage] = useState<'waiting' | 'suspense' | 'ball1' | 'ball2' | 'ball3' | 'finale'>('waiting');
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);

  const nextFriday = getNextFriday7PM();
  const countdown = useCountdown(nextFriday);
  const now = new Date();
  const today = now.getDay();
  const isToday = today === 5; // Friday
  const isDrawTime = isToday && now.getHours() >= 19;
  const isPreDrawPolling = isToday && now.getHours() === 18 && now.getMinutes() >= 59;

  // Check for test mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setIsTestMode(urlParams.get('test') === 'true');
    }
  }, []);

  // Test data
  const testData = {
    draw_number: 999,
    drawn_at: new Date().toISOString(),
    drawn_numbers: [7, 23, 42],
    pot_amount: 35000,
    winners: [
      { place: "1st", number: 7, name: "Emma Chambers", prize: 8750 },
      { place: "2nd", number: 23, name: "Liam McDevitt", prize: 5250 },
      { place: "3rd", number: 42, name: "Sarah O'Neill", prize: 3500 }
    ]
  };

  // Fetch pot data
  const fetchPot = useCallback(async () => {
    try {
      const response = await fetch('/api/pot');
      if (response.ok) {
        const data = await response.json();
        setPotData(data);
      }
    } catch (error) {
      console.error('Failed to fetch pot:', error);
    }
  }, []);

  // Fetch draw results
  const fetchResults = useCallback(async () => {
    try {
      const response = await fetch('/api/draw/results');
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const latestDraw = data.results[0];
          if (latestDraw.draw_number > lastKnownDraw) {
            setLastKnownDraw(latestDraw.draw_number);
            setDrawResult(latestDraw);
            setAnimationStage('suspense');
            return true; // New result found
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
      setError('Results coming soon — check your email.');
    }
    return false;
  }, [lastKnownDraw]);

  // Initial data load
  useEffect(() => {
    fetchPot();
    
    if (isTestMode) {
      // Simulate test mode with delay
      setTimeout(() => {
        setDrawResult(testData);
        setLastKnownDraw(999);
        setAnimationStage('suspense');
      }, 2000);
    } else if (!isToday) {
      // Load last draw if not Friday
      fetchResults();
    }
  }, [fetchPot, fetchResults, isTestMode, isToday]);

  // Polling logic
  useEffect(() => {
    if (!isTestMode && (isPreDrawPolling || isDrawTime) && !drawResult) {
      setIsPolling(true);
      const interval = setInterval(fetchResults, 2000);
      
      // Stop polling after 5 minutes if no results
      const timeout = setTimeout(() => {
        setIsPolling(false);
        setError('Draw complete! Check your email for results.');
        clearInterval(interval);
      }, 300000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isPreDrawPolling, isDrawTime, drawResult, fetchResults, isTestMode]);

  // Animation sequence
  useEffect(() => {
    if (animationStage === 'suspense') {
      const timer = setTimeout(() => setAnimationStage('ball1'), 3000);
      return () => clearTimeout(timer);
    } else if (animationStage === 'ball1') {
      const timer = setTimeout(() => setAnimationStage('ball2'), 5000);
      return () => clearTimeout(timer);
    } else if (animationStage === 'ball2') {
      const timer = setTimeout(() => setAnimationStage('ball3'), 5000);
      return () => clearTimeout(timer);
    } else if (animationStage === 'ball3') {
      const timer = setTimeout(() => setAnimationStage('finale'), 5000);
      return () => clearTimeout(timer);
    }
  }, [animationStage]);

  const formatPrize = (pence: number) => `£${(pence / 100).toFixed(2)}`;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Friday Night Draw</h1>
          <p className="text-xl text-gray-300 mb-6">{error}</p>
          <Link href="/draw" className="inline-block bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-semibold transition-colors">
            Back to Draw
          </Link>
        </div>
      </div>
    );
  }

  // Show last draw for non-Friday
  if (!isToday && !isTestMode && drawResult) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <h1 className="text-3xl font-bold text-white mb-4">Last Week's Results</h1>
          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            {drawResult.winners.map((winner, idx) => (
              <div key={idx} className="mb-4 last:mb-0">
                <div className="flex justify-between items-center">
                  <div className="text-left">
                    <span className="text-2xl font-bold text-yellow-500">#{winner.number}</span>
                    <p className="text-white font-semibold">{winner.name}</p>
                    <p className="text-gray-400">{winner.place} Prize</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">{formatPrize(winner.prize)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-lg text-gray-300 mb-6">Next draw: Friday 7PM</p>
          <Link href="/draw" className="inline-block bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-semibold transition-colors">
            Enter This Week
          </Link>
        </div>
      </div>
    );
  }

  // Waiting for draw time
  if (animationStage === 'waiting' && !drawResult) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4 text-center">
        <div className="animate-pulse-glow">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Friday Night Draw
          </h1>
        </div>
        
        {!countdown.finished ? (
          <>
            <div className="text-6xl md:text-7xl font-mono font-bold text-yellow-500 mb-6 animate-pulse">
              {String(countdown.hours).padStart(2, '0')}:
              {String(countdown.minutes).padStart(2, '0')}:
              {String(countdown.seconds).padStart(2, '0')}
            </div>
            <p className="text-xl md:text-2xl text-gray-300 mb-8">
              Draw starts in
            </p>
          </>
        ) : (
          <>
            <div className="text-3xl md:text-4xl font-bold text-yellow-500 mb-8 animate-pulse">
              THE DRAW IS HAPPENING...
            </div>
            {isPolling && (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            )}
          </>
        )}
        
        {potData && (
          <div className="bg-slate-800 rounded-lg p-6 max-w-sm w-full animate-pulse-subtle">
            <p className="text-lg text-gray-300 mb-2">Tonight's Pot</p>
            <p className="text-3xl font-bold text-yellow-500">£{potData.totalPounds}</p>
            <div className="mt-4 text-sm text-gray-400 space-y-1">
              <p>1st Prize: £{potData.first}</p>
              <p>2nd Prize: £{potData.second}</p>
              <p>3rd Prize: £{potData.third}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Animation stages
  if (animationStage === 'suspense') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center p-4">
        <div className="text-center animate-pulse-dramatic">
          <h1 className="text-4xl md:text-6xl font-bold text-white animate-pulse">
            THE DRAW IS HAPPENING...
          </h1>
        </div>
      </div>
    );
  }

  if (!drawResult) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  const currentBall = animationStage === 'ball1' ? 0 : animationStage === 'ball2' ? 1 : 2;
  const showWinner = animationStage !== 'ball1' || (animationStage === 'ball1' && true); // Always show winner for ball 1 after animation

  // Ball reveal animation
  if (animationStage === 'ball1' || animationStage === 'ball2' || animationStage === 'ball3') {
    const winner = drawResult.winners[currentBall];
    const colors = {
      ball1: { bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600', text: 'text-yellow-900', theme: 'gold' },
      ball2: { bg: 'bg-gradient-to-br from-gray-300 to-gray-500', text: 'text-gray-900', theme: 'silver' },
      ball3: { bg: 'bg-gradient-to-br from-orange-400 to-orange-600', text: 'text-orange-900', theme: 'bronze' }
    }[animationStage];

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex flex-col items-center justify-center p-4 text-center">
        <div className="mb-8">
          <p className="text-xl md:text-2xl text-gray-300 mb-4">
            {currentBall === 0 ? '1st' : currentBall === 1 ? '2nd' : '3rd'} Prize
          </p>
          
          {/* Ball animation */}
          <div className="relative mb-8">
            <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full ${colors.bg} flex items-center justify-center shadow-2xl animate-ball-drop`}>
              <span className={`text-4xl md:text-5xl font-bold ${colors.text}`}>
                {winner.number}
              </span>
            </div>
            {colors.theme === 'gold' && <div className="animate-gold-burst"></div>}
          </div>

          {/* Winner reveal */}
          <div className="animate-fade-in-delayed">
            <p className="text-2xl md:text-3xl font-bold text-white mb-2">
              {winner.name}
            </p>
            <p className="text-3xl md:text-4xl font-bold text-yellow-500">
              {formatPrize(winner.prize)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Finale
  if (animationStage === 'finale') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
        {/* Confetti animation */}
        <div className="confetti-container">
          {Array.from({ length: 50 }, (_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: ['#fbbf24', '#60a5fa', '#f87171', '#34d399', '#a78bfa'][Math.floor(Math.random() * 5)]
              }}
            />
          ))}
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-8 animate-bounce">
          Congratulations!
        </h1>

        <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Tonight's Winners</h2>
          {drawResult.winners.map((winner, idx) => (
            <div key={idx} className="flex justify-between items-center mb-3 last:mb-0 p-3 rounded bg-slate-700">
              <div className="text-left">
                <span className="text-xl font-bold text-yellow-500">#{winner.number}</span>
                <p className="text-white font-semibold">{winner.name}</p>
                <p className="text-gray-400 text-sm">{winner.place} Prize</p>
              </div>
              <p className="text-xl font-bold text-white">{formatPrize(winner.prize)}</p>
            </div>
          ))}
        </div>

        <div className="bg-slate-700 rounded-lg p-4 max-w-md w-full mb-8 text-sm">
          <p className="text-gray-300">
            Total Pot: £{(drawResult.pot_amount / 100).toFixed(2)} • 
            Club Share: £{((drawResult.pot_amount / 2) / 100).toFixed(2)} • 
            Platform Fee: 10%
          </p>
        </div>

        <p className="text-lg text-gray-300 mb-6">
          Your results have also been emailed
        </p>

        <Link href="/draw" className="inline-block bg-yellow-500 hover:bg-yellow-600 text-black px-8 py-4 rounded-lg font-semibold text-lg transition-colors">
          Enter Next Week
        </Link>
      </div>
    );
  }

  return null;
}