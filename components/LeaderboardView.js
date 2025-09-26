// components/LeaderboardView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Image from 'next/image';

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
    async function fetchLeaderboard() {
      setLoading(true);
      setError(null);

      try {
        // Try multiple approaches to get leaderboard data
        let endlessScores = null;
        let fetchError = null;

        // First, try the direct query with proper join
        console.debug('[Leaderboard] Loading top scores via Supabase client');
        const { data: directScores, error: directError } = await supabase
          .from('scores')
          .select(`
            score,
            profiles!inner (
              username,
              avatar_url
            )
          `)
          .order('score', { ascending: false })
          .limit(10);

        if (!directError && directScores) {
          endlessScores = directScores;
        } else {
          console.log('Direct query failed:', directError);
          fetchError = directError;

          // Fallback: Try getting scores and profiles separately
          const { data: scoresOnly, error: scoresError } = await supabase
            .from('scores')
            .select('user_id, score')
            .order('score', { ascending: false })
            .limit(10);

          if (!scoresError && scoresOnly && scoresOnly.length > 0) {
            const userIds = scoresOnly.map(s => s.user_id);
            
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .in('id', userIds);

            if (!profilesError && profilesData) {
              // Combine the data
              endlessScores = scoresOnly.map(score => {
                const profile = profilesData.find(p => p.id === score.user_id);
                return {
                  score: score.score,
                  profiles: profile || { username: 'Unknown Player', avatar_url: null }
                };
              });
            } else {
              console.log('Profiles query failed:', profilesError);
              fetchError = profilesError;
            }
          } else {
            console.log('Scores query failed:', scoresError);
            fetchError = scoresError;
          }
        }

        if (endlessScores) {
          console.log('Successfully fetched leaderboard:', endlessScores);
          setEndlessLeaderboard(endlessScores);
        } else {
          console.error("All leaderboard fetch attempts failed:", fetchError);
          setError("Unable to load leaderboard data. Please try again later.");
        }

      } catch (err) {
        console.error("Unexpected error fetching leaderboard:", err);
        setError("An unexpected error occurred while loading the leaderboard.");
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  return (
    <div 
      className="min-h-screen relative"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%)',
        backgroundImage: `
          radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%),
          radial-gradient(circle at 70% 80%, rgba(212, 175, 55, 0.01) 0%, transparent 50%),
          radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)
        `
      }}
    >
      {/* Header */}
      <header className="flex items-center justify-center p-8 relative">
        <button 
          onClick={() => setView('menu')} 
          className="absolute left-4 px-5 py-2.5 bg-gray-900 text-gray-300 font-medium rounded-md border border-gray-700/30 hover:border-yellow-500/50 hover:text-white transition-all duration-300 relative group"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.01em' }}
        >
          ← Menu
          <div 
            className="absolute bottom-0 left-5 right-5 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
            style={{ backgroundColor: '#d4af37' }}
          ></div>
        </button>
        <h1 className="text-4xl font-serif font-bold" style={{ color: '#d4af37', letterSpacing: '0.02em' }}>
          Endless Leaderboard
        </h1>
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
    </div>
  );
}