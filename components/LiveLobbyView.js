// components/LiveLobbyView.js - OPTIMIZED VERSION WITH PROFILE CACHE
"use client";
console.log('LiveLobbyView.js file is loading');
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

console.log('LiveLobbyView.js imports successful');

// Inline implementations to avoid import errors
function normalizeInvite(code) {
  return String(code || '').trim().toUpperCase();
}

function safePlayAudio(elementId) {
  try {
    const audio = document.getElementById(elementId);
    if (audio && typeof audio.play === 'function') {
      audio.play().catch(() => {});
    }
  } catch (e) {
    console.debug('Audio play failed (non-critical):', e);
  }
}

async function fetchJoinableMatchByInvite(inviteCode, uid) {
  const code = normalizeInvite(inviteCode);
  console.log('[liveApi] Finding match for code:', code);

  try {
    // Look for waiting battles with this code
    const { data: battles, error } = await supabase
      .from('battles')
      .select('*')
      .eq('invite_code', code);

    if (error) {
      console.error('[liveApi] Query error:', error);
      return { battle: null, path: 'none', error };
    }

    if (battles && battles.length > 0) {
      console.log('[liveApi] Found battle:', battles[0]);
      return { battle: battles[0], path: 'found', error: null };
    }

    return { battle: null, path: 'none', error: null };
  } catch (err) {
    return { battle: null, path: 'none', error: err };
  }
}

export default function LiveLobbyView({ session, setView, setActiveLiveMatch }) {
  console.log('[LiveLobby] Component mounting', {
    hasSession: !!session,
    userId: session?.user?.id,
    hasSetView: !!setView,
    hasSetActiveLiveMatch: !!setActiveLiveMatch
  });

  // Add this right at the start
  useEffect(() => {
    console.log('[LiveLobby] Initial useEffect running');
    return () => {
      console.log('[LiveLobby] Component unmounting');
    };
  }, []);

  const [mode, setMode] = useState(null); // null, 'searching', 'waiting'
  const [inviteCode, setInviteCode] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [friends, setFriends] = useState([]);
  const [joinLoading, setJoinLoading] = useState(false);

  const pollIntervalRef = useRef(null);
  const hasCheckedForBattles = useRef(false);

  useEffect(() => {
    console.log('[LiveLobby] Friends loading useEffect starting', {
      sessionUserId: session?.user?.id,
      setActiveLiveMatchType: typeof setActiveLiveMatch,
      setViewType: typeof setView
    });

    // Check for existing active battles
    const checkForActiveBattles = async () => {
      if (hasCheckedForBattles.current) {
        console.log('[LiveLobby] Already checked for battles, skipping...');
        return;
      }
      hasCheckedForBattles.current = true;

      try {
        console.log('[LiveLobby] Checking for active battles...');

        const { data: activeBattles, error } = await supabase
          .from('battles')
          .select('*')
          .or(`player1.eq.${session.user.id},player2.eq.${session.user.id}`)
          .eq('status', 'active')
          .limit(1);

        console.log('[LiveLobby] Active battles query result:', { activeBattles, error });

        if (!error && activeBattles && activeBattles.length > 0) {
          const battle = activeBattles[0];
          console.log('[LiveLobby] Found active battle:', battle.id, 'redirecting to liveBattle');

          // Auto-rejoin the active battle
          setActiveLiveMatch(battle.id);
          setView('liveBattle');
          return;
        }

        // Also check for waiting battles we created
        const { data: waitingBattles, error: waitingError } = await supabase
          .from('battles')
          .select('*')
          .eq('player1', session.user.id)
          .eq('status', 'waiting')
          .limit(1);

        console.log('[LiveLobby] Waiting battles query result:', { waitingBattles, waitingError });

        if (!waitingError && waitingBattles && waitingBattles.length > 0) {
          const battle = waitingBattles[0];
          console.log('[LiveLobby] Found waiting battle:', battle.id, battle.invite_code);

          // Resume waiting for this battle
          setMode('waiting');
          setGeneratedInvite(battle.invite_code);

          // Poll for player2 to join
          pollIntervalRef.current = setInterval(async () => {
            const { data: updatedBattle, error: battleError } = await supabase
              .from('battles')
              .select('*')
              .eq('id', battle.id)
              .single();

            if (!battleError && updatedBattle.player2) {
              console.log('[LiveLobby] Opponent joined waiting battle!');
              clearInterval(pollIntervalRef.current);
              setActiveLiveMatch(battle.id);
              setView('liveBattle');
            }
          }, 2000);
        }
      } catch (error) {
        console.error('[LiveLobby] Error checking for battles:', error);
      }
    };

    // Load friends list
    const loadFriends = async () => {
      try {
        console.log('[LiveLobby] Checking auth session...');
        // Step 0: Verify authentication session
        const { data: { session: authSession }, error: authError } = await supabase.auth.getSession();

        console.log('[LiveLobby] Auth check result:', {
          hasAuth: !!authSession,
          error: authError
        });

        if (authError || !authSession) {
          console.error('[LiveLobby] No active session for friendships query:', authError);
          return;
        }
        console.log('[LiveLobby] Auth session verified for friendships:', authSession.user.id);

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
          // Fetch friend profiles directly
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', friendIds);

          console.log('Friend profiles loaded:', profiles?.length || 0, 'profiles');

          if (profiles) {
            friendsList = profiles;
          }
        }
      }

        setFriends(friendsList);
        console.log('[LiveLobby] Friends loading completed, set', friendsList.length, 'friends');
      } catch (error) {
        console.error('[LiveLobby] Error loading friends:', error);
      }
    };

    console.log('[LiveLobby] About to run checkForActiveBattles and loadFriends');
    checkForActiveBattles();
    loadFriends();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [session.user.id, setActiveLiveMatch, setView]);


  const handleRandomMatch = async () => {
    setMode('searching');

    try {
      console.log('[LiveLobby] Starting quick match...');

      // Use the quick_match_player function
      const { data, error } = await supabase.rpc('quick_match_player', {
        player_id: session.user.id
      });

      if (error) {
        console.error('[LiveLobby] Quick match error:', error);
        alert('Failed to start quick match');
        setMode(null);
        return;
      }

      if (!data || data.length === 0) {
        console.error('[LiveLobby] No data returned from quick match');
        alert('Failed to start quick match');
        setMode(null);
        return;
      }

      const result = data[0];
      console.log('[LiveLobby] Quick match result:', result);

      if (result.is_new) {
        // We created a new battle and are waiting
        console.log('[LiveLobby] Created new battle, waiting for opponent...');
        setMode('waiting');
        setGeneratedInvite(result.invite_code);

        // Poll for player2 to join
        pollIntervalRef.current = setInterval(async () => {
          console.log('[LiveLobby] Polling for opponent...');

          const { data: battle, error: battleError } = await supabase
            .from('battles')
            .select('*')
            .eq('id', result.battle_id)
            .single();

          if (!battleError && battle.player2) {
            console.log('[LiveLobby] Opponent joined! Starting battle.');
            clearInterval(pollIntervalRef.current);
            setActiveLiveMatch(result.battle_id);
            setView('liveBattle');
          }
        }, 2000);

        // Stop waiting after 30 seconds
        setTimeout(() => {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            handleCancelSearch();
          }
        }, 30000);

      } else {
        // We joined an existing battle
        console.log('[LiveLobby] Joined existing battle, starting immediately.');
        setActiveLiveMatch(result.battle_id);
        setView('liveBattle');
      }

    } catch (error) {
      console.error('[LiveLobby] Error in quick match:', error);
      setMode(null);
    }
  };

  const handleCancelSearch = async () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Cancel any waiting battles we created
    if (mode === 'waiting' && generatedInvite) {
      await supabase
        .from('battles')
        .delete()
        .eq('player1', session.user.id)
        .eq('status', 'waiting');
    }

    setMode(null);
    setGeneratedInvite(null);
  };

  const handleCreateInvite = async () => {
    try {
      // Clear any existing polling first
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

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
      let errorCount = 0;
      pollIntervalRef.current = setInterval(async () => {
        const { data: updatedBattle, error } = await supabase
          .from('battles')
          .select('player2, status')
          .eq('id', battle.id)
          .single();

        if (error) {
          errorCount++;
          console.error('[LiveLobby] Polling error:', error);

          // Stop polling after 3 errors to prevent runaway requests
          if (errorCount >= 3 || error.code === '406') {
            console.error('[LiveLobby] Stopping poll due to repeated errors');
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setMode(null);
            setGeneratedInvite(null);
            alert('Lost connection to battle. Please try again.');
            return;
          }
        } else if (updatedBattle && updatedBattle.player2) {
          // Someone joined!
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;

          // Update battle to active
          await supabase
            .from('battles')
            .update({ status: 'active' })
            .eq('id', battle.id);

          // Both players found, start battle
          setActiveLiveMatch(battle.id);
          setView('liveGame');
        } else {
          // Reset error count on successful poll
          errorCount = 0;
        }
      }, 1000);

    } catch (error) {
      console.error('Error creating invite:', error);
      alert('Failed to create invite');
    }
  };

  const handleJoinByCode = async () => {
    console.log('[LiveLobby] Join button clicked', { inviteCode, sessionUserId: session?.user?.id });

    if (joinLoading) {
      console.log('[LiveLobby] Already joining, ignoring click');
      return;
    }

    setJoinLoading(true);

    try {
      // Validate invite code locally
      const code = normalizeInvite(inviteCode);
      console.log('[LiveLobby] Normalized code:', code);

      // Simple validation - 6 alphanumeric characters
      const isValidCode = /^[A-Z0-9]{6}$/.test(code);
      console.log('[LiveLobby] Code validation:', { code, isValid: isValidCode });

      if (!isValidCode) {
        alert('Please enter a valid 6-character invite code');
        setJoinLoading(false);
        return;
      }

      if (!session?.user?.id) {
        console.error('[LiveLobby] No session user ID');
        alert('You must be signed in to join a battle');
        setJoinLoading(false);
        return;
      }

      console.debug('[LiveLobby] Joining battle with invite code:', code);

      // Play join sound on user gesture
      safePlayAudio('join-sound');

      // Call the function
      console.log('[LiveLobby] Calling fetchJoinableMatchByInvite...');
      let result;
      try {
        result = await fetchJoinableMatchByInvite(code, session?.user?.id);
      } catch (err) {
        console.error('[LiveLobby] Fetch error:', err);
        alert('Failed to search for battle. Please try again.');
        setJoinLoading(false);
        return;
      }

      const { battle, path, error: findError } = result;
      console.log('[LiveLobby] fetchJoinableMatchByInvite returned:', { battle, path, findError });

      // Add detailed logging for debugging
      console.log('[LiveLobby] Battle lookup result:', {
        inviteCode: code,
        battle,
        path,
        hasBattle: !!battle,
        error: findError
      });

      if (findError) {
        console.error('[LiveLobby] Battle lookup error:', findError);
        alert('Failed to query matches. Check console for details.');
        setJoinLoading(false);
        return;
      }

      if (!battle) {
        console.warn('[LiveLobby] No battle found for code:', code);
        alert('No battle found with that invite code. Please check the code and try again.');
        setJoinLoading(false);
        return;
      }

      // Check if battle already has both players (fully occupied)
      if (battle.player2 && battle.player1 !== session.user.id && battle.player2 !== session.user.id) {
        alert('This battle is already full');
        setJoinLoading(false);
        return;
      }

      // Handle different scenarios
      if (battle.player1 === session.user.id) {
        // User is the inviter - just rejoin the existing battle
        console.log('[LiveLobby] Rejoining battle as inviter');
        // If battle is waiting, check if player2 has joined
        if (battle.status === 'waiting' && battle.player2) {
          // Update to active
          await supabase
            .from('battles')
            .update({ status: 'active' })
            .eq('id', battle.id);
        }
        setActiveLiveMatch(battle.id);
        setView('liveGame');
        setJoinLoading(false);
        return;
      }

      if (battle.player2 === session.user.id) {
        // User is already the joiner - just rejoin the existing battle
        console.log('[LiveLobby] Rejoining battle as joiner');
        setActiveLiveMatch(battle.id);
        setView('liveGame');
        setJoinLoading(false);
        return;
      }

      // New player joining - must be empty player2 slot
      if (battle.player2) {
        alert('This battle is already full');
        setJoinLoading(false);
        return;
      }

      // Join the battle as player2
      console.log('[LiveLobby] Joining battle as player2...');

      // Add a small delay to avoid race conditions
      await new Promise(resolve => setTimeout(resolve, 500));

      // Double-check battle is still available
      const { data: currentBattle } = await supabase
        .from('battles')
        .select('*')
        .eq('id', battle.id)
        .single();

      if (currentBattle?.player2 && currentBattle.player2 !== session.user.id) {
        console.log('[LiveLobby] Battle already has player2');
        alert('This battle was just joined by another player.');
        setJoinLoading(false);
        return;
      }

      // Verify session before update
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        console.error('[LiveLobby] Lost session before join');
        alert('Session expired. Please sign in again.');
        setJoinLoading(false);
        return;
      }

      const { data: updatedBattle, error: updateError } = await supabase
        .from('battles')
        .update({
          player2: session.user.id,
          status: 'active'
        })
        .eq('id', battle.id)
        .is('player2', null)  // Only update if player2 is still null (prevent race conditions)
        .select()
        .single();

      if (updateError) {
        console.error('[LiveLobby] Error joining battle:', updateError);
        if (updateError.code === '406') {
          alert('Not authorized to join this battle. Please check you are signed in.');
        } else if (updateError.code === 'PGRST116') {
          alert('Battle was already joined by another player.');
        } else {
          alert('Failed to join battle. Please try again.');
        }
        setJoinLoading(false);
        return;
      }

      if (!updatedBattle) {
        console.error('[LiveLobby] No battle returned after update');
        alert('Battle was already joined by another player.');
        setJoinLoading(false);
        return;
      }

      console.log('[LiveLobby] Successfully joined battle:', updatedBattle);

      // Add delay before entering to ensure both sides are ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Go to battle immediately
      setActiveLiveMatch(updatedBattle.id);
      setView('liveGame');

    } catch (error) {
      console.error('[LiveLobby] Error in handleJoinByCode:', error);
      alert('Failed to join battle. Please try again.');
    } finally {
      setJoinLoading(false);
    }
  };

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

      <div className="relative z-10">
      {/* Audio element for join sound */}
      <audio id="join-sound" preload="none">
      </audio>
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
                    disabled={!inviteCode.trim() || joinLoading}
                    className="px-6 py-3 bg-green-700 text-white font-medium rounded-md hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
                  >
                    {joinLoading ? 'Joining...' : 'Join'}
                  </button>
                </div>
                {joinLoading && <p className="text-yellow-400 mt-2">Connecting to battle...</p>}
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
                    if (pollIntervalRef.current) {
                      clearInterval(pollIntervalRef.current);
                      pollIntervalRef.current = null;
                    }
                    setMode(null);
                    setGeneratedInvite(null);
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
    </div>
  );
}