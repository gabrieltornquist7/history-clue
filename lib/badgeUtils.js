// lib/badgeUtils.js - Badge system utilities

/**
 * Get emoji for a badge based on its ID
 */
export const getBadgeEmoji = (badgeId) => {
  const emojiMap = {
    // Daily Challenge
    'daily_first': '🌅',
    'daily_3_days': '🐦',
    'daily_streak_7': '⚔️',
    'daily_perfect_day': '💎',
    'daily_streak_30': '👑',
    'daily_speedrun': '⚡',
    'daily_streak_100': '🌟',
    'daily_perfect_month': '🏆',
    // Endless Mode
    'endless_level_10': '🎯',
    'endless_first_perfect': '✨',
    'endless_level_25': '🎪',
    'endless_perfect_streak': '🔥',
    'endless_level_50': '🏔️',
    'endless_total_100': '🚂',
    'endless_level_100': '🎖️',
    'endless_master': '👑',
    // Battle
    'battle_first_win': '⚔️',
    'challenge_first': '🤝',
    'battle_wins_25': '🛡️',
    'battle_streak_3': '🔱',
    'battle_wins_100': '🎖️',
    'battle_perfect': '💪',
    'battle_wins_500': '🏆',
    'battle_untouchable': '👊',
    // Social
    'social_first_friend': '👋',
    'social_5_friends': '🦋',
    'social_20_friends': '🌟',
    'social_challenges_10': '📨',
    'social_friend_battles_50': '👥',
    'social_50_friends': '🏘️',
    'social_legend': '🎭',
    // Mastery
    'mastery_puzzles_50': '🧩',
    'mastery_quick_solve': '💡',
    'mastery_puzzles_500': '📚',
    'mastery_coins_10k': '💰',
    'mastery_puzzles_2000': '🌍',
    'mastery_coins_50k': '💎',
    'mastery_puzzles_5000': '🎓',
    'mastery_coins_100k': '👑'
  };

  return emojiMap[badgeId] || '🏅';
};

/**
 * Get color for a badge rarity
 */
export const getRarityColor = (rarity) => {
  const colors = {
    common: '#CD7F32',    // Bronze
    rare: '#C0C0C0',      // Silver
    epic: '#FFD700',      // Gold
    legendary: '#FF00FF'  // Magenta
  };

  return colors[rarity] || '#FFFFFF';
};

/**
 * Get gradient for a badge rarity
 */
export const getRarityGradient = (rarity) => {
  const gradients = {
    common: 'linear-gradient(135deg, #CD7F32, #B8860B)',
    rare: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)',
    epic: 'linear-gradient(135deg, #FFD700, #FFA500)',
    legendary: 'linear-gradient(135deg, #FF00FF, #FF1493)'
  };

  return gradients[rarity] || 'linear-gradient(135deg, #FFFFFF, #CCCCCC)';
};

/**
 * Get badge categories for filtering
 */
export const getBadgeCategories = () => [
  { id: 'all', label: 'All Badges', icon: '🏅' },
  { id: 'daily_challenge', label: 'Daily Challenge', icon: '📅' },
  { id: 'endless_mode', label: 'Endless Mode', icon: '🏔️' },
  { id: 'battle', label: 'Battle', icon: '⚔️' },
  { id: 'social', label: 'Social', icon: '👥' },
  { id: 'mastery', label: 'Mastery', icon: '🎓' }
];

/**
 * Get rarity filters
 */
export const getRarityFilters = () => [
  { id: 'all', label: 'All Rarities', color: '#FFFFFF' },
  { id: 'legendary', label: 'Legendary', color: '#FF00FF' },
  { id: 'epic', label: 'Epic', color: '#FFD700' },
  { id: 'rare', label: 'Rare', color: '#C0C0C0' },
  { id: 'common', label: 'Common', color: '#CD7F32' }
];

/**
 * Format time ago for badge earned date
 */
export const formatTimeAgo = (dateString) => {
  const now = new Date();
  const earned = new Date(dateString);
  const diffMs = now - earned;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Earned today';
  if (diffDays === 1) return 'Earned yesterday';
  if (diffDays < 7) return `Earned ${diffDays} days ago`;
  if (diffDays < 30) return `Earned ${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  if (diffDays < 365) return `Earned ${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  return `Earned ${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
};

/**
 * Get rarity label in uppercase for display
 */
export const getRarityLabel = (rarity) => {
  return rarity.toUpperCase();
};