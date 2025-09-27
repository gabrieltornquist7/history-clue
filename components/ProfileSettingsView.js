// components/ProfileSettingsView.js
"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import GlassBackButton from './GlassBackButton';

export default function ProfileSettingsView({ setView, session }) {
  console.log('[ProfileSettingsView] Rendered with setView:', typeof setView);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function getProfileData() {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("username, titles, selected_title")
        .eq("id", session.user.id)
        .single();

      if (!error) {
        setProfile(profileData);
        setSelectedTitle(profileData?.selected_title || "");
      }
      setLoading(false);
    }
    getProfileData();
  }, [session?.user?.id]);

  const handleSave = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ selected_title: selectedTitle })
      .eq("id", session.user.id);

    if (error) {
      alert("Error updating title: " + error.message);
    } else {
      alert("Title updated successfully!");
      setView("profile");
    }
    setSaving(false);
  };

  // ✅ Loading branch
  if (loading) {
    return (
      <div
        className="min-h-screen relative flex items-center justify-center"
        style={{
          background: `
            linear-gradient(145deg, #0d0d0d 0%, #1a1a1a 40%, #2a2a2a 100%),
            radial-gradient(circle at 25% 25%, rgba(255, 215, 0, 0.05), transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.04), transparent 50%)
          `,
          backgroundBlendMode: "overlay",
        }}
      >
        <div className="text-center">
          <div className="text-2xl font-serif text-white mb-4">
            Loading settings...
          </div>
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // ✅ Main return
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
        @keyframes slideUp {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .slide-up {
          animation: slideUp 0.6s ease-out;
        }
      `}</style>

      <GlassBackButton
        onClick={() => {
          console.log('[ProfileSettingsView] Back button clicked');
          if (setView && typeof setView === 'function') {
            setView('profile');
          } else {
            console.error('[ProfileSettingsView] setView is not a function:', setView);
          }
        }}
        fallbackUrl="/"
      />

      {/* Header */}
      <header className="p-8 relative z-10">
        <div className="text-center max-w-7xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-2">
            Profile Settings
          </h1>
          <p
            className="text-sm italic font-light"
            style={{ color: "#d4af37", opacity: 0.9 }}
          >
            Customize your profile • Manage preferences
          </p>
        </div>
      </header>

      <div className="px-8 pb-8 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Main Settings Card */}
          <div className="backdrop-blur rounded-xl shadow-2xl border slide-up p-8 bg-black/70 border-white/5">
            <h2 className="text-xs font-semibold uppercase mb-8 text-yellow-400/80 tracking-widest">
              Customize Your Profile
            </h2>

            {profile?.titles && profile.titles.length > 0 ? (
              <div className="space-y-6">
                {/* Current Selection */}
                <div className="p-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Current Title
                  </h3>
                  <p className="text-2xl font-serif text-yellow-400">
                    “{selectedTitle || "No title selected"}”
                  </p>
                </div>

                {/* Title Select */}
                <div className="space-y-4">
                  <label
                    htmlFor="title-select"
                    className="block text-sm font-semibold text-white mb-3"
                  >
                    Available Titles
                  </label>
                  <select
                    id="title-select"
                    value={selectedTitle}
                    onChange={(e) => setSelectedTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 text-white font-medium rounded-md border border-gray-700/30 focus:border-yellow-500/50 focus:outline-none"
                  >
                    {profile.titles.map((title) => (
                      <option key={title} value={title}>
                        {title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preview */}
                <div className="grid gap-3 mt-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    Preview your unlocked titles:
                  </h4>
                  {profile.titles.map((title) => (
                    <div
                      key={title}
                      onClick={() => setSelectedTitle(title)}
                      className={`p-3 rounded-lg border cursor-pointer ${
                        selectedTitle === title
                          ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400"
                          : "border-gray-700/30 bg-gray-800/30 text-gray-300 hover:border-gray-600/50 hover:bg-gray-800/50"
                      }`}
                    >
                      “{title}”{" "}
                      {selectedTitle === title && (
                        <span className="ml-2 text-xs text-yellow-500">
                          ✓ Selected
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-7 py-5 font-bold text-white rounded-md transition-all duration-300 relative group disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: saving
                        ? "rgba(139,0,0,0.5)"
                        : "linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)",
                    }}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={() => setView("profile")}
                    className="px-6 py-3 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 border border-gray-700/20"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏆</div>
                <p className="text-xl font-serif text-white mb-4">
                  No Titles Yet
                </p>
                <p className="text-gray-400 max-w-md mx-auto">
                  You haven&apos;t unlocked any titles yet. Keep playing to earn
                  achievements!
                </p>
                <div className="mt-8">
                  <button
                    onClick={() => setView("menu")}
                    className="px-7 py-5 font-bold text-white rounded-md"
                    style={{
                      background:
                        "linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)",
                    }}
                  >
                    Start Playing
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tips */}
          {profile?.titles && profile.titles.length > 0 && (
            <div className="mt-8 backdrop-blur rounded-xl shadow-2xl border p-6 bg-black/70 border-white/5 slide-up">
              <h3 className="text-xs font-semibold uppercase mb-4 text-yellow-400/80 tracking-widest">
                Tips
              </h3>
              <div className="space-y-3 text-sm text-gray-400">
                <p>• Titles are earned by completing achievements</p>
                <p>• Selected title shows on profile & leaderboards</p>
                <p>• Rare titles let you stand out more</p>
                <p>• Change your title anytime here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
