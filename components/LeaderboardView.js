// components/LeaderboardView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AvatarImage } from '../lib/avatarHelpers';
import GlassBackButton from './GlassBackButton';
import UserProfileView from './UserProfileView';
import TitleDisplay from './TitleDisplay';

export default function LeaderboardView({ setView, session }) {
  console.log('[LeaderboardView] Rendered with setView:', typeof setView);
  const [loading, setLoading] = useState(true);
  const [endlessLeaderboard, setEndlessLeaderboard] = useState([]);
  const [error, setError] = useState(null);
  const [viewingUserId, setViewingUserId] = useState(null);
  const [titleData, setTitleData] = useState({});

  // Endless Mode Level System (same as GameView)
  const getEndlessDifficulty = (level) => {
    const cycleLevel = ((level - 1) % 10) + 1;
    if (cycleLevel <= 4) return 'easy';
    if (cycleLevel <= 8) return 'medium';
    return 'hard';
  };

  const getDifficultyLabel = (level) => {
    const difficulty = getEndlessDifficulty(level);
    return {
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard'
    }[difficulty];
  };

  // Get crown emoji and styling for top 3
  const getTopPlayerStyle = (rank) => {
    if (rank === 0) return {
      crown: '👑',
      bgColor: 'rgba(255, 215, 0, 0.15)',
      borderColor: 'rgba(255, 215, 0, 0.6)',
      textColor: 'text-yellow-300',
      glowColor: 'rgba(255, 215, 0, 0.4)',
      label: '1st Place'
    };
    if (rank === 1) return {
      crown: '🥈',
      bgColor: 'rgba(192, 192, 192, 0.12)',
      borderColor: 'rgba(192, 192, 192, 0.5)',
      textColor: 'text-gray-300',
      glowColor: 'rgba(192, 192, 192, 0.3)',
      label: '2nd Place'
    };
    if (rank === 2) return {
      crown: '🥉',
      bgColor: 'rgba(205, 127, 50, 0.12)',
      borderColor: 'rgba(205, 127, 50, 0.5)',
      textColor: 'text-orange-300',
      glowColor: 'rgba(205, 127, 50, 0.3)',
      label: '3rd Place'
    };
    return null;
  };

  // Handle clicking on a profile
  const handleProfileClick = (userId) => {
    console.log('[LeaderboardView] Profile clicked:', userId);
    
    // If it's your own profile, go to regular profile view
    if (session?.user?.id === userId) {
      setView('profile');
    } else {
      // View other user's profile
      setViewingUserId(userId);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function fetchLeaderboard() {
      setLoading(true);
      setError(null);

      try {
        // Get profiles with their endless mode levels
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select(`
            id,
            username,
            avatar_url,
            endless_mode_level,
            equipped_title
          `)
          .order('endless_mode_level', { ascending: false });

        if (ignore) return;

        if (profilesError) {
          console.error('[LeaderboardView] profiles error', profilesError);
          setError('Failed to load leaderboard');
          return;
        }

        // Transform data for display
        const leaderboardData = profilesData?.map(profile => ({
          user_id: profile.id,
          endless_mode_level: profile.endless_mode_level,
          profiles: {
            username: profile.username,
            avatar_url: profile.avatar_url,
            equipped_title: profile.equipped_title
          }
        }));

        // Data is already sorted by endless_mode_level descending from the query

        console.log('Successfully fetched leaderboard:', leaderboardData);
        setEndlessLeaderboard(leaderboardData || []);

        // Fetch title data for all equipped titles
        const uniqueTitleIds = [...new Set(
          leaderboardData
            ?.filter(entry => entry.profiles?.equipped_title)
            .map(entry => entry.profiles.equipped_title)
        )];

        if (uniqueTitleIds.length > 0) {
          const titleDataMap = {};

          // Fetch from title_definitions
          const { data: titleDefs } = await supabase
            .from('title_definitions')
            .select('id, title_text, rarity')
            .in('id', uniqueTitleIds);

          titleDefs?.forEach(title => {
            titleDataMap[title.id] = {
              text: title.title_text,
              rarity: title.rarity || 'legendary'
            };
          });

          // Fetch from shop_items
          const { data: shopItems } = await supabase
            .from('shop_items')
            .select('id, name, rarity')
            .in('id', uniqueTitleIds)
            .eq('category', 'title');

          shopItems?.forEach(item => {
            titleDataMap[item.id] = {
              text: item.name,
              rarity: item.rarity
            };
          });

          setTitleData(titleDataMap);
        }

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

  // If viewing a user profile, show that instead
  if (viewingUserId) {
    return (
      <UserProfileView
        setView={setView}
        session={session}
        userId={viewingUserId}
        onBack={() => setViewingUserId(null)}
      />
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
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px var(--glow-color, rgba(255, 215, 0, 0.3)); }
          50% { box-shadow: 0 0 35px var(--glow-color, rgba(255, 215, 0, 0.5)); }
        }
        .top-player-glow {
          animation: pulse-glow 2.5s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        .crown-float {
          animation: float 2s ease-in-out infinite;
        }
      `}</style>

      <GlassBackButton
        onClick={() => {
          console.log('[LeaderboardView] Back button clicked');
          if (setView && typeof setView === 'function') {
            setView('menu');
          } else {
            console.error('[LeaderboardView] setView is not a function:', setView);
          }
        }}
        fallbackUrl="/"
      />

      <header className="p-4 sm:p-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-2"
              style={{ letterSpacing: '0.02em', textShadow: '0 0 20px rgba(212, 175, 55, 0.3)' }}>
            Leaderboard
          </h1>
          <p className="text-sm italic font-light" style={{ color: '#d4af37', opacity: 0.9, letterSpacing: '0.05em' }}>
            Highest Endless Mode levels reached • Click to view profiles
          </p>
        </div>
      </header>

      <div className="px-4 sm:px-8 pb-4 sm:pb-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="backdrop-blur rounded-lg overflow-hidden"
               style={{
                 backgroundColor: "rgba(0, 0, 0, 0.7)",
                 boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)"
               }}>
            <div className="p-4 sm:p-6">
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
                  endlessLeaderboard.map((entry, index) => {
                    const topStyle = getTopPlayerStyle(index);
                    const isTopThree = index < 3;
                    const isCurrentUser = session?.user?.id === entry.user_id;
                    
                    return (
                      <div 
                        key={`${entry.profiles?.username || 'unknown'}-${index}`} 
                        onClick={() => handleProfileClick(entry.user_id)}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-300 hover:border-yellow-500/50 hover:scale-[1.02] cursor-pointer group ${
                          isTopThree ? 'top-player-glow' : ''
                        } ${isCurrentUser ? 'ring-2 ring-blue-500/50' : ''}`}
                        style={{ 
                          backgroundColor: topStyle ? topStyle.bgColor : 'rgba(0, 0, 0, 0.3)',
                          borderColor: topStyle ? topStyle.borderColor : 'rgba(255, 255, 255, 0.05)',
                          position: 'relative',
                          '--glow-color': topStyle?.glowColor
                        }}
                      >
                        {/* Top 3 special background shimmer effect */}
                        {isTopThree && (
                          <div 
                            className="absolute inset-0 rounded-lg pointer-events-none opacity-60"
                            style={{
                              background: `linear-gradient(90deg, transparent 0%, ${topStyle.glowColor} 50%, transparent 100%)`,
                              backgroundSize: '200% 100%',
                              animation: 'shimmer 4s linear infinite'
                            }}
                          />
                        )}
                        
                        <div className="flex items-center gap-3 sm:gap-4 relative z-10 flex-1">
                          {/* Rank and Crown */}
                          <div className="flex items-center gap-2 w-16 sm:w-20">
                            <span className={`font-bold text-base sm:text-lg ${topStyle ? topStyle.textColor : 'text-white'}`}>
                              #{index + 1}
                            </span>
                            {topStyle && (
                              <span className="text-2xl sm:text-3xl crown-float">{topStyle.crown}</span>
                            )}
                          </div>
                          
                          {/* Avatar with special effect for top 3 */}
                          <div className="relative">
                            <AvatarImage
                              url={entry.profiles?.avatar_url}
                              size="w-12 h-12 sm:w-14 sm:h-14"
                              className={`border-2 ${topStyle ? topStyle.borderColor.replace('rgba', 'border-yellow') : 'border-yellow-500'} transition-transform group-hover:scale-110`}
                            />
                            {isTopThree && (
                              <div 
                                className="absolute inset-0 rounded-full pointer-events-none"
                                style={{
                                  boxShadow: `0 0 20px ${topStyle.glowColor}`,
                                  animation: 'pulse-glow 2s ease-in-out infinite'
                                }}
                              />
                            )}
                          </div>
                          
                          {/* Username and Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold text-base sm:text-lg truncate ${topStyle ? topStyle.textColor : 'text-white'}`}>
                                {entry.profiles?.username ?? 'Traveler'}
                              </span>
                              {isCurrentUser && (
                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full border border-blue-500/30 whitespace-nowrap">
                                  You
                                </span>
                              )}
                              {topStyle && (
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full whitespace-nowrap hidden sm:inline-block`}
                                      style={{
                                        backgroundColor: topStyle.bgColor,
                                        color: topStyle.textColor.replace('text-', '#'),
                                        border: `1px solid ${topStyle.borderColor}`
                                      }}>
                                  {topStyle.label}
                                </span>
                              )}
                            </div>
                            {/* Title Display */}
                            {entry.profiles?.equipped_title && titleData[entry.profiles.equipped_title] && (
                              <div className="mt-1">
                                <TitleDisplay 
                                  title={titleData[entry.profiles.equipped_title].text}
                                  rarity={titleData[entry.profiles.equipped_title].rarity}
                                  showIcon={true}
                                  size="small"
                                  animated={false}
                                />
                              </div>
                            )}
                            <div className="text-xs sm:text-sm text-gray-400 group-hover:text-yellow-500 transition-colors mt-1">
                              Endless Mode • Click to view profile
                            </div>
                          </div>
                        </div>
                        
                        {/* Level Display */}
                        <div className="text-right relative z-10 ml-2">
                          <div className={`font-bold text-lg sm:text-xl ${topStyle ? topStyle.textColor : 'text-yellow-500'} whitespace-nowrap`}>
                            Lvl {entry.endless_mode_level}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-400 uppercase tracking-wide">
                            {getDifficultyLabel(entry.endless_mode_level)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <h3 className="text-xl font-serif text-white mb-4">No Endless Mode Players Yet</h3>
                    <p className="text-gray-400 mb-6">Be the first to reach higher levels in Endless Mode!</p>
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
