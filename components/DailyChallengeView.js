// components/DailyChallengeView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AvatarImage } from '../lib/avatarHelpers';
import Image from 'next/image';
import PageWrapper from './ui/PageWrapper';
import Card from './ui/Card';
import GlassBackButton from './GlassBackButton';
import { useBadgeNotifications } from '../contexts/BadgeNotificationContext';

export default function DailyChallengeView({
  setView,
  session,
  setActiveDailyPuzzle,
  coinResults,
}) {
  const { queueBadgeNotification } = useBadgeNotifications();
  console.log('[DailyChallengeView] Rendered with setView:', typeof setView);
  const [loading, setLoading] = useState(true);
  const [dailyPuzzleSet, setDailyPuzzleSet] = useState(null);
  const [userAttempt, setUserAttempt] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [error, setError] = useState(null);

  const SCORE_TARGETS = [3000, 3500, 5000, 7500, 10000];
  const DIFFICULTY_LABELS = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Super Hard'];

  // Check for pending badge notifications from daily challenge completion
  useEffect(() => {
    if (window.pendingBadgeNotifications && window.pendingBadgeNotifications.length > 0) {
      console.log('[DailyChallengeView] Displaying pending badge notifications');
      window.pendingBadgeNotifications.forEach(badgeData => {
        queueBadgeNotification(badgeData);
      });
      window.pendingBadgeNotifications = [];
    }
  }, [queueBadgeNotification]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setLoadingLeaderboard(true);
      setError(null);

      try {
        console.log('Fetching daily challenge data...');
        
        // Get today's daily puzzle set (5 puzzles, difficulty 1-5)
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        // Fetch today's 5 daily challenge puzzles (one for each difficulty level)
        const { data: dailyPuzzles, error: dailyError } = await supabase
          .from('daily_challenge_puzzles')
          .select(`
            id,
            city_name,
            historical_entity,
            year,
            latitude,
            longitude,
            country_code,
            difficulty_level,
            scheduled_date,
            is_active,
            daily_challenge_translations!daily_challenge_id (
              language_code,
              clue_1_text,
              clue_2_text,
              clue_3_text,
              clue_4_text,
              clue_5_text
            )
          `)
          .eq('scheduled_date', today)
          .eq('is_active', true)
          .eq('daily_challenge_translations.language_code', 'en')
          .in('difficulty_level', [1, 2, 3, 4, 5])
          .order('difficulty_level', { ascending: true });

        if (dailyError) {
          console.error('Error fetching daily puzzles:', dailyError);
          throw new Error(`Failed to fetch daily puzzles: ${dailyError.message}`);
        }

        if (!dailyPuzzles || dailyPuzzles.length !== 5) {
          throw new Error(`Invalid daily puzzle set - expected 5 puzzles, got ${dailyPuzzles?.length || 0}. Check if puzzles are scheduled for ${today}.`);
        }

        // Create a puzzle set object that matches expected structure
        const todaysPuzzle = {
          scheduled_date: today, // Use date as the primary identifier
          puzzle_ids: dailyPuzzles.map(p => p.id),
          puzzles: dailyPuzzles
        };
        console.log('Daily puzzle data:', todaysPuzzle);
        
        setDailyPuzzleSet(todaysPuzzle);

        // Check if user has already attempted today's challenge
        if (session?.user?.id && todaysPuzzle?.scheduled_date) {
          const { data: attemptData, error: attemptError } = await supabase
            .from('daily_attempts')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('challenge_date', today)
            .single();

          if (attemptError && attemptError.code !== 'PGRST116') {
            console.error('Error fetching user attempt:', attemptError);
          } else if (attemptData) {
            setUserAttempt(attemptData);
          }

          // Fetch leaderboard - use fallback approach with separate queries
          try {
            // First, get all daily attempts for today's puzzle
            const { data: attempts, error: attemptsError } = await supabase
              .from('daily_attempts')
              .select('user_id, final_score, puzzles_completed')
              .eq('challenge_date', today)
              .order('final_score', { ascending: false })
              .order('puzzles_completed', { ascending: false })
              .limit(10);

            if (attemptsError) {
              console.error("Error fetching attempts:", attemptsError);
              setLeaderboard([]);
            } else if (attempts && attempts.length > 0) {
              // Get user profiles separately
              const userIds = attempts.map(a => a.user_id);
              const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .in('id', userIds);

              if (profilesError) {
                console.error("Error fetching profiles:", profilesError);
                setLeaderboard([]);
              } else {
                // Manually join the data
                const combinedData = attempts.map(attempt => {
                  const profile = profiles?.find(p => p.id === attempt.user_id);
                  return {
                    final_score: attempt.final_score,
                    puzzles_completed: attempt.puzzles_completed,
                    profiles: profile || { username: 'Unknown Player', avatar_url: null }
                  };
                });
                console.log('Leaderboard data:', combinedData);
                setLeaderboard(combinedData);
              }
            } else {
              console.log('No daily attempts found for today');
              setLeaderboard([]);
            }
          } catch (error) {
            console.error("Unexpected error fetching leaderboard:", error);
            setLeaderboard([]);
          }
        }
      } catch (error) {
        console.error("Error in fetchData:", error);
        setError(error.message || "Failed to load daily challenge");
        setLeaderboard([]);
      } finally {
        setLoading(false);
        setLoadingLeaderboard(false);
      }
    }

    if (session?.user?.id) {
      fetchData();
    }
  }, [session?.user?.id]);

  const startChallenge = async () => {
    try {
      if (!dailyPuzzleSet?.scheduled_date) {
        throw new Error('No daily puzzle set available');
      }

      if (!dailyPuzzleSet.puzzle_ids || dailyPuzzleSet.puzzle_ids.length !== 5) {
        throw new Error('Invalid puzzle set - missing puzzle IDs');
      }

      const { data, error } = await supabase
        .from('daily_attempts')
        .insert({
          user_id: session.user.id,
          challenge_date: dailyPuzzleSet.scheduled_date,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Could not start challenge: ${error.message}`);
      }

      // Set up the daily puzzle info for the first puzzle
      setActiveDailyPuzzle({
        puzzleId: dailyPuzzleSet.puzzle_ids[0], // First puzzle (difficulty 1)
        step: 1,
        attemptId: data.id,
        scoreTarget: SCORE_TARGETS[0],
        challengeDate: dailyPuzzleSet.scheduled_date,
        totalScore: 0,
      });
      
      setView('game');
    } catch (error) {
      console.error('Error starting challenge:', error);
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        {/* Metallic shine overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(115deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.08) 100%)",
            backgroundSize: "200% 200%",
            animation: "shine 12s linear infinite",
          }}
        ></div>

        <style jsx>{`
          @keyframes shine {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>

        <header className="p-8 relative z-10">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
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
            <div className="text-center flex-1 mx-8">
              <h1 
                className="text-4xl sm:text-5xl font-serif font-bold text-white mb-2" 
                style={{ 
                  letterSpacing: '0.02em',
                  textShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
                }}
              >
                Daily Challenge
              </h1>
              <p 
                className="text-sm italic font-light"
                style={{ 
                  color: '#d4af37', 
                  opacity: 0.9, 
                  letterSpacing: '0.05em' 
                }}
              >
                Five puzzles • One chance • Pure glory
              </p>
            </div>
            <div className="w-24"></div>
          </div>
        </header>
        
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="text-2xl font-serif text-white mb-4">Loading today&apos;s challenge...</div>
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        {/* Metallic shine overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(115deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.08) 100%)",
            backgroundSize: "200% 200%",
            animation: "shine 12s linear infinite",
          }}
        ></div>

        <style jsx>{`
          @keyframes shine {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>

        <header className="p-8 relative z-10">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
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
            <div className="text-center flex-1 mx-8">
              <h1 
                className="text-4xl sm:text-5xl font-serif font-bold text-white mb-2" 
                style={{ 
                  letterSpacing: '0.02em',
                  textShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
                }}
              >
                Daily Challenge
              </h1>
            </div>
            <div className="w-24"></div>
          </div>
        </header>
        
        <div className="flex items-center justify-center min-h-[50vh] p-8">
          <div 
            className="text-center p-8 backdrop-blur rounded-xl max-w-md"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: '0 0 0 1px rgba(212, 175, 55, 0.2)'
            }}
          >
            <p className="text-2xl font-serif text-red-400 mb-4">Error Loading Daily Challenge</p>
            <p className="text-gray-300 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gray-800 text-white font-medium rounded-md hover:bg-gray-700 transition-all duration-300 border border-gray-700/30"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              Try Again
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* Metallic shine overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(115deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.08) 100%)",
          backgroundSize: "200% 200%",
          animation: "shine 12s linear infinite",
        }}
      ></div>

      <style jsx>{`
        @keyframes shine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .slide-up {
          animation: slideUp 0.6s ease-out;
        }
      `}</style>

      <GlassBackButton
        onClick={() => {
          console.log('[DailyChallengeView] Back button clicked');
          if (setView && typeof setView === 'function') {
            setView('menu');
          } else {
            console.error('[DailyChallengeView] setView is not a function:', setView);
          }
        }}
        fallbackUrl="/"
      />

      <header className="p-8 relative z-10">
        <div className="text-center">
          <h1
            className="text-5xl font-serif font-bold text-white mb-2"
            style={{
              letterSpacing: '0.02em',
              textShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
            }}
          >
            Daily Challenge
          </h1>
          <p
            className="text-sm italic font-light"
            style={{
              color: '#d4af37',
              opacity: 0.9,
              letterSpacing: '0.05em'
            }}
          >
            Five puzzles • One chance • Pure glory
          </p>
        </div>
      </header>

      <div className="px-8 pb-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          
          {/* Main Challenge Area */}
          <div className="lg:col-span-2">
            <div 
              className="backdrop-blur rounded-xl shadow-2xl border slide-up"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)'
              }}
            >
              {!dailyPuzzleSet ? (
                <div className="text-center p-12">
                  <p className="text-2xl font-serif text-red-400 mb-4">
                    No Daily Challenge Available
                  </p>
                  <p className="text-gray-400">
                    There was an issue setting up today&apos;s challenge. Please try again later or contact support.
                  </p>
                </div>
              ) : userAttempt ? (
                <div className="text-center p-12">
                  <p className="text-3xl font-serif text-white mb-8">
                    Challenge Complete!
                  </p>
                  
                  <div 
                    className="p-8 rounded-xl border mb-8 slide-up"
                    style={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      border: '2px solid rgba(212, 175, 55, 0.3)',
                      boxShadow: '0 0 30px rgba(212, 175, 55, 0.1)'
                    }}
                  >
                    <div className={`grid ${coinResults ? 'grid-cols-3' : 'grid-cols-2'} gap-8 text-center`}>
                      <div>
                        <p
                          className="text-5xl font-bold mb-2"
                          style={{
                            color: '#d4af37',
                            textShadow: '0 0 20px rgba(212, 175, 55, 0.5)'
                          }}
                        >
                          {userAttempt.puzzles_completed}
                        </p>
                        <p className="text-sm text-gray-400 uppercase tracking-wider">Puzzles Completed</p>
                      </div>
                      <div>
                        <p
                          className="text-5xl font-bold mb-2"
                          style={{
                            color: '#d4af37',
                            textShadow: '0 0 20px rgba(212, 175, 55, 0.5)'
                          }}
                        >
                          {userAttempt.final_score.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-400 uppercase tracking-wider">Total Score</p>
                      </div>
                      {coinResults && (
                        <div>
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <span className="text-3xl">🪙</span>
                            <p
                              className="text-4xl font-bold"
                              style={{
                                color: '#ffd700',
                                textShadow: '0 0 20px rgba(255, 215, 0, 0.5)'
                              }}
                            >
                              {(coinResults && coinResults.coinsEarned && typeof coinResults.coinsEarned === 'number') ? coinResults.coinsEarned.toLocaleString() : '0'}
                            </p>
                          </div>
                          <p className="text-sm text-gray-400 uppercase tracking-wider">Coins Earned</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-300 text-lg leading-relaxed">
                    Come back tomorrow for a new set of progressively challenging puzzles!
                  </p>
                </div>
              ) : (
                <div className="p-12">
                  <div className="text-center mb-8">
                    <p className="text-3xl font-serif text-white mb-6">
                      Welcome to Today&apos;s Daily Challenge!
                    </p>
                    <p className="text-gray-300 text-lg leading-relaxed mb-8">
                      Face 5 progressively challenging puzzles, from very easy to super hard. 
                      You must meet each score target to advance. One attempt per day!
                    </p>
                  </div>

                  {/* Difficulty Progression Display */}
                  <div 
                    className="p-6 rounded-xl border mb-8"
                    style={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <h3 className="text-xl font-serif font-bold text-white mb-4 text-center">Challenge Progression</h3>
                    <div className="grid grid-cols-5 gap-4">
                      {SCORE_TARGETS.map((target, index) => (
                        <div key={index} className="text-center">
                          <div 
                            className="font-bold text-lg mb-2"
                            style={{ color: '#d4af37' }}
                          >
                            Puzzle {index + 1}
                          </div>
                          <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">
                            {DIFFICULTY_LABELS[index]}
                          </div>
                          <div 
                            className="text-white font-bold text-lg"
                            style={{ textShadow: '0 0 10px rgba(212, 175, 55, 0.3)' }}
                          >
                            {target.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div 
                    className="p-6 rounded-xl border mb-8"
                    style={{ 
                      backgroundColor: 'rgba(139, 69, 19, 0.1)',
                      border: '1px solid rgba(139, 69, 19, 0.3)'
                    }}
                  >
                    <h4 className="font-bold text-yellow-400 mb-3 text-lg">How it works:</h4>
                    <ul className="text-gray-300 space-y-2 leading-relaxed">
                      <li>• Each puzzle gets progressively harder</li>
                      <li>• You must reach the target score to unlock the next puzzle</li>
                      <li>• If you fail to reach a target, your challenge ends</li>
                      <li>• Your final score is the sum of all completed puzzles</li>
                      <li>• Complete all 5 puzzles for maximum glory!</li>
                    </ul>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={startChallenge}
                      className="px-12 py-5 font-bold text-white text-xl rounded-lg transition-all duration-300 relative group"
                      style={{ 
                        background: 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        letterSpacing: '-0.02em',
                        boxShadow: '0 10px 30px rgba(139, 0, 0, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.boxShadow = '0 0 0 2px rgba(212, 175, 55, 0.4), 0 15px 40px rgba(139, 0, 0, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.boxShadow = '0 10px 30px rgba(139, 0, 0, 0.3)';
                      }}
                    >
                      Begin Challenge
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard Sidebar */}
          <div className="lg:col-span-1">
            <div 
              className="backdrop-blur rounded-xl shadow-2xl border sticky top-8 slide-up"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)'
              }}
            >
              <div className="p-6">
                <h2 
                  className="text-2xl font-serif font-bold text-center mb-6"
                  style={{ 
                    color: '#d4af37',
                    textShadow: '0 0 15px rgba(212, 175, 55, 0.3)'
                  }}
                >
                  Daily Leaderboard
                </h2>
                
                {loadingLeaderboard ? (
                  <div className="text-center text-gray-400 py-8">
                    <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p>Loading scores...</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {leaderboard.length > 0 ? (
                      leaderboard.map((entry, index) => (
                        <div 
                          key={`${entry.profiles?.username || 'unknown'}-${index}`} 
                          className="flex items-center justify-between p-4 rounded-lg border transition-all duration-300 hover:border-yellow-500/30"
                          style={{ 
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <span 
                              className="font-bold w-6 text-center text-lg"
                              style={{ color: index < 3 ? '#d4af37' : '#ffffff' }}
                            >
                              {index + 1}.
                            </span>
                            <div 
                              className="relative"
                              style={{
                                border: '2px solid #d4af37',
                                borderRadius: '50%',
                                padding: '2px'
                              }}
                            >
                              <AvatarImage
                                url={entry.profiles?.avatar_url}
                                alt={`${entry.profiles?.username ?? 'Traveler'}'s avatar`}
                                size="w-8 h-8"
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-white text-sm">
                                {entry.profiles?.username ?? 'Traveler'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {entry.puzzles_completed}/5 completed
                              </span>
                            </div>
                          </div>
                          <span 
                            className="font-bold text-sm"
                            style={{ 
                              color: '#d4af37',
                              textShadow: '0 0 10px rgba(212, 175, 55, 0.3)'
                            }}
                          >
                            {entry.final_score.toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-400 italic py-8">
                        No daily scores yet. Be the first to play!
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}