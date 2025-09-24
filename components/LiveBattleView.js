// components/LiveBattleView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function LiveBattleView({ setView, session, setActiveLiveMatch }) {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [onlineFriends, setOnlineFriends] = useState([]);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [searchingMatch, setSearchingMatch] = useState(false);
  
  const currentUserId = session?.user?.id;

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      
      // Get current user profile
      const { data: selfProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', currentUserId)
        .single();
      setCurrentUserProfile(selfProfile);

      // Get all profiles except current user
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .not('id', 'eq', currentUserId);
      setProfiles(profilesData || []);

      // Get friendships
      const { data: friendshipsData } = await supabase
        .from('friendships')
        .select(`*, user1:user_id_1(id, username), user2:user_id_2(id, username)`)
        .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`);
      setFriendships(friendshipsData || []);

      setLoading(false);
    };

    fetchData();

    // Set up presence channel to track online users
    // FIX: Changed channel name to match the working LiveLobbyView component
    const channel = supabase.channel('live-lobby-presence');
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const onlineUserIds = Object.values(presenceState).flat().map(p => p.user_id);
        setOnlineFriends(onlineUserIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: session.user.id });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, session?.user?.id]);

  const startLiveMatch = async (opponentId) => {
    setSearchingMatch(true);
    try {
      // Create the live match
      const { data: matchId, error } = await supabase.rpc('create_live_match', { 
        opponent_id: opponentId 
      });
      
      if (error) {
        alert('Error creating match: ' + error.message);
        return;
      }

      // Send invitation to opponent
      const inviteChannel = supabase.channel(`invites:${opponentId}`);
      inviteChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await inviteChannel.send({
            type: 'broadcast',
            event: 'live_invite',
            payload: { 
              matchId, 
              from_username: currentUserProfile?.username || 'A player' 
            },
          });
          supabase.removeChannel(inviteChannel);
        }
      });

      // Navigate to live game
      setActiveLiveMatch(matchId);
      setView('liveGame');
    } catch (error) {
      alert('Failed to start match: ' + error.message);
    } finally {
      setSearchingMatch(false);
    }
  };

  const quickMatch = async () => {
    // For now, this could just show a "coming soon" message
    // or you could implement random matchmaking logic here
    alert('Quick match coming soon! For now, challenge a friend directly.');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 min-h-screen">
        <div className="text-center text-sepia">Loading...</div>
      </div>
    );
  }

  // Get accepted friends
  const friends = friendships.filter((f) => f.status === 'accepted');
  const friendProfiles = friends.map((f) => 
    f.user1.id === currentUserId ? f.user2 : f.user1
  );
  
  // Split into online and offline friends
  const onlineFriendProfiles = friendProfiles.filter(p => 
    onlineFriends.includes(p.id)
  );
  const offlineFriendProfiles = friendProfiles.filter(p => 
    !onlineFriends.includes(p.id)
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 min-h-screen">
      <header className="mb-8 text-center relative">
        <button 
          onClick={() => setView('menu')} 
          className="absolute left-0 top-1/2 -translate-y-1/2 px-4 py-2 bg-sepia-dark text-white font-bold rounded-lg hover:bg-ink transition-colors shadow-sm"
        >
          ← Menu
        </button>
        <h1 className="text-5xl font-serif font-bold text-gold-rush">
          Live Battle ⚔️
        </h1>
        <p className="text-lg text-sepia mt-2">
          Challenge friends to real-time battles!
        </p>
      </header>

      <div className="space-y-8">
        {/* Quick Match Section */}
        <div className="text-center">
          <button
            onClick={quickMatch}
            disabled={searchingMatch}
            className="px-8 py-4 bg-red-700 text-white font-bold text-xl rounded-lg hover:bg-red-800 disabled:bg-gray-500 transition-colors shadow-md"
          >
            {searchingMatch ? 'Searching...' : 'Quick Match'}
          </button>
          <p className="text-sm text-sepia mt-2">
            Find a random opponent for instant battle
          </p>
        </div>

        {/* Online Friends */}
        <div>
          <h3 className="text-2xl font-serif font-bold text-ink mb-4">
            Online Friends ({onlineFriendProfiles.length})
          </h3>
          <div className="bg-papyrus p-4 rounded-lg shadow-inner border border-sepia/20 space-y-3">
            {onlineFriendProfiles.length > 0 ? (
              onlineFriendProfiles.map(friend => (
                <div key={friend.id} className="flex items-center justify-between p-3 bg-parchment rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="font-bold text-ink">{friend.username}</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Online
                    </span>
                  </div>
                  <button
                    onClick={() => startLiveMatch(friend.id)}
                    disabled={searchingMatch}
                    className="px-4 py-2 bg-red-700 text-white font-bold rounded-lg hover:bg-red-800 disabled:bg-gray-500 transition-colors"
                  >
                    {searchingMatch ? 'Connecting...' : 'Battle Now!'}
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-sepia text-lg mb-2">No friends are currently online</p>
                <p className="text-sepia/70 text-sm">
                  Friends need to be online for live battles
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Offline Friends */}
        <div>
          <h3 className="text-2xl font-serif font-bold text-ink mb-4">
            Offline Friends ({offlineFriendProfiles.length})
          </h3>
          <div className="bg-papyrus p-4 rounded-lg shadow-inner border border-sepia/20 space-y-3">
            {offlineFriendProfiles.length > 0 ? (
              offlineFriendProfiles.map(friend => (
                <div key={friend.id} className="flex items-center justify-between p-3 bg-parchment rounded-lg opacity-60">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                    <span className="font-bold text-ink">{friend.username}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      Offline
                    </span>
                  </div>
                  <button
                    disabled
                    className="px-4 py-2 bg-gray-400 text-gray-600 font-bold rounded-lg cursor-not-allowed"
                  >
                    Offline
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sepia text-center py-4">No offline friends</p>
            )}
          </div>
        </div>

        {/* Add Friends Help */}
        {friendProfiles.length === 0 && (
          <div className="text-center py-8 bg-papyrus rounded-lg border border-sepia/20">
            <h4 className="text-xl font-serif font-bold text-ink mb-2">
              No Friends Yet?
            </h4>
            <p className="text-sepia mb-4">
              Add friends to challenge them to live battles!
            </p>
            <button
              onClick={() => setView('challenge')}
              className="px-6 py-2 bg-sepia-dark text-white font-bold rounded-lg hover:bg-ink transition-colors"
            >
              Find & Add Friends
            </button>
          </div>
        )}
      </div>
    </div>
  );
}