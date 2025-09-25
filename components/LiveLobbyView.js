// components/LiveLobbyView.js
"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function LiveLobbyView({ session, setView, setActiveLiveMatch }) {
  const [mode, setMode] = useState(null); // null, 'searching', 'inviting', 'waiting'
  const [inviteCode, setInviteCode] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [friends, setFriends] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const queueChannelRef = useRef(null);
  const inviteChannelRef = useRef(null);

  useEffect(() => {
    // Load friends list
    const loadFriends = async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          friend:profiles!friendships_friend_id_fkey(id, username),
          requester:profiles!friendships_requester_id_fkey(id, username)
        `)
        .or(`requester_id.eq.${session.user.id},friend_id.eq.${session.user.id}`)
        .eq('status', 'accepted');

      if (!error && data) {
        const friendsList = data.map(friendship => {
          return friendship.requester.id === session.user.id 
            ? friendship.friend 
            : friendship.requester;
        });
        setFriends(friendsList);
      }
    };

    loadFriends();

    return () => {
      if (queueChannelRef.current) {
        supabase.removeChannel(queueChannelRef.current);
      }
      if (inviteChannelRef.current) {
        supabase.removeChannel(inviteChannelRef.current);
      }
    };
  }, [session.user.id]);

  const handleRandomMatch = async () => {
    setMode('searching');
    setIsSearching(true);

    try {
      // Check if there's already someone in the queue
      const { data: existingQueue, error: checkError } = await supabase
        .from('match_queue')
        .select('user_id')
        .neq('user_id', session.user.id)
        .limit(1);

      if (checkError) {
        console.error('Error checking queue:', checkError);
        setMode(null);
        setIsSearching(false);
        return;
      }

      if (existingQueue && existingQueue.length > 0) {
        // Found an opponent immediately
        const opponent = existingQueue[0];
        
        // Create battle
        const { data: battle, error: battleError } = await supabase
          .from('battles')
          .insert({
            player1: session.user.id,
            player2: opponent.user_id,
            status: 'lobby'
          })
          .select()
          .single();

        if (battleError) {
          console.error('Error creating battle:', battleError);
          setMode(null);
          setIsSearching(false);
          return;
        }

        // Remove opponent from queue
        await supabase
          .from('match_queue')
          .delete()
          .eq('user_id', opponent.user_id);

        // Start the battle immediately
        setActiveLiveMatch(battle.id);
        setView('liveGame');
        return;
      }

      // No opponent found, join queue and wait
      const { error: queueError } = await supabase
        .from('match_queue')
        .upsert({ user_id: session.user.id });

      if (queueError) {
        console.error('Error joining queue:', queueError);
        setMode(null);
        setIsSearching(false);
        return;
      }

      // Listen for match found (when another player joins)
      const channel = supabase.channel(`queue:${session.user.id}`);
      queueChannelRef.current = channel;

      channel
        .on('broadcast', { event: 'match_found' }, ({ payload }) => {
          setActiveLiveMatch(payload.battleId);
          setView('liveGame');
        })
        .subscribe();

      // Poll for opponents every 2 seconds
      const pollInterval = setInterval(async () => {
        const { data: queueData } = await supabase
          .from('match_queue')
          .select('user_id')
          .neq('user_id', session.user.id)
          .limit(1);

        if (queueData && queueData.length > 0) {
          clearInterval(pollInterval);
          
          const opponent = queueData[0];
          
          // Create battle
          const { data: battle, error: battleError } = await supabase
            .from('battles')
            .insert({
              player1: session.user.id,
              player2: opponent.user_id,
              status: 'lobby'
            })
            .select()
            .single();

          if (!battleError) {
            // Remove both players from queue
            await supabase
              .from('match_queue')
              .delete()
              .in('user_id', [session.user.id, opponent.user_id]);

            // Notify opponent
            const oppChannel = supabase.channel(`queue:${opponent.user_id}`);
            oppChannel.send({
              type: 'broadcast',
              event: 'match_found',
              payload: { battleId: battle.id }
            });

            // Start battle for current player
            setActiveLiveMatch(battle.id);
            setView('liveGame');
          }
        }
      }, 2000);

      // Clean up interval after 30 seconds
      setTimeout(() => {
        clearInterval(pollInterval);
      }, 30000);

    } catch (error) {
      console.error('Error in random match:', error);
      setMode(null);
      setIsSearching(false);
    }
  };

  const handleCancelSearch = async () => {
    await supabase
      .from('match_queue')
      .delete()
      .eq('user_id', session.user.id);

    if (queueChannelRef.current) {
      supabase.removeChannel(queueChannelRef.current);
    }

    setMode(null);
    setIsSearching(false);
  };

  const handleCreateInvite = async () => {
    try {
      console.log('Creating battle invite...');
      
      // Try using the RPC function first
      const { data, error } = await supabase.rpc('create_battle_invite');

      if (error) {
        console.error('RPC Error creating invite:', error);
        
        // Fallback: create battle manually
        const inviteCode = generateSimpleInviteCode();
        const { data: battleData, error: battleError } = await supabase
          .from('battles')
          .insert({
            player1: session.user.id,
            player2: null,
            invite_code: inviteCode,
            status: 'waiting'
          })
          .select()
          .single();

        if (battleError) {
          console.error('Error creating battle manually:', battleError);
          alert('Failed to create invite. Please try again.');
          return;
        }

        console.log('Battle created manually:', battleData);
        setGeneratedInvite({
          battle_id: battleData.id,
          invite_code: battleData.invite_code,
          player1: battleData.player1,
          player2: battleData.player2
        });
      } else {
        console.log('Battle created via RPC:', data);
        setGeneratedInvite(data);
      }

      setMode('waiting');

      // Listen for opponent joining
      const channel = supabase.channel(`invite:${generatedInvite?.battle_id || data?.battle_id}`);
      inviteChannelRef.current = channel;

      channel
        .on('broadcast', { event: 'opponent_joined' }, ({ payload }) => {
          setActiveLiveMatch(payload.battle_id || generatedInvite?.battle_id || data?.battle_id);
          setView('liveGame');
        })
        .subscribe();

    } catch (error) {
      console.error('Unexpected error creating invite:', error);
      alert('Failed to create invite. Please try again.');
    }
  };

  // Simple invite code generator as fallback
  const generateSimpleInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) return;

    try {
      console.log('Attempting to join with code:', inviteCode.trim());

      // Try RPC function first
      const { data, error } = await supabase.rpc('join_battle_by_code', {
        code: inviteCode.trim().toUpperCase()
      });

      if (error) {
        console.error('RPC Error joining battle:', error);
        
        // Fallback: manual join
        const { data: battleData, error: findError } = await supabase
          .from('battles')
          .select('*')
          .eq('invite_code', inviteCode.trim().toUpperCase())
          .eq('status', 'waiting')
          .is('player2', null)
          .single();

        if (findError || !battleData) {
          alert('Invalid or expired invite code');
          return;
        }

        // Update battle with player2
        const { data: updatedBattle, error: updateError } = await supabase
          .from('battles')
          .update({ 
            player2: session.user.id, 
            status: 'lobby' 
          })
          .eq('id', battleData.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating battle:', updateError);
          alert('Failed to join battle');
          return;
        }

        console.log('Joined battle manually:', updatedBattle);
        
        // Notify the battle creator
        const creatorChannel = supabase.channel(`invite:${updatedBattle.id}`);
        creatorChannel.send({
          type: 'broadcast',
          event: 'opponent_joined',
          payload: { battle_id: updatedBattle.id }
        });

        setActiveLiveMatch(updatedBattle.id);
        setView('liveGame');
        return;
      }

      if (data.error) {
        alert(data.error);
        return;
      }

      console.log('Joined battle via RPC:', data);

      // Notify the battle creator
      const creatorChannel = supabase.channel(`invite:${data.battle_id}`);
      creatorChannel.send({
        type: 'broadcast',
        event: 'opponent_joined',
        payload: { battle_id: data.battle_id }
      });

      setActiveLiveMatch(data.battle_id);
      setView('liveGame');

    } catch (error) {
      console.error('Unexpected error joining battle:', error);
      alert('Failed to join battle. Please try again.');
    }
  };

  const handleInviteFriend = async (friendId) => {
    const { data, error } = await supabase.rpc('create_battle_invite', {
      target_user_id: friendId
    });

    if (error) {
      console.error('Error creating friend invite:', error);
      return;
    }

    // Send notification to friend
    const friendChannel = supabase.channel(`invites:${friendId}`);
    friendChannel.send({
      type: 'broadcast',
      event: 'live_invite',
      payload: {
        from_user_id: session.user.id,
        from_username: session.user.email, // or username from profile
        battle_id: data.battle_id
      }
    });

    setGeneratedInvite(data);
    setMode('waiting');
  };

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
      {/* Header */}
      <header className="p-8 relative z-10">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button 
            onClick={() => setView('menu')} 
            className="px-5 py-2.5 bg-gray-900 text-gray-300 font-medium rounded-md border border-gray-700/30 hover:border-yellow-500/50 hover:text-white transition-all duration-300"
          >
            ← Back to Menu
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-serif font-bold text-white mb-2">
              Live Battle
            </h1>
            <p className="text-sm text-gray-300">Real-time multiplayer</p>
          </div>
          <div className="w-32"></div>
        </div>
      </header>

      <div className="px-8 pb-8 relative z-10">
        <div className="max-w-2xl mx-auto">
          
          {!mode && (
            <div className="space-y-6">
              {/* Random Match */}
              <div 
                className="backdrop-blur rounded-lg p-8 border transition-all duration-300 hover:border-yellow-500/20"
                style={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <h2 className="text-2xl font-serif font-bold text-white mb-4">Quick Match</h2>
                <p className="text-gray-300 mb-6">
                  Get matched with a random opponent for instant battle action.
                </p>
                <button
                  onClick={handleRandomMatch}
                  className="w-full px-8 py-4 font-bold text-white rounded-md transition-all duration-300"
                  style={{ 
                    background: 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}
                >
                  Find Random Opponent
                </button>
              </div>

              {/* Join by Code */}
              <div 
                className="backdrop-blur rounded-lg p-8 border"
                style={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <h2 className="text-2xl font-serif font-bold text-white mb-4">Join by Code</h2>
                <p className="text-gray-300 mb-6">
                  Enter a friend&apos;s invite code to join their battle.
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="Enter invite code"
                    className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
                    maxLength={6}
                  />
                  <button
                    onClick={handleJoinByCode}
                    disabled={!inviteCode.trim()}
                    className="px-6 py-3 bg-green-700 text-white font-medium rounded-md hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    Join
                  </button>
                </div>
              </div>

              {/* Invite Friends */}
              <div 
                className="backdrop-blur rounded-lg p-8 border"
                style={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <h2 className="text-2xl font-serif font-bold text-white mb-4">Challenge Friends</h2>
                <div className="space-y-4">
                  <button
                    onClick={handleCreateInvite}
                    className="w-full px-6 py-3 bg-blue-700 text-white font-medium rounded-md hover:bg-blue-600"
                  >
                    Create Invite Link
                  </button>
                  
                  {friends.length > 0 && (
                    <div>
                      <p className="text-gray-400 mb-3">Or invite a friend directly:</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {friends.map((friend) => (
                          <div key={friend.id} className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                            <span className="text-white">{friend.username}</span>
                            <button
                              onClick={() => handleInviteFriend(friend.id)}
                              className="px-4 py-1 bg-green-700 text-white text-sm rounded hover:bg-green-600"
                            >
                              Invite
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {mode === 'searching' && (
            <div 
              className="backdrop-blur rounded-lg p-8 border text-center"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <div className="mb-6">
                <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-2xl font-serif font-bold text-white mb-2">Searching for Opponent</h2>
                <p className="text-gray-300">Looking for another player to battle...</p>
              </div>
              <button
                onClick={handleCancelSearch}
                className="px-6 py-3 bg-gray-700 text-white font-medium rounded-md hover:bg-gray-600"
              >
                Cancel Search
              </button>
            </div>
          )}

          {mode === 'waiting' && generatedInvite && (
            <div 
              className="backdrop-blur rounded-lg p-8 border text-center"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <h2 className="text-2xl font-serif font-bold text-white mb-4">Battle Created</h2>
              <p className="text-gray-300 mb-6">Share this code with your opponent:</p>
              
              <div className="bg-gray-900 rounded-lg p-4 mb-6 border-2 border-yellow-500">
                <p className="text-3xl font-bold text-yellow-400 tracking-wider">
                  {generatedInvite.invite_code}
                </p>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => navigator.clipboard.writeText(generatedInvite.invite_code)}
                  className="px-6 py-3 bg-blue-700 text-white font-medium rounded-md hover:bg-blue-600"
                >
                  Copy Code
                </button>
                <button
                  onClick={() => setMode(null)}
                  className="px-6 py-3 bg-gray-700 text-white font-medium rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
              
              <p className="text-sm text-gray-400 mt-4">Waiting for opponent to join...</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}