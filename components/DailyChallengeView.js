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
  const [error, setError] = useState(null);

  const SCORE_TARGETS = [3000, 3500, 5000, 7500, 10000];
  const DIFFICULTY_LABELS = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Super Hard'];

  // Helper function to get public URL for avatars
  const getAvatarUrl = (avatar_url) => {
    if (!avatar_url) return 'https://placehold.co/40x40/fcf8f0/5a4b41?text=?';
    const { data, error } = supabase.storage.from('avatars').getPublicUrl(avatar_url);
    if (error || !data?.publicUrl) {
      return 'https://placehold.co/40x40/fcf8f0/5a4b41?text=?';
    }
    return data.publicUrl;
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setLoadingLeaderboard(true);
      setError(null);

      try {
        console.log('Fetching daily challenge data...');
        
        // Create/get today's daily puzzle set
        const { data: dailyData, error: dailyError } = await supabase
          .rpc('create_daily_puzzle_set');

        if (dailyError) {
          console.error('Error creating daily puzzle set:', dailyError);
          throw new Error(`Failed to create daily puzzle set: ${dailyError.message}`);
        }

        if (!dailyData || dailyData.length === 0) {
          throw new Error('No daily puzzle data returned');
        }

        const todaysPuzzle = dailyData[0];
        console.log('Daily puzzle data:', todaysPuzzle);
        
        setDailyPuzzleSet(todaysPuzzle);

        // Check if user has already attempted today's challenge
        if (session?.user?.id && todaysPuzzle?.id) {
          const { data: attemptData, error: attemptError } = await supabase
            .from('daily_attempts')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('daily_puzzle_id', todaysPuzzle.id)
            .single();

          if (attemptError && attemptError.code !== 'PGRST116') {
            console.error('Error fetching user attempt:', attemptError);
          } else if (attemptData) {
            setUserAttempt(attemptData);
          }

          // Fetch leaderboard
          const { data: leaderboardData, error: leaderboardError } = await supabase
            .from('daily_attempts')
            .select(`
              final_score,
              puzzles_completed,
              profiles!inner (
                username,
                avatar_url
              )
            `)
            .eq('daily_puzzle_id', todaysPuzzle.id)
            .gt('final_score', 0)
            .order('final_score', { ascending: false })
            .limit(10);

          if (leaderboardError) {
            console.error("Error fetching leaderboard:", leaderboardError);
            setLeaderboard([]);
          } else {
            setLeaderboard(leaderboardData || []);
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
      if (!dailyPuzzleSet?.id) {
        throw new Error('No daily puzzle set available');
      }

      if (!dailyPuzzleSet.puzzle_ids || dailyPuzzleSet.puzzle_ids.length !== 5) {
        throw new Error('Invalid puzzle set - missing puzzle IDs');
      }

      const { data, error } = await supabase
        .from('daily_attempts')
        .insert({
          user_id: session.user.id,
          daily_puzzle_id: dailyPuzzleSet.id,
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
        dailyPuzzleId: dailyPuzzleSet.id,
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
        <div className="text-center text-sepia">
          Loading today&apos;s challenge...
        </div>
      </div>
    );
  }

  if (error) {
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
        <div className="text-center p-8 bg-papyrus rounded-lg shadow-lg border border-sepia/20">
          <p className="text-2xl font-serif text-red-600 mb-4">Error Loading Daily Challenge</p>
          <p className="text-sepia mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-sepia-dark text-white font-bold rounded-lg hover:bg-ink transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

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
          <div className="text-center p-8 bg-papyrus rounded-lg shadow-lg border border-sepia/20">
            {!dailyPuzzleSet ? (
              <div>
                <p className="text-2xl font-serif text-red-600 mb-4">
                  No Daily Challenge Available
                </p>
                <p className="text-sepia">
                  There was an issue setting up today&apos;s challenge. Please try again later or contact support.
                </p>
              </div>
            ) : userAttempt ? (
              <div>
                <p className="text-2xl font-serif text-ink mb-6">
                  You have already completed today&apos;s challenge!
                </p>
                
                <div className="bg-parchment p-6 rounded-lg border border-sepia/20 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-3xl font-bold text-gold-rush">
                        {userAttempt.puzzles_completed}
                      </p>
                      <p className="text-sm text-sepia">Puzzles Completed</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gold-rush">
                        {userAttempt.final_score.toLocaleString()}
                      </p>
                      <p className="text-sm text-sepia">Total Score</p>
                    </div>
                  </div>
                </div>
                
                <p className="text-ink">
                  Come back tomorrow for a new set of progressively challenging puzzles!
                </p>
              </div>
            ) : (
              <div>
                <p className="text-2xl font-serif text-ink mb-4">
                  Welcome to Today&apos;s Daily Challenge!
                </p>
                <p className="text-sepia mb-6">
                  Face 5 progressively challenging puzzles, from very easy to super hard. 
                  You must meet each score target to advance. One attempt per day!
                </p>

                {/* Difficulty Progression Display */}
                <div className="mt-6 p-4 bg-parchment rounded-lg border border-sepia/20">
                  <h3 className="text-lg font-serif font-bold text-ink mb-3">Challenge Progression</h3>
                  <div className="grid grid-cols-5 gap-2 text-sm">
                    {SCORE_TARGETS.map((target, index) => (
                      <div key={index} className="text-center">
                        <div className="font-bold text-gold-rush">Puzzle {index + 1}</div>
                        <div className="text-xs text-sepia mb-1">{DIFFICULTY_LABELS[index]}</div>
                        <div className="text-sepia font-semibold">{target.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="font-bold text-amber-800 mb-2">How it works:</h4>
                  <ul className="text-sm text-amber-700 text-left space-y-1">
                    <li>• Each puzzle gets progressively harder</li>
                    <li>• You must reach the target score to unlock the next puzzle</li>
                    <li>• If you fail to reach a target, your challenge ends</li>
                    <li>• Your final score is the sum of all completed puzzles</li>
                    <li>• Complete all 5 puzzles for maximum glory!</li>
                  </ul>
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
                    <div key={`${entry.profiles?.username || 'unknown'}-${index}`} className="flex items-center justify-between p-3 bg-parchment rounded-lg shadow-sm border border-sepia/10">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-ink w-6 text-center">{index + 1}.</span>
                        <Image
                          src={getAvatarUrl(entry.profiles?.avatar_url)}
                          alt={`${entry.profiles?.username ?? 'Traveler'}'s avatar`}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full object-cover border-2 border-gold-rush"
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold text-ink text-sm">{entry.profiles?.username ?? 'Traveler'}</span>
                          <span className="text-xs text-sepia">{entry.puzzles_completed}/5 completed</span>
                        </div>
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