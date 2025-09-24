// components/LeaderboardView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Image from 'next/image';

export default function LeaderboardView({ setView }) {
  const [loading, setLoading] = useState(true);
  const [endlessLeaderboard, setEndlessLeaderboard] = useState([]);

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

      const { data: endlessScores, error } = await supabase
        .from('scores')
        .select('score, profiles!inner(username, avatar_url)')
        .order('score', { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching endless leaderboard:", error);
      } else {
        setEndlessLeaderboard(endlessScores || []);
      }

      setLoading(false);
    }

    fetchLeaderboard();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 min-h-screen">
      <header className="mb-8 text-center relative">
        <button onClick={() => setView('menu')} className="absolute left-0 top-1/2 -translate-y-1/2 px-4 py-2 bg-sepia-dark text-white font-bold rounded-lg hover:bg-ink transition-colors shadow-sm">&larr; Menu</button>
        <h1 className="text-5xl font-serif font-bold text-gold-rush">Endless Leaderboard</h1>
      </header>

      <div className="p-6 bg-papyrus border border-sepia/20 rounded-2xl shadow-lg">
        {loading ? (
          <div className="text-center text-sepia">Loading scores...</div>
        ) : (
          <div className="space-y-3">
            {endlessLeaderboard.length > 0 ? (
              endlessLeaderboard.map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-parchment rounded-lg shadow-sm border border-sepia/10">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-ink w-6 text-center">{index + 1}.</span>
                    <Image
                      src={getAvatarUrl(entry.profiles?.avatar_url)}
                      alt={`${entry.profiles?.username ?? 'Traveler'}'s avatar`}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover border-2 border-gold-rush"
                    />
                    <span className="font-semibold text-ink text-sm">{entry.profiles?.username ?? 'Traveler'}</span>
                  </div>
                  <span className="font-bold text-gold-rush text-sm">{entry.score.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="text-center text-sepia">No scores yet. Be the first to play!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
