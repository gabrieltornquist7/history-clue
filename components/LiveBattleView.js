// components/LiveBattleView.js - MINIMAL WORKING VERSION
"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import dynamic from 'next/dynamic';
import { subscribeToBattle, broadcastBattleEvent } from '../lib/realtimeHelpers';
import GlassBackButton from './GlassBackButton';

// Historical eras with representative years
const historicalEras = [
  { label: 'Ancient', value: -2500, tooltip: '~3000 BCE - 500 CE' },
  { label: 'Classical', value: -300, tooltip: '~800 BCE - 500 CE' },
  { label: 'Medieval', value: 1000, tooltip: '~500 - 1500 CE' },
  { label: 'Renaissance', value: 1450, tooltip: '~1400 - 1600 CE' },
  { label: 'Enlightenment', value: 1700, tooltip: '~1650 - 1800 CE' },
  { label: 'Industrial', value: 1850, tooltip: '~1760 - 1900 CE' },
  { label: 'Modern', value: 1950, tooltip: '~1900 - 2000 CE' },
  { label: 'Contemporary', value: 2010, tooltip: '~2000 - Present' },
];

const Map = dynamic(() => import('./Map'), { ssr: false });

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function LiveBattleView({ session, battleId, setView }) {
  console.log('[LiveBattleView] Rendered with setView:', typeof setView);

  const [battle, setBattle] = useState(null);
  const [puzzle, setPuzzle] = useState(null);
  const [opponent, setOpponent] = useState(null);

  const [connectionStatus, setConnectionStatus] = useState('connecting');
  // Game state
  const [myTimer, setMyTimer] = useState(180);
  const [myClues, setMyClues] = useState([1]);
  const [myScore, setMyScore] = useState(10000);
  const [selectedYear, setSelectedYear] = useState(0);
  const [guessCoords, setGuessCoords] = useState(null);
  const [myGuess, setMyGuess] = useState(null);
  const [oppGuess, setOppGuess] = useState(null);
  const [gameFinished, setGameFinished] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [firstGuessSubmitted, setFirstGuessSubmitted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const timerRef = useRef(null);
  const currentRoundId = useRef(null);

  const CLUE_COSTS = { 1: 0, 2: 1000, 3: 1500, 4: 2000, 5: 3000 };
  const SCORING_POINTS = [5000, 3500, 2500, 1500, 800];

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = null;

    const initializeBattle = async () => {
      try {
        setConnectionStatus('loading');
        console.log('Initializing battle:', battleId);

        // 0. Verify authentication session
        const { data: { session: authSession }, error: authError } = await supabase.auth.getSession();
        if (authError || !authSession) {
          console.error('No active session for RLS queries:', authError);
          setError('Authentication required. Please sign in again.');
          return;
        }
        console.log('Authenticated session verified:', authSession.user.id);

        // 1. Load battle info
        const { data: battleData, error: battleError } = await supabase
          .from('battles')
          .select('*')
          .eq('id', battleId)
          .single();

        if (battleError || !battleData) {
          throw new Error('Battle not found');
        }

        // If battle is waiting and both players present, activate it
        if (battleData.status === 'waiting' && battleData.player1 && battleData.player2) {
          console.log('Activating waiting battle');
          await supabase
            .from('battles')
            .update({ status: 'active' })
            .eq('id', battleId);
          battleData.status = 'active';
        }

        if (!isMounted) return;

        // 2. Load player profiles directly
        try {
          if (battleData.player1) {
            const { data: p1 } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', battleData.player1)
              .single();
            battleData.player1_profile = p1;
          }

          if (battleData.player2) {
            const { data: p2 } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', battleData.player2)
              .single();
            battleData.player2_profile = p2;
          }
        } catch (profileError) {
          console.warn('Could not load profiles, using defaults:', profileError);
          battleData.player1_profile = null;
          battleData.player2_profile = null;
        }

        setBattle(battleData);
        console.log('Battle loaded:', battleData);

        // Set opponent
        const isPlayer1 = session.user.id === battleData.player1;
        const oppProfile = isPlayer1 ? battleData.player2_profile : battleData.player1_profile;
        setOpponent({
          id: isPlayer1 ? battleData.player2 : battleData.player1,
          username: oppProfile?.username || oppProfile?.user_metadata?.username || 'Opponent'
        });

        // Setup realtime subscription
        unsubscribe = subscribeToBattle(battleId, ({ event, payload }) => {
          if (!isMounted) return;

          switch (event) {
            case 'guess_submitted':
              if (payload.playerId !== session.user.id) {
                console.log('Opponent submitted guess:', payload);
                setOppGuess(payload.guess);

                // Check if both players done
                if (myGuess) {
                  console.log('Both players have guessed, showing results');
                  showResults(myGuess, payload.guess);
                }
              }
              break;

            case 'first_guess':
              if (payload.playerId !== session.user.id && !firstGuessSubmitted) {
                console.log('Opponent made first guess, dropping timer to 45s');
                setMyTimer(45);
              }
              break;

            case 'clue_revealed':
              if (payload.playerId !== session.user.id) {
                console.log('Opponent revealed clue:', payload.clueIndex);
              }
              break;

            default:
              console.log('Unknown event:', event, payload);
          }
        });

        // Announce we joined
        setTimeout(() => {
          broadcastBattleEvent(battleId, 'player_joined', { playerId: session.user.id });
        }, 1000);

        setConnectionStatus('connected');

        // 3. Check if there's an active round
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (session.user.id !== battleData.player1 && session.user.id !== battleData.player2) {
          console.error('User not authorized for this battle:', {
            userId: session.user.id,
            battlePlayers: { player1: battleData.player1, player2: battleData.player2 }
          });
          throw new Error('Not authorized to access this battle');
        }

        let { data: existingRound, error: roundError } = await supabase
          .from('battle_rounds')
          .select('*')
          .eq('battle_id', battleId)
          .eq('status', 'active');

        console.log('Active round fetch result:', {
          battleId,
          existingRound,
          roundError,
          sessionUserId: session?.user?.id
        });

        // Handle array response
        if (existingRound && Array.isArray(existingRound)) {
          existingRound = existingRound[0] || null;
        }

        if (roundError) {
          if (roundError.code === '406') {
            console.warn('RLS policy issue with battle_rounds, attempting to create round anyway');
            existingRound = null; // Force creation of new round
          } else if (roundError.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('Error checking for rounds:', roundError);
          }
        }

        // 5. Create round if none exists
        if (!existingRound) {
          console.log('No active round found, creating one...');

          // Get random puzzle
          const { data: puzzles, error: puzzleError } = await supabase
            .from('puzzles')
            .select('id')
            .limit(100);

          if (puzzleError || !puzzles || puzzles.length === 0) {
            throw new Error('No puzzles available');
          }

          const randomPuzzle = puzzles[Math.floor(Math.random() * puzzles.length)];

          const authSession = await supabase.auth.getSession();
          console.log('DEBUG session before battle_rounds insert (initial):', authSession?.data?.session?.user?.id);
          console.log('Battle data for context:', { battleId, player1: battleData.player1, player2: battleData.player2 });

          const { data: newRound, error: createError } = await supabase
            .from('battle_rounds')
            .insert({
              battle_id: battleId,
              round_no: 1,
              puzzle_id: randomPuzzle.id,
              status: 'active',
              started_at: new Date().toISOString()
            })
            .select('*')
            .single();

          console.log('Creating new round:', { newRound, createError });

          if (createError) {
            console.error('Error creating round:', createError);

            if (createError.code === '406') {
              console.error('406 Not Acceptable - RLS authorization failed:', {
                userId: session?.user?.id,
                battleId: battleId,
                battlePlayers: { player1: battleData.player1, player2: battleData.player2 },
                userAuthorized: session?.user?.id === battleData.player1 || session?.user?.id === battleData.player2,
                message: 'Current session user is not authorized by RLS policy'
              });
            } else if (createError.code === '400') {
              console.error('400 Bad Request - Invalid insert payload:', {
                payload: {
                  battle_id: battleId,
                  round_no: 1,
                  puzzle_id: randomPuzzle.id,
                  status: 'active',
                  started_at: new Date().toISOString()
                },
                message: 'Insert call has missing/invalid payload'
              });
            }
            throw new Error('Failed to create round');
          }

          existingRound = newRound;
          console.log('Created new round:', newRound);
        }

        if (!isMounted) return;

        currentRoundId.current = existingRound.id;
        setCurrentRound(existingRound);

        // 6. Load puzzle
        const { data: puzzleData, error: puzzleError } = await supabase
          .from('puzzles')
          .select('*, puzzle_translations(*)')
          .eq('id', existingRound.puzzle_id)
          .single();

        if (puzzleError || !puzzleData) {
          throw new Error('Failed to load puzzle');
        }

        if (!isMounted) return;

        setPuzzle(puzzleData);
        console.log('Puzzle loaded:', puzzleData.id);


        setLoading(false);
        startTimer();

      } catch (err) {
        setConnectionStatus('error');
        console.error('Error initializing battle:', err);
        // Show more specific error messages
        if (err.message.includes('Cannot access')) {
          console.error('Initialization error - likely a code loading issue');
          // Try to recover by refreshing once
          if (!window.hasReloaded) {
            window.hasReloaded = true;
            window.location.reload();
          }
        }
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    initializeBattle();

    return () => {
      isMounted = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (unsubscribe) unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleId, session.user.id]); // Dependencies intentionally limited to prevent unnecessary re-initialization

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setMyTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!myGuess) {
            handleAutoSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRevealClue = async (clueIndex) => {
    if (myClues.includes(clueIndex) || myScore < CLUE_COSTS[clueIndex] || myGuess) return;

    const cost = CLUE_COSTS[clueIndex];
    const newScore = myScore - cost;

    setMyScore(newScore);
    setMyClues(prev => [...prev, clueIndex].sort());

    // Save move to database
    await supabase.from('battle_moves').insert({
      round_id: currentRoundId.current,
      player: session.user.id,
      action: 'reveal_clue',
      payload: { clue_index: clueIndex }
    });

    // Broadcast to opponent
    broadcastBattleEvent(battleId, 'clue_revealed', {
      playerId: session.user.id,
      clueIndex
    });
  };

  const handleMapGuess = (latlng) => {
    if (myGuess) return;
    setGuessCoords(latlng);
  };

  const handleYearChange = (newYear) => {
    if (myGuess) return;
    const year = Math.max(-3000, Math.min(2025, parseInt(newYear) || 0));
    setSelectedYear(year);
  };

  const handleAutoSubmit = () => {
    if (myGuess) return;
    handleGuessSubmit(true);
  };

  const handleGuessSubmit = async (isAutoSubmit = false) => {
    if (myGuess) return;

    const coords = isAutoSubmit ? { lat: 0, lng: 0 } : guessCoords;
    if (!coords && !isAutoSubmit) {
      alert('Please place a pin on the map');
      return;
    }

    const distance = getDistance(
      coords.lat,
      coords.lng,
      parseFloat(puzzle.latitude),
      parseFloat(puzzle.longitude)
    );

    const clueCount = myClues.length;
    const baseScore = SCORING_POINTS[clueCount - 1] || 0;
    const distancePenalty = Math.min(baseScore * 0.5, (distance / 1000) * 10);
    const yearDiff = Math.abs(selectedYear - puzzle.year);
    const timePenalty = Math.min(baseScore * 0.3, yearDiff * 5);

    let finalScore = Math.max(0, baseScore - distancePenalty - timePenalty);
    if (distance < 50) finalScore += Math.min(1000, baseScore * 0.2);

    finalScore = Math.round(finalScore);

    const guessData = {
      lat: coords.lat,
      lng: coords.lng,
      year: selectedYear,
      score: finalScore,
      distance: Math.round(distance),
      completed_at: new Date().toISOString()
    };

    setMyGuess(guessData);

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Save guess to database
    await supabase.from('battle_moves').insert({
      round_id: currentRoundId.current,
      player: session.user.id,
      action: 'guess',
      payload: guessData
    });

    // Update battle_rounds with completion timestamp
    const isPlayer1 = session.user.id === battle.player1;
    const completionField = isPlayer1 ? 'player1_completed_at' : 'player2_completed_at';

    // Debug session before update
    const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
    console.log('DEBUG user:', currentSession?.user?.id, 'battle:', {
      id: battle.id,
      player1: battle.player1,
      player2: battle.player2,
      userIsPlayer1: currentSession?.user?.id === battle.player1,
      userIsPlayer2: currentSession?.user?.id === battle.player2,
      userIsAuthorized: currentSession?.user?.id === battle.player1 || currentSession?.user?.id === battle.player2,
      sessionError,
      isPlayer1,
      completionField,
      roundId: currentRoundId.current
    });

    if (!currentSession?.user?.id) {
      console.error('No authenticated session for completion update');
      return;
    }

    const updatePayload = {
      [completionField]: new Date().toISOString()
    };

    console.log('Round update attempt:', {
      roundId: currentRoundId.current,
      payload: updatePayload,
      conditions: { id: currentRoundId.current }
    });

    const { error: completionError } = await supabase
      .from('battle_rounds')
      .update(updatePayload)
      .eq('id', currentRoundId.current);

    console.log('Update error:', completionError);
    console.log('Completion update result:', {
      currentRoundId: currentRoundId.current,
      completionField,
      completionError,
      errorCode: completionError?.code,
      errorMessage: completionError?.message
    });

    if (completionError) {
      console.error('Error updating completion timestamp:', completionError);

      if (completionError.code === '406') {
        console.error('406 Not Acceptable - RLS authorization failed:', {
          userId: currentSession?.user?.id,
          battlePlayers: { player1: battle.player1, player2: battle.player2 },
          userAuthorized: currentSession?.user?.id === battle.player1 || currentSession?.user?.id === battle.player2,
          message: 'Current session user is not authorized by RLS policy'
        });
      } else if (completionError.code === '400') {
        console.error('400 Bad Request - Invalid update payload:', {
          payload: updatePayload,
          conditions: { id: currentRoundId.current },
          message: 'Update call has missing/invalid payload or conditions'
        });
      }
    }

    // Broadcast first guess if needed
    if (!firstGuessSubmitted && !oppGuess) {
      broadcastBattleEvent(battleId, 'first_guess', {
        playerId: session.user.id
      });
      setFirstGuessSubmitted(true);
    }

    // Broadcast the guess
    broadcastBattleEvent(battleId, 'guess_submitted', {
      playerId: session.user.id,
      guess: guessData
    });

    // Check if opponent already finished
    if (oppGuess) {
      console.log('Opponent already guessed, showing results');
      showResults(guessData, oppGuess);
    }
  };

  const showResults = (myGuessData, oppGuessData) => {
    console.log('Showing results:', { myGuessData, oppGuessData });

    const myFinalScore = myGuessData.score || 0;
    const oppFinalScore = oppGuessData.score || 0;

    setRoundResult({
      myScore: myFinalScore,
      oppScore: oppFinalScore,
      winner: myFinalScore > oppFinalScore ? 'me' :
              myFinalScore < oppFinalScore ? 'opponent' : 'tie'
    });
    setGameFinished(true);

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const handleRoundUpdate = (round) => {
    if (!round) return;

    console.log('Processing round update:', round);
    setCurrentRound(round);

    // Check if both players have completed (using completion timestamps)
    const bothCompleted = round.player1_completed_at && round.player2_completed_at;

    if (bothCompleted && round.status === 'active') {
      console.log('Both players have completed, finishing round and starting next');

      // Mark current round as finished (only one client should do this)
      const finishRound = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          console.log('DEBUG user:', session?.user?.id, 'battle:', {
            id: round.battle_id,
            roundId: round.id,
            status: round.status,
            userIsAuthenticated: !!session?.user?.id
          });

          if (!session?.user?.id) {
            console.error('No authenticated session for round finish update');
            return;
          }

          const updatePayload = {
            status: 'finished',
            finished_at: new Date().toISOString()
          };

          console.log('Round update attempt:', {
            roundId: round.id,
            payload: updatePayload,
            conditions: { id: round.id, status: 'active' }
          });

          const { error: finishError } = await supabase
            .from('battle_rounds')
            .update(updatePayload)
            .eq('id', round.id)
            .eq('status', 'active'); // Only update if still active (prevents race conditions)

          console.log('Update error:', finishError);
          console.log('Finishing round result:', { roundId: round.id, success: !finishError, error: finishError });

          if (finishError) {
            console.error('Error finishing round:', finishError);

            if (finishError.code === '406') {
              console.error('406 Not Acceptable - RLS authorization failed:', {
                userId: session?.user?.id,
                roundId: round.id,
                battleId: round.battle_id,
                message: 'Current session user is not authorized by RLS policy'
              });
            } else if (finishError.code === '400') {
              console.error('400 Bad Request - Invalid update payload:', {
                payload: updatePayload,
                conditions: { id: round.id, status: 'active' },
                message: 'Update call has missing/invalid payload or conditions'
              });
            }
            return;
          }

          // Create next round after a short delay
          setTimeout(async () => {
            try {
              // Get random puzzle for next round
              const { data: puzzles, error: puzzleError } = await supabase
                .from('puzzles')
                .select('id')
                .limit(100);

              if (puzzleError || !puzzles || puzzles.length === 0) {
                console.error('Failed to get puzzles for next round');
                return;
              }

              const randomPuzzle = puzzles[Math.floor(Math.random() * puzzles.length)];

              const authSession = await supabase.auth.getSession();
              console.log('DEBUG session before battle_rounds insert (next round):', authSession?.data?.session?.user?.id);
              console.log('Round data for context:', { battleId: round.battle_id, nextRoundNo: (round.round_no || 1) + 1 });

              const { data: newRound, error: createError } = await supabase
                .from('battle_rounds')
                .insert({
                  battle_id: round.battle_id,
                  round_no: (round.round_no || 1) + 1,
                  puzzle_id: randomPuzzle.id,
                  status: 'active',
                  started_at: new Date().toISOString(),
                  player1_completed_at: null,
                  player2_completed_at: null
                })
                .select('*')
                .single();

              console.log('Creating next round:', { newRound, createError });

              if (createError) {
                console.error('Error creating next round:', createError);

                if (createError.code === '406') {
                  console.error('406 Not Acceptable - RLS authorization failed:', {
                    userId: authSession?.data?.session?.user?.id,
                    battleId: round.battle_id,
                    message: 'Current session user is not authorized by RLS policy'
                  });
                } else if (createError.code === '400') {
                  console.error('400 Bad Request - Invalid insert payload:', {
                    payload: {
                      battle_id: round.battle_id,
                      round_no: (round.round_no || 1) + 1,
                      puzzle_id: randomPuzzle.id,
                      status: 'active',
                      started_at: new Date().toISOString(),
                      player1_completed_at: null,
                      player2_completed_at: null
                    },
                    message: 'Insert call has missing/invalid payload'
                  });
                }
                return;
              }

              console.log('Created next round:', newRound);

            } catch (err) {
              console.error('Error setting up next round:', err);
            }
          }, 3000); // 3 second delay to show results

        } catch (err) {
          console.error('Error finishing round:', err);
        }
      };

      finishRound();
    }

    // If this is a new active round, reset game state
    if (round.status === 'active' && round.id !== currentRoundId.current) {
      console.log('New active round detected, resetting game state');

      currentRoundId.current = round.id;
      setMyTimer(180);
      setMyClues([1]);
      setMyScore(10000);
      setMyGuess(null);
      setOppGuess(null);
      setGuessCoords(null);
      setSelectedYear(0);
      setGameFinished(false);
      setRoundResult(null);
      setFirstGuessSubmitted(false);

      // Load new puzzle
      const loadNewPuzzle = async () => {
        try {
          const { data: newPuzzleData, error: newPuzzleError } = await supabase
            .from('puzzles')
            .select('*, puzzle_translations(*)')
            .eq('id', round.puzzle_id)
            .single();

          if (!newPuzzleError && newPuzzleData) {
            setPuzzle(newPuzzleData);
            console.log('Loaded new puzzle for round', round.round_no);
          }

          // Restart timer
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          startTimer();

        } catch (err) {
          console.error('Error loading new puzzle:', err);
        }
      };

      loadNewPuzzle();
    }
  };

  const getClueText = (clueNumber) => {
    return puzzle?.puzzle_translations?.[0]?.[`clue_${clueNumber}_text`];
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const displayYear = (year) => {
    const yearNum = Number(year);
    if (yearNum < 0) return `${Math.abs(yearNum)} BCE`;
    if (yearNum === 0) return `Year 0`;
    return `${yearNum} CE`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl">Connecting to Battle...</div>
          <div className="text-sm text-gray-400 mt-2">Status: {connectionStatus}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Error: {error}</div>
          <button 
            onClick={() => setView('menu')}
            className="px-6 py-3 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative text-white"
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
      <GlassBackButton
        onClick={() => {
          console.log('[LiveBattleView] Back button clicked');
          if (setView && typeof setView === 'function') {
            setView('menu');
          } else {
            console.error('[LiveBattleView] setView is not a function:', setView);
          }
        }}
        fallbackUrl="/"
      />

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-center flex-1">
            <h1 className="text-2xl font-serif font-bold text-yellow-400">Live Battle</h1>
            <p className="text-sm text-gray-300">vs {opponent?.username || 'Loading...'}</p>
          </div>

          <div className="text-right">
            {/* Invite Code Display */}
            {battle?.invite_code && (
              <div className="mb-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Invite Code</p>
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-mono font-bold text-yellow-400 px-2 py-1 bg-black/30 rounded border border-yellow-500/30"
                    style={{ textShadow: '0 0 10px rgba(212, 175, 55, 0.3)' }}
                  >
                    {battle.invite_code}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(battle.invite_code);
                      // Optional: Add a temporary "Copied!" feedback
                    }}
                    className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                    title="Copy invite code"
                  >
                    📋
                  </button>
                </div>
              </div>
            )}

            {/* Timer */}
            <div className="text-center">
              <p className="text-sm text-gray-400">Your Timer</p>
              <p className={`text-2xl font-bold ${myTimer <= 30 ? 'text-red-400' : 'text-white'}`}>
                {formatTime(myTimer)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Panel - Clues */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-yellow-400">Clues</h2>
              {[1, 2, 3, 4, 5].map((num) => {
                const isUnlocked = myClues.includes(num);
                const clueText = getClueText(num);
                
                return (
                  <div 
                    key={num}
                    className={`bg-gray-800 rounded-lg border-2 p-4 ${
                      isUnlocked ? 'border-yellow-500' : 'border-gray-600'
                    }`}
                  >
                    {isUnlocked ? (
                      <div>
                        <div className="text-yellow-400 font-bold mb-2">Clue {num}</div>
                        <p className="text-gray-300">{clueText}</p>
                      </div>
                    ) : (
                      <button 
                        className="w-full text-left hover:bg-gray-700 p-2 rounded"
                        onClick={() => handleRevealClue(num)}
                        disabled={myScore < CLUE_COSTS[num] || !!myGuess}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">🔒 Unlock Clue {num}</span>
                          <span className="text-yellow-500 font-bold">
                            {CLUE_COSTS[num]}
                          </span>
                        </div>
                      </button>
                    )}
                  </div>
                );
              })}
              
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                <div className="text-center">
                  <p className="text-sm text-gray-400">Potential Score</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {myScore.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Center - Map and Controls */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-yellow-400">Map</h2>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="h-64 sm:h-80 rounded-lg overflow-hidden border border-gray-600">
                  <Map onGuess={handleMapGuess} />
                </div>
              </div>
              
              {/* Year Selector */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-2">Year Guess</h3>
                <div className="flex items-center gap-3 mb-2">
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => handleYearChange(e.target.value)}
                    disabled={!!myGuess}
                    min="-1000"
                    max="2025"
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-center text-yellow-400 font-bold disabled:opacity-50"
                  />
                  <button
                    onClick={() => handleYearChange(selectedYear + 10)}
                    disabled={!!myGuess}
                    className="px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50"
                  >
                    +10
                  </button>
                  <button
                    onClick={() => handleYearChange(selectedYear - 10)}
                    disabled={!!myGuess}
                    className="px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50"
                  >
                    -10
                  </button>
                </div>

                {/* Historical Era Quick Jump */}
                <div className="space-y-2 mt-3">
                  <div className="text-xs text-gray-400 text-center font-medium uppercase tracking-wide">
                    Jump to Era
                  </div>

                  {/* Desktop: Era buttons in compact grid */}
                  <div className="hidden sm:block">
                    <div className="grid grid-cols-4 gap-1 mb-1">
                      {historicalEras.slice(0, 4).map((era) => (
                        <button
                          key={era.label}
                          onClick={() => handleYearChange(era.value)}
                          disabled={!!myGuess}
                          title={era.tooltip}
                          className="relative px-1 py-1 text-xs font-medium rounded transition-all duration-300 group disabled:opacity-50"
                          style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            color: Math.abs(selectedYear - era.value) < 100 ? '#d4af37' : '#9ca3af',
                            border: '1px solid',
                            borderColor: Math.abs(selectedYear - era.value) < 100
                              ? 'rgba(212, 175, 55, 0.5)'
                              : 'rgba(156, 163, 175, 0.15)',
                          }}
                          onMouseEnter={(e) => {
                            if (!myGuess) {
                              e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.7)';
                              e.currentTarget.style.color = '#d4af37';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = Math.abs(selectedYear - era.value) < 100
                              ? 'rgba(212, 175, 55, 0.5)'
                              : 'rgba(156, 163, 175, 0.15)';
                            e.currentTarget.style.color = Math.abs(selectedYear - era.value) < 100 ? '#d4af37' : '#9ca3af';
                          }}
                        >
                          {era.label}

                          {/* Tooltip on hover */}
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-black/90 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
                            {era.tooltip}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {historicalEras.slice(4).map((era) => (
                        <button
                          key={era.label}
                          onClick={() => handleYearChange(era.value)}
                          disabled={!!myGuess}
                          title={era.tooltip}
                          className="relative px-1 py-1 text-xs font-medium rounded transition-all duration-300 group disabled:opacity-50"
                          style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            color: Math.abs(selectedYear - era.value) < 100 ? '#d4af37' : '#9ca3af',
                            border: '1px solid',
                            borderColor: Math.abs(selectedYear - era.value) < 100
                              ? 'rgba(212, 175, 55, 0.5)'
                              : 'rgba(156, 163, 175, 0.15)',
                          }}
                          onMouseEnter={(e) => {
                            if (!myGuess) {
                              e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.7)';
                              e.currentTarget.style.color = '#d4af37';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = Math.abs(selectedYear - era.value) < 100
                              ? 'rgba(212, 175, 55, 0.5)'
                              : 'rgba(156, 163, 175, 0.15)';
                            e.currentTarget.style.color = Math.abs(selectedYear - era.value) < 100 ? '#d4af37' : '#9ca3af';
                          }}
                        >
                          {era.label}

                          {/* Tooltip on hover */}
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-black/90 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
                            {era.tooltip}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mobile: Dropdown selector */}
                  <div className="sm:hidden">
                    <select
                      onChange={(e) => handleYearChange(Number(e.target.value))}
                      value={selectedYear}
                      disabled={!!myGuess}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm disabled:opacity-50"
                    >
                      <option value={selectedYear}>Jump to Era...</option>
                      {historicalEras.map(era => (
                        <option key={era.label} value={era.value}>
                          {era.label} ({era.tooltip})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-center mt-3">
                  <span className="text-lg font-bold text-yellow-400">
                    {displayYear(selectedYear)}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button 
                onClick={() => handleGuessSubmit()}
                disabled={!guessCoords || !!myGuess}
                className="w-full px-6 py-3 bg-red-700 text-white font-bold rounded hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {!guessCoords ? 'Place Pin on Map' : myGuess ? 'Guess Submitted' : 'Submit Guess'}
              </button>
            </div>

            {/* Right Panel - Status */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-yellow-400">Battle Status</h2>
              
              {myGuess ? (
                <div className="bg-green-800 rounded-lg p-4 border border-green-500">
                  <h3 className="font-bold text-green-400 mb-2">Your Result</h3>
                  <p>Score: <span className="font-bold">{myGuess.score.toLocaleString()}</span></p>
                  <p>Distance: <span className="font-bold">{myGuess.distance}km</span></p>
                  {!oppGuess && (
                    <div className="mt-2">
                      <div className="text-yellow-400">Waiting for opponent...</div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                        <div className="bg-yellow-400 h-2 rounded-full animate-pulse" style={{width: '50%'}}></div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                  <p className="text-gray-300">Make your guess before time runs out!</p>
                </div>
              )}

              {oppGuess && (
                <div className="bg-blue-800 rounded-lg p-4 border border-blue-500">
                  <h3 className="font-bold text-blue-400 mb-2">Opponent Result</h3>
                  <p>Score: <span className="font-bold">{oppGuess.score.toLocaleString()}</span></p>
                  <p>Distance: <span className="font-bold">{oppGuess.distance}km</span></p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Modal */}
      {gameFinished && roundResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full text-center border-2 border-yellow-500">
            <h3 className="text-2xl font-serif font-bold text-yellow-400 mb-6">
              Round Complete!
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className={`text-3xl font-bold ${
                roundResult.winner === 'me' ? 'text-green-400' : 
                roundResult.winner === 'opponent' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {roundResult.winner === 'me' ? '🏆 You Win!' : 
                 roundResult.winner === 'opponent' ? '💔 You Lose' : '🤝 It\'s a Tie!'}
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span>Your Score:</span>
                  <span className="font-bold">{roundResult.myScore.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Opponent Score:</span>
                  <span className="font-bold">{roundResult.oppScore.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-green-400">
                <p className="font-bold">Answer: {puzzle?.city_name}</p>
                <p>{displayYear(puzzle?.year)}</p>
              </div>
            </div>

            <button
              onClick={() => setView('menu')}
              className="w-full px-6 py-3 bg-red-700 text-white font-bold rounded hover:bg-red-600"
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}