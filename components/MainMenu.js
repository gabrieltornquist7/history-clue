"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function MainMenu({ setView, session, onSignOut }) {
  const [streak, setStreak] = useState(0);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  useEffect(() => {
    const fetchStreak = async () => {
      if (session) {
        const { data } = await supabase
          .from("streaks")
          .select("streak_count")
          .eq("user_id", session.user.id)
          .single();

        if (data) {
          setStreak(data.streak_count);
        }
      }
    };
    
    const fetchUserProfile = async () => {
      if (session) {
        const { data } = await supabase
          .from("profiles")
          .select("id, username, is_founder")
          .eq("id", session.user.id)
          .single();

        if (data) {
          setCurrentUserProfile(data);
        }
      }
    };
    
    fetchStreak();
    fetchUserProfile();
  }, [session]);

  const handleContactClick = () => {
    // If user is logged in and is the founder, show their profile
    if (session && currentUserProfile?.is_founder) {
      setView("profile");
    } else {
      // Otherwise, show the contact page
      setView("contact");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-parchment p-4">
      <div className="text-center max-w-md w-full">
        {session && (
          <div className="absolute top-4 right-4 bg-gold-rush text-ink font-bold py-2 px-4 rounded-full shadow-lg">
            🔥 {streak} Day Streak
          </div>
        )}
        <h1 className="text-6xl font-serif font-bold text-gold-rush mb-4">
          HistoryClue
        </h1>
        <p className="text-xl text-sepia mt-2 mb-8">Where in history are you?</p>

        <div className="p-8 bg-papyrus border border-sepia/20 rounded-2xl shadow-lg w-full flex flex-col gap-4">
          <button
            onClick={() => setView("endless")}
            className="w-full px-6 py-3 bg-sepia-dark text-white font-bold text-lg rounded-lg hover:bg-ink transition-colors shadow-md"
          >
            Endless Mode
          </button>
          <button
            onClick={() => setView("daily")}
            className="w-full px-6 py-3 bg-gold-rush text-ink font-bold text-lg rounded-lg hover:bg-amber-600 transition-colors shadow-md"
          >
            Daily Challenge
          </button>
          <button
            onClick={() => setView("challenge")}
            className="w-full px-6 py-3 bg-sepia-dark text-white font-bold text-lg rounded-lg hover:bg-ink transition-colors shadow-md"
          >
            Challenge a Friend
          </button>
          <button
            onClick={() => setView("liveLobby")}
            className="w-full px-6 py-3 bg-red-700 text-white font-bold text-lg rounded-lg hover:bg-red-800 transition-colors shadow-md animate-pulse"
          >
            Live Battle (Beta)
          </button>
          <button
            onClick={() => setView("leaderboard")}
            className="w-full px-6 py-3 bg-gold-rush text-ink font-bold text-lg rounded-lg hover:bg-amber-600 transition-colors shadow-md"
          >
            Leaderboard
          </button>
        </div>

        <div className="mt-8 text-center">
          {session ? (
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={onSignOut}
                className="font-bold text-gold-rush hover:text-amber-600 transition-colors"
              >
                Sign Out
              </button>
              <button
                onClick={() => setView("profile")}
                className="px-6 py-2 bg-gold-rush text-ink font-bold rounded-lg hover:bg-amber-600 transition-colors shadow-md"
              >
                Profile
              </button>
            </div>
          ) : (
            <button
              onClick={() => setView("auth")}
              className="px-6 py-2 bg-gold-rush text-ink font-bold rounded-lg hover:bg-amber-600 transition-colors shadow-md"
            >
              Login or Sign Up
            </button>
          )}
        </div>

        <div className="mt-4">
          <button
            onClick={handleContactClick}
            className="text-sm text-sepia hover:text-ink underline"
          >
            Contact
          </button>
        </div>
      </div>
    </div>
  );
}