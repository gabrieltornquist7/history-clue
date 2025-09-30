// components/ProfileSettingsView.js
"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import GlassBackButton from './GlassBackButton';
import { getBadgeEmoji, getRarityColor, getRarityLabel } from '../lib/badgeUtils';

export default function ProfileSettingsView({ setView, session }) {
  console.log('[ProfileSettingsView] Rendered with setView:', typeof setView);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('titles'); // 'titles' or 'badges'

  // Badge state
  const [userBadges, setUserBadges] = useState([]);
  const [badgesLoading, setBadgesLoading] = useState(false);

  // Title state
  const [titleDefinitions, setTitleDefinitions] = useState([]);
  const [selectedTitleText, setSelectedTitleText] = useState('');

  useEffect(() => {
    async function getProfileData() {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("username, titles, selected_title")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          console.error('Error loading profile:', profileError);
          setLoading(false);
          return;
        }

        setProfile(profileData);
        setSelectedTitle(profileData?.selected_title || "");

        // Fetch title definitions for all user titles
        if (profileData?.titles && profileData.titles.length > 0) {
          const { data: titleDefs, error: titleError } = await supabase
            .from('title_definitions')
            .select('id, title_text, color_hex, rarity')
            .in('id', profileData.titles);

          if (!titleError && titleDefs) {
            setTitleDefinitions(titleDefs);

            // Set selected title text
            const selectedDef = titleDefs.find(t => t.id === profileData.selected_title);
            setSelectedTitleText(selectedDef?.title_text || profileData.selected_title || '');
          } else {
            console.error('Error loading title definitions:', titleError);
            // Fallback: treat titles array as legacy display text
            setTitleDefinitions(profileData.titles.map(t => ({ id: t, title_text: t })));
            setSelectedTitleText(profileData.selected_title || '');
          }
        }
      } catch (error) {
        console.error('Error in getProfileData:', error);
      } finally {
        setLoading(false);
      }
    }
    getProfileData();
  }, [session?.user?.id]);

  useEffect(() => {
    if (activeTab === 'badges') {
      loadUserBadges();
    }
  }, [activeTab, session?.user?.id]);

  const loadUserBadges = async () => {
    setBadgesLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          *,
          badge:badge_definitions(id, name, rarity, category)
        `)
        .eq('user_id', session.user.id)
        .order('earned_at', { ascending: false });

      if (!error) {
        setUserBadges(data || []);
      } else {
        console.error('[ProfileSettings] Error loading badges:', error);
      }
    } catch (error) {
      console.error('[ProfileSettings] Error loading badges:', error);
    } finally {
      setBadgesLoading(false);
    }
  };

  const handleSave = async () => {
    if (!session?.user?.id) return;
    setSaving(true);

    // Always store the title ID, not the display text
    const { error } = await supabase
      .from("profiles")
      .update({ selected_title: selectedTitle }) // selectedTitle is the ID
      .eq("id", session.user.id);

    if (error) {
      alert("Error updating title: " + error.message);
    } else {
      alert("Title updated successfully!");
      setView("profile");
    }
    setSaving(false);
  };

  const handleBadgeToggle = async (badgeId, currentlyDisplayed) => {
    // Count currently displayed
    const displayedCount = userBadges.filter(b => b.is_displayed).length;

    if (!currentlyDisplayed && displayedCount >= 5) {
      alert('Maximum 5 badges can be displayed on your profile');
      return;
    }

    const { error } = await supabase
      .from('user_badges')
      .update({ is_displayed: !currentlyDisplayed })
      .eq('user_id', session.user.id)
      .eq('badge_id', badgeId);

    if (error) {
      console.error('[ProfileSettings] Error updating badge display:', error);
      alert('Error updating badge display');
    } else {
      // Reload badges to reflect changes
      loadUserBadges();
    }
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

  const displayedCount = userBadges.filter(b => b.is_displayed).length;

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

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div
              className="backdrop-blur rounded-lg p-1.5 border"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('titles')}
                  className={`relative px-5 py-2.5 font-medium rounded-md transition-all duration-300 ${
                    activeTab === 'titles'
                      ? 'bg-gray-800 text-white border border-gray-700/30'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/50'
                  }`}
                >
                  🏆 Titles
                  {activeTab === 'titles' && (
                    <div
                      className="absolute bottom-0 left-5 right-5 h-px"
                      style={{ backgroundColor: '#d4af37' }}
                    ></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('badges')}
                  className={`relative px-5 py-2.5 font-medium rounded-md transition-all duration-300 ${
                    activeTab === 'badges'
                      ? 'bg-gray-800 text-white border border-gray-700/30'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/50'
                  }`}
                >
                  🏅 Badges
                  {activeTab === 'badges' && (
                    <div
                      className="absolute bottom-0 left-5 right-5 h-px"
                      style={{ backgroundColor: '#d4af37' }}
                    ></div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Titles Tab */}
          {activeTab === 'titles' && (
            <div className="backdrop-blur rounded-xl shadow-2xl border slide-up p-8 bg-black/70 border-white/5">
              <h2 className="text-xs font-semibold uppercase mb-8 text-yellow-400/80 tracking-widest">
                Customize Your Title
              </h2>

              {titleDefinitions && titleDefinitions.length > 0 ? (
                <div className="space-y-6">
                  {/* Current Selection */}
                  <div className="p-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Current Title
                    </h3>
                    <p className="text-2xl font-serif text-yellow-400">
                      {selectedTitleText || "No title selected"}
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
                      onChange={(e) => {
                        setSelectedTitle(e.target.value);
                        const selectedDef = titleDefinitions.find(t => t.id === e.target.value);
                        setSelectedTitleText(selectedDef?.title_text || e.target.value);
                      }}
                      className="w-full px-4 py-3 bg-gray-900 text-white font-medium rounded-md border border-gray-700/30 focus:border-yellow-500/50 focus:outline-none"
                    >
                      {titleDefinitions.map((titleDef) => (
                        <option key={titleDef.id} value={titleDef.id}>
                          {titleDef.title_text}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Preview */}
                  <div className="grid gap-3 mt-6">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">
                      Preview your unlocked titles:
                    </h4>
                    {titleDefinitions.map((titleDef) => (
                      <div
                        key={titleDef.id}
                        onClick={() => {
                          setSelectedTitle(titleDef.id);
                          setSelectedTitleText(titleDef.title_text);
                        }}
                        className={`p-3 rounded-lg border cursor-pointer ${
                          selectedTitle === titleDef.id
                            ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400"
                            : "border-gray-700/30 bg-gray-800/30 text-gray-300 hover:border-gray-600/50 hover:bg-gray-800/50"
                        }`}
                        style={{
                          color: selectedTitle === titleDef.id ? titleDef.color_hex : undefined
                        }}
                      >
                        {titleDef.title_text}{" "}
                        {selectedTitle === titleDef.id && (
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
          )}

          {/* Badges Tab */}
          {activeTab === 'badges' && (
            <div className="backdrop-blur rounded-xl shadow-2xl border slide-up p-8 bg-black/70 border-white/5">
              <h2 className="text-xs font-semibold uppercase mb-4 text-yellow-400/80 tracking-widest">
                Display Badges
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                Select up to 5 badges to display on your profile ({displayedCount}/5 selected)
              </p>

              {badgesLoading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading badges...</p>
                </div>
              ) : userBadges.length > 0 ? (
                <div className="space-y-3">
                  {userBadges.map(userBadge => {
                    const badge = userBadge.badge;
                    const emoji = getBadgeEmoji(badge.id);
                    const rarityColor = getRarityColor(badge.rarity);

                    return (
                      <div
                        key={userBadge.id}
                        className={`p-4 rounded-lg border transition-all cursor-pointer ${
                          userBadge.is_displayed
                            ? 'border-yellow-500/50 bg-yellow-500/10'
                            : 'border-gray-700/30 bg-gray-800/30 hover:border-gray-600/50'
                        }`}
                        onClick={() => handleBadgeToggle(badge.id, userBadge.is_displayed)}
                      >
                        <div className="flex items-center gap-4">
                          {/* Checkbox */}
                          <div
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                              userBadge.is_displayed
                                ? 'bg-yellow-500 border-yellow-500'
                                : 'border-gray-600'
                            }`}
                          >
                            {userBadge.is_displayed && (
                              <span className="text-black font-bold">✓</span>
                            )}
                          </div>

                          {/* Badge Emoji */}
                          <div className="text-3xl">
                            {emoji}
                          </div>

                          {/* Badge Info */}
                          <div className="flex-1">
                            <div className="font-semibold text-white">
                              {badge.name}
                            </div>
                            <div
                              className="text-xs font-medium inline-block px-2 py-0.5 rounded-full mt-1"
                              style={{
                                color: rarityColor,
                                backgroundColor: `${rarityColor}22`,
                                border: `1px solid ${rarityColor}44`
                              }}
                            >
                              {getRarityLabel(badge.rarity)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏅</div>
                  <p className="text-xl font-serif text-white mb-4">
                    No Badges Yet
                  </p>
                  <p className="text-gray-400 max-w-md mx-auto mb-6">
                    You haven&apos;t earned any badges yet. Complete challenges to unlock badges!
                  </p>
                  <button
                    onClick={() => setView("badges")}
                    className="px-6 py-3 bg-yellow-600 text-black font-bold rounded-md hover:bg-yellow-500 transition-all"
                  >
                    View All Badges
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tips */}
          {activeTab === 'titles' && profile?.titles && profile.titles.length > 0 && (
            <div className="mt-8 backdrop-blur rounded-xl shadow-2xl border p-6 bg-black/70 border-white/5 slide-up">
              <h3 className="text-xs font-semibold uppercase mb-4 text-yellow-400/80 tracking-widest">
                Tips
              </h3>
              <div className="space-y-3 text-sm text-gray-400">
                <p>• Titles are earned by completing legendary badges</p>
                <p>• Selected title shows on profile & leaderboards</p>
                <p>• Rare titles let you stand out more</p>
                <p>• Change your title anytime here</p>
              </div>
            </div>
          )}

          {activeTab === 'badges' && userBadges.length > 0 && (
            <div className="mt-8 backdrop-blur rounded-xl shadow-2xl border p-6 bg-black/70 border-white/5 slide-up">
              <h3 className="text-xs font-semibold uppercase mb-4 text-yellow-400/80 tracking-widest">
                Tips
              </h3>
              <div className="space-y-3 text-sm text-gray-400">
                <p>• Select up to 5 badges to display on your profile</p>
                <p>• Displayed badges show your achievements to others</p>
                <p>• Click on a badge to toggle its display status</p>
                <p>• View all available badges in the Badge Gallery</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}