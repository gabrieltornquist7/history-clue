// components/DailyChallengeView.js
"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import Image from "next/image";

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
  const DIFFICULTY_LABELS = [
    "Very Easy",
    "Easy",
    "Medium",
    "Hard",
    "Super Hard",
  ];

  // Avatar helper
  const getAvatarUrl = (avatar_url) => {
    if (!avatar_url)
      return "https://placehold.co/40x40/1a1a1a/ffffff?text=?";
    const { data, error } = supabase.storage
      .from("avatars")
      .getPublicUrl(avatar_url);
    if (error || !data?.publicUrl) {
      return "https://placehold.co/40x40/1a1a1a/ffffff?text=?";
    }
    return data.publicUrl;
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setLoadingLeaderboard(true);
      setError(null);

      try {
        const { data: dailyData, error: dailyError } = await supabase.rpc(
          "create_daily_puzzle_set"
        );
        if (dailyError) throw dailyError;
        if (!dailyData || dailyData.length === 0)
          throw new Error("No daily puzzle data returned");

        const todaysPuzzle = dailyData[0];
        setDailyPuzzleSet(todaysPuzzle);

        // Check user attempt
        if (session?.user?.id && todaysPuzzle?.id) {
          const { data: attemptData } = await supabase
            .from("daily_attempts")
            .select("*")
            .eq("user_id", session.user.id)
            .eq("daily_puzzle_id", todaysPuzzle.id)
            .single();
          if (attemptData) setUserAttempt(attemptData);

          // Leaderboard
          const { data: attempts } = await supabase
            .from("daily_attempts")
            .select("user_id, final_score, puzzles_completed")
            .eq("daily_puzzle_id", todaysPuzzle.id)
            .order("final_score", { ascending: false })
            .limit(10);

          if (attempts && attempts.length > 0) {
            const userIds = attempts.map((a) => a.user_id);
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, username, avatar_url")
              .in("id", userIds);

            const combinedData = attempts.map((a) => {
              const profile = profiles?.find((p) => p.id === a.user_id);
              return {
                final_score: a.final_score,
                puzzles_completed: a.puzzles_completed,
                profiles: profile || {
                  username: "Unknown Player",
                  avatar_url: null,
                },
              };
            });
            setLeaderboard(combinedData);
          }
        }
      } catch (err) {
        setError(err.message);
        setLeaderboard([]);
      } finally {
        setLoading(false);
        setLoadingLeaderboard(false);
      }
    }
    if (session?.user?.id) fetchData();
  }, [session?.user?.id]);

  const startChallenge = async () => {
    try {
      if (!dailyPuzzleSet?.id) throw new Error("No daily puzzle set available");
      if (!dailyPuzzleSet.puzzle_ids || dailyPuzzleSet.puzzle_ids.length !== 5)
        throw new Error("Invalid puzzle set");

      const { data, error } = await supabase
        .from("daily_attempts")
        .insert({
          user_id: session.user.id,
          daily_puzzle_id: dailyPuzzleSet.id,
        })
        .select()
        .single();
      if (error) throw error;

      setActiveDailyPuzzle({
        puzzleId: dailyPuzzleSet.puzzle_ids[0],
        step: 1,
        attemptId: data.id,
        scoreTarget: SCORE_TARGETS[0],
        dailyPuzzleId: dailyPuzzleSet.id,
        totalScore: 0,
      });
      setView("game");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div 
  className="min-h-screen relative px-6 py-10"
  style={{
    background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%)",
    backgroundImage: `
      radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%),
      radial-gradient(circle at 70% 80%, rgba(212, 175, 55, 0.01) 0%, transparent 50%),
      radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)
    `
  }}
>

      {/* Header */}
      <header className="mb-10 text-center relative">
        <button
          onClick={() => setView("menu")}
          className="absolute left-0 top-1/2 -translate-y-1/2 px-5 py-2.5 text-gray-300 font-medium rounded-md border border-gray-600/30 hover:border-yellow-500/50 hover:text-white transition-all"
        >
          &larr; Menu
        </button>
        <h1 className="text-4xl font-serif font-bold text-white">
          Daily Challenge
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Area */}
        <div className="lg:col-span-2">
          <div
            className="backdrop-blur rounded-lg shadow-2xl p-8"
            style={{
              backgroundColor: "rgba(0,0,0,0.7)",
              boxShadow:
                "0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
            }}
          >
            {!dailyPuzzleSet ? (
              <p className="text-red-500 text-center">
                No Daily Challenge available today.
              </p>
            ) : userAttempt ? (
              <div>
                <p className="text-lg text-gray-200 mb-6 text-center">
                  You’ve already completed today’s challenge!
                </p>
                <div className="grid grid-cols-2 gap-6 text-center mb-8">
                  <div>
                    <p className="text-3xl font-bold text-yellow-400">
                      {userAttempt.puzzles_completed}
                    </p>
                    <p className="text-sm text-gray-400">Puzzles Completed</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-yellow-400">
                      {userAttempt.final_score.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-400">Total Score</p>
                  </div>
                </div>
                <p className="text-gray-400 text-center">
                  Come back tomorrow for a new set of puzzles!
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg text-gray-200 mb-6 text-center">
                  Welcome to today’s challenge — 5 puzzles from very easy to
                  super hard. One attempt per day!
                </p>

                {/* Progression */}
                <div className="mb-8 p-5 rounded-md border border-gray-700/30 bg-black/30">
                  <h3 className="text-sm uppercase text-yellow-400 mb-3">
                    Challenge Progression
                  </h3>
                  <div className="grid grid-cols-5 gap-3 text-center text-xs text-gray-400">
                    {SCORE_TARGETS.map((target, i) => (
                      <div key={i}>
                        <div className="font-semibold text-yellow-400">
                          Puzzle {i + 1}
                        </div>
                        <div className="text-gray-500 mb-1">
                          {DIFFICULTY_LABELS[i]}
                        </div>
                        <div>{target.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* How it works */}
                <div className="mb-8 p-5 rounded-md border border-yellow-500/20 bg-yellow-500/10">
                  <h4 className="font-bold text-yellow-400 mb-2">
                    How it works
                  </h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Each puzzle gets progressively harder</li>
                    <li>• Reach the target score to unlock the next puzzle</li>
                    <li>• Fail to reach a target and your challenge ends</li>
                    <li>• Final score = sum of completed puzzles</li>
                    <li>• Complete all 5 for maximum glory!</li>
                  </ul>
                </div>

                {/* Start button */}
                <button
                  onClick={startChallenge}
                  className="w-full py-4 font-bold text-white rounded-md transition-all"
                  style={{
                    background: "linear-gradient(135deg, #8b0000, #a52a2a)",
                  }}
                >
                  Begin Challenge
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="lg:col-span-1">
          <div
            className="backdrop-blur rounded-lg shadow-lg p-6 sticky top-8"
            style={{
              backgroundColor: "rgba(0,0,0,0.7)",
              boxShadow:
                "0 10px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
            }}
          >
            <h2 className="text-lg font-serif font-bold text-yellow-400 text-center mb-6">
              Daily Leaderboard
            </h2>
            {loadingLeaderboard ? (
              <p className="text-gray-400 text-center">Loading scores…</p>
            ) : leaderboard.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {leaderboard.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-md border border-gray-700/30 bg-black/30"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center font-semibold text-gray-400">
                        {i + 1}.
                      </span>
                      <Image
                        src={getAvatarUrl(entry.profiles?.avatar_url)}
                        alt="avatar"
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full border border-yellow-400/40 object-cover"
                      />
                      <div>
                        <span className="block text-sm font-semibold text-white">
                          {entry.profiles?.username ?? "Traveler"}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {entry.puzzles_completed}/5 completed
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-yellow-400 text-sm">
                      {entry.final_score.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center">
                No scores yet — be the first!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
