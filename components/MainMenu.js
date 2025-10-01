"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function MainMenu({ setView, session, onSignOut }) {
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchUserProfile = async () => {
      // Get profile data including endless mode level from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, is_founder, endless_mode_level")
        .eq("id", session.user.id)
        .single();

      if (!profileError && profileData) {
        setCurrentUserProfile({
          ...profileData,
          endless_mode_level: profileData?.endless_mode_level || 1
        });
      }
    };

    fetchUserProfile();
  }, [session?.user?.id]); // ✅ fixed deps

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
        background: `
          linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%),
          radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%),
          radial-gradient(circle at 70% 80%, rgba(212, 175, 55, 0.01) 0%, transparent 50%),
          radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)
        `
      }}
    >
      {/* Metallic shine overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(115deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.08) 100%)",
          backgroundSize: "200% 200%",
          animation: "shine 12s linear infinite",
        }}
      ></div>

      <style jsx>{`
        @keyframes shine {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        @keyframes dailyShine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes liveBattleShine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Header */}
      <header className="flex items-center justify-between p-8 pb-4 relative z-10">
        <div className="flex-1"></div>
        <div className="text-center">
          <h1
            className="text-5xl font-serif font-bold mb-2 relative inline-block"
            style={{
              letterSpacing: "0.05em",
              background: "linear-gradient(135deg, #ffffff 0%, #f5f5f5 50%, #e0e0e0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 0 40px rgba(212, 175, 55, 0.3)",
              filter: "drop-shadow(0 2px 8px rgba(212, 175, 55, 0.4)) drop-shadow(0 0 20px rgba(255, 255, 255, 0.1))"
            }}
          >
            HistoryClue
          </h1>
          <p
            className="text-sm italic font-light"
            style={{
              color: "#d4af37",
              opacity: 0.95,
              letterSpacing: "0.08em",
              textShadow: "0 0 15px rgba(212, 175, 55, 0.4)"
            }}
          >
            Where in history are you?
          </p>
        </div>
        <div className="flex-1 flex justify-end">
        </div>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-8 pt-4 relative z-10">
        <div className="w-full max-w-md">
          {/* Main Action Card */}
          <div
            className="backdrop-blur rounded-lg overflow-hidden shadow-2xl"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              boxShadow:
                "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)",
            }}
          >
            {/* Play Section */}
            <div className="p-7 pb-5">
              <div className="flex items-center gap-3 mb-7">
                <h2
                  className="text-xs font-semibold uppercase"
                  style={{
                    color: "#d4af37",
                    opacity: 0.8,
                    letterSpacing: "0.15em",
                  }}
                >
                  Play
                </h2>
              </div>

              {/* Hero Button - Daily Challenge */}
              <button
                onClick={() => setView("daily")}
                className="w-full mb-5 px-7 py-5 font-bold text-white rounded-md transition-all duration-300 relative group overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)",
                  backgroundImage:
                    "linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, transparent 100%)",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  letterSpacing: "-0.02em",
                  boxShadow: "0 8px 32px rgba(139, 0, 0, 0.4), 0 0 0 1px rgba(212, 175, 55, 0.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 12px 48px rgba(139, 0, 0, 0.6), 0 0 20px rgba(212, 175, 55, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(139, 0, 0, 0.4), 0 0 0 1px rgba(212, 175, 55, 0.2)";
                }}
              >
                {/* Shine effect */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
                    backgroundSize: "200% 100%",
                    animation: "dailyShine 3s infinite",
                  }}
                ></div>
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-lg font-bold">Daily Challenge</div>
                    <div className="text-xs font-normal text-gray-400 mt-1.5">
                      5 puzzles • Progressive difficulty
                    </div>
                  </div>
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "#d4af37" }}
                  ></div>
                </div>
              </button>

              {/* Secondary Play Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setView("endless")}
                  className="px-5 py-4 text-white font-medium rounded-md transition-all duration-300 relative group border overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)",
                    borderColor: 'rgba(59, 130, 246, 0.4)',
                    boxShadow: '0 4px 20px rgba(59, 130, 246, 0.25), inset 0 1px 0 rgba(59, 130, 246, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(59, 130, 246, 0.45), inset 0 1px 0 rgba(59, 130, 246, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.25), inset 0 1px 0 rgba(59, 130, 246, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                  }}
                >
                  {/* Animated subtle shine */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(115deg, transparent 0%, rgba(59, 130, 246, 0.2) 50%, transparent 100%)",
                      backgroundSize: "200% 100%",
                      animation: "dailyShine 4s infinite"
                    }}
                  ></div>
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="text-left">
                      <div className="font-bold text-base">Endless Mode</div>
                      <div className="text-xs text-blue-300 mt-0.5">
                        {currentUserProfile?.endless_mode_level ? 'Continue your journey' : 'Start your journey'}
                      </div>
                    </div>
                    {currentUserProfile?.endless_mode_level && (
                      <div
                        className="px-2.5 py-1 rounded font-bold text-sm"
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          color: 'white',
                          boxShadow: '0 0 20px rgba(59, 130, 246, 0.6)'
                        }}
                      >
                        L{currentUserProfile.endless_mode_level}
                      </div>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setView("challenge")}
                  className="px-5 py-4 text-white font-medium rounded-md transition-all duration-300 relative group border overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(147, 51, 234, 0.1) 100%)",
                    borderColor: 'rgba(168, 85, 247, 0.4)',
                    boxShadow: '0 4px 20px rgba(168, 85, 247, 0.25), inset 0 1px 0 rgba(168, 85, 247, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(168, 85, 247, 0.45), inset 0 1px 0 rgba(168, 85, 247, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(168, 85, 247, 0.25), inset 0 1px 0 rgba(168, 85, 247, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)';
                  }}
                >
                  {/* Animated subtle shine */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(115deg, transparent 0%, rgba(168, 85, 247, 0.2) 50%, transparent 100%)",
                      backgroundSize: "200% 100%",
                      animation: "dailyShine 4s infinite"
                    }}
                  ></div>
                  <div className="relative z-10">
                    <div className="font-bold text-base">Challenge Friend</div>
                    <div className="text-xs text-purple-300 mt-0.5">3-round showdown</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-7 h-px bg-gradient-to-r from-transparent via-gray-600/20 to-transparent"></div>

            {/* Live Battle Section */}
            <div className="p-7 py-5">
              <div className="flex items-center gap-3 mb-5">
                <h2
                  className="text-xs font-semibold uppercase"
                  style={{
                    color: "#d4af37",
                    opacity: 0.8,
                    letterSpacing: "0.15em",
                  }}
                >
                  Live Action
                </h2>
              </div>
              <button
                onClick={() => setView("liveLobby")}
                className="w-full px-7 py-5 font-bold text-white rounded-md transition-all duration-300 relative group overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #b00050 0%, #d81b60 100%)",
                  boxShadow: "0 8px 32px rgba(176, 0, 80, 0.4), 0 0 0 1px rgba(216, 27, 96, 0.3)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 12px 48px rgba(176, 0, 80, 0.6), 0 0 30px rgba(216, 27, 96, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(176, 0, 80, 0.4), 0 0 0 1px rgba(216, 27, 96, 0.3)";
                }}
              >
                {/* Animated pink/magenta shine effect */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(115deg, transparent 0%, rgba(236, 72, 153, 0.4) 50%, transparent 100%)",
                    backgroundSize: "200% 100%",
                    animation: "liveBattleShine 2.5s infinite",
                  }}
                ></div>
                <div className="flex items-center justify-between relative z-10">
                  <div className="text-left">
                    <div className="text-lg font-bold">Live Battle</div>
                    <div className="text-xs text-pink-200 mt-1.5">
                      Real-time multiplayer
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{
                        background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
                        color: "#fff",
                        boxShadow: "0 0 20px rgba(236, 72, 153, 0.7)",
                        textShadow: "0 0 10px rgba(0, 0, 0, 0.3)"
                      }}
                    >
                      NEW
                    </span>
                    <div 
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{
                        backgroundColor: "#ec4899",
                        boxShadow: "0 0 12px rgba(236, 72, 153, 0.9)"
                      }}
                    ></div>
                  </div>
                </div>
              </button>
            </div>

            {/* Divider */}
            <div className="mx-7 h-px bg-gradient-to-r from-transparent via-gray-600/20 to-transparent"></div>

            {/* Account Section */}
            <div className="p-7 pt-5">
              {session ? (
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <button
                    onClick={() => setView("shop")}
                    className="px-5 py-2.5 font-medium rounded-md border transition-all duration-300 relative"
                    style={{
                      borderColor: 'rgba(255, 215, 0, 0.4)',
                      color: '#ffd700',
                      backgroundColor: 'rgba(255, 215, 0, 0.05)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = 'rgba(255, 215, 0, 0.6)';
                      e.target.style.backgroundColor = 'rgba(255, 215, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = 'rgba(255, 215, 0, 0.4)';
                      e.target.style.backgroundColor = 'rgba(255, 215, 0, 0.05)';
                    }}
                  >
                    🪙 Shop
                  </button>
                  <button
                    onClick={() => setView("leaderboard")}
                    className="px-5 py-2.5 text-gray-300 font-medium rounded-md border border-gray-600/30 hover:border-yellow-500/50 hover:text-white transition-all duration-300"
                  >
                    Leaderboard
                  </button>
                  <button
                    onClick={() => setView("friends")}
                    className="px-5 py-2.5 text-gray-300 font-medium rounded-md border border-gray-600/30 hover:border-yellow-500/50 hover:text-white transition-all duration-300"
                  >
                    Friends
                  </button>
                  <button
                    onClick={() => setView("profile")}
                    className="px-5 py-2.5 text-gray-300 font-medium rounded-md border border-gray-600/30 hover:border-yellow-500/50 hover:text-white transition-all duration-300"
                  >
                    Profile
                  </button>
                  <button
                    onClick={handleContactClick}
                    className="px-5 py-2.5 text-gray-300 font-medium rounded-md border border-gray-600/30 hover:border-yellow-500/50 hover:text-white transition-all duration-300"
                  >
                    Contact
                  </button>
                  <button
                    onClick={onSignOut}
                    className="px-5 py-2.5 text-gray-400 hover:text-gray-200 font-medium transition-colors duration-300"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setView("auth")}
                  className="w-full px-7 py-3.5 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-all duration-300 border border-gray-700/20 relative group"
                >
                  Login or Sign Up
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bar */}
      <footer className="border-t border-gray-800/30 bg-black/20 backdrop-blur relative z-10">
        <div className="flex items-center justify-center py-4">
          <button
            onClick={() => setView("news")}
            className="text-gray-500 hover:text-yellow-400 font-medium transition-colors duration-300 text-sm flex items-center gap-2"
          >
            <span className="text-xs">📰</span> News
          </button>
        </div>
      </footer>
    </div>
  );
}