// components/LiveLobbyView.js
"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function LiveLobbyView({ setView, session, setActiveLiveMatch }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [friendProfiles, setFriendProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [inviteTimeout, setInviteTimeout] = useState(null);
  
  const presenceChannelRef = useRef(null);
  const inviteChannelRef = useRef(null);
  const currentUserId = session?.user?.id;

  // Cleanup function
  const cleanup = useCallback(() => {
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }
    if (inviteChannelRef.current) {
      supabase.removeChannel(inviteChannelRef.current);
      inviteChannelRef.current = null;
    }
    if (inviteTimeout) {
      clearTimeout(inviteTimeout);
      setInviteTimeout(null);
    }
  }, [inviteTimeout]);

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return cleanup;
    }

    const fetchData = async () => {
      setLoading(true);
      
      try {
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
          f.user_id_1 === currentUserId ? f.user2 : f.user1
        );
        setFriendProfiles(friends);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData().then(() => {
      const setupPresenceChannel = () => {
        const presenceChannel = supabase.channel('global-presence', {
          config: { 
            presence: { 
              key: currentUserId,
            },
          },
        });

        presenceChannel
          .on('presence', { event: 'sync' }, () => {
            const presenceState = presenceChannel.presenceState();
            const onlineUserIds = [];
            Object.keys(presenceState).forEach(key => {
              presenceState[key].forEach(presence => {
                if (presence.user_id && !onlineUserIds.includes(presence.user_id)) {
                  onlineUserIds.push(presence.user_id);
                }
              });
            });
            setOnlineUsers(onlineUserIds);
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            console.log('User joined:', key, newPresences);
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            console.log('User left:', key, leftPresences);
          })
          .subscribe(async (status) => {
            console.log('Presence channel status:', status);
            if (status === 'SUBSCRIBED') {
              console.log('Presence channel subscribed, tracking user');
              await presenceChannel.track({ 
                user_id: currentUserId,
                username: currentUserProfile?.username,
                online_at: new Date().toISOString(),
              });
            } else if (status === 'CHANNEL_ERROR') {
              console.error('Presence channel error, retrying...');
              setTimeout(() => {
                if (presenceChannelRef.current === presenceChannel) {
                  setupPresenceChannel();
                }
              }, 3000);
            }
          });

        presenceChannelRef.current = presenceChannel;
      };

      const setupInviteChannel = () => {
        const inviteChannel = supabase.channel(`invites:${currentUserId}`, {
          config: { broadcast: { self: false } }
        });
        
        inviteChannel
          .on('broadcast', { event: 'live_invite' }, ({ payload }) => {
            if (window.confirm(`${payload.from_username} challenges you to a Live Battle! Accept?`)) {
              setActiveLiveMatch(payload.matchId);
              setView('liveGame');
            }
          })
          .subscribe((status) => {
            console.log('Invite channel status:', status);
            if (status === 'CHANNEL_ERROR') {
              console.error('Invite channel error, retrying...');
              setTimeout(() => {
                if (inviteChannelRef.current === inviteChannel) {
                  setupInviteChannel();
                }
              }, 3000);
            }
          });

        inviteChannelRef.current = inviteChannel;
      };

      setupPresenceChannel();
      setupInviteChannel();

      const presenceInterval = setInterval(() => {
        if (presenceChannelRef.current) {
          presenceChannelRef.current.track({
            user_id: currentUserId,
            username: currentUserProfile?.username,
            online_at: new Date().toISOString(),
          });
        }
      }, 30000);

      return () => {
        clearInterval(presenceInterval);
        cleanup();
      };
    });
  }, [currentUserId, setActiveLiveMatch, setView, cleanup, currentUserProfile]);

  const startLiveMatch = async (opponentId) => {
    if (waitingForOpponent) return;
    setWaitingForOpponent(true);
    
    try {
      const { data: matchId, error } = await supabase.rpc('create_live_match', { opponent_id: opponentId });
      if (error) {
        console.error('Error creating match:', error);
        alert('Error creating match: ' + error.message);
        setWaitingForOpponent(false);
        return;
      }

      const opponentChannel = supabase.channel(`invites:${opponentId}`);
      
      const timeout = setTimeout(() => {
        console.log('Invite timeout, proceeding to game anyway');
        supabase.removeChannel(opponentChannel);
        setActiveLiveMatch(matchId);
        setView('liveGame');
        setWaitingForOpponent(false);
      }, 3000);

      setInviteTimeout(timeout);

      opponentChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await opponentChannel.send({
            type: 'broadcast',
            event: 'live_invite',
            payload: { 
              matchId, 
              from_username: currentUserProfile?.username || 'A player',
              from_user_id: currentUserId
            },
          });
          
          setTimeout(() => {
            clearTimeout(timeout);
            supabase.removeChannel(opponentChannel);
            setActiveLiveMatch(matchId);
            setView('liveGame');
            setWaitingForOpponent(false);
          }, 1000);
        }
      });
    } catch (error) {
      console.error('Error starting match:', error);
      alert('Failed to start match: ' + error.message);
      setWaitingForOpponent(false);
    }
  };

  const refreshPresence = async () => {
    if (presenceChannelRef.current) {
      await presenceChannelRef.current.track({
        user_id: currentUserId,
        username: currentUserProfile?.username,
        online_at: new Date().toISOString(),
      });
    }
  };

  const onlineFriendProfiles = friendProfiles.filter(p => onlineUsers.includes(p.id));
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
        <div className="text-center p-8 bg-papyrus rounded-lg shadow-lg border border-sepia/20 max-w-md">
          <div className="text-2xl font-serif text-gold-rush mb-4">Sending Challenge...</div>
          <div className="animate-pulse text-lg text-sepia mb-4">Inviting opponent to battle</div>
          <div className="mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700 mx-auto"></div>
          </div>
          <button 
            onClick={() => {
              setWaitingForOpponent(false);
              if (inviteTimeout) {
                clearTimeout(inviteTimeout);
                setInviteTimeout(null);
              }
            }}
            className="px-4 py-2 bg-sepia text-white rounded-lg hover:bg-sepia-dark"
          >
            Cancel
          </button>
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
        <p className="text-lg text-sepia mt-2">Challenge friends to real-time battles!</p>
      </header>

      <div className="space-y-8">
        <div className="text-xs text-sepia bg-papyrus p-3 rounded mb-6">
          <div>Online Users: {onlineUsers.length} ({onlineUsers.join(', ')})</div>
          <div>Friends: {friendProfiles.length} ({friendProfiles.map(f => f.username).join(', ')})</div>
          <div>Online Friends: {onlineFriendProfiles.length} ({onlineFriendProfiles.map(f => f.username).join(', ')})</div>
          <div>Channel: {presenceChannelRef.current ? 'Connected' : 'Disconnected'}</div>
          <div>Current User ID: {currentUserId}</div>
          <button 
            onClick={refreshPresence}
            className="mt-2 px-3 py-1 bg-sepia text-white text-xs rounded hover:bg-sepia-dark"
          >
            Refresh Presence
          </button>
        </div>

        <div>
          <h3 className="text-2xl font-serif font-bold text-ink mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
            Online Friends ({onlineFriendProfiles.length})
          </h3>
          <div className="bg-papyrus p-4 rounded-lg shadow-inner border border-sepia/20 space-y-3">
            {onlineFriendProfiles.length > 0 ? (
              onlineFriendProfiles.map(friend => (
                <div key={friend.id} className="flex items-center justify-between p-3 bg-parchment rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="font-bold text-ink text-lg">{friend.username}</span>
                    <span className="text-xs text-green-600 font-semibold">ONLINE</span>
                  </div>
                  <button 
                    onClick={() => startLiveMatch(friend.id)}
                    disabled={waitingForOpponent}
                    className="px-4 py-2 bg-red-700 text-white font-bold rounded-lg hover:bg-red-800 transition-colors shadow-md animate-pulse disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Battle Now!
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