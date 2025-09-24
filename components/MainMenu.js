// components/MainMenu.js
"use client";
import { useState, useEffect } from "react";
import { supabase } from '../lib/supabaseClient';
import Image from 'next/image';

export default function MainMenu({ setView, session, onSignOut }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoadingLeaderboard(true);
      const { data, error } = await supabase
        .from('daily_attempts')
        .select(`final_score, profiles(username, avatar_url)`)
        .order('final_score', { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching leaderboard:", error);
      } else {
        setLeaderboard(data.filter(item => item.final_score > 0));
      }
      setLoadingLeaderboard(false);
    };
    fetchLeaderboard();
  }, []);
  
  // Helper function to get public URL for avatars
  const getAvatarUrl = (avatar_url) => {
    if (!avatar_url) return 'https://placehold.co/40x40/fcf8f0/5a4b41?text=?';
    const { data } = supabase.storage.from('avatars').getPublicUrl(avatar_url);
    return data.publicUrl;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-parchment p-4">
      
      {/* Leaderboard Section - Left Side */}
      <div className="flex-1 max-w-sm mr-12 p-8 bg-papyrus border border-sepia/20 rounded-2xl shadow-lg h-full">
        <h2 className="text-3xl font-serif font-bold text-gold-rush text-center mb-6">
          Daily Leaderboard
        </h2>
        {loadingLeaderboard ? (
          <div className="text-center text-sepia">Loading scores...</div>
        ) : (
          <ul className="space-y-4">
            {leaderboard.length > 0 ? (
              leaderboard.map((entry, index) => (
                <li key={index} className="flex items-center justify-between p-3 bg-parchment rounded-lg shadow-sm border border-sepia/10">
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-ink w-6">{index + 1}.</span>
                    <Image
                      src={getAvatarUrl(entry.profiles.avatar_url)}
                      alt={`${entry.profiles.username}'s avatar`}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover border-2 border-gold-rush"
                    />
                    <span className="font-semibold text-ink">{entry.profiles.username}</span>
                  </div>
                  <span className="font-bold text-lg text-gold-rush">{entry.final_score.toLocaleString()}</span>
                </li>
              ))
            ) : (
              <p className="text-center text-sepia">No daily scores yet. Be the first to play!</p>
            )}
          </ul>
        )}
      </div>

      {/* Main Menu Buttons - Right Side */}
      <div className="text-center">
        <h1 className="text-6xl font-serif font-bold text-gold-rush">
          HistoryClue
        </h1>
        <p className="text-xl text-sepia mt-2">The Historical Detective Game</p>
        <div className="mt-12 p-8 bg-papyrus border border-sepia/20 rounded-2xl shadow-lg w-full max-w-sm flex flex-col gap-4">
          <button
            onClick={() => setView('endless')}
            className="w-full px-6 py-3 bg-sepia-dark text-white font-bold text-lg rounded-lg hover:bg-ink transition-colors shadow-md"
          >
            Endless Mode
          </button>
          <button
            onClick={() => setView('daily')}
            className="w-full px-6 py-3 bg-gold-rush text-ink font-bold text-lg rounded-lg hover:bg-amber-600 transition-colors shadow-md"
          >
            Daily Challenge
          </button>
          <button
            onClick={() => setView('challenge')}
            className="w-full px-6 py-3 bg-sepia-dark text-white font-bold text-lg rounded-lg hover:bg-ink transition-colors shadow-md"
          >
            Challenge a Friend
          </button>
          <button
            onClick={() => setView('liveLobby')}
            className="w-full px-6 py-3 bg-red-700 text-white font-bold text-lg rounded-lg hover:bg-red-800 transition-colors shadow-md animate-pulse"
          >
            Live Battle
          </button>
        </div>
        <div className="mt-8 text-center">
          {session ? (
            <div className="flex items-center gap-6">
              <button
                onClick={onSignOut}
                className="font-bold text-gold-rush hover:text-amber-600"
              >
                Sign Out
              </button>
              <button
                onClick={() => setView('profile')}
                className="px-6 py-2 bg-gold-rush text-ink font-bold rounded-lg hover:bg-amber-600 transition-colors shadow-md"
              >
                Profile
              </button>
            </div>
          ) : (
            <button
              onClick={() => setView('auth')}
              className="px-6 py-2 bg-gold-rush text-ink font-bold rounded-lg hover:bg-amber-600 transition-colors shadow-md"
            >
              Login or Sign Up
            </button>
          )}
        </div>
      </div>
    </div>
  );
}