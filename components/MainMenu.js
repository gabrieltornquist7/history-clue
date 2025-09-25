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
        background: `
          linear-gradient(145deg, #0d0d0d 0%, #1a1a1a 40%, #2a2a2a 100%),
          radial-gradient(circle at 25% 25%, rgba(255, 215, 0, 0.05), transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.04), transparent 50%)
        `,
        backgroundBlendMode: "overlay",
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
      `}</style>

      {/* Header */}
      <header className="flex items-center justify-between p-8 pb-4 relative z-10">
        <div className="flex-1"></div>
        <div className="text-center">
          <h1
            className="text-4xl font-serif font-bold text-white mb-2"
            style={{ letterSpacing: "0.02em" }}
          >
            HistoryClue
          </h1>
          <p
            className="text-sm italic font-light"
            style={{
              color: "#d4af37",
              opacity: 0.9,
              letterSpacing: "0.05em",
            }}
          >
            Where in history are you?
          </p>
        </div>
        <div className="flex-1 flex justify-end">
          {session && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur border border-gray-700/40 rounded-full">
              <div
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: "#d4af37" }}
              ></div>
              <span className="font-mono text-xs text-white font-medium">
                {streak}
              </span>
              <span className="text-xs text-gray-400">streak</span>
            </div>
          )}
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
                className="w-full mb-5 px-7 py-5 font-bold text-white rounded-md transition-all duration-300 relative group"
                style={{
                  background: "linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)",
                  backgroundImage:
                    "linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, transparent 100%)",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  letterSpacing: "-0.02em",
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow =
                    "0 0 0 2px rgba(212, 175, 55, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = "none";
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-lg font-bold">Daily Challenge</div>
                    <div
                      className="text-xs font-normal text-gray-400 mt-1.5"
                      style={{ letterSpacing: "0.03em" }}
                    >
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
                  className="px-5 py-3.5 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-all duration-300 relative group border border-gray-700/20"
                  style={{
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Endless Mode
                  <div
                    className="absolute bottom-0 left-5 right-5 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                    style={{ backgroundColor: "#d4af37" }}
                  ></div>
                </button>
                <button
                  onClick={() => setView("challenge")}
                  className="px-5 py-3.5 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-all duration-300 relative group border border-gray-700/20"
                  style={{
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Challenge Friend
                  <div
                    className="absolute bottom-0 left-5 right-5 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                    style={{ backgroundColor: "#d4af37" }}
                  ></div>
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
                className="w-full px-7 py-5 font-bold text-white rounded-md transition-all duration-300 relative group border border-pink-600/15"
                style={{
                  background:
                    "linear-gradient(135deg, #b00050 0%, #d81b60 100%)",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  letterSpacing: "-0.02em",
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = "rgba(216, 27, 96, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = "rgba(216, 27, 96, 0.15)";
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-lg font-bold">Live Battle</div>
                    <div
                      className="text-xs font-normal text-gray-400 mt-1.5"
                      style={{ letterSpacing: "0.03em" }}
                    >
                      Real-time multiplayer
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="bg-white text-pink-800 px-2.5 py-0.5 rounded-full text-xs font-bold"
                      style={{ letterSpacing: "0.05em" }}
                    >
                      dCOMING SOON
                    </span>
                    <div className="w-1.5 h-1.5 bg-pink-300 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </button>
            </div>

            {/* Divider */}
            <div className="mx-7 h-px bg-gradient-to-r from-transparent via-gray-600/20 to-transparent"></div>

            {/* Account Section */}
            <div className="p-7 pt-5">
              {session ? (
                <div className="flex items-center justify-center gap-5">
                  <button
                    onClick={() => setView("profile")}
                    className="px-5 py-2.5 text-gray-300 font-medium rounded-md border border-gray-600/30 hover:border-yellow-500/50 hover:text-white transition-all duration-300 relative group"
                    style={{
                      fontFamily: "system-ui, -apple-system, sans-serif",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Profile
                    <div
                      className="absolute bottom-0 left-5 right-5 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                      style={{ backgroundColor: "#d4af37" }}
                    ></div>
                  </button>
                  <button
                    onClick={onSignOut}
                    className="px-5 py-2.5 text-gray-400 hover:text-gray-200 font-medium transition-colors duration-300"
                    style={{
                      fontFamily: "system-ui, -apple-system, sans-serif",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setView("auth")}
                  className="w-full px-7 py-3.5 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-all duration-300 border border-gray-700/20 relative group"
                  style={{
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Login or Sign Up
                  <div
                    className="absolute bottom-0 left-7 right-7 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                    style={{ backgroundColor: "#d4af37" }}
                  ></div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bar */}
      <footer className="border-t border-gray-800/30 bg-black/20 backdrop-blur relative z-10">
        <div className="flex items-center justify-center gap-6 py-4">
          <button
            onClick={() => setView("leaderboard")}
            className="text-gray-500 hover:text-yellow-400 font-medium transition-colors duration-300 text-sm"
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              letterSpacing: "0.02em",
            }}
          >
            Leaderboard
          </button>
          <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
          <button
            onClick={handleContactClick}
            className="text-gray-500 hover:text-yellow-400 font-medium transition-colors duration-300 text-sm"
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              letterSpacing: "0.02em",
            }}
          >
            Contact
          </button>
        </div>
      </footer>
    </div>
  );
}
