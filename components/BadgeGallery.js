// components/BadgeGallery.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  getBadgeEmoji,
  getRarityColor,
  getRarityGradient,
  getBadgeCategories,
  getRarityFilters,
  getRarityLabel
} from '../lib/badgeUtils';
import PageWrapper from './ui/PageWrapper';
import GlassBackButton from './GlassBackButton';

export default function BadgeGallery({ session, setView }) {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [selectedBadge, setSelectedBadge] = useState(null);

  const categories = getBadgeCategories();
  const rarities = getRarityFilters();

  useEffect(() => {
    loadBadges();
  }, [session?.user?.id]);

  const loadBadges = async () => {
    try {
      setLoading(true);

      // Get all badge definitions
      const { data: allBadges, error: badgesError } = await supabase
        .from('badge_definitions')
        .select('*')
        .order('display_order');

      if (badgesError) throw badgesError;

      // Get user's earned badges
      const { data: earnedBadges, error: earnedError } = await supabase
        .from('user_badges')
        .select('badge_id, earned_at')
        .eq('user_id', session.user.id);

      if (earnedError) throw earnedError;

      // Get accurate progress for each badge by calling check_and_award_badge
      const badgesWithStatus = await Promise.all(
        allBadges.map(async (badge) => {
          const earned = earnedBadges.find(e => e.badge_id === badge.id);

          // Call RPC to get accurate progress
          const { data: badgeCheck } = await supabase.rpc('check_and_award_badge', {
            p_user_id: session.user.id,
            p_badge_id: badge.id
          });

          return {
            ...badge,
            isEarned: !!earned,
            earnedAt: earned?.earned_at,
            progress: badgeCheck?.progress || 0,
            progressMetadata: badgeCheck?.metadata
          };
        })
      );

      setBadges(badgesWithStatus);
    } catch (error) {
      console.error('[BadgeGallery] Error loading badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBadges = badges.filter(badge => {
    const categoryMatch = categoryFilter === 'all' || badge.category === categoryFilter;
    const rarityMatch = rarityFilter === 'all' || badge.rarity === rarityFilter;
    return categoryMatch && rarityMatch;
  });

  const earnedCount = badges.filter(b => b.isEarned).length;
  const totalCount = badges.length;

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="text-2xl font-serif text-white mb-4">Loading badges...</div>
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <GlassBackButton
        onClick={() => setView('profile')}
        fallbackUrl="/profile"
      />

      <header className="p-8 relative z-10">
        <div className="text-center max-w-7xl mx-auto">
          <h1
            className="text-4xl sm:text-5xl font-serif font-bold text-white mb-2"
            style={{
              letterSpacing: '0.02em',
              textShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
            }}
          >
            Badge Collection
          </h1>
          <p
            className="text-sm italic font-light"
            style={{
              color: '#d4af37',
              opacity: 0.9,
              letterSpacing: '0.05em'
            }}
          >
            {earnedCount} / {totalCount} badges earned
          </p>
        </div>
      </header>

      <div className="px-8 pb-8 relative z-10">
        <div className="max-w-7xl mx-auto">

          {/* Category Filters */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    categoryFilter === cat.id
                      ? 'bg-yellow-600 text-black'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rarity Filters */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2 justify-center">
              {rarities.map(rarity => (
                <button
                  key={rarity.id}
                  onClick={() => setRarityFilter(rarity.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all border-2 ${
                    rarityFilter === rarity.id
                      ? 'bg-opacity-20'
                      : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                  }`}
                  style={{
                    borderColor: rarityFilter === rarity.id ? rarity.color : undefined,
                    backgroundColor: rarityFilter === rarity.id ? `${rarity.color}33` : undefined
                  }}
                >
                  {rarity.label}
                </button>
              ))}
            </div>
          </div>

          {/* Badge Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredBadges.map(badge => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                onClick={() => setSelectedBadge(badge)}
              />
            ))}
          </div>

          {filteredBadges.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No badges match your filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <BadgeDetailModal
          badge={selectedBadge}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </PageWrapper>
  );
}

function BadgeCard({ badge, onClick }) {
  const emoji = getBadgeEmoji(badge.id);
  const rarityColor = getRarityColor(badge.rarity);
  const progressPercent = badge.requirement_value > 0
    ? Math.min(100, (badge.progress / badge.requirement_value) * 100)
    : 0;

  return (
    <button
      onClick={onClick}
      className={`relative p-4 rounded-xl border-2 transition-all hover:scale-105 ${
        badge.isEarned ? '' : 'opacity-60'
      }`}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderColor: badge.isEarned ? rarityColor : '#333',
        boxShadow: badge.isEarned ? `0 0 20px ${rarityColor}44` : undefined
      }}
    >
      {/* Lock icon for locked badges */}
      {!badge.isEarned && (
        <div className="absolute top-2 right-2 text-2xl opacity-50">
          🔒
        </div>
      )}

      {/* Badge Emoji */}
      <div
        className={`text-5xl mb-2 ${badge.isEarned ? '' : 'grayscale'}`}
      >
        {emoji}
      </div>

      {/* Badge Name */}
      <div className="text-sm font-bold text-white mb-1 truncate">
        {badge.name}
      </div>

      {/* Rarity */}
      <div
        className="text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2"
        style={{
          color: rarityColor,
          backgroundColor: `${rarityColor}22`,
          border: `1px solid ${rarityColor}44`
        }}
      >
        {getRarityLabel(badge.rarity)}
      </div>

      {/* Progress Bar */}
      {!badge.isEarned && badge.progress > 0 && (
        <div className="mt-2">
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: rarityColor
              }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {badge.progress} / {badge.requirement_value}
          </div>
        </div>
      )}
    </button>
  );
}

function BadgeDetailModal({ badge, onClose }) {
  const emoji = getBadgeEmoji(badge.id);
  const rarityColor = getRarityColor(badge.rarity);
  const rarityGradient = getRarityGradient(badge.rarity);
  const progressPercent = badge.requirement_value > 0
    ? Math.min(100, (badge.progress / badge.requirement_value) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="backdrop-blur rounded-2xl shadow-2xl border-2 p-8 max-w-md w-full"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          borderColor: rarityColor
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-2xl"
        >
          ×
        </button>

        {/* Badge Emoji */}
        <div className={`text-8xl text-center mb-4 ${badge.isEarned ? '' : 'grayscale'}`}>
          {emoji}
          {!badge.isEarned && <span className="text-4xl ml-2">🔒</span>}
        </div>

        {/* Badge Name */}
        <h2 className="text-3xl font-serif font-bold text-white text-center mb-2">
          {badge.name}
        </h2>

        {/* Rarity */}
        <div className="flex justify-center mb-4">
          <div
            className="px-4 py-1 rounded-full font-bold text-sm"
            style={{
              background: rarityGradient,
              color: badge.rarity === 'legendary' ? '#000' : '#FFF'
            }}
          >
            {getRarityLabel(badge.rarity)}
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-300 text-center mb-6">
          {badge.description}
        </p>

        {/* Requirements */}
        <div className="bg-gray-900 rounded-lg p-4 mb-4">
          <div className="text-sm font-bold text-gray-400 mb-2">REQUIREMENTS</div>
          <div className="text-white">
            {badge.requirement_type}: {badge.requirement_value}
          </div>
        </div>

        {/* Progress */}
        {!badge.isEarned && (
          <div className="bg-gray-900 rounded-lg p-4 mb-4">
            <div className="text-sm font-bold text-gray-400 mb-2">YOUR PROGRESS</div>
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: rarityColor
                }}
              />
            </div>
            <div className="text-white text-center">
              {badge.progress} / {badge.requirement_value} ({Math.floor(progressPercent)}%)
            </div>
          </div>
        )}

        {/* Rewards */}
        <div className="bg-gray-900 rounded-lg p-4 mb-4">
          <div className="text-sm font-bold text-gray-400 mb-2">REWARDS</div>
          <div className="flex justify-around">
            {badge.coin_reward > 0 && (
              <div className="text-center">
                <div className="text-xl font-bold" style={{ color: '#d4af37' }}>
                  +{badge.coin_reward.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">Coins</div>
              </div>
            )}
            {badge.xp_reward > 0 && (
              <div className="text-center">
                <div className="text-xl font-bold text-blue-400">
                  +{badge.xp_reward.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">XP</div>
              </div>
            )}
            {badge.unlocks_title && (
              <div className="text-center">
                <div className="text-xl font-bold text-yellow-400">
                  ✨ Title
                </div>
                <div className="text-xs text-gray-400">{badge.unlocks_title}</div>
              </div>
            )}
          </div>
        </div>

        {/* Earned Date */}
        {badge.isEarned && badge.earnedAt && (
          <div className="text-center text-sm text-gray-400">
            Earned on {new Date(badge.earnedAt).toLocaleDateString()}
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-4 px-6 py-3 bg-gray-700 text-white font-medium rounded-md hover:bg-gray-600 transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}