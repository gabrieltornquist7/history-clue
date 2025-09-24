// components/LeaderboardView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Image from 'next/image';

export default function LeaderboardView({ setView }) {
  const [loading, setLoading] = useState(true);
  const [dailyLeaderboard, setDailyLeaderboard] = useState([]);
  const [endlessLeaderboard, setEndlessLeaderboard] = useState([]);
  const [tab, setTab] = useState('daily');

  const getAvatarUrl = (avatar_url) => {
    if (!avatar_url) return 'https://placehold.co/40x40/fcf8f0/5a4b41?text=?';
    const { data } = supabase.storage.from('avatars').getPublicUrl(avatar_url);
    return data.publicUrl;
  };

  useEffect(() => {
    async function fetchLeaderboards() {
      setLoading(true);
      
      // Fetch Daily Leaderboard
      const today = new Date().toISOString().slice(0, 10);
      const { data: dailyData } = await supabase
        .from('daily_puzzles')
        .select('id')
        .eq('puzzle_date', today)
        .single();
        
      if (dailyData) {
        const { data: dailyScores } = await supabase
          .from('daily_attempts')
          .select('final_score, profiles(username, avatar_url)')
          .eq('daily_puzzle_id', dailyData.id)
          .order('final_score', { ascending: false })
          .limit(10);
        setDailyLeaderboard(dailyScores || []);
      }

      // Fetch Endless Leaderboard
      const { data: endlessScores } = await supabase
        .from('scores')
        .select('score, profiles(username, avatar_url)')
        .order('score', { ascending: false })
        .limit(10);
      setEndlessLeaderboard(endlessScores || []);
      
      setLoading(false);
    }
    
    fetchLeaderboards();
  }, []);

  const LeaderboardTable = ({ data, scoreField }) => (
    <div className="space-y-3">
      {data.length > 0 ? (
        data.map((entry, index) => (
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
            <span className="font-bold text-gold-rush text-sm">{entry[scoreField].toLocaleString()}</span>
          </div>
        ))
      ) : (
        <p className="text-center text-sepia">No scores yet. Be the first to play!</p>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 min-h-screen">
      <header className="mb-8 text-center relative">
        <button onClick={() => setView('menu')} className="absolute left-0 top-1/2 -translate-y-1/2 px-4 py-2 bg-sepia-dark text-white font-bold rounded-lg hover:bg-ink transition-colors shadow-sm">&larr; Menu</button>
        <h1 className="text-5xl font-serif font-bold text-gold-rush">Leaderboards</h1>
      </header>
      
      <div className="border-b border-sepia/20 mb-6">
        <nav className="flex space-x-6">
          <button onClick={() => setTab('daily')} className={`py-3 px-1 font-semibold ${tab === 'daily' ? 'text-gold-rush border-b-2 border-gold-rush' : 'text-sepia'}`}>Daily Challenge</button>
          <button onClick={() => setTab('endless')} className={`py-3 px-1 font-semibold ${tab === 'endless' ? 'text-gold-rush border-b-2 border-gold-rush' : 'text-sepia'}`}>Endless Mode</button>
        </nav>
      </div>
      
      <div className="p-6 bg-papyrus border border-sepia/20 rounded-2xl shadow-lg">
        {loading ? (
          <div className="text-center text-sepia">Loading scores...</div>
        ) : (
          tab === 'daily' 
            ? <LeaderboardTable data={dailyLeaderboard} scoreField="final_score" /> 
            : <LeaderboardTable data={endlessLeaderboard} scoreField="score" />
        )}
      </div>
    </div>
  );
}