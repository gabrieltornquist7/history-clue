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
      className="min-h-screen"
      style={{
        background: 'linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 100%)'
      }}
    >
      {/* Top Navigation Bar */}
      <nav className="flex items-center justify-between p-8 border-b border-gray-800">
        <div className="flex items-center">
          <h1 className="text-3xl font-serif font-bold text-white tracking-wide">HistoryClue</h1>
        </div>
        {session && (
          <div className="flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur border border-gray-700 rounded-lg">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#d4af37' }}></div>
            <span className="font-mono text-sm text-white font-semibold">{streak}</span>
            <span className="text-sm text-gray-300">day streak</span>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)] p-8">
        <div className="w-full max-w-lg">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-6xl font-serif font-bold text-white mb-4 tracking-wide">
              HistoryClue
            </h1>
            <p className="text-xl italic font-light tracking-tight" style={{ color: '#d4af37' }}>
              Where in history are you?
            </p>
          </div>

          {/* Main Action Card */}
          <div 
            className="backdrop-blur rounded-xl overflow-hidden border"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderColor: '#d4af37'
            }}
          >
            
            {/* Play Section */}
            <div className="p-8 pb-6">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-px" style={{ backgroundColor: '#d4af37' }}></div>
                <h2 className="text-xs font-semibold text-white uppercase tracking-widest">
                  Play
                </h2>
              </div>
              
              {/* Hero Button - Daily Challenge */}
              <button
                onClick={() => setView("daily")}
                className="w-full mb-6 px-8 py-6 font-bold text-white rounded-lg transition-all duration-300 relative group"
                style={{ 
                  background: 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-xl font-bold">Daily Challenge</div>
                    <div className="text-sm font-normal text-red-200 mt-2">
                      5 puzzles • Progressive difficulty
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#d4af37' }}></div>
                </div>
                <div 
                  className="absolute bottom-0 left-8 right-8 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                  style={{ backgroundColor: '#d4af37' }}
                ></div>
              </button>

              {/* Secondary Play Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setView("endless")}
                  className="px-6 py-4 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all duration-300 relative group border border-gray-700"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  Endless Mode
                  <div 
                    className="absolute bottom-0 left-6 right-6 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                    style={{ backgroundColor: '#d4af37' }}
                  ></div>
                </button>
                <button
                  onClick={() => setView("challenge")}
                  className="px-6 py-4 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all duration-300 relative group border border-gray-700"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  Challenge Friend
                  <div 
                    className="absolute bottom-0 left-6 right-6 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                    style={{ backgroundColor: '#d4af37' }}
                  ></div>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px" style={{ backgroundColor: '#d4af37', opacity: 0.3 }}></div>

            {/* Live Battle Section */}
            <div className="p-8 py-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-px bg-pink-500"></div>
                <h2 className="text-xs font-semibold text-white uppercase tracking-widest">
                  Live Action
                </h2>
              </div>
              <button
                onClick={() => setView("liveLobby")}
                className="w-full px-8 py-6 font-bold text-white rounded-lg transition-all duration-300 relative group hover:shadow-pink-500/25"
                style={{ 
                  background: 'linear-gradient(135deg, #b00050 0%, #d81b60 100%)',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-xl font-bold">Live Battle</div>
                    <div className="text-sm font-normal text-pink-200 mt-2">
                      Real-time multiplayer
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-white/90 text-pink-800 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
                      BETA
                    </span>
                    <div className="w-2 h-2 bg-pink-300 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-lg shadow-lg shadow-pink-500/50 pointer-events-none"></div>
              </button>
            </div>

            {/* Divider */}
            <div className="h-px" style={{ backgroundColor: '#d4af37', opacity: 0.3 }}></div>

            {/* Account Section */}
            <div className="p-8 pt-6">
              {session ? (
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={() => setView("profile")}
                    className="px-6 py-3 text-gray-300 font-semibold rounded-lg border border-gray-600 hover:border-yellow-500 hover:text-white transition-all duration-300 relative group"
                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  >
                    Profile
                    <div 
                      className="absolute bottom-0 left-6 right-6 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                      style={{ backgroundColor: '#d4af37' }}
                    ></div>
                  </button>
                  <button
                    onClick={onSignOut}
                    className="px-6 py-3 text-gray-400 hover:text-gray-200 font-semibold transition-colors duration-300"
                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setView("auth")}
                  className="w-full px-8 py-4 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-700 transition-all duration-300 border border-gray-700 relative group"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  Login or Sign Up
                  <div 
                    className="absolute bottom-0 left-8 right-8 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                    style={{ backgroundColor: '#d4af37' }}
                  ></div>
                </button>
              )}
            </div>
          </div>

          {/* Footer Links */}
          <div className="flex items-center justify-center gap-6 mt-8">
            <button
              onClick={() => setView("leaderboard")}
              className="text-gray-400 hover:text-yellow-500 font-medium transition-colors duration-300 text-sm"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              Leaderboard
            </button>
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            <button
              onClick={handleContactClick}
              className="text-gray-400 hover:text-yellow-500 font-medium transition-colors duration-300 text-sm"
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