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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {/* Top Navigation Bar */}
      <nav className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm shadow-sm border-b border-amber-200">
        <div className="flex items-center">
          <h1 className="text-2xl font-serif font-bold text-amber-900">HistoryClue</h1>
        </div>
        {session && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white font-bold rounded-full shadow-sm">
            <span>🔥</span>
            <span>{streak}</span>
            <span className="text-sm">day streak</span>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <div className="w-full max-w-lg">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-serif font-bold text-amber-900 mb-2">
              HistoryClue
            </h1>
            <p className="text-lg italic text-amber-700">
              Where in history are you?
            </p>
          </div>

          {/* Main Action Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-amber-200">
            
            {/* Play Section */}
            <div className="mb-8">
              <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-4 text-center">
                Play
              </h2>
              
              {/* Hero Button - Daily Challenge */}
              <button
                onClick={() => setView("daily")}
                className="w-full mb-4 px-8 py-5 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-xl rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform"
              >
                <div className="flex items-center justify-center gap-3">
                  <span>⭐</span>
                  <span>Daily Challenge</span>
                </div>
                <p className="text-sm font-normal opacity-90 mt-1">
                  5 puzzles • Progressive difficulty
                </p>
              </button>

              {/* Secondary Play Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setView("endless")}
                  className="px-6 py-3 bg-amber-800 text-white font-bold rounded-lg hover:bg-amber-900 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  Endless Mode
                </button>
                <button
                  onClick={() => setView("challenge")}
                  className="px-6 py-3 bg-amber-800 text-white font-bold rounded-lg hover:bg-amber-900 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  Challenge Friend
                </button>
              </div>
            </div>

            {/* Live Battle Section */}
            <div className="mb-8">
              <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-4 text-center">
                Live Action
              </h2>
              <button
                onClick={() => setView("liveLobby")}
                className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold text-lg rounded-xl hover:from-red-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform relative overflow-hidden"
              >
                <div className="flex items-center justify-center gap-3">
                  <span className="animate-pulse">⚡</span>
                  <span>Live Battle</span>
                  <span className="bg-white/20 px-2 py-1 rounded text-xs">BETA</span>
                </div>
              </button>
            </div>

            {/* Account Section */}
            <div className="text-center border-t border-amber-200 pt-6">
              {session ? (
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setView("profile")}
                    className="px-6 py-2 bg-amber-100 text-amber-800 font-semibold rounded-lg hover:bg-amber-200 transition-colors"
                  >
                    Profile
                  </button>
                  <button
                    onClick={onSignOut}
                    className="px-6 py-2 text-amber-700 hover:text-amber-900 font-semibold transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setView("auth")}
                  className="px-8 py-3 bg-amber-800 text-white font-bold rounded-lg hover:bg-amber-900 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Login or Sign Up
                </button>
              )}
            </div>
          </div>

          {/* Footer Links */}
          <div className="flex items-center justify-center gap-6 mt-6 text-sm">
            <button
              onClick={() => setView("leaderboard")}
              className="text-amber-700 hover:text-amber-900 font-semibold transition-colors"
            >
              Leaderboard
            </button>
            <span className="text-amber-400">•</span>
            <button
              onClick={handleContactClick}
              className="text-amber-700 hover:text-amber-900 font-semibold transition-colors"
            >
              Contact
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}