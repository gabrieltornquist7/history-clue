// components/LeaderboardView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AvatarImage } from '../lib/avatarHelpers';

export default function LeaderboardView({ setView }) {
  const [loading, setLoading] = useState(true);
  const [endlessLeaderboard, setEndlessLeaderboard] = useState([]);
  const [error, setError] = useState(null);


  useEffect(() => {
    let ignore = false;

    async function fetchLeaderboard() {
      setLoading(true);
      setError(null);

      try {
        // Get all scores grouped by user with total
        const { data: scoresData, error: scoresError } = await supabase
          .from('scores')
          .select('user_id, score');

        if (ignore) return;

        if (scoresError) {
          console.error('[LeaderboardView] scores error', scoresError);
          setError('Failed to load leaderboard');
          return;
        }

        // Group by user and calculate totals
        const userTotals = {};
        scoresData?.forEach(entry => {
          if (!userTotals[entry.user_id]) {
            userTotals[entry.user_id] = 0;
          }
          userTotals[entry.user_id] += entry.score;
        });

        // Get user profiles for all users with scores
        const userIds = Object.keys(userTotals);
        if (userIds.length === 0) {
          setEndlessLeaderboard([]);
          return;
        }

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        if (profilesError) {
          console.error('[LeaderboardView] profiles error', profilesError);
          setError('Failed to load user profiles');
          return;
        }

        // Combine data and sort
        const leaderboardData = profiles?.map(profile => ({
          user_id: profile.id,
          score: userTotals[profile.id] || 0,
          profiles: {
            username: profile.username,
            avatar_url: profile.avatar_url
          }
        }));

        // Sort by total score descending
        leaderboardData?.sort((a, b) => b.score - a.score);

        console.log('Successfully fetched leaderboard:', leaderboardData);
        setEndlessLeaderboard(leaderboardData || []);

      } catch (err) {
        if (ignore) return;
        console.error("Unexpected error fetching leaderboard:", err);
        setError("An unexpected error occurred while loading the leaderboard.");
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchLeaderboard();
    return () => { ignore = true; };
  }, []);

  return (
    <div
      className="min-h-screen relative"
      style={{
        background: `
          linear-gradient(145deg, #0d0d0d 0%, #1a1a1a 40%, #2a2a2a 100%),
          radial-gradient(circle at 25% 25%, rgba(255, 215, 0, 0.05), transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.04), transparent 50%)
        `,
        backgroundBlendMode: "overlay",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(115deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.08) 100%)",
          backgroundSize: "200% 200%",
          animation: "shine 12s linear infinite",
        }}
      />
      <style jsx>{`
        @keyframes shine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <header className="p-8 relative z-10">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button
            onClick={() => setView('menu')}
            className="px-5 py-2.5 bg-gray-900 text-gray-300 font-medium rounded-md border border-gray-700/30 hover:border-yellow-500/50 hover:text-white transition-all duration-300"
          >
            ← Back
          </button>
          <div className="text-center flex-1 px-4">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-2"
                style={{ letterSpacing: '0.02em', textShadow: '0 0 20px rgba(212, 175, 55, 0.3)' }}>
              Leaderboard
            </h1>
            <p className="text-sm italic font-light" style={{ color: '#d4af37', opacity: 0.9, letterSpacing: '0.05em' }}>
              Top players across all modes
            </p>
          </div>
          <div className="w-24"></div>
        </div>
      </header>

      <div className="px-8 pb-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="backdrop-blur rounded-lg overflow-hidden"
               style={{
                 backgroundColor: "rgba(0, 0, 0, 0.7)",
                 boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)"
               }}>
            <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="text-xl text-gray-400 mb-4">Loading scores...</div>
                <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <h2 className="text-2xl font-serif font-bold text-red-400 mb-4">Error Loading Leaderboard</h2>
                <p className="text-gray-400 mb-6">{error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-6 py-3 bg-gray-800 text-white font-medium rounded-md hover:bg-gray-700 transition-all duration-300 border border-gray-700/30"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {endlessLeaderboard.length > 0 ? (
                  endlessLeaderboard.map((entry, index) => (
                    <div 
                      key={`${entry.profiles?.username || 'unknown'}-${index}`} 
                      className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-300 hover:border-yellow-500/50 ${index < 3 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent' : ''}`}
                      style={{ 
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        borderColor: index < 3 ? 'rgba(212, 175, 55, 0.3)' : 'rgba(255, 255, 255, 0.05)'
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 w-12">
                          <span className="font-bold text-white text-lg">
                            {index + 1}.
                          </span>
                          {index < 3 && (
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#d4af37' }}></div>
                          )}
                        </div>
                        <AvatarImage
                          url={entry.profiles?.avatar_url}
                          size="w-10 h-10"
                          className="border-2 border-yellow-500"
                        />
                        <div>
                          <span className="font-bold text-white text-lg">{entry.profiles?.username ?? 'Traveler'}</span>
                          <div className="text-sm" style={{ color: '#9ca3af' }}>Total Score</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-xl" style={{ color: '#d4af37' }}>
                          {entry.score.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-400 uppercase tracking-wide">points</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <h3 className="text-xl font-serif text-white mb-4">No Scores Yet</h3>
                    <p className="text-gray-400 mb-6">Be the first to play and claim the top spot!</p>
                    <button
                      onClick={() => setView('endless')}
                      className="px-6 py-3 font-medium text-white rounded-md transition-all duration-300"
                      style={{ 
                        background: 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        letterSpacing: '-0.01em'
                      }}
                    >
                      Play Endless Mode
                    </button>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}