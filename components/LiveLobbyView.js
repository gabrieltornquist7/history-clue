// components/LiveLobbyView.js
"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function LiveLobbyView({ setView, session, setActiveLiveMatch }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [friendProfiles, setFriendProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const currentUserId = session?.user?.id;

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      
      const { data: selfProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', currentUserId)
        .single();
      setCurrentUserProfile(selfProfile);

      const { data: friendshipsData } = await supabase
        .from('friendships')
        .select(`*, user1:user_id_1(id, username), user2:user_id_2(id, username)`)
        .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`)
        .eq('status', 'accepted');

      const friends = (friendshipsData || []).map(f => 
        f.user1.id === currentUserId ? f.user2 : f.user1
      );
      setFriendProfiles(friends);
      setLoading(false);
    };
    fetchData();

    const channel = supabase.channel('live-lobby-presence');
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const onlineUserIds = Object.values(presenceState).flat().map(p => p.user_id);
        setOnlineUsers([...new Set(onlineUserIds)]);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: currentUserId });
        }
      });

    const inviteChannel = supabase.channel(`invites:${currentUserId}`);
    inviteChannel
      .on('broadcast', { event: 'live_invite' }, ({ payload }) => {
        if (window.confirm(`${payload.from_username} challenges you to a Live Battle! Accept?`)) {
          setActiveLiveMatch(payload.matchId);
          setView('liveGame');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(inviteChannel);
    };
  }, [currentUserId, setActiveLiveMatch, setView]);

  const startLiveMatch = async (opponentId) => {
    setWaitingForOpponent(true);
    
    try {
      const { data: matchId, error } = await supabase.rpc('create_live_match', { 
        opponent_id: opponentId 
      });
      
      if (error) {
        setWaitingForOpponent(false);
        return alert('Error creating match: ' + error.message);
      }

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
          setTimeout(() => {
            supabase.removeChannel(inviteChannel);
            setActiveLiveMatch(matchId);
            setView('liveGame');
          }, 3000);
        }
      });
    } catch (error) {
      console.error('Error starting match:', error);
      setWaitingForOpponent(false);
    }
  };

  const onlineFriends = friendProfiles.filter(f => onlineUsers.includes(f.id));
  const offlineFriends = friendProfiles.filter(f => !onlineUsers.includes(f.id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-serif text-gold-rush mb-4">Loading Live Battle Lobby...</div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-rush mx-auto"></div>
        </div>
      </div>
    );
  }

  if (waitingForOpponent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 bg-papyrus rounded-lg shadow-lg border border-sepia/20">
          <div className="text-2xl font-serif text-gold-rush mb-4">Sending Challenge...</div>
          <div className="animate-pulse text-lg text-sepia">Waiting for opponent to accept</div>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 min-h-screen">
      <header className="mb-8 text-center relative">
        <button 
          onClick={() => setView('menu')} 
          className="absolute left-0 top-1/2 -translate-y-1/2 px-4 py-2 bg-sepia-dark text-white font-bold rounded-lg hover:bg-ink transition-colors shadow-sm"
        >
          &larr; Menu
        </button>
        <h1 className="text-5xl font-serif font-bold text-gold-rush">
           Live Battle Arena
        </h1>
        <p className="text-lg text-sepia mt-2">Challenge friends to 1v1 battles!</p>
      </header>

      <div className="space-y-8">
        <div>
          <h3 className="text-2xl font-serif font-bold text-ink mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
            Online Friends ({onlineFriends.length})
          </h3>
          <div className="bg-papyrus p-4 rounded-lg shadow-inner border border-sepia/20 space-y-3">
            {onlineFriends.length > 0 ? (
              onlineFriends.map(friend => (
                <div key={friend.id} className="flex items-center justify-between p-3 bg-parchment rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="font-bold text-ink text-lg">{friend.username}</span>
                    <span className="text-xs text-green-600 font-semibold">ONLINE</span>
                  </div>
                  <button 
                    onClick={() => startLiveMatch(friend.id)} // This should now correctly pass the UUID
                    className="px-4 py-2 bg-red-700 text-white font-bold rounded-lg hover:bg-red-800 transition-colors shadow-md animate-pulse"
                  >
                     Battle Now!
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sepia text-center py-8">
                No friends are currently online for Live Battle.
                <br />
                <span className="text-sm">Invite friends to join!</span>
              </p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-serif font-bold text-ink mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-400"></span>
            Offline Friends ({offlineFriends.length})
          </h3>
          <div className="bg-papyrus p-4 rounded-lg shadow-inner border border-sepia/20 space-y-3 opacity-75">
            {offlineFriends.length > 0 ? (
              offlineFriends.map(friend => (
                <div key={friend.id} className="flex items-center justify-between p-3 bg-parchment rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                    <span className="font-bold text-ink/70">{friend.username}</span>
                    <span className="text-xs text-gray-500">OFFLINE</span>
                  </div>
                  <button 
                    disabled
                    className="px-4 py-2 bg-gray-400 text-white/70 font-bold rounded-lg cursor-not-allowed"
                  >
                    Unavailable
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sepia text-center py-4">No offline friends.</p>
            )}
          </div>
        </div>

        <div className="bg-papyrus p-6 rounded-lg shadow-inner border border-sepia/20">
          <h3 className="font-serif font-bold text-ink mb-2">How Live Battles Work:</h3>
          <ul className="space-y-2 text-sepia">
            <li>• Both players solve the same puzzle simultaneously</li>
            <li>• 3-minute timer - drops to 30 seconds when opponent submits</li>
            <li>• See your opponent&apos;s pin placement in real-time</li>
            <li>• Unlock clues independently with your own points</li>
            <li>• Highest score wins the round!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}