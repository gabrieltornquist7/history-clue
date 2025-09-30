// components/Shop.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import GlassBackButton from './GlassBackButton';

const RARITY_COLORS = {
  common: { border: 'rgba(156, 163, 175, 0.3)', glow: 'rgba(156, 163, 175, 0.1)', text: '#9ca3af' },
  rare: { border: 'rgba(59, 130, 246, 0.4)', glow: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
  epic: { border: 'rgba(168, 85, 247, 0.4)', glow: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' },
  legendary: { border: 'rgba(234, 179, 8, 0.5)', glow: 'rgba(234, 179, 8, 0.2)', text: '#eab308' }
};

export default function Shop({ setView, session }) {
  const [shopItems, setShopItems] = useState([]);
  const [userPurchases, setUserPurchases] = useState([]);
  const [userCoins, setUserCoins] = useState(0);
  const [equippedTitle, setEquippedTitle] = useState(null);
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

    // Fetch user profile (coins and equipped title)
    const { data: profile } = await supabase
      .from('profiles')
      .select('coins, equipped_title')
      .eq('id', session.user.id)
      .single();

    setShopItems(items || []);
    setUserPurchases(purchases?.map(p => p.item_id) || []);
    setUserCoins(profile?.coins || 0);
    setEquippedTitle(profile?.equipped_title || null);
    setIsLoading(false);
  };

  const handlePurchase = async (item) => {
    if (userCoins < item.price) {
      showNotification('Not enough coins!', 'error');
      return;
    }

    if (userPurchases.includes(item.id)) {
      showNotification('You already own this item!', 'error');
      return;
    }

    setPurchaseModal(item);
  };

  const confirmPurchase = async () => {
    const item = purchaseModal;
    setPurchaseModal(null);

    try {
      const { data, error } = await supabase.rpc('purchase_shop_item', {
        p_user_id: session.user.id,
        p_item_id: item.id
      });

      if (error) throw error;

      const result = data[0];
      
      if (result.success) {
        setUserCoins(result.new_coin_balance);
        setUserPurchases([...userPurchases, item.id]);
        showNotification(`Successfully purchased ${item.name}!`, 'success');
        
        // Auto-equip if it's a title and user has no title equipped
        if (item.category === 'title' && !equippedTitle) {
          await handleEquipTitle(item.id);
        }
      } else {
        showNotification(result.message, 'error');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      showNotification('Purchase failed. Please try again.', 'error');
    }
  };

  const handleEquipTitle = async (itemId) => {
    try {
      const { data, error } = await supabase.rpc('equip_title', {
        p_user_id: session.user.id,
        p_item_id: itemId
      });

      if (error) throw error;

      const result = data[0];
      
      if (result.success) {
        setEquippedTitle(itemId);
        showNotification('Title equipped!', 'success');
      } else {
        showNotification(result.message, 'error');
      }
    } catch (error) {
      console.error('Equip error:', error);
      showNotification('Failed to equip title.', 'error');
    }
  };

  const handleUnequipTitle = async () => {
    try {
      const { error } = await supabase.rpc('unequip_title', {
        p_user_id: session.user.id
      });

      if (error) throw error;

      setEquippedTitle(null);
      showNotification('Title unequipped!', 'success');
    } catch (error) {
      console.error('Unequip error:', error);
      showNotification('Failed to unequip title.', 'error');
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const getItemsByCategory = () => {
    return shopItems.filter(item => item.category === selectedCategory);
  };

  const isOwned = (itemId) => userPurchases.includes(itemId);
  const isEquipped = (itemId) => equippedTitle === itemId;

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
        .slide-down {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>

      <GlassBackButton onClick={() => setView('menu')} fallbackUrl="/" />

      {/* Notification */}
      {notification && (
        <div 
          className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-2xl slide-down"
          style={{
            backgroundColor: notification.type === 'success' ? 'rgba(34, 197, 94, 0.9)' : notification.type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(59, 130, 246, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <p className="text-white font-semibold">{notification.message}</p>
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
            <p className="text-gray-300">Spend your coins on titles and customizations</p>
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 sm:px-8 pb-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          
          {/* Category Tabs */}
          <div className="flex gap-4 mb-8 justify-center">
            <button
              onClick={() => setSelectedCategory('title')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                selectedCategory === 'title'
                  ? 'bg-yellow-600 text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Titles
            </button>
            {/* Future categories can be added here */}
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getItemsByCategory().map(item => {
              const owned = isOwned(item.id);
              const equipped = isEquipped(item.id);
              const rarityColor = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;

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
                    {equipped && (
                      <span className="text-xs font-bold text-green-400 bg-green-400/20 px-2 py-1 rounded">
                        EQUIPPED
                      </span>
                    )}
                  </div>

                  {/* Item Name */}
                  <h3 
                    className="text-xl font-serif font-bold mb-2"
                    style={{ 
                      color: '#d4af37',
                      textShadow: '0 0 10px rgba(212, 175, 55, 0.3)'
                    }}
                  >
                    {item.name}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-400 text-sm mb-4 italic">
                    {item.description}
                  </p>

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

                    {owned ? (
                      equipped ? (
                        <button
                          onClick={() => handleUnequipTitle()}
                          className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors font-medium text-sm"
                        >
                          Unequip
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEquipTitle(item.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 transition-colors font-medium text-sm"
                        >
                          Equip
                        </button>
                      )
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
                        {userCoins >= item.price ? 'Purchase' : 'Not Enough'}
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
            <h3 className="text-2xl font-serif font-bold text-white mb-4">Confirm Purchase</h3>
            <p className="text-gray-300 mb-2">
              Are you sure you want to purchase:
            </p>
            <p 
              className="text-xl font-bold mb-4"
              style={{ color: '#d4af37' }}
            >
              {purchaseModal.name}
            </p>
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
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
