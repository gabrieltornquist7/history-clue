// components/ProfileSettingsView.js
"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import GlassBackButton from './GlassBackButton';
import { getBadgeEmoji, getRarityColor, getRarityLabel } from '../lib/badgeUtils';
import TitleDisplay from './TitleDisplay';
import AvatarWithFrame from './AvatarWithFrame';

// Helper function to get shop title colors based on rarity
const getShopTitleColor = (rarity) => {
  const colors = {
    common: '#9ca3af',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#eab308'
  };
  return colors[rarity] || '#FFD700';
};

export default function ProfileSettingsView({ setView, session }) {
  console.log('[ProfileSettingsView] Rendered with setView:', typeof setView);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('titles'); // 'titles', 'badges', or 'frames'

  // Badge state
  const [userBadges, setUserBadges] = useState([]);
  const [badgesLoading, setBadgesLoading] = useState(false);

  // Title state
  const [titleDefinitions, setTitleDefinitions] = useState([]);
  const [shopTitles, setShopTitles] = useState([]);
  const [allTitles, setAllTitles] = useState([]); // Combined titles from both systems
  const [selectedTitleText, setSelectedTitleText] = useState('');

  // Frame state
  const [ownedFrames, setOwnedFrames] = useState([]);
  const [equippedFrame, setEquippedFrame] = useState(null);
  const [framesLoading, setFramesLoading] = useState(false);
  const [userAvatar, setUserAvatar] = useState(null);

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
          .select("username, selected_title, equipped_avatar_frame, avatar_url")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          console.error('Error loading profile:', profileError);
          setLoading(false);
          return;
        }

        setProfile(profileData);
        setSelectedTitle(profileData?.selected_title || "");
        setEquippedFrame(profileData?.equipped_avatar_frame || null);
        setUserAvatar(profileData?.avatar_url || session.user.user_metadata?.avatar_url);

        // FETCH BADGE-EARNED TITLES (from title_definitions)
        const { data: userTitlesData, error: userTitlesError } = await supabase
          .from('user_titles')
          .select('title_id')
          .eq('user_id', session.user.id);

        let badgeTitles = [];
        if (!userTitlesError && userTitlesData && userTitlesData.length > 0) {
          const titleIds = userTitlesData.map(t => t.title_id);
          
          const { data: titleDefs, error: titleError } = await supabase
            .from('title_definitions')
            .select('id, title_text, color_hex, rarity')
            .in('id', titleIds);

          if (!titleError && titleDefs) {
            badgeTitles = titleDefs.map(t => ({
              id: t.id,
              display_name: t.title_text,
              color: t.color_hex,
              rarity: t.rarity,
              source: 'badge'
            }));
            setTitleDefinitions(titleDefs);
          }
        }

        // FETCH SHOP-PURCHASED TITLES (from shop_items)
        const { data: purchasedItems, error: purchaseError } = await supabase
          .from('user_purchases')
          .select(`
            item_id,
            shop_items!inner(
              id,
              name,
              rarity,
              category
            )
          `)
          .eq('user_id', session.user.id)
          .eq('shop_items.category', 'title');

        let purchasedTitles = [];
        if (!purchaseError && purchasedItems) {
          purchasedTitles = purchasedItems.map(p => ({
            id: `shop_${p.shop_items.id}`, // Prefix with 'shop_' to avoid ID conflicts
            display_name: p.shop_items.name,
            color: getShopTitleColor(p.shop_items.rarity),
            rarity: p.shop_items.rarity,
            source: 'shop',
            shop_item_id: p.shop_items.id // Keep original ID for equipping
          }));
          setShopTitles(purchasedTitles);
        }

        // COMBINE ALL TITLES
        const combined = [...badgeTitles, ...purchasedTitles];
        setAllTitles(combined);

        // Set selected title text
        const selectedDef = combined.find(t => 
          t.id === profileData.selected_title || 
          t.shop_item_id === profileData.selected_title
        );
        setSelectedTitleText(selectedDef?.display_name || profileData.selected_title || '');
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
    } else if (activeTab === 'frames') {
      loadUserFrames();
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

  const loadUserFrames = async () => {
    setFramesLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select(`
          item_id,
          shop_items!inner(
            id,
            name,
            rarity,
            category
          )
        `)
        .eq('user_id', session.user.id)
        .eq('shop_items.category', 'avatar_frame');

      if (!error) {
        setOwnedFrames(data || []);
      } else {
        console.error('[ProfileSettings] Error loading frames:', error);
      }
    } catch (error) {
      console.error('[ProfileSettings] Error loading frames:', error);
    } finally {
      setFramesLoading(false);
    }
  };

  const handleSave = async () => {
    if (!session?.user?.id) return;
    setSaving(true);

    // Find the selected title from allTitles
    const selectedTitleObj = allTitles.find(t => t.id === selectedTitle);
    
    // If it's a shop title, use the original shop_item_id, otherwise use the ID directly
    const titleIdToSave = selectedTitleObj?.source === 'shop' 
      ? selectedTitleObj.shop_item_id 
      : selectedTitle;

    const { error } = await supabase
      .from("profiles")
      .update({ selected_title: titleIdToSave })
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

  const handleFrameEquip = async (frameId) => {
    if (!session?.user?.id) return;

    const { error } = await supabase
      .from('profiles')
      .update({ equipped_avatar_frame: frameId })
      .eq('id', session.user.id);

    if (error) {
      console.error('[ProfileSettings] Error equipping frame:', error);
      alert('Error equipping frame');
    } else {
      setEquippedFrame(frameId);
      alert('Frame equipped successfully!');
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
              <div className="flex flex-wrap space-x-2">
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
                  onClick={() => setActiveTab('frames')}
                  className={`relative px-5 py-2.5 font-medium rounded-md transition-all duration-300 ${
                    activeTab === 'frames'
                      ? 'bg-gray-800 text-white border border-gray-700/30'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/50'
                  }`}
                >
                  🖼️ Frames
                  {activeTab === 'frames' && (
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

              {allTitles && allTitles.length > 0 ? (
                <div className="space-y-6">
                  {/* Current Selection */}
                  <div className="p-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
                    <h3 className="text-lg font-semibold text-white mb-3">
                      Current Title Preview
                    </h3>
                    <div className="flex justify-center">
                      {selectedTitleText ? (
                        <TitleDisplay 
                          title={selectedTitleText}
                          rarity={allTitles.find(t => t.id === selectedTitle)?.rarity || 'common'}
                          showIcon={true}
                          size="large"
                          animated={true}
                        />
                      ) : (
                        <p className="text-gray-400">No title selected</p>
                      )}
                    </div>
                  </div>

                  {/* Title Select */}
                  <div className="space-y-4">
                    <label
                      htmlFor="title-select"
                      className="block text-sm font-semibold text-white mb-3"
                    >
                      Available Titles ({allTitles.length})
                    </label>
                    <select
                      id="title-select"
                      value={selectedTitle}
                      onChange={(e) => {
                        setSelectedTitle(e.target.value);
                        const selectedTitleObj = allTitles.find(t => t.id === e.target.value);
                        setSelectedTitleText(selectedTitleObj?.display_name || e.target.value);
                      }}
                      className="w-full px-4 py-3 bg-gray-900 text-white font-medium rounded-md border border-gray-700/30 focus:border-yellow-500/50 focus:outline-none"
                    >
                      {allTitles.map((title) => (
                        <option key={title.id} value={title.id}>
                          {title.display_name} {title.source === 'shop' ? '🪙' : '🏆'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Preview - Grouped by source */}
                  <div className="grid gap-3 mt-6">
                    {/* Badge Titles */}
                    {allTitles.filter(t => t.source === 'badge').length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-400 mb-2">
                          🏆 Badge-Earned Titles
                        </h4>
                        {allTitles.filter(t => t.source === 'badge').map((title) => (
                          <div
                            key={title.id}
                            onClick={() => {
                              setSelectedTitle(title.id);
                              setSelectedTitleText(title.display_name);
                            }}
                            className={`p-4 rounded-lg border cursor-pointer mb-2 ${
                              selectedTitle === title.id
                                ? "border-yellow-500/50 bg-yellow-500/10"
                                : "border-gray-700/30 bg-gray-800/30 hover:border-gray-600/50 hover:bg-gray-800/50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <TitleDisplay 
                                title={title.display_name}
                                rarity={title.rarity}
                                showIcon={true}
                                size="default"
                                animated={selectedTitle === title.id}
                              />
                              {selectedTitle === title.id && (
                                <span className="text-xs text-yellow-500 font-bold ml-2">
                                  ✓ Selected
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Shop Titles */}
                    {allTitles.filter(t => t.source === 'shop').length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">
                          🪙 Shop-Purchased Titles
                        </h4>
                        {allTitles.filter(t => t.source === 'shop').map((title) => (
                          <div
                            key={title.id}
                            onClick={() => {
                              setSelectedTitle(title.id);
                              setSelectedTitleText(title.display_name);
                            }}
                            className={`p-4 rounded-lg border cursor-pointer mb-2 ${
                              selectedTitle === title.id
                                ? "border-yellow-500/50 bg-yellow-500/10"
                                : "border-gray-700/30 bg-gray-800/30 hover:border-gray-600/50 hover:bg-gray-800/50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <TitleDisplay 
                                title={title.display_name}
                                rarity={title.rarity}
                                showIcon={true}
                                size="default"
                                animated={selectedTitle === title.id}
                              />
                              {selectedTitle === title.id && (
                                <span className="text-xs text-yellow-500 font-bold ml-2">
                                  ✓ Selected
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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

          {/* Frames Tab */}
          {activeTab === 'frames' && (
            <div className="backdrop-blur rounded-xl shadow-2xl border slide-up p-8 bg-black/70 border-white/5">
              <h2 className="text-xs font-semibold uppercase mb-4 text-yellow-400/80 tracking-widest">
                Avatar Frames
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                Select a frame to customize your avatar
              </p>

              {framesLoading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading frames...</p>
                </div>
              ) : (
                <>
                  {/* Current Frame Preview */}
                  <div className="p-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 mb-6">
                    <h3 className="text-lg font-semibold text-white mb-4 text-center">
                      Current Frame
                    </h3>
                    <div className="flex justify-center">
                      <AvatarWithFrame 
                        url={userAvatar}
                        frameId={equippedFrame}
                        size="w-32 h-32"
                      />
                    </div>
                    {equippedFrame && (
                      <p className="text-center text-sm text-gray-400 mt-3">
                        {ownedFrames.find(f => f.shop_items.id === equippedFrame)?.shop_items.name || 'Frame'}
                      </p>
                    )}
                  </div>

                  {/* Frame Selection Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* No Frame Option */}
                    <div
                      onClick={() => handleFrameEquip(null)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all flex flex-col items-center ${
                        equippedFrame === null
                          ? 'border-yellow-500 bg-yellow-500/10 shadow-lg'
                          : 'border-gray-700/30 bg-gray-800/30 hover:border-gray-600/50'
                      }`}
                    >
                      <AvatarWithFrame 
                        url={userAvatar}
                        frameId={null}
                        size="w-20 h-20"
                      />
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        No Frame
                      </p>
                      {equippedFrame === null && (
                        <span className="text-xs text-yellow-500 font-bold mt-1">
                          ✓ Equipped
                        </span>
                      )}
                    </div>

                    {/* Owned Frames */}
                    {ownedFrames.map((frame) => {
                      const frameItem = frame.shop_items;
                      const isEquipped = equippedFrame === frameItem.id;

                      return (
                        <div
                          key={frameItem.id}
                          onClick={() => handleFrameEquip(frameItem.id)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all flex flex-col items-center ${
                            isEquipped
                              ? 'border-yellow-500 bg-yellow-500/10 shadow-lg'
                              : 'border-gray-700/30 bg-gray-800/30 hover:border-gray-600/50'
                          }`}
                        >
                          <AvatarWithFrame 
                            url={userAvatar}
                            frameId={frameItem.id}
                            size="w-20 h-20"
                          />
                          <p className="text-xs text-white mt-2 text-center font-medium">
                            {frameItem.name}
                          </p>
                          <span 
                            className="text-xs mt-1 px-2 py-0.5 rounded-full"
                            style={{
                              color: frameItem.rarity === 'legendary' ? '#eab308' :
                                     frameItem.rarity === 'epic' ? '#a855f7' :
                                     frameItem.rarity === 'rare' ? '#3b82f6' : '#9ca3af',
                              backgroundColor: frameItem.rarity === 'legendary' ? 'rgba(234, 179, 8, 0.1)' :
                                               frameItem.rarity === 'epic' ? 'rgba(168, 85, 247, 0.1)' :
                                               frameItem.rarity === 'rare' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(156, 163, 175, 0.1)'
                            }}
                          >
                            {frameItem.rarity}
                          </span>
                          {isEquipped && (
                            <span className="text-xs text-yellow-500 font-bold mt-1">
                              ✓ Equipped
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {ownedFrames.length === 0 && (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🖼️</div>
                      <p className="text-xl font-serif text-white mb-4">
                        No Frames Yet
                      </p>
                      <p className="text-gray-400 max-w-md mx-auto mb-6">
                        You haven&apos;t purchased any avatar frames yet. Visit the Shop to get some!
                      </p>
                      <button
                        onClick={() => setView("shop")}
                        className="px-6 py-3 bg-yellow-600 text-black font-bold rounded-md hover:bg-yellow-500 transition-all"
                      >
                        Visit Shop
                      </button>
                    </div>
                  )}
                </>
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
          {activeTab === 'titles' && allTitles && allTitles.length > 0 && (
            <div className="mt-8 backdrop-blur rounded-xl shadow-2xl border p-6 bg-black/70 border-white/5 slide-up">
              <h3 className="text-xs font-semibold uppercase mb-4 text-yellow-400/80 tracking-widest">
                Tips
              </h3>
              <div className="space-y-3 text-sm text-gray-400">
                <p>• 🏆 Badge titles are earned by completing legendary badges</p>
                <p>• 🪙 Shop titles can be purchased with coins in the Shop</p>
                <p>• Selected title shows on your profile & leaderboards</p>
                <p>• Rarer titles let you stand out more</p>
                <p>• Change your title anytime here</p>
              </div>
            </div>
          )}

          {activeTab === 'frames' && ownedFrames.length > 0 && (
            <div className="mt-8 backdrop-blur rounded-xl shadow-2xl border p-6 bg-black/70 border-white/5 slide-up">
              <h3 className="text-xs font-semibold uppercase mb-4 text-yellow-400/80 tracking-widest">
                Tips
              </h3>
              <div className="space-y-3 text-sm text-gray-400">
                <p>• Frames display on your profile, leaderboard, and in battles</p>
                <p>• Higher rarity frames have special animations</p>
                <p>• VIP members get exclusive animated frames</p>
                <p>• Click any frame to equip it instantly</p>
                <p>• You can remove your frame by selecting &quot;No Frame&quot;</p>
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