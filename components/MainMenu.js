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
    if (session && currentUserProfile?.is_founder) {
      setView("profile");
    } else {
      setView("contact");
    }
  };

  return (
    <div 
      className="min-h-screen relative"
      style={{
        background: 'linear-gradient(135deg, #f8f4e6 0%, #f1e6d3 100%)',
        backgroundImage: `
          radial-gradient(circle at 25% 25%, rgba(139, 90, 43, 0.03) 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(139, 90, 43, 0.03) 0%, transparent 50%),
          repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139, 90, 43, 0.01) 2px, rgba(139, 90, 43, 0.01) 4px)
        `
      }}
    >
      {/* Top Navigation Bar */}
      <nav className="flex items-center justify-between p-6 bg-white/90 backdrop-blur border-b border-amber-200/50">
        <div className="flex items-center">
          <h1 className="text-2xl font-serif font-bold text-amber-900">HistoryClue</h1>
        </div>
        {session && (
          <div className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white font-medium rounded-md border border-stone-700">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="font-mono text-sm">{streak}</span>
            <span className="text-sm text-stone-300">day streak</span>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-84px)] p-6">
        <div className="w-full max-w-md">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-serif font-bold text-stone-900 mb-3">
              HistoryClue
            </h1>
            <p className="text-lg italic text-stone-600 font-light">
              Where in history are you?
            </p>
          </div>

          {/* Main Action Card */}
          <div className="bg-white/95 backdrop-blur rounded-lg border border-stone-200/50 overflow-hidden">
            
            {/* Play Section */}
            <div className="p-6 pb-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-0.5 bg-stone-800"></div>
                <h2 className="text-xs font-semibold text-stone-800 uppercase tracking-wider">
                  Play
                </h2>
              </div>
              
              {/* Hero Button - Daily Challenge */}
              <button
                onClick={() => setView("daily")}
                className="w-full mb-4 px-6 py-4 bg-gradient-to-r from-red-800 to-red-900 text-white font-semibold rounded-md hover:from-red-900 hover:to-red-950 transition-all duration-200 border border-red-700/30"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-lg font-semibold">Daily Challenge</div>
                    <div className="text-sm font-normal text-red-200 mt-1">
                      5 puzzles • Progressive difficulty
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                </div>
              </button>

              {/* Secondary Play Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setView("endless")}
                  className="px-5 py-3 bg-stone-800 text-white font-medium rounded-md hover:bg-stone-900 transition-colors border border-stone-700/50"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  Endless Mode
                </button>
                <button
                  onClick={() => setView("challenge")}
                  className="px-5 py-3 bg-stone-800 text-white font-medium rounded-md hover:bg-stone-900 transition-colors border border-stone-700/50"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  Challenge Friend
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-stone-200/60"></div>

            {/* Live Battle Section */}
            <div className="p-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-0.5 bg-pink-600"></div>
                <h2 className="text-xs font-semibold text-stone-800 uppercase tracking-wider">
                  Live Action
                </h2>
              </div>
              <button
                onClick={() => setView("liveLobby")}
                className="w-full px-6 py-4 bg-gradient-to-r from-pink-700 to-rose-800 text-white font-semibold rounded-md hover:from-pink-800 hover:to-rose-900 transition-all duration-200 border border-pink-600/30 relative"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-lg font-semibold">Live Battle</div>
                    <div className="text-sm font-normal text-pink-200 mt-1">
                      Real-time multiplayer
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-white/20 px-2 py-1 rounded text-xs font-medium">BETA</span>
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-stone-200/60"></div>

            {/* Account Section */}
            <div className="p-6 pt-5">
              {session ? (
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setView("profile")}
                    className="px-5 py-2 bg-stone-100 text-stone-800 font-medium rounded-md hover:bg-stone-200 transition-colors border border-stone-300/50"
                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  >
                    Profile
                  </button>
                  <button
                    onClick={onSignOut}
                    className="px-5 py-2 text-stone-600 hover:text-stone-800 font-medium transition-colors"
                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setView("auth")}
                  className="w-full px-6 py-3 bg-stone-800 text-white font-semibold rounded-md hover:bg-stone-900 transition-colors border border-stone-700/50"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  Login or Sign Up
                </button>
              )}
            </div>
          </div>

          {/* Footer Links */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <button
              onClick={() => setView("leaderboard")}
              className="text-stone-600 hover:text-stone-800 font-medium transition-colors text-sm"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              Leaderboard
            </button>
            <div className="w-1 h-1 bg-stone-400 rounded-full"></div>
            <button
              onClick={handleContactClick}
              className="text-stone-600 hover:text-stone-800 font-medium transition-colors text-sm"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              Contact
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}