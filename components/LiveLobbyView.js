// components/LiveLobbyView.js - SIMPLE VERSION THAT ACTUALLY WORKS
"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function LiveLobbyView({ session, setView, setActiveLiveMatch }) {
  const [mode, setMode] = useState(null); // null, 'searching', 'waiting'
  const [inviteCode, setInviteCode] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [friends, setFriends] = useState([]);

  const pollIntervalRef = useRef(null);

  useEffect(() => {
    // Load friends list
    const loadFriends = async () => {
      // Step 1: Get friendships
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`user_id_1.eq.${session.user.id},user_id_2.eq.${session.user.id}`);

      console.log('Friendships fetched:', { friendships, error });

      if (error) {
        console.error('Error loading friendships:', error);
        return;
      }

      // Step 2: Get friend profiles if friendships exist
      let friendsList = [];
      if (friendships && friendships.length > 0) {
        // Get unique friend IDs
        const friendIds = [...new Set(friendships.flatMap(f => [f.user_id_1, f.user_id_2]))].filter(id => id !== session.user.id);

        if (friendIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', friendIds);

          console.log('Friend profiles fetched:', { profiles, profilesError });

          if (!profilesError && profiles) {
            friendsList = profiles;
          }
        }
      }

      setFriends(friendsList);
    };

    loadFriends();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [session.user.id]);


  const handleRandomMatch = async () => {
    setMode('searching');

    try {
      // Check if someone is already waiting
      const { data: waiting, error: waitingError } = await supabase
        .from('match_queue')
        .select('user_id')
        .neq('user_id', session.user.id)
        .limit(1);

      if (waitingError) {
        console.error('Error checking queue:', waitingError);
        alert('Failed to search for opponents');
        setMode(null);
        return;
      }

      if (waiting && waiting.length > 0) {
        // Found someone waiting, create battle immediately
        const opponentId = waiting[0].user_id;
        
        const { data: battle, error: battleError } = await supabase
          .from('battles')
          .insert({
            player1: session.user.id,
            player2: opponentId,
            status: 'active'
          })
          .select()
          .single();

        if (battleError) {
          console.error('Error creating battle:', battleError);
          alert('Failed to create battle');
          setMode(null);
          return;
        }

        // Remove both players from queue
        await supabase
          .from('match_queue')
          .delete()
          .in('user_id', [session.user.id, opponentId]);

        // Go to battle
        setActiveLiveMatch(battle.id);
        setView('liveGame');
        return;
      }

      // No one waiting, add myself to queue and poll
      const { error: queueError } = await supabase
        .from('match_queue')
        .insert({ user_id: session.user.id });

      if (queueError) {
        console.error('Error joining queue:', queueError);
        alert('Failed to join matchmaking');
        setMode(null);
        return;
      }

      // Poll every 2 seconds for opponents
      pollIntervalRef.current = setInterval(async () => {
        const { data: opponents, error } = await supabase
          .from('match_queue')
          .select('user_id')
          .neq('user_id', session.user.id)
          .limit(1);

        if (!error && opponents && opponents.length > 0) {
          clearInterval(pollIntervalRef.current);
          
          const opponentId = opponents[0].user_id;
          
          // Create battle
          const { data: battle, error: battleError } = await supabase
            .from('battles')
            .insert({
              player1: session.user.id,
              player2: opponentId,
              status: 'active'
            })
            .select()
            .single();

          if (!battleError) {
            // Remove both from queue
            await supabase
              .from('match_queue')
              .delete()
              .in('user_id', [session.user.id, opponentId]);

            // Go to battle
            setActiveLiveMatch(battle.id);
            setView('liveGame');
          }
        }
      }, 2000);

      // Stop searching after 30 seconds
      setTimeout(() => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          handleCancelSearch();
        }
      }, 30000);

    } catch (error) {
      console.error('Error in random match:', error);
      setMode(null);
    }
  };

  const handleCancelSearch = async () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    await supabase
      .from('match_queue')
      .delete()
      .eq('user_id', session.user.id);

    setMode(null);
  };

  const handleCreateInvite = async () => {
    try {
      // Generate secure invite code using database function
      const { data: inviteCode, error: codeError } = await supabase
        .rpc('generate_invite_code');

      if (codeError || !inviteCode) {
        console.error('Error generating invite code:', codeError);
        alert('Failed to generate invite code');
        return;
      }

      const { data: battle, error: battleError } = await supabase
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
        console.error('Error creating battle:', battleError);
        alert('Failed to create invite');
        return;
      }

      setGeneratedInvite({
        battle_id: battle.id,
        invite_code: battle.invite_code
      });
      setMode('waiting');

      // Simple polling to check if someone joined
      pollIntervalRef.current = setInterval(async () => {
        const { data: updatedBattle, error } = await supabase
          .from('battles')
          .select('player2, status')
          .eq('id', battle.id)
          .single();

        if (!error && updatedBattle && updatedBattle.player2) {
          clearInterval(pollIntervalRef.current);
          
          // Update battle to active
          await supabase
            .from('battles')
            .update({ status: 'active' })
            .eq('id', battle.id);

          // Both players found, start battle
          setActiveLiveMatch(battle.id);
          setView('liveGame');
        }
      }, 1000);

    } catch (error) {
      console.error('Error creating invite:', error);
      alert('Failed to create invite');
    }
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) return;

    try {
      // Find the battle with proper authorization logic
      // - Anyone can see waiting battles with no player2 (open invites)
      // - Only player1 or player2 can see active battles (for rejoins)
      const { data: battle, error: findError } = await supabase
        .from("battles")
        .select("*")
        .eq("invite_code", inviteCode.trim().toUpperCase())
        .or(`and(status.eq.waiting,player2.is.null),and(status.eq.active,or(player1.eq.${session.user.id},player2.eq.${session.user.id}))`)
        .single();

      // Add detailed logging for debugging
      console.log('Battle lookup:', {
        inviteCode: inviteCode.trim().toUpperCase(),
        battle,
        findError,
        errorCode: findError?.code,
        errorMessage: findError?.message
      });

      if (findError || !battle) {
        console.error('Battle lookup error:', findError);
        if (findError?.code === 'PGRST116') {
          alert('Invite not found');
        } else if (findError?.code === 'PGRST301') {
          alert('Not authorized');
        } else if (findError) {
          alert('Failed to find battle. Please check your invite code and try again.');
        } else {
          alert('Invite not found');
        }
        return;
      }

      // Check if battle already has both players (fully occupied)
      if (battle.player2 && battle.player1 !== session.user.id && battle.player2 !== session.user.id) {
        alert('This battle is already full');
        return;
      }

      // Handle different scenarios
      if (battle.player1 === session.user.id) {
        // User is the inviter - just rejoin the existing battle
        console.log('Rejoining battle as inviter');
        setActiveLiveMatch(battle.id);
        setView('liveGame');
        return;
      }

      if (battle.player2 === session.user.id) {
        // User is already the joiner - just rejoin the existing battle
        console.log('Rejoining battle as joiner');
        setActiveLiveMatch(battle.id);
        setView('liveGame');
        return;
      }

      // New player joining - must be empty player2 slot
      if (battle.player2) {
        alert('This battle is already full');
        return;
      }

      // Join the battle as player2
      const { data: updatedBattle, error: updateError } = await supabase
        .from('battles')
        .update({
          player2: session.user.id,
          status: 'active'
        })
        .eq('id', battle.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error joining battle:', updateError);
        alert('Failed to join battle');
        return;
      }

      // Go to battle immediately
      setActiveLiveMatch(updatedBattle.id);
      setView('liveGame');

    } catch (error) {
      console.error('Error joining battle:', error);
      alert('Failed to join battle');
    }
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

              {/* Create Invite */}
              <div 
                className="backdrop-blur rounded-lg p-8 border"
                style={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <h2 className="text-2xl font-serif font-bold text-white mb-4">Challenge Friends</h2>
                <button
                  onClick={handleCreateInvite}
                  className="w-full px-6 py-3 bg-blue-700 text-white font-medium rounded-md hover:bg-blue-600"
                >
                  Create Invite Code
                </button>
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
                  onClick={() => {
                    setMode(null);
                    if (pollIntervalRef.current) {
                      clearInterval(pollIntervalRef.current);
                    }
                  }}
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