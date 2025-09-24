// components/DailyChallengeView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Image from 'next/image';

export default function DailyChallengeView({
  setView,
  session,
  setActiveDailyPuzzle,
}) {
  const [loading, setLoading] = useState(true);
  const [dailyPuzzleSet, setDailyPuzzleSet] = useState(null);
  const [userAttempt, setUserAttempt] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  const SCORE_TARGETS = [3000, 3500, 5000, 7500, 10000];

  // Helper function to get public URL for avatars
  const getAvatarUrl = (avatar_url) => {
    if (!avatar_url) return 'https://placehold.co/40x40/fcf8f0/5a4b41?text=?';
    const { data } = supabase.storage.from('avatars').getPublicUrl(avatar_url);
    return data.publicUrl;
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setLoadingLeaderboard(true);
      
      try {
        // Fetch daily puzzle data
        await supabase.rpc('create_daily_puzzle_set');
        const today = new Date().toISOString().slice(0, 10);
        const { data: dailyData } = await supabase
          .from('daily_puzzles')
          .select('*')
          .eq('puzzle_date', today)
          .single();
        
        setDailyPuzzleSet(dailyData);

        if (dailyData) {
          const { data: attemptData } = await supabase
            .from('daily_attempts')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('daily_puzzle_id', dailyData.id)
            .single();
          setUserAttempt(attemptData);

          // Fetch leaderboard
          const { data: leaderboardData, error } = await supabase
            .from('daily_attempts')
            .select(`final_score, profiles(username, avatar_url)`)
            .eq('daily_puzzle_id', dailyData.id)
            .order('final_score', { ascending: false })
            .limit(10);

          if (error) {
            console.error("Error fetching leaderboard:", error);
            setLeaderboard([]);
          } else {
            setLeaderboard((leaderboardData || []).filter(item => item.final_score > 0));
          }
        }
      } catch (error) {
        console.error("Error in fetchData:", error);
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
    const { data, error } = await supabase
      .from('daily_attempts')
      .insert({
        user_id: session.user.id,
        daily_puzzle_id: dailyPuzzleSet.id,
      })
      .select()
      .single();
    if (error) return alert('Could not start challenge: ' + error.message);

    setActiveDailyPuzzle({
      puzzleId: dailyPuzzleSet.puzzle_ids[0],
      step: 1,
      attemptId: data.id,
      scoreTarget: SCORE_TARGETS[0],
      dailyPuzzleId: dailyPuzzleSet.id,
      totalScore: 0,
    });
    setView('game');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 min-h-screen">
      <header className="mb-8 text-center relative">
        <button
          onClick={() => setView('menu')}
          className="absolute left-0 top-1/2 -translate-y-1/2 px-4 py-2 bg-sepia-dark text-white font-bold rounded-lg hover:bg-ink transition-colors shadow-sm"
        >
          &larr; Menu
        </button>
        <h1 className="text-5xl font-serif font-bold text-gold-rush">
          Daily Challenge
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Challenge Area */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="text-center text-sepia">
              Loading today&apos;s challenge...
            </div>
          ) : (
            <div className="text-center p-8 bg-papyrus rounded-lg shadow-lg border border-sepia/20">
              {!dailyPuzzleSet ? (
                <p className="text-2xl font-serif text-ink">
                  Today&apos;s challenge has not been set up yet. Please check
                  back later!
                </p>
              ) : userAttempt ? (
                <div>
                  <p className="text-2xl font-serif text-ink">
                    You have already attempted today&apos;s challenge.
                  </p>
                  <p className="text-lg text-sepia mt-4">
                    You completed{' '}
                    <span className="font-bold text-gold-rush">
                      {userAttempt.puzzles_completed}
                    </span>{' '}
                    of 5 puzzles.
                  </p>
                  <p className="text-lg text-sepia">
                    Your total score was{' '}
                    <span className="font-bold text-gold-rush">
                      {userAttempt.final_score.toLocaleString()}
                    </span>
                    .
                  </p>
                  <p className="text-ink mt-6">
                    Come back tomorrow for a new set of puzzles!
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl font-serif text-ink">
                    Welcome to the Daily Challenge!
                  </p>
                  <p className="text-sepia mt-4">
                    You will face 5 puzzles in a row. To advance, you must meet
                    the score target. You only get one attempt per day.
                  </p>
                  
                  {/* Score Targets Display */}
                  <div className="mt-6 p-4 bg-parchment rounded-lg border border-sepia/20">
                    <h3 className="text-lg font-serif font-bold text-ink mb-3">Score Targets</h3>
                    <div className="grid grid-cols-5 gap-2 text-sm">
                      {SCORE_TARGETS.map((target, index) => (
                        <div key={index} className="text-center">
                          <div className="font-bold text-gold-rush">Puzzle {index + 1}</div>
                          <div className="text-sepia">{target.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={startChallenge}
                    className="mt-8 px-8 py-4 bg-gold-rush text-ink font-bold text-xl rounded-lg hover:bg-amber-600 transition-colors shadow-md"
                  >
                    Begin Challenge
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Leaderboard Sidebar */}
        <div className="lg:col-span-1">
          <div className="p-6 bg-papyrus border border-sepia/20 rounded-2xl shadow-lg sticky top-8">
            <h2 className="text-2xl font-serif font-bold text-gold-rush text-center mb-6">
              Daily Leaderboard
            </h2>
            {loadingLeaderboard ? (
              <div className="text-center text-sepia">Loading scores...</div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {leaderboard.length > 0 ? (
                  leaderboard.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-parchment rounded-lg shadow-sm border border-sepia/10">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-ink w-6 text-center">{index + 1}.</span>
                        <Image
                          src={getAvatarUrl(entry.profiles.avatar_url)}
                          alt={`${entry.profiles.username}'s avatar`}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full object-cover border-2 border-gold-rush"
                        />
                        <span className="font-semibold text-ink text-sm">{entry.profiles.username}</span>
                      </div>
                      <span className="font-bold text-gold-rush text-sm">{entry.final_score.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-sepia">No daily scores yet. Be the first to play!</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}