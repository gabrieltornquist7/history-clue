"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AvatarImage } from '../lib/avatarHelpers';

export default function UserProfileView({ setView, userId, onBack }) {
  const [userProfile, setUserProfile] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    setLoading(true);

    try {
      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, is_founder')
        .eq('id', userId)
        .single();

      if (profile) {
        setUserProfile(profile);

        // Fetch user scores (using 'scores' table)
        const { data: scoresData } = await supabase
          .from('scores')
          .select('score, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (scoresData) {
          // Calculate stats from scores
          const totalScore = scoresData.reduce((sum, s) => sum + s.score, 0);
          const gamesPlayed = scoresData.length;
          const recentGames = scoresData.slice(0, 5).map(score => ({
            id: `score_${score.created_at}`,
            score: score.score,
            created_at: score.created_at,
            mode: 'endless' // Default mode since we don't have mode in scores table
          }));

          setUserStats({
            total_score: totalScore,
            games_played: gamesPlayed
          });
          setRecentGames(recentGames);
        } else {
          setUserStats({ total_score: 0, games_played: 0 });
          setRecentGames([]);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }

    setLoading(false);
  };

  if (loading) {
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
        <div className="flex items-center justify-center min-h-screen relative z-10">
          <div className="text-center">
            <div className="text-2xl font-serif text-white mb-4">Loading profile...</div>
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
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
        <div className="flex items-center justify-center min-h-screen relative z-10">
          <div className="text-center">
            <div className="text-2xl font-serif text-white mb-4">User not found</div>
            <button
              onClick={onBack}
              className="px-6 py-3 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-all"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            onClick={onBack}
            className="px-5 py-2.5 bg-gray-900 text-gray-300 font-medium rounded-md border border-gray-700/30 hover:border-yellow-500/50 hover:text-white transition-all duration-300"
          >
            ← Back
          </button>
          <div className="text-center flex-1 px-4">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-2"
                style={{ letterSpacing: '0.02em', textShadow: '0 0 20px rgba(212, 175, 55, 0.3)' }}>
              Player Profile
            </h1>
            <p className="text-sm italic font-light" style={{ color: '#d4af37', opacity: 0.9, letterSpacing: '0.05em' }}>
              View player statistics
            </p>
          </div>
          <div className="w-24"></div>
        </div>
      </header>

      <div className="px-8 pb-8 relative z-10">
        <div className="max-w-4xl mx-auto">

          {/* Profile Card */}
          <div className="mb-8">
            <div className="backdrop-blur rounded-lg overflow-hidden"
                 style={{
                   backgroundColor: "rgba(0, 0, 0, 0.7)",
                   boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)"
                 }}>
              <div className="p-8">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <AvatarImage url={userProfile.avatar_url} size="w-24 h-24" />
                  <div className="text-center sm:text-left flex-1">
                    <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                      <h2 className="text-3xl font-serif font-bold text-white">
                        {userProfile.username}
                      </h2>
                      {userProfile.is_founder && (
                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm font-medium rounded-full border border-yellow-500/30">
                          Founder
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-6 text-gray-300">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{userStats?.total_score?.toLocaleString() || '0'}</div>
                        <div className="text-sm text-gray-400">Total Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{userStats?.games_played || '0'}</div>
                        <div className="text-sm text-gray-400">Games Played</div>
                      </div>
                      {userStats?.games_played > 0 && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">
                            {Math.round((userStats.total_score / userStats.games_played) || 0)}
                          </div>
                          <div className="text-sm text-gray-400">Avg Score</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Games */}
          <div className="backdrop-blur rounded-lg overflow-hidden"
               style={{
                 backgroundColor: "rgba(0, 0, 0, 0.7)",
                 boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)"
               }}>
            <div className="p-6">
              <h3 className="text-xl font-serif font-bold text-white mb-4">Recent Games</h3>
              {recentGames.length > 0 ? (
                <div className="space-y-3">
                  {recentGames.map(game => (
                    <div key={game.id} className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-white font-medium">
                          {game.mode === 'daily' ? 'Daily Challenge' :
                           game.mode === 'endless' ? 'Endless Mode' :
                           game.mode === 'challenge' ? 'Challenge' : 'Game'}
                        </div>
                        <div className="text-sm text-gray-400">
                          {new Date(game.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-lg font-bold text-white">
                        {game.score?.toLocaleString() || '0'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  No recent games to display
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}