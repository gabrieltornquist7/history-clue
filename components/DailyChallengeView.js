// components/DailyChallengeView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function DailyChallengeView({
  setView,
  session,
  setActiveDailyPuzzle,
}) {
  const [loading, setLoading] = useState(true);
  const [dailyPuzzleSet, setDailyPuzzleSet] = useState(null);
  const [userAttempt, setUserAttempt] = useState(null);

  const SCORE_TARGETS = [3000, 3500, 5000, 7500, 10000];

  useEffect(() => {
    async function fetchDailyData() {
      setLoading(true);
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
      }
      setLoading(false);
    }
    fetchDailyData();
  }, [session.user.id]);

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 min-h-screen">
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

      {loading ? (
        <div className="text-center text-sepia">
          Loading today's challenge...
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
  );
}