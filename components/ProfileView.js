// components/ProfileView.js - Emergency Fix Version (Streaks Disabled)
"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import { AvatarImage } from "../lib/avatarHelpers";
import PageWrapper from "./ui/PageWrapper";
import Card from "./ui/Card";
import GlassBackButton from './GlassBackButton';
import { getBadgeEmoji, getRarityColor, formatTimeAgo } from '../lib/badgeUtils';

export default function ProfileView({ setView, session, userId = null }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [avatarKey, setAvatarKey] = useState(Date.now());
  const [streak] = useState(0); // always 0 until streaks table is created
  const [displayedBadges, setDisplayedBadges] = useState([]);
  const [recentBadges, setRecentBadges] = useState([]);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [titleText, setTitleText] = useState('');
  const [titleColor, setTitleColor] = useState('#FFD700');

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
              "username, avatar_url, xp, level, is_founder, titles, selected_title, coins"
            )
            .eq("id", profileId)
            .single(),
          supabase.rpc("get_player_stats", { p_user_id: profileId }),
        ];

        const results = await Promise.all(promises);

        const { data: profileData, error: profileError } = results[0];
        const { data: statsData, error: statsError } = results[1];

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          console.error("Profile error details:", {
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
            code: profileError.code
          });
        }
        if (statsError) {
          console.error("Error fetching stats:", statsError);
          console.error("Stats error details:", {
            message: statsError.message,
            details: statsError.details,
            hint: statsError.hint,
            code: statsError.code
          });
        }

        console.log("Profile data received:", profileData);
        console.log("Stats data received:", statsData);
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

  // Fetch title display text and color
  useEffect(() => {
    async function fetchTitleData() {
      if (!profile?.selected_title) {
        setTitleText('');
        setTitleColor('#FFD700');
        return;
      }

      try {
        const { data } = await supabase
          .from('title_definitions')
          .select('title_text, color_hex')
          .eq('id', profile.selected_title)
          .maybeSingle();

        // If found in title_definitions, use title_text and color
        // Otherwise assume it's legacy display text stored directly
        setTitleText(data?.title_text || profile.selected_title);
        setTitleColor(data?.color_hex || '#FFD700');
      } catch (error) {
        console.error('Error fetching title data:', error);
        setTitleText(profile.selected_title); // Fallback to raw value
        setTitleColor('#FFD700');
      }
    }

    fetchTitleData();
  }, [profile?.selected_title]);

  // Load badges separately
  useEffect(() => {
    async function loadBadges() {
      if (!profileId) {
        setBadgesLoading(false);
        return;
      }

      try {
        setBadgesLoading(true);

        // Fetch displayed badges (max 5)
        const { data: displayed, error: displayedError } = await supabase
          .from('user_badges')
          .select(`
            badge_id,
            earned_at,
            badge_definitions!inner(id, name, rarity)
          `)
          .eq('user_id', profileId)
          .eq('is_displayed', true)
          .order('earned_at', { ascending: false })
          .limit(5);

        if (displayedError) {
          console.error('Error loading displayed badges:', displayedError);
        } else {
          setDisplayedBadges(displayed || []);
        }

        // Fetch recently earned (last 3)
        const { data: recent, error: recentError } = await supabase
          .from('user_badges')
          .select(`
            badge_id,
            earned_at,
            badge_definitions!inner(id, name, rarity)
          `)
          .eq('user_id', profileId)
          .order('earned_at', { ascending: false })
          .limit(3);

        if (recentError) {
          console.error('Error loading recent badges:', recentError);
        } else {
          setRecentBadges(recent || []);
        }
      } catch (error) {
        console.error('Error loading badges:', error);
      } finally {
        setBadgesLoading(false);
      }
    }

    loadBadges();
  }, [profileId]);

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);
      if (!event.target.files?.length) throw new Error("You must select an image to upload.");

      const { data: { user } } = await supabase.auth.getUser();
      const file = event.target.files[0];

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // IMPORTANT: Build the correct URL with /public/
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bisjnzssegpfhkxaayuz.supabase.co';
      const correctUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${fileName}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: correctUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Update local profile state
      setProfile(prev => ({ ...prev, avatar_url: correctUrl }));
      setAvatarKey(Date.now()); // cache-bust avatar

      alert('Avatar updated successfully!');
    } catch (error) {
      console.error('Avatar upload error:', error);
      alert(error.message || 'Failed to upload avatar');
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


  // Removed mockBadges - now using real badges from database

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
      <GlassBackButton
        onClick={() => {
          console.log('[ProfileView] Back button clicked');
          if (setView && typeof setView === 'function') {
            setView('menu');
          } else {
            console.error('[ProfileView] setView is not a function:', setView);
          }
        }}
        fallbackUrl="/"
      />

      {/* HEADER */}
      <header className="p-8 relative z-10">
        <div className="text-center max-w-7xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-2"
              style={{ letterSpacing: '0.02em', textShadow: '0 0 20px rgba(212, 175, 55, 0.3)' }}>
            Profile
          </h1>
          <p className="text-sm italic font-light" style={{ color: '#d4af37', opacity: 0.9, letterSpacing: '0.05em' }}>
            Player statistics • Achievements • Progress
          </p>
        </div>
      </header>

      {/* CONTENT */}
      <div className="px-8 pb-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="backdrop-blur rounded-xl shadow-2xl border" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
              <div className="p-6 text-center">
                <div className="w-32 h-32 mx-auto mb-4 relative group">
                  <AvatarImage
                    url={profile?.avatar_url}
                    size="w-32 h-32"
                    className="border-2 border-yellow-500"
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
                {titleText && (
                  <p 
                    className="text-sm mb-4 font-semibold"
                    style={{ 
                      color: titleColor,
                      textShadow: `0 0 10px ${titleColor}44`
                    }}
                  >
                    {titleText}
                  </p>
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
                <div className="col-span-2 lg:col-span-1 p-4 border rounded-lg" style={{ backgroundColor: 'rgba(255, 215, 0, 0.1)', borderColor: 'rgba(255, 215, 0, 0.3)' }}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-xl">🪙</span>
                    <p className="text-2xl font-bold" style={{ color: '#ffd700' }}>
                      {(profile?.coins || 0).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm text-gray-400 uppercase text-center">Coins</p>
                </div>
              </div>
            </div>

            {/* Displayed Badges */}
            {!badgesLoading && displayedBadges.length > 0 && (
              <div className="backdrop-blur rounded-xl shadow-2xl border p-6" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-semibold uppercase text-yellow-500">Featured Badges</h3>
                  <button
                    onClick={() => setView('badges')}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    View All →
                  </button>
                </div>
                <div className="flex flex-wrap gap-4 justify-center">
                  {displayedBadges.map((userBadge) => {
                    const badge = userBadge.badge_definitions;
                    const emoji = getBadgeEmoji(badge.id);
                    const rarityColor = getRarityColor(badge.rarity);

                    return (
                      <div
                        key={userBadge.badge_id}
                        className="group relative"
                      >
                        <div
                          className="p-4 rounded-lg border text-center transition-all hover:scale-110"
                          style={{
                            backgroundColor: "rgba(0,0,0,0.5)",
                            borderColor: rarityColor,
                            boxShadow: `0 0 20px ${rarityColor}44`
                          }}
                        >
                          <div className="text-4xl mb-2">{emoji}</div>
                          <p className="text-white text-xs font-medium">{badge.name}</p>
                        </div>
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {badge.name}
                          <div className="text-xxs text-gray-400 mt-1">
                            {formatTimeAgo(userBadge.earned_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recently Earned */}
            {!badgesLoading && recentBadges.length > 0 && (
              <div className="backdrop-blur rounded-xl shadow-2xl border p-6" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
                <h3 className="text-xs font-semibold uppercase text-yellow-500 mb-6">Recently Earned</h3>
                <div className="space-y-3">
                  {recentBadges.map((userBadge) => {
                    const badge = userBadge.badge_definitions;
                    const emoji = getBadgeEmoji(badge.id);
                    const rarityColor = getRarityColor(badge.rarity);

                    return (
                      <div
                        key={userBadge.badge_id}
                        className="flex items-center gap-4 p-3 rounded-lg"
                        style={{
                          backgroundColor: "rgba(0,0,0,0.3)",
                          borderLeft: `3px solid ${rarityColor}`
                        }}
                      >
                        <div className="text-3xl">{emoji}</div>
                        <div className="flex-1">
                          <p className="text-white font-medium">{badge.name}</p>
                          <p className="text-xs text-gray-400">{formatTimeAgo(userBadge.earned_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No Badges Yet */}
            {!badgesLoading && displayedBadges.length === 0 && recentBadges.length === 0 && (
              <div className="backdrop-blur rounded-xl shadow-2xl border p-8 text-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
                <div className="text-6xl mb-4">🏅</div>
                <h3 className="text-xl font-serif text-white mb-2">No Badges Yet</h3>
                <p className="text-gray-400 mb-6">
                  {isOwnProfile
                    ? "Complete challenges to earn your first badge!"
                    : "This player hasn't earned any badges yet."}
                </p>
                {isOwnProfile && (
                  <button
                    onClick={() => setView('badges')}
                    className="px-6 py-3 bg-yellow-600 text-black font-bold rounded-md hover:bg-yellow-500 transition-all"
                  >
                    View All Badges
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
