// components/BadgeEarnedNotification.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getBadgeEmoji, getRarityColor, getRarityGradient, getRarityLabel } from '../lib/badgeUtils';

export default function BadgeEarnedNotification({ badgeData, onClose, onViewBadge }) {
  const emoji = getBadgeEmoji(badgeData.badge_id);
  const rarityColor = getRarityColor(badgeData.rarity);
  const rarityGradient = getRarityGradient(badgeData.rarity);
  const [titleText, setTitleText] = useState(badgeData.title_unlocked || '');

  // Fetch title display text if we have a title unlock
  useEffect(() => {
    const fetchTitleText = async () => {
      if (badgeData.title_unlocked) {
        // If title_unlocked looks like an ID (lowercase with underscores), look it up
        if (badgeData.title_unlocked.includes('_') || badgeData.title_unlocked === badgeData.title_unlocked.toLowerCase()) {
          const { data } = await supabase
            .from('title_definitions')
            .select('title_text')
            .eq('id', badgeData.title_unlocked)
            .maybeSingle();

          if (data?.title_text) {
            setTitleText(data.title_text);
          }
        }
      }
    };
    fetchTitleText();
  }, [badgeData.title_unlocked]);

  return (
    <div
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4"
      style={{
        animation: 'badge-earned 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}
    >
      <style jsx>{`
        @keyframes badge-earned {
          0% {
            transform: translateX(-50%) scale(0) rotate(-180deg);
            opacity: 0;
          }
          50% {
            transform: translateX(-50%) scale(1.2) rotate(0deg);
          }
          100% {
            transform: translateX(-50%) scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes badge-glow {
          0%, 100% {
            box-shadow: 0 0 20px ${rarityColor}, 0 0 40px ${rarityColor};
          }
          50% {
            box-shadow: 0 0 40px ${rarityColor}, 0 0 80px ${rarityColor};
          }
        }

        .badge-notification-card {
          animation: badge-glow 2s ease-in-out infinite;
        }
      `}</style>

      <div
        className="badge-notification-card relative backdrop-blur rounded-2xl shadow-2xl border-2 p-6 text-center"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          borderColor: rarityColor,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800"
          aria-label="Close"
        >
          ×
        </button>

        {/* Badge Emoji (3x size) */}
        <div className="text-7xl mb-4 animate-bounce">
          {emoji}
        </div>

        {/* Badge Name */}
        <h2 className="text-2xl font-serif font-bold text-white mb-2">
          Badge Unlocked: {badgeData.badge_name}
        </h2>

        {/* Rarity */}
        <div
          className="inline-block px-4 py-1 rounded-full mb-4 font-bold text-sm"
          style={{
            background: rarityGradient,
            color: badgeData.rarity === 'legendary' ? '#000' : '#FFF'
          }}
        >
          {getRarityLabel(badgeData.rarity)}
        </div>

        {/* Rewards */}
        <div className="flex justify-center gap-6 mb-4">
          {badgeData.coin_reward > 0 && (
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: '#d4af37' }}>
                +{badgeData.coin_reward.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">Coins</div>
            </div>
          )}
          {badgeData.xp_reward > 0 && (
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400">
                +{badgeData.xp_reward.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">XP</div>
            </div>
          )}
        </div>

        {/* Title Unlocked */}
        {titleText && (
          <div
            className="mb-4 p-3 rounded-lg border-2"
            style={{
              backgroundColor: 'rgba(255, 215, 0, 0.1)',
              borderColor: '#FFD700'
            }}
          >
            <div className="text-yellow-400 font-bold text-lg">
              ✨ Title Unlocked: {titleText}! ✨
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-700 text-white font-medium rounded-md hover:bg-gray-600 transition-all"
          >
            Close
          </button>
          <button
            onClick={onViewBadge}
            className="flex-1 px-6 py-3 font-bold text-white rounded-md transition-all"
            style={{
              background: rarityGradient
            }}
          >
            View Badge →
          </button>
        </div>
      </div>
    </div>
  );
}