// components/ProfileView.js - Emergency Fix Version (Streaks Disabled)
"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import Image from "next/image";
import PageWrapper from "./ui/PageWrapper";
import Card from "./ui/Card";

export default function ProfileView({ setView, session, userId = null }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [avatarKey, setAvatarKey] = useState(Date.now());
  const [streak] = useState(0); // always 0 until streaks table is created

  const profileId = userId || session?.user?.id;

  useEffect(() => {
    async function getProfileData() {
      if (!profileId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        const promises = [
          supabase
            .from("profiles")
            .select(
              "username, avatar_url, xp, level, is_founder, titles, selected_title"
            )
            .eq("id", profileId)
            .single(),
          supabase.rpc("get_player_stats", { p_user_id: profileId }),
        ];

        const results = await Promise.all(promises);

        const { data: profileData, error: profileError } = results[0];
        const { data: statsData, error: statsError } = results[1];

        if (profileError) console.error("Error fetching profile:", profileError);
        if (statsError) console.error("Error fetching stats:", statsError);

        setProfile(profileData);
        setStats(Array.isArray(statsData) ? statsData[0] : statsData);
      } catch (error) {
        console.error("Error loading profile data:", error);
      } finally {
        setLoading(false);
      }
    }

    getProfileData();
  }, [profileId]);

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);
      if (!event.target.files?.length) throw new Error("You must select an image to upload.");
      const { data: { user } } = await supabase.auth.getUser();
      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}.${fileExt}`;

      await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      await supabase.from("profiles").update({ avatar_url: filePath }).eq("id", user.id);

      setAvatarKey(Date.now()); // cache-bust avatar
    } catch (error) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const xpCalculations = useMemo(() => {
    const xpForLevel = (level) => Math.floor(1000 * Math.pow(level || 1, 1.5));
    const getNextLevelXP = (level) => Math.floor(1000 * Math.pow((level || 1) + 1, 1.5));

    const currentXP = profile?.xp || 0;
    const currentLevel = profile?.level || 1;
    const xpForCurrentLevel = xpForLevel(currentLevel);
    const xpForNextLevel = getNextLevelXP(currentLevel);
    const xpProgress =
      xpForNextLevel > xpForCurrentLevel
        ? ((currentXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100
        : 0;

    return {
      currentXP,
      currentLevel,
      xpForCurrentLevel,
      xpForNextLevel,
      xpProgress,
    };
  }, [profile?.xp, profile?.level]);

  const avatarSrc = useMemo(() => {
    if (!profile?.avatar_url) {
      return "https://placehold.co/128x128/fcf8f0/5a4b41?text=??";
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(profile.avatar_url);
    return `${data.publicUrl}?t=${avatarKey}`;
  }, [profile?.avatar_url, avatarKey]);

  const mockBadges = useMemo(
    () => [
      { id: "first_win", name: "First Victory", unlocked: (stats?.wins || 0) > 0, icon: "🏆" },
      { id: "streak_5", name: "5 Day Streak", unlocked: streak >= 5, icon: "🔥" },
      { id: "high_scorer", name: "High Scorer", unlocked: (stats?.total_score || 0) > 10000, icon: "⭐" },
      { id: "social_player", name: "Social Player", unlocked: false, icon: "👥" },
      { id: "puzzle_master", name: "Puzzle Master", unlocked: false, icon: "🧩" },
      { id: "speed_demon", name: "Speed Demon", unlocked: false, icon: "⚡" },
    ],
    [streak, stats?.total_score, stats?.wins]
  );

  const isOwnProfile = session?.user?.id === profileId;

  if (loading) {
    return (
      <div className="min-h-screen relative" style={{ background: "linear-gradient(145deg,#0d0d0d,#1a1a1a 40%,#2a2a2a)" }}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="text-2xl font-serif text-white mb-4">Loading profile...</div>
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ background: "linear-gradient(145deg,#0d0d0d,#1a1a1a 40%,#2a2a2a)" }}>
      {/* HEADER */}
      <header className="p-8 relative z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={() => setView("menu")}
            className="px-5 py-2.5 bg-gray-900 text-gray-300 font-medium rounded-md border border-gray-700/30 hover:border-yellow-500/50 hover:text-white transition-all duration-300"
          >
            ← Menu
          </button>
          <div className="text-center flex-1 mx-8">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-2">Profile</h1>
            <p className="text-sm italic font-light text-yellow-500/90">Player statistics • Achievements • Progress</p>
          </div>
          <div className="w-24"></div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="px-8 pb-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="backdrop-blur rounded-xl shadow-2xl border" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
              <div className="p-6 text-center">
                <div className="w-32 h-32 rounded-full mx-auto mb-4 border-2 border-yellow-500 relative group">
                  <Image
                    key={avatarKey}
                    src={avatarSrc}
                    alt="Avatar"
                    width={120}
                    height={120}
                    className="w-full h-full rounded-full object-cover"
                  />
                  {!userId && (
                    <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <span className="text-white text-xs font-medium px-2 py-1 bg-gray-900 rounded">
                        {uploading ? 'Uploading...' : 'Change'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={uploadAvatar}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <h2 className="text-2xl font-serif font-bold text-white mb-1">{profile?.username || "Anonymous"}</h2>
                {profile?.selected_title && (
                  <p className="text-sm mb-4 text-yellow-500/90">&quot;{profile.selected_title}&quot;</p>
                )}
                <div className="mb-6">
                  <span className="text-yellow-500 font-bold">Level {xpCalculations.currentLevel}</span>
                  <div className="w-full h-3 bg-gray-800 rounded-full mt-3">
                    <div
                      className="h-full bg-yellow-500 rounded-full"
                      style={{ width: `${Math.max(5, Math.min(xpCalculations.xpProgress, 100))}%` }}
                    ></div>
                  </div>
                </div>
                {isOwnProfile && (
                  <button
                    onClick={() => setView("profileSettings")}
                    className="w-full px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition"
                  >
                    Settings
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stats & Achievements */}
          <div className="lg:col-span-2 space-y-8">
            <div className="backdrop-blur rounded-xl shadow-2xl border p-6" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
              <h3 className="text-xs font-semibold uppercase text-yellow-500 mb-6">Player Stats</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="col-span-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-3xl font-bold text-yellow-500">{(stats?.total_score || 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-400 uppercase">Total Score</p>
                </div>
                <div className="p-4 bg-black/50 border border-gray-600/30 rounded-lg">
                  <p className="text-2xl font-bold text-white">{Math.round(stats?.average_score || 0)}</p>
                  <p className="text-sm text-gray-400 uppercase">Average Score</p>
                </div>
                <div className="p-4 bg-black/50 border border-gray-600/30 rounded-lg">
                  <p className="text-2xl font-bold text-white">{stats?.games_played || 0}</p>
                  <p className="text-sm text-gray-400 uppercase">Games Played</p>
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div className="backdrop-blur rounded-xl shadow-2xl border p-6" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
              <h3 className="text-xs font-semibold uppercase text-yellow-500 mb-6">Achievements & Badges</h3>
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
                {mockBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`p-4 rounded-lg border text-center ${
                      badge.unlocked ? "bg-yellow-500/10 border-yellow-500/30" : "bg-black/50 border-gray-700 opacity-40"
                    }`}
                  >
                    <div className="text-2xl mb-2">{badge.icon}</div>
                    <p className={badge.unlocked ? "text-white text-xs" : "text-gray-500 text-xs"}>{badge.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
