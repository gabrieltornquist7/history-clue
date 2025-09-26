"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AvatarImage } from '../lib/avatarHelpers';
import UserProfileView from './UserProfileView';

export default function FriendsView({ setView, session }) {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('friends');
  const [viewingProfile, setViewingProfile] = useState(null);
  const currentUserId = session?.user?.id;

  useEffect(() => {
    if (!currentUserId) return;
    fetchFriendsData();
  }, [currentUserId]);

  const fetchFriendsData = async () => {
    setLoading(true);

    // Fetch friendships with user profiles
    const { data: friendshipsRaw } = await supabase
      .from('friendships')
      .select('*, user1:user_id_1(id, username, avatar_url), user2:user_id_2(id, username, avatar_url)')
      .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`);

    if (friendshipsRaw) {
      const acceptedFriends = friendshipsRaw
        .filter(f => f.status === 'accepted')
        .map(f => f.user_id_1 === currentUserId ? f.user2 : f.user1);

      const pending = friendshipsRaw
        .filter(f => f.status === 'pending' && f.user_id_2 === currentUserId && f.action_user_id !== currentUserId)
        .map(f => ({ ...f.user1, friendship_id: f.id }));

      const sent = friendshipsRaw
        .filter(f => f.status === 'pending' && f.action_user_id === currentUserId)
        .map(f => f.user2);

      setFriends(acceptedFriends);
      setPendingRequests(pending);
      setSentRequests(sent);
    }

    setLoading(false);
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `%${searchQuery}%`)
      .neq('id', currentUserId)
      .limit(10);

    const friendIds = [...friends, ...sentRequests, ...pendingRequests].map(f => f.id);
    const filtered = data?.filter(user => !friendIds.includes(user.id)) || [];
    setSearchResults(filtered);
  };

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery) searchUsers();
    }, 300);
    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const sendFriendRequest = async (userId) => {
    const { error } = await supabase
      .from('friendships')
      .insert({
        user_id_1: currentUserId,
        user_id_2: userId,
        action_user_id: currentUserId
      });

    if (!error) {
      alert('Friend request sent!');
      fetchFriendsData();
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const acceptRequest = async (friendshipId) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', action_user_id: currentUserId })
      .eq('id', friendshipId);

    if (!error) {
      alert('Friend request accepted!');
      fetchFriendsData();
    }
  };

  const removeFriend = async (friendId) => {
    if (!confirm('Remove this friend?')) return;

    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id_1.eq.${currentUserId},user_id_2.eq.${friendId}),and(user_id_1.eq.${friendId},user_id_2.eq.${currentUserId})`);

    if (!error) {
      fetchFriendsData();
    }
  };

  // If viewing a profile, show that instead
  if (viewingProfile) {
    return (
      <UserProfileView
        setView={setView}
        userId={viewingProfile}
        onBack={() => setViewingProfile(null)}
      />
    );
  }

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
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(115deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.08) 100%)",
          backgroundSize: "200% 200%",
          animation: "shine 12s linear infinite",
        }}
      />
      <style jsx>{`
        @keyframes shine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <header className="p-8 relative z-10">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button
            onClick={() => setView('menu')}
            className="px-5 py-2.5 bg-gray-900 text-gray-300 font-medium rounded-md border border-gray-700/30 hover:border-yellow-500/50 hover:text-white transition-all duration-300"
          >
            ← Back
          </button>
          <div className="text-center flex-1 px-4">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-2"
                style={{ letterSpacing: '0.02em', textShadow: '0 0 20px rgba(212, 175, 55, 0.3)' }}>
              Friends
            </h1>
            <p className="text-sm italic font-light" style={{ color: '#d4af37', opacity: 0.9, letterSpacing: '0.05em' }}>
              Connect with other players
            </p>
          </div>
          <div className="w-24"></div>
        </div>
      </header>

      <div className="px-8 pb-8 relative z-10">
        <div className="max-w-4xl mx-auto">

          <div className="mb-8">
            <div className="backdrop-blur rounded-lg overflow-hidden"
                 style={{
                   backgroundColor: "rgba(0, 0, 0, 0.7)",
                   boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)"
                 }}>
              <div className="p-4">
                <input
                  type="text"
                  placeholder="Search for players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 text-white rounded-md border border-gray-700/30 focus:border-yellow-500/50 focus:outline-none transition-all"
                />

                {searchResults.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                    {searchResults.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-md">
                        <div className="flex items-center gap-3">
                          <AvatarImage url={user.avatar_url} size="w-8 h-8" />
                          <span className="text-white font-medium">{user.username}</span>
                        </div>
                        <button
                          onClick={() => sendFriendRequest(user.id)}
                          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded hover:bg-gray-700 transition-all"
                        >
                          Add Friend
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center mb-6">
            <div className="backdrop-blur rounded-lg p-1.5"
                 style={{
                   backgroundColor: 'rgba(0, 0, 0, 0.7)',
                   border: '1px solid rgba(255, 255, 255, 0.05)'
                 }}>
              <div className="flex space-x-2">
                {['friends', 'requests'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-2.5 font-medium rounded-md transition-all ${
                      activeTab === tab ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {tab === 'requests' && pendingRequests.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                        {pendingRequests.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="backdrop-blur rounded-lg overflow-hidden"
               style={{
                 backgroundColor: "rgba(0, 0, 0, 0.7)",
                 boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)"
               }}>
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="text-gray-400">Loading...</div>
                </div>
              ) : (
                <>
                  {activeTab === 'friends' && (
                    <div className="space-y-3">
                      {friends.length > 0 ? (
                        friends.map(friend => (
                          <div key={friend.id} className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg">
                            <button
                              onClick={() => setViewingProfile(friend.id)}
                              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                            >
                              <AvatarImage url={friend.avatar_url} size="w-10 h-10" />
                              <span className="text-white font-medium hover:text-yellow-400 transition-colors">
                                {friend.username}
                              </span>
                            </button>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setView('challenge')}
                                className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded hover:bg-gray-700 transition-all"
                              >
                                Challenge
                              </button>
                              <button
                                onClick={() => removeFriend(friend.id)}
                                className="px-4 py-2 text-red-400 text-sm font-medium rounded hover:bg-red-900/20 transition-all"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 text-gray-400">
                          No friends yet. Search for players to add!
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'requests' && (
                    <div className="space-y-3">
                      {pendingRequests.length > 0 ? (
                        pendingRequests.map(request => (
                          <div key={request.id} className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <AvatarImage url={request.avatar_url} size="w-10 h-10" />
                              <div>
                                <div className="text-white font-medium">{request.username}</div>
                                <div className="text-xs text-gray-400">Wants to be friends</div>
                              </div>
                            </div>
                            <button
                              onClick={() => acceptRequest(request.friendship_id)}
                              className="px-5 py-2.5 font-bold text-white rounded-md transition-all"
                              style={{
                                background: "linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)",
                                fontFamily: "system-ui, -apple-system, sans-serif",
                                letterSpacing: "-0.02em",
                              }}
                            >
                              Accept
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 text-gray-400">
                          No pending friend requests
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}