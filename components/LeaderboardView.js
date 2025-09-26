// components/LeaderboardView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchTopScores } from '../lib/leaderboardApi';
import Image from 'next/image';
import PageWrapper from './ui/PageWrapper';
import Card from './ui/Card';

export default function LeaderboardView({ setView }) {
  const [loading, setLoading] = useState(true);
  const [endlessLeaderboard, setEndlessLeaderboard] = useState([]);
  const [error, setError] = useState(null);

  const getAvatarUrl = (avatar_url) => {
    if (!avatar_url) return 'https://placehold.co/40x40/fcf8f0/5a4b41?text=?';
    const { data, error } = supabase.storage.from('avatars').getPublicUrl(avatar_url);
    if (error || !data?.publicUrl) {
      return 'https://placehold.co/40x40/fcf8f0/5a4b41?text=?';
    }
    return data.publicUrl;
  };

  useEffect(() => {
    let ignore = false;

    async function fetchLeaderboard() {
      setLoading(true);
      setError(null);

      try {
        const { rows, error } = await fetchTopScores(10);

        if (ignore) return;

        if (error) {
          console.error('[LeaderboardView] fetchTopScores error', error);
          setError('Failed to load leaderboard');
          return;
        }

        // Convert API format to component format
        const endlessScores = rows.map(row => ({
          score: row.score,
          profiles: {
            username: row.username,
            avatar_url: row.avatar_url
          }
        }));

        console.log('Successfully fetched leaderboard:', endlessScores);
        setEndlessLeaderboard(endlessScores);

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
    <PageWrapper>
      {/* Header */}
      <header className="flex items-center justify-between p-8">
        <button
          onClick={() => setView('menu')}
          className="px-5 py-2.5 bg-gray-900 text-gray-300 font-medium rounded-md border border-gray-700/30 hover:border-yellow-500/50 hover:text-white transition-all duration-300 relative group"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.01em' }}
        >
          ← Menu
          <div
            className="absolute bottom-0 left-5 right-5 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
            style={{ backgroundColor: '#d4af37' }}
          ></div>
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-4xl font-serif font-bold" style={{ color: '#d4af37', letterSpacing: '0.02em' }}>
            Endless Leaderboard
          </h1>
        </div>
        <div className="w-[120px]"></div>
      </header>

      {/* Main Content */}
      <div className="flex items-start justify-center min-h-[calc(100vh-120px)] p-8 pt-4">
        <div className="w-full max-w-3xl">
          <div 
            className="backdrop-blur rounded-xl p-8 shadow-2xl"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
            }}
          >
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
                        <Image
                          src={getAvatarUrl(entry.profiles?.avatar_url)}
                          alt={`${entry.profiles?.username ?? 'Traveler'}'s avatar`}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover border-2 border-yellow-500"
                        />
                        <div>
                          <span className="font-bold text-white text-lg">{entry.profiles?.username ?? 'Traveler'}</span>
                          <div className="text-sm" style={{ color: '#9ca3af' }}>Endless Mode</div>
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
    </PageWrapper>
  );
}