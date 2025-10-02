// components/Shop.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import GlassBackButton from './GlassBackButton';
import TitleDisplay from './TitleDisplay';
import AvatarWithFrame from './AvatarWithFrame';

const RARITY_COLORS = {
  common: { border: 'rgba(156, 163, 175, 0.3)', glow: 'rgba(156, 163, 175, 0.1)', text: '#9ca3af' },
  rare: { border: 'rgba(59, 130, 246, 0.4)', glow: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
  epic: { border: 'rgba(168, 85, 247, 0.4)', glow: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' },
  legendary: { border: 'rgba(234, 179, 8, 0.5)', glow: 'rgba(234, 179, 8, 0.2)', text: '#eab308' }
};

const VIP_BENEFITS = {
  vip_bronze: [
    '+10% coin earnings on all games',
    'Exclusive Bronze VIP Avatar Frame',
    'VIP badge on your profile',
    'Support game development'
  ],
  vip_silver: [
    '+20% coin earnings on all games',
    'Exclusive Silver VIP Avatar Frame',
    'Weekly bonus challenges (coming soon)',
    'VIP badge on your profile',
    'Support game development'
  ],
  vip_gold: [
    '+30% coin earnings on all games',
    'Exclusive Gold VIP Avatar Frame',
    'Custom challenge creation (coming soon)',
    'Early access to new features',
    'VIP badge on your profile',
    'Premium support',
    'Support game development'
  ]
};

export default function Shop({ setView, session }) {
  const [shopItems, setShopItems] = useState([]);
  const [userPurchases, setUserPurchases] = useState([]);
  const [userCoins, setUserCoins] = useState(0);
  const [userVipTier, setUserVipTier] = useState('none');
  const [userAvatar, setUserAvatar] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('title');
  const [purchaseModal, setPurchaseModal] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchShopData();
  }, [session]);

  const fetchShopData = async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    
    // Fetch shop items
    const { data: items } = await supabase
      .from('shop_items')
      .select('*')
      .eq('is_available', true)
      .order('sort_order');

    // Fetch user purchases
    const { data: purchases } = await supabase
      .from('user_purchases')
      .select('item_id')
      .eq('user_id', session.user.id);

    // Fetch user profile (coins, vip tier, avatar)
    const { data: profile } = await supabase
      .from('profiles')
      .select('coins, vip_tier, avatar_url')
      .eq('id', session.user.id)
      .single();

    setShopItems(items || []);
    setUserPurchases(purchases?.map(p => p.item_id) || []);
    setUserCoins(profile?.coins || 0);
    setUserVipTier(profile?.vip_tier || 'none');
    setUserAvatar(profile?.avatar_url || session.user.user_metadata?.avatar_url);
    setIsLoading(false);
  };

  const handlePurchase = async (item) => {
    if (userCoins < item.price) {
      showNotification('Not enough coins!', 'error');
      return;
    }

    // Check if VIP tier and user already has this or higher tier
    if (item.category === 'vip_tier') {
      const tierOrder = { 'none': 0, 'bronze': 1, 'silver': 2, 'gold': 3 };
      const currentTier = tierOrder[userVipTier] || 0;
      const itemTier = tierOrder[item.id.replace('vip_', '')] || 0;
      
      if (currentTier >= itemTier) {
        showNotification('You already have this VIP tier or higher!', 'error');
        return;
      }
    } else if (userPurchases.includes(item.id)) {
      showNotification('You already own this item!', 'error');
      return;
    }

    setPurchaseModal(item);
  };

  const confirmPurchase = async () => {
    const item = purchaseModal;
    setPurchaseModal(null);

    try {
      let result;

      // Handle VIP tier purchases differently
      if (item.category === 'vip_tier') {
        const { data, error } = await supabase.rpc('purchase_vip_tier', {
          p_user_id: session.user.id,
          p_vip_item_id: item.id
        });

        if (error) throw error;
        result = data[0];

        if (result.success) {
          setUserCoins(result.new_coin_balance);
          setUserVipTier(result.vip_tier);
          // VIP frame is auto-granted, add it to purchases
          const vipFrameId = `frame_vip_${result.vip_tier}`;
          setUserPurchases([...userPurchases, item.id, vipFrameId]);
          showNotification(`Welcome to ${item.name}! Your exclusive frame has been added to your collection. Earn ${item.id === 'vip_bronze' ? '+10%' : item.id === 'vip_silver' ? '+20%' : '+30%'} more coins now!`, 'success');
        } else {
          showNotification(result.message, 'error');
        }
      } else {
        // Regular purchase (titles, frames)
        const { data, error } = await supabase.rpc('purchase_shop_item', {
          p_user_id: session.user.id,
          p_item_id: item.id
        });

        if (error) throw error;
        result = data[0];
        
        if (result.success) {
          setUserCoins(result.new_coin_balance);
          setUserPurchases([...userPurchases, item.id]);
          const equipLocation = item.category === 'title' ? 'Titles' : 'Frames';
          showNotification(`${item.name} added to your collection! Equip it in Profile → Settings → ${equipLocation}.`, 'success');
        } else {
          showNotification(result.message, 'error');
        }
      }
    } catch (error) {
      console.error('Purchase error:', error);
      showNotification('Purchase failed. Please try again.', 'error');
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const getItemsByCategory = () => {
    let items = shopItems.filter(item => item.category === selectedCategory);
    
    // Filter out VIP-exclusive frames (price = 0) from the frames category
    if (selectedCategory === 'avatar_frame') {
      items = items.filter(item => item.price > 0);
    }
    
    return items;
  };

  const isOwned = (itemId) => userPurchases.includes(itemId);

  const getCategoryTitle = () => {
    switch(selectedCategory) {
      case 'title': return 'Titles';
      case 'avatar_frame': return 'Avatar Frames';
      case 'vip_tier': return 'VIP Membership';
      default: return 'Shop';
    }
  };

  const getCategoryTips = () => {
    switch(selectedCategory) {
      case 'title':
        return (
          <>
            <p>• Purchase titles with coins earned from playing games</p>
            <p>• Collect all titles to complete your collection!</p>
            <p>• Equip your favorite title in <span className="text-yellow-400 font-semibold">Profile → Settings → Titles</span></p>
            <p>• Your equipped title appears on your profile and leaderboards</p>
          </>
        );
      case 'avatar_frame':
        return (
          <>
            <p>• Avatar frames add style to your profile picture</p>
            <p>• Higher rarity frames have special animations!</p>
            <p>• Equip frames in <span className="text-yellow-400 font-semibold">Profile → Settings → Frames</span></p>
            <p>• Frames display everywhere: profile, leaderboard, and battles</p>
            <p>• VIP members get exclusive animated frames!</p>
          </>
        );
      case 'vip_tier':
        return (
          <>
            <p>• VIP membership is a <span className="text-yellow-400 font-semibold">permanent upgrade</span></p>
            <p>• Earn bonus coins on every game you play</p>
            <p>• Get exclusive VIP-only avatar frames automatically</p>
            <p>• Higher tiers can be purchased to upgrade benefits</p>
            <p>• Support continued development of History Clue!</p>
          </>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div 
        className="min-h-screen relative flex items-center justify-center"
        style={{
          background: `
            linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%),
            radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%)
          `
        }}
      >
        <div className="text-center">
          <div className="text-2xl font-serif text-white mb-4">Loading Shop...</div>
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative"
      style={{
        background: `
          linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%),
          radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%),
          radial-gradient(circle at 70% 80%, rgba(212, 175, 55, 0.01) 0%, transparent 50%)
        `
      }}
    >
      {/* Metallic shine overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(115deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.08) 100%)",
          backgroundSize: "200% 200%",
          animation: "shine 12s linear infinite",
        }}
      ></div>

      <style jsx>{`
        @keyframes shine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.3), 0 0 40px rgba(255, 215, 0, 0.1); }
          50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.5), 0 0 60px rgba(255, 215, 0, 0.2); }
        }
        .slide-down {
          animation: slideDown 0.3s ease-out;
        }
        .vip-button-shiny {
          background: linear-gradient(
            90deg,
            #FFD700 0%,
            #FFF8DC 25%,
            #FFD700 50%,
            #FFF8DC 75%,
            #FFD700 100%
          );
          background-size: 200% 100%;
          animation: shimmer 3s linear infinite, pulse-glow 2s ease-in-out infinite;
          color: #000;
          font-weight: bold;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }
        .vip-button-shiny:hover {
          transform: scale(1.05);
          box-shadow: 0 0 40px rgba(255, 215, 0, 0.6), 0 0 80px rgba(255, 215, 0, 0.3) !important;
        }
      `}</style>

      <GlassBackButton onClick={() => setView('menu')} fallbackUrl="/" />

      {/* Notification */}
      {notification && (
        <div 
          className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-2xl slide-down max-w-md"
          style={{
            backgroundColor: notification.type === 'success' ? 'rgba(34, 197, 94, 0.9)' : notification.type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(59, 130, 246, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <p className="text-white font-semibold text-center">{notification.message}</p>
        </div>
      )}

      {/* Header */}
      <header className="p-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <h1 
              className="text-4xl font-serif font-bold text-white mb-2"
              style={{ 
                letterSpacing: '0.02em',
                textShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
              }}
            >
              The Shop
            </h1>
            <p className="text-gray-300">Customize your profile and support the game</p>
          </div>

          {/* Coin Balance */}
          <div 
            className="backdrop-blur rounded-lg p-4 max-w-md mx-auto border-2"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderColor: 'rgba(255, 215, 0, 0.3)',
              boxShadow: '0 0 20px rgba(255, 215, 0, 0.1)'
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl">🪙</span>
              <div>
                <p className="text-sm text-gray-400 uppercase tracking-wider">Your Balance</p>
                <p 
                  className="text-2xl font-bold"
                  style={{ 
                    color: '#ffd700',
                    textShadow: '0 0 15px rgba(255, 215, 0, 0.5)'
                  }}
                >
                  {userCoins.toLocaleString()} Coins
                </p>
              </div>
            </div>
            {userVipTier !== 'none' && (
              <div className="mt-3 text-center">
                <span 
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: userVipTier === 'gold' ? '#FFD700' : userVipTier === 'silver' ? '#C0C0C0' : '#CD7F32',
                    color: '#000'
                  }}
                >
                  {userVipTier} VIP ✨
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 sm:px-8 pb-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          
          {/* Category Tabs - VIP IN THE MIDDLE WITH SHINY STYLING */}
          <div className="flex flex-wrap gap-3 mb-8 justify-center">
            <button
              onClick={() => setSelectedCategory('title')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                selectedCategory === 'title'
                  ? 'bg-yellow-600 text-black shadow-lg scale-105'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              📜 Titles
            </button>
            
            {/* VIP BUTTON - EXTRA SHINY IN THE MIDDLE */}
            <button
              onClick={() => setSelectedCategory('vip_tier')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                selectedCategory === 'vip_tier'
                  ? 'scale-110 shadow-2xl'
                  : 'hover:scale-105'
              } ${
                selectedCategory === 'vip_tier' 
                  ? 'vip-button-shiny' 
                  : 'vip-button-shiny opacity-90'
              }`}
            >
              ✨ VIP ✨
            </button>
            
            <button
              onClick={() => setSelectedCategory('avatar_frame')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                selectedCategory === 'avatar_frame'
                  ? 'bg-yellow-600 text-black shadow-lg scale-105'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              🖼️ Frames
            </button>
          </div>

          {/* Category Title */}
          <h2 className="text-2xl font-serif font-bold text-white text-center mb-6">
            {getCategoryTitle()}
          </h2>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getItemsByCategory().map(item => {
              const owned = isOwned(item.id);
              const rarityColor = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
              const isVipTier = item.category === 'vip_tier';
              const isFrame = item.category === 'avatar_frame';

              return (
                <div
                  key={item.id}
                  className="backdrop-blur rounded-lg p-6 transition-all duration-300 hover:scale-105"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    border: `2px solid ${rarityColor.border}`,
                    boxShadow: `0 0 20px ${rarityColor.glow}`
                  }}
                >
                  {/* Rarity Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span 
                      className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded"
                      style={{ 
                        color: rarityColor.text,
                        backgroundColor: `${rarityColor.border}40`
                      }}
                    >
                      {item.rarity}
                    </span>
                    {isVipTier && (
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded bg-yellow-600 text-black">
                        PERMANENT
                      </span>
                    )}
                  </div>

                  {/* Item Preview */}
                  <div className="mb-4 flex justify-center">
                    {isFrame ? (
                      <AvatarWithFrame 
                        url={userAvatar}
                        frameId={item.id}
                        size="w-24 h-24"
                      />
                    ) : (
                      <TitleDisplay 
                        title={item.name}
                        rarity={item.rarity}
                        showIcon={true}
                        size="default"
                        animated={true}
                      />
                    )}
                  </div>

                  {/* Item Name */}
                  {isFrame && (
                    <h3 className="text-center text-lg font-bold text-white mb-2">
                      {item.name}
                    </h3>
                  )}

                  {/* Description */}
                  <p className="text-gray-400 text-sm mb-4 italic text-center">
                    {item.description}
                  </p>

                  {/* VIP Benefits */}
                  {isVipTier && VIP_BENEFITS[item.id] && (
                    <div className="mb-4 bg-black/30 rounded-lg p-3">
                      <h4 className="text-xs font-bold uppercase text-yellow-400 mb-2">Benefits:</h4>
                      <ul className="text-xs text-gray-300 space-y-1">
                        {VIP_BENEFITS[item.id].map((benefit, idx) => (
                          <li key={idx}>• {benefit}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Price & Action */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🪙</span>
                      <span 
                        className="text-xl font-bold"
                        style={{ color: '#ffd700' }}
                      >
                        {item.price.toLocaleString()}
                      </span>
                    </div>

                    {owned && !isVipTier ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-500/50 rounded-md">
                        <span className="text-green-400 text-lg">✓</span>
                        <span className="text-green-400 font-bold text-sm">OWNED</span>
                      </div>
                    ) : isVipTier && userVipTier !== 'none' ? (
                      <div className="px-4 py-2 bg-yellow-900/30 border border-yellow-500/50 rounded-md">
                        <span className="text-yellow-400 font-bold text-sm">CURRENT VIP</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePurchase(item)}
                        disabled={userCoins < item.price}
                        className="px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: userCoins >= item.price ? '#d4af37' : '#374151',
                          color: userCoins >= item.price ? '#000' : '#9ca3af'
                        }}
                      >
                        {userCoins >= item.price ? (isVipTier ? 'Upgrade' : 'Purchase') : 'Not Enough'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {getItemsByCategory().length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No items available in this category yet.</p>
            </div>
          )}

          {/* Helpful Tips */}
          {getItemsByCategory().length > 0 && (
            <div className="mt-8">
              <div 
                className="backdrop-blur rounded-lg p-6 border"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(212, 175, 55, 0.2)'
                }}
              >
                <h3 className="text-sm font-semibold uppercase text-yellow-500 mb-3 tracking-wider">💡 How It Works</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  {getCategoryTips()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Purchase Confirmation Modal */}
      {purchaseModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div 
            className="backdrop-blur rounded-xl p-8 max-w-md w-full text-center"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              border: '2px solid rgba(212, 175, 55, 0.3)',
              boxShadow: '0 0 50px rgba(0, 0, 0, 0.8)'
            }}
          >
            <h3 className="text-2xl font-serif font-bold text-white mb-4">
              {purchaseModal.category === 'vip_tier' ? 'Upgrade to VIP?' : 'Confirm Purchase'}
            </h3>
            
            {purchaseModal.category === 'vip_tier' ? (
              <>
                <p className="text-gray-300 mb-2">
                  Upgrade to <span className="text-yellow-400 font-bold">{purchaseModal.name}</span>?
                </p>
                <p className="text-sm text-gray-400 mb-4">
                  This is a permanent upgrade. You&apos;ll start earning bonus coins immediately!
                </p>
                {VIP_BENEFITS[purchaseModal.id] && (
                  <div className="mb-4 bg-black/50 rounded-lg p-4 text-left">
                    <h4 className="text-xs font-bold uppercase text-yellow-400 mb-2 text-center">You&apos;ll Get:</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      {VIP_BENEFITS[purchaseModal.id].map((benefit, idx) => (
                        <li key={idx}>✓ {benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-300 mb-4">
                Purchase <span className="text-yellow-400 font-bold">{purchaseModal.name}</span>?
              </p>
            )}

            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-2xl">🪙</span>
              <span className="text-2xl font-bold" style={{ color: '#ffd700' }}>
                {purchaseModal.price.toLocaleString()} Coins
              </span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setPurchaseModal(null)}
                className="flex-1 px-4 py-3 bg-gray-800 text-gray-300 font-medium rounded-md hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmPurchase}
                className="flex-1 px-4 py-3 font-bold text-black rounded-md transition-colors"
                style={{ backgroundColor: '#d4af37' }}
              >
                {purchaseModal.category === 'vip_tier' ? 'Upgrade Now' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
