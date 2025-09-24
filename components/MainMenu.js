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
        background: 'linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 50%, #242424 100%)',
        backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(212, 175, 55, 0.02) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(212, 175, 55, 0.01) 0%, transparent 50%)
        `
      }}
    >
      {/* Top Navigation Bar */}
      <nav className="flex items-center justify-between p-8 border-b border-gray-800/50">
        <div className="flex items-center">
          <h1 className="text-3xl font-serif font-bold text-white tracking-wide">HistoryClue</h1>
        </div>
        {session && (
          <div className="flex items-center gap-3 px-4 py-2 bg-black/60 backdrop-blur border border-gray-700/50 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#d4af37' }}></div>
            <span className="font-mono text-sm text-white font-medium">{streak}</span>
            <span className="text-xs text-gray-400 uppercase tracking-wide">streak</span>
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
            className="backdrop-blur rounded-lg overflow-hidden"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.6)'
            }}
          >
            
            {/* Play Section */}
            <div className="p-8 pb-6">
              <div className="flex items-center gap-4 mb-8">
                <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#d4af37', opacity: 0.8 }}>
                  Play
                </h2>
              </div>
              
              {/* Hero Button - Daily Challenge */}
              <button
                onClick={() => setView("daily")}
                className="w-full mb-6 px-8 py-5 font-bold text-white rounded-md transition-all duration-300 relative group"
                style={{ 
                  background: 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)',
                  backgroundImage: 'linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, transparent 100%)',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = '0 0 0 2px rgba(212, 175, 55, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = 'none';
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-xl font-bold">Daily Challenge</div>
                    <div className="text-sm font-normal text-gray-300 mt-2">
                      5 puzzles • Progressive difficulty
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#d4af37' }}></div>
                </div>
              </button>

              {/* Secondary Play Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setView("endless")}
                  className="px-6 py-4 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-all duration-300 relative group border border-gray-700/30"
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
                  className="px-6 py-4 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-all duration-300 relative group border border-gray-700/30"
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

            {/* Subtle Divider */}
            <div className="mx-8 h-px bg-gradient-to-r from-transparent via-gray-700/30 to-transparent"></div>

            {/* Live Battle Section */}
            <div className="p-8 py-6">
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#d4af37', opacity: 0.8 }}>
                  Live Action
                </h2>
              </div>
              <button
                onClick={() => setView("liveLobby")}
                className="w-full px-8 py-5 font-bold text-white rounded-md transition-all duration-300 relative group border border-pink-600/20"
                style={{ 
                  background: 'linear-gradient(135deg, #b00050 0%, #d81b60 100%)',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = 'rgba(216, 27, 96, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = 'rgba(216, 27, 96, 0.2)';
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-xl font-bold">Live Battle</div>
                    <div className="text-sm font-normal text-gray-300 mt-2">
                      Real-time multiplayer
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-white text-pink-800 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
                      BETA
                    </span>
                    <div className="w-2 h-2 bg-pink-300 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </button>
            </div>

            {/* Subtle Divider */}
            <div className="mx-8 h-px bg-gradient-to-r from-transparent via-gray-700/30 to-transparent"></div>

            {/* Account Section */}
            <div className="p-8 pt-6">
              {session ? (
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={() => setView("profile")}
                    className="px-6 py-3 text-gray-300 font-medium rounded-md border border-gray-600/50 hover:border-yellow-500/60 hover:text-white transition-all duration-300 relative group"
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
                    className="px-6 py-3 text-gray-400 hover:text-gray-200 font-medium transition-colors duration-300"
                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setView("auth")}
                  className="w-full px-8 py-4 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-all duration-300 border border-gray-700/30 relative group"
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
              className="text-gray-500 hover:text-yellow-400 font-medium transition-colors duration-300 text-sm"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              Leaderboard
            </button>
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            <button
              onClick={handleContactClick}
              className="text-gray-500 hover:text-yellow-400 font-medium transition-colors duration-300 text-sm"
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