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

// Continent center coordinates for quick navigation
const CONTINENTS = [
  { label: 'N.America', lat: 45.0, lng: -100.0 },
  { label: 'S.America', lat: -15.0, lng: -60.0 },
  { label: 'Europe', lat: 50.0, lng: 10.0 },
  { label: 'Africa', lat: 0.0, lng: 20.0 },
  { label: 'Asia', lat: 35.0, lng: 90.0 },
  { label: 'Oceania', lat: -25.0, lng: 135.0 },
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

  // Separate loading states for better error handling
  const [loadingStates, setLoadingStates] = useState({
    battle: true,
    currentRound: true,
    puzzle: true,
    opponent: true
  });

  // Game data with proper null initialization
  const [gameData, setGameData] = useState({
    battle: null,
    currentRound: null,
    puzzle: null,
    opponent: null
  });

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
  const [firstGuessSubmitted, setFirstGuessSubmitted] = useState(false);

  // Battle state for 3-round system
  const [battleState, setBattleState] = useState({
    totalRounds: 3,
    currentRoundNum: 1,
    myTotalScore: 0,
    oppTotalScore: 0,
    roundScores: [],
    battleFinished: false,
    battleWinner: null
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Server-synced timer state
  const [serverRoundStartTime, setServerRoundStartTime] = useState(null);
  const [battleGameState, setBattleGameState] = useState('waiting'); // waiting, ready, active, round_complete, transitioning, completed

  const timerRef = useRef(null);
  const currentRoundId = useRef(null);

  const CLUE_COSTS = { 1: 0, 2: 1000, 3: 1500, 4: 2000, 5: 3000 };
  const SCORING_POINTS = [5000, 3500, 2500, 1500, 800];

  // Server-synced timer calculation
  const calculateTimeRemaining = (roundStartedAt) => {
    if (!roundStartedAt) return 180;
    const now = new Date();
    const started = new Date(roundStartedAt);
    const elapsed = Math.floor((now - started) / 1000);
    const remaining = Math.max(0, 180 - elapsed); // 180 seconds = 3 minutes
    return remaining;
  };

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

        // 1. Load battle info with null safety
        const { data: battleData, error: battleError } = await supabase
          .from('battles')
          .select('*')
          .eq('id', battleId)
          .single();

        if (battleError || !battleData) {
          console.error('Failed to load battle:', battleError);
          setError('Battle not found');
          return;
        }

        // Safely update battle data
        setGameData(prev => ({ ...prev, battle: battleData }));
        setLoadingStates(prev => ({ ...prev, battle: false }));
        console.log('Battle data loaded:', battleData.id);

        // If battle is waiting and both players present, mark as ready
        if (battleData.status === 'waiting' && battleData.player1 && battleData.player2) {
          console.log('Both players present, marking battle as ready');
          await supabase
            .from('battles')
            .update({ status: 'ready' })
            .eq('id', battleId);
          battleData.status = 'ready';
        }

        if (!isMounted) return;

        // 2. Load player profiles with null safety
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

        // Set opponent with null safety
        const isPlayer1 = session.user.id === battleData.player1;
        const oppProfile = isPlayer1 ? battleData.player2_profile : battleData.player1_profile;
        const opponentData = {
          id: isPlayer1 ? battleData.player2 : battleData.player1,
          username: oppProfile?.username || oppProfile?.user_metadata?.username || 'Opponent'
        };

        setGameData(prev => ({ ...prev, opponent: opponentData }));
        setLoadingStates(prev => ({ ...prev, opponent: false }));
        console.log('Opponent loaded:', opponentData.username);

        // Setup realtime subscription
        unsubscribe = subscribeToBattle(battleId, ({ event, payload }) => {
          if (!isMounted) return;

          switch (event) {
            case 'guess_submitted':
              if (payload.playerId !== session.user.id) {
                setOppGuess(payload.guess);
                // Check if both players done
                if (myGuess) {
                  showResults(myGuess, payload.guess);
                }
              }
              break;

            case 'first_guess':
              if (payload.playerId !== session.user.id && !firstGuessSubmitted) {
                // Opponent made first guess, reduce remaining time to 45s max
                setMyTimer(prev => Math.min(prev, 45));
              }
              break;

            case 'clue_revealed':
              // Just for logging opponent moves, no action needed
              break;

            case 'battle_complete':
              if (payload.playerId !== session.user.id) {
                setBattleState(prev => ({ ...prev, battleFinished: true }));
              }
              break;

            case 'round_started':
              // New round started with server timestamp
              if (payload.roundStartTime) {
                setServerRoundStartTime(payload.roundStartTime);
                setBattleGameState('active');
              }
              break;

            case 'round_transition':
              // Load new round data
              setTimeout(async () => {
                try {
                  const { data: newRound } = await supabase
                    .from('battle_rounds')
                    .select('*')
                    .eq('id', payload.newRoundId)
                    .single();

                  if (newRound) {
                    handleRoundUpdate(newRound);
                  }
                } catch (err) {
                  console.error('Error fetching new round:', err);
                  window.location.reload();
                }
              }, 1000);
              break;

            case 'battle_state_change':
              setBattleGameState(payload.newState);
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

        // 5. Create round if none exists and battle is ready (only Player 1)
        if (!existingRound && battleData.status === 'ready') {
          console.log('No active round found and battle is ready');

          // Only Player 1 creates rounds
          if (session.user.id !== battleData.player1) {
            console.log('Player 2 waiting for Player 1 to create round...');
            setLoadingStates(prev => ({ ...prev, currentRound: true }));
            return; // Exit and wait for round creation broadcast
          }

          console.log('Player 1 creating initial round...');

          // Mark battle as active now that we're starting the game
          await supabase
            .from('battles')
            .update({ status: 'active' })
            .eq('id', battleId);

          // Get random puzzle with null safety
          const { data: puzzles, error: puzzleError } = await supabase
            .from('puzzles')
            .select('*') // Get full puzzle data for immediate use
            .limit(100);

          if (puzzleError) {
            console.error('Puzzle query error:', puzzleError);
            throw new Error('Failed to load puzzles');
          }

          if (!puzzles || puzzles.length === 0) {
            console.error('No puzzles found in database');
            throw new Error('No puzzles available - database may be empty');
          }

          const randomPuzzle = puzzles[Math.floor(Math.random() * puzzles.length)];

          if (!randomPuzzle || !randomPuzzle.id) {
            throw new Error('Invalid puzzle data');
          }

          const initialRoundStartTime = new Date().toISOString();
          const { data: newRound, error: createError } = await supabase
            .from('battle_rounds')
            .insert({
              battle_id: battleId,
              round_no: 1,
              puzzle_id: randomPuzzle.id,
              status: 'active',
              started_at: initialRoundStartTime
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

          // Set puzzle data immediately from creation
          setGameData(prev => ({ ...prev, puzzle: randomPuzzle }));
          setLoadingStates(prev => ({ ...prev, puzzle: false }));

          // Broadcast initial round start
          setTimeout(() => {
            broadcastBattleEvent(battleId, 'round_started', {
              newRoundId: newRound.id,
              roundNumber: 1,
              roundStartTime: initialRoundStartTime
            });
          }, 1000);
        }

        if (!isMounted) return;

        // Handle existing round data
        if (existingRound) {
          currentRoundId.current = existingRound.id;
          setGameData(prev => ({ ...prev, currentRound: existingRound }));
          setLoadingStates(prev => ({ ...prev, currentRound: false }));

          // Set server round start time for timer sync
          if (existingRound.started_at) {
            setServerRoundStartTime(existingRound.started_at);
            setBattleGameState('active');
          }

        } else if (battleData.status === 'ready') {
          // Battle is ready but no round exists yet - show waiting state
          setBattleGameState('ready');
          console.log('Battle ready, waiting for round to be created...');
          return;
        }

        // 6. Load puzzle if not already loaded
        if (existingRound && (!gameData.puzzle || gameData.puzzle.id !== existingRound.puzzle_id)) {
          console.log('Loading puzzle for existing round:', existingRound.puzzle_id);

          const { data: puzzleData, error: puzzleError } = await supabase
            .from('puzzles')
            .select('*, puzzle_translations(*)')
            .eq('id', existingRound.puzzle_id)
            .single();

          if (puzzleError || !puzzleData) {
            console.error('Failed to load puzzle:', puzzleError);
            setError('Failed to load puzzle data');
            return;
          }

          if (isMounted) {
            setGameData(prev => ({ ...prev, puzzle: puzzleData }));
            setLoadingStates(prev => ({ ...prev, puzzle: false }));
            console.log('Puzzle loaded:', puzzleData.id);
          }
        }

        setLoading(false);

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

  // Timer synchronization effect - starts timer when server time is available
  useEffect(() => {
    const initTimer = () => {
      if (!serverRoundStartTime) {
        console.warn('No server round start time available');
        return;
      }

      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Immediately sync timer with server time
      const remaining = calculateTimeRemaining(serverRoundStartTime);
      setMyTimer(remaining);

      // Update timer every second based on server timestamp
      timerRef.current = setInterval(() => {
        const newRemaining = calculateTimeRemaining(serverRoundStartTime);
        setMyTimer(newRemaining);

        if (newRemaining <= 0) {
          clearInterval(timerRef.current);
          if (!myGuess) {
            handleAutoSubmit();
          }
        }
      }, 1000);
    };

    if (serverRoundStartTime && battleGameState === 'active') {
      initTimer();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [serverRoundStartTime, battleGameState, myGuess]); // Added myGuess to dependencies


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
      parseFloat(gameData.puzzle?.latitude || 0),
      parseFloat(gameData.puzzle?.longitude || 0)
    );

    const clueCount = myClues.length;
    const baseScore = SCORING_POINTS[clueCount - 1] || 0;
    const distancePenalty = Math.min(baseScore * 0.5, (distance / 1000) * 10);
    const yearDiff = Math.abs(selectedYear - (gameData.puzzle?.year || 0));
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

    const myRoundScore = myGuessData.score || 0;
    const oppRoundScore = oppGuessData.score || 0;
    const currentRoundNum = currentRound?.round_no || 1;

    // Update battle state with round results
    setBattleState(prev => {
      const newMyTotal = prev.myTotalScore + myRoundScore;
      const newOppTotal = prev.oppTotalScore + oppRoundScore;
      const newRoundScores = [...prev.roundScores, {
        round: currentRoundNum,
        myScore: myRoundScore,
        oppScore: oppRoundScore,
        winner: myRoundScore > oppRoundScore ? 'me' :
               myRoundScore < oppRoundScore ? 'opponent' : 'tie'
      }];

      const isFinalRound = currentRoundNum >= 3;
      const battleWinner = isFinalRound ?
        (newMyTotal > newOppTotal ? 'me' :
         newMyTotal < newOppTotal ? 'opponent' : 'tie') : null;

      return {
        ...prev,
        myTotalScore: newMyTotal,
        oppTotalScore: newOppTotal,
        roundScores: newRoundScores,
        battleFinished: isFinalRound,
        battleWinner: battleWinner
      };
    });

    setRoundResult({
      myScore: myRoundScore,
      oppScore: oppRoundScore,
      winner: myRoundScore > oppRoundScore ? 'me' :
              myRoundScore < oppRoundScore ? 'opponent' : 'tie',
      roundNumber: currentRoundNum
    });
    setGameFinished(true);

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // If this was round 3, broadcast battle completion
    if (currentRoundNum >= 3) {
      broadcastBattleEvent(battleId, 'battle_complete', {
        playerId: session.user.id
      });
    }
  };

  const handleRoundUpdate = (round) => {
    if (!round) return;

    console.log('Processing round update:', round);
    setGameData(prev => ({ ...prev, currentRound: round }));

    // Check if both players have completed (using completion timestamps)
    const bothCompleted = round.player1_completed_at && round.player2_completed_at;

    if (bothCompleted && round.status === 'active') {
      console.log('Both players have completed, finishing round and starting next');

      // Mark current round as finished (only player1/battle creator should do this)
      const finishRound = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          console.log('DEBUG user:', session?.user?.id, 'battle:', {
            id: round.battle_id,
            roundId: round.id,
            status: round.status,
            userIsAuthenticated: !!session?.user?.id,
            isPlayer1: session?.user?.id === battle?.player1,
            battlePlayer1: battle?.player1
          });

          if (!session?.user?.id) {
            console.error('No authenticated session for round finish update');
            return;
          }

          // CRITICAL: Only player1 (battle creator) should manage round transitions
          // This prevents race conditions and 409 conflicts
          if (session.user.id !== gameData.battle?.player1) {
            console.log('Only player1 manages round transitions, skipping...');
            return;
          }

          console.log('Player1 managing round transition...');

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

          // Only create next round if we haven't reached round 3
          const nextRoundNo = (round.round_no || 1) + 1;
          if (nextRoundNo <= 3) {
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
                console.log('Round data for context:', { battleId: round.battle_id, nextRoundNo });

                // Check if round already exists (prevent 409 conflicts)
                const { data: existingNextRound } = await supabase
                  .from('battle_rounds')
                  .select('*')
                  .eq('battle_id', round.battle_id)
                  .eq('round_no', nextRoundNo)
                  .single();

                if (existingNextRound) {
                  console.log('Next round already exists, broadcasting transition...');
                  // Broadcast round transition to notify all players
                  setTimeout(() => {
                    broadcastBattleEvent(round.battle_id, 'round_transition', {
                      newRoundId: existingNextRound.id,
                      roundNumber: nextRoundNo
                    });
                  }, 500);
                  return;
                }

                const roundStartTime = new Date().toISOString();
                const { data: newRound, error: createError } = await supabase
                  .from('battle_rounds')
                  .insert({
                    battle_id: round.battle_id,
                    round_no: nextRoundNo,
                    puzzle_id: randomPuzzle.id,
                    status: 'active',
                    started_at: roundStartTime,
                    player1_completed_at: null,
                    player2_completed_at: null
                  })
                  .select('*')
                  .single();

              console.log('Creating next round:', { newRound, createError });

              if (createError) {
                if (createError.code === '23505') {
                  // Unique constraint violation - round already exists
                  console.log('Round already created by race condition, fetching existing...');
                  const { data: existing } = await supabase
                    .from('battle_rounds')
                    .select('*')
                    .eq('battle_id', round.battle_id)
                    .eq('round_no', nextRoundNo)
                    .single();

                  if (existing) {
                    console.log('Found existing round:', existing.id);
                    // Broadcast round transition
                    setTimeout(() => {
                      broadcastBattleEvent(round.battle_id, 'round_transition', {
                        newRoundId: existing.id,
                        roundNumber: nextRoundNo
                      });
                    }, 500);
                  }
                  return;
                }

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
                      round_no: nextRoundNo,
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

              // Broadcast round start with server timestamp
              setTimeout(() => {
                broadcastBattleEvent(round.battle_id, 'round_started', {
                  newRoundId: newRound.id,
                  roundNumber: nextRoundNo,
                  roundStartTime: roundStartTime
                });
              }, 500);

            } catch (err) {
              console.error('Error setting up next round:', err);
            }
          }, 3000); // 3 second delay to show results
          } else {
            console.log('Battle completed after 3 rounds, marking battle as finished');
            // Mark battle as completed
            setTimeout(async () => {
              await supabase
                .from('battles')
                .update({ status: 'completed' })
                .eq('id', round.battle_id);
            }, 1000);
          }

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

      // Update battle state with current round number
      setBattleState(prev => ({
        ...prev,
        currentRoundNum: round.round_no || 1
      }));

      // Set server round start time for timer sync
      if (round.started_at) {
        setServerRoundStartTime(round.started_at);
        setBattleGameState('active');
      }

      // Reset game state for new round
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

          // Timer will restart automatically via useEffect when serverRoundStartTime updates

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

  // Show loading screen with detailed status
  if (loading || loadingStates.battle || loadingStates.currentRound) {
    let statusMessage = 'Connecting to Battle...';
    if (loadingStates.battle) statusMessage = 'Loading battle data...';
    else if (loadingStates.currentRound) statusMessage = 'Waiting for round to start...';
    else if (loadingStates.puzzle) statusMessage = 'Loading puzzle...';

    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl">{statusMessage}</div>
          <div className="text-sm text-gray-400 mt-2">Status: {connectionStatus}</div>
        </div>
      </div>
    );
  }

  // Check for critical missing data
  if (!gameData.battle || !gameData.currentRound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-xl text-red-400">Battle Data Missing</div>
          <div className="text-sm text-gray-400 mt-2">
            {!gameData.battle && "Battle not found"}
            {!gameData.currentRound && "No active round"}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-yellow-600 text-black rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (battleGameState === 'ready') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl">Both Players Ready!</div>
          <div className="text-sm text-gray-400 mt-2">Starting battle...</div>
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
            <p className="text-sm text-gray-300">vs {gameData.opponent?.username || 'Loading...'}</p>
            <div className="text-xs text-gray-400 mt-1">
              Round {battleState.currentRoundNum} of {battleState.totalRounds}
            </div>
            <div className="flex justify-center gap-4 mt-2 text-sm">
              <span className="text-green-400">You: {battleState.myTotalScore.toLocaleString()}</span>
              <span className="text-blue-400">Them: {battleState.oppTotalScore.toLocaleString()}</span>
            </div>
          </div>

          <div className="text-right">
            {/* Invite Code Display */}
            {gameData.battle?.invite_code && (
              <div className="mb-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Invite Code</p>
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-mono font-bold text-yellow-400 px-2 py-1 bg-black/30 rounded border border-yellow-500/30"
                    style={{ textShadow: '0 0 10px rgba(212, 175, 55, 0.3)' }}
                  >
                    {gameData.battle.invite_code}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(gameData.battle.invite_code);
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
                  <Map onGuess={handleMapGuess} guessCoords={guessCoords} />
                </div>
              </div>

              {/* Continent Quick Jump */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-400 text-center font-medium uppercase tracking-wide mb-2">
                  Jump to Continent
                </div>

                {/* Desktop: Continent buttons in compact grid */}
                <div className="hidden sm:block">
                  <div className="grid grid-cols-3 gap-1 mb-1">
                    {CONTINENTS.slice(0, 3).map((continent) => (
                      <button
                        key={continent.label}
                        onClick={() => handleMapGuess({ lat: continent.lat, lng: continent.lng })}
                        disabled={!!myGuess}
                        className="relative px-2 py-1 text-xs font-medium rounded transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          color: '#9ca3af',
                          border: '1px solid rgba(156, 163, 175, 0.15)',
                          backdropFilter: 'blur(4px)',
                        }}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.7)';
                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.color = '#d4af37';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(156, 163, 175, 0.15)';
                          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.color = '#9ca3af';
                        }}
                      >
                        {continent.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {CONTINENTS.slice(3).map((continent) => (
                      <button
                        key={continent.label}
                        onClick={() => handleMapGuess({ lat: continent.lat, lng: continent.lng })}
                        disabled={!!myGuess}
                        className="relative px-2 py-1 text-xs font-medium rounded transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          color: '#9ca3af',
                          border: '1px solid rgba(156, 163, 175, 0.15)',
                          backdropFilter: 'blur(4px)',
                        }}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.7)';
                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.color = '#d4af37';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(156, 163, 175, 0.15)';
                          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.color = '#9ca3af';
                        }}
                      >
                        {continent.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile: Dropdown selector */}
                <div className="sm:hidden">
                  <select
                    onChange={(e) => {
                      const selected = CONTINENTS.find(c => c.label === e.target.value);
                      if (selected) {
                        handleMapGuess({ lat: selected.lat, lng: selected.lng });
                      }
                    }}
                    disabled={!!myGuess}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    defaultValue=""
                  >
                    <option value="">Jump to Continent...</option>
                    {CONTINENTS.map(continent => (
                      <option key={continent.label} value={continent.label}>
                        {continent.label}
                      </option>
                    ))}
                  </select>
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
          <div className="bg-gray-900 rounded-xl p-8 max-w-lg w-full text-center border-2 border-yellow-500">
            {!battleState.battleFinished ? (
              // Round Result
              <>
                <h3 className="text-2xl font-serif font-bold text-yellow-400 mb-6">
                  Round {roundResult.roundNumber} Complete!
                </h3>

                <div className="space-y-4 mb-6">
                  <div className={`text-3xl font-bold ${
                    roundResult.winner === 'me' ? 'text-green-400' :
                    roundResult.winner === 'opponent' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {roundResult.winner === 'me' ? '🏆 You Win This Round!' :
                     roundResult.winner === 'opponent' ? '💔 You Lose This Round' : '🤝 Round Tied!'}
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <span>Your Round Score:</span>
                      <span className="font-bold">{roundResult.myScore.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mb-3">
                      <span>Opponent Round Score:</span>
                      <span className="font-bold">{roundResult.oppScore.toLocaleString()}</span>
                    </div>
                    <hr className="border-gray-600 my-3" />
                    <div className="flex justify-between mb-2 text-lg font-bold">
                      <span>Your Total:</span>
                      <span className="text-green-400">{battleState.myTotalScore.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Their Total:</span>
                      <span className="text-blue-400">{battleState.oppTotalScore.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-green-400">
                    <p className="font-bold">Answer: {gameData.puzzle?.city_name}</p>
                    <p>{displayYear(gameData.puzzle?.year)}</p>
                  </div>

                  <div className="text-yellow-400 text-sm">
                    {roundResult.roundNumber < 3 ?
                      `Next round starting soon... (${3 - roundResult.roundNumber} rounds remaining)` :
                      'Calculating final results...'
                    }
                  </div>
                </div>

                {roundResult.roundNumber >= 3 && (
                  <button
                    onClick={() => setView('menu')}
                    className="w-full px-6 py-3 bg-red-700 text-white font-bold rounded hover:bg-red-600"
                  >
                    View Final Results
                  </button>
                )}
              </>
            ) : (
              // Final Battle Result
              <>
                <h3 className="text-3xl font-serif font-bold text-yellow-400 mb-6">
                  Battle Complete!
                </h3>

                <div className="space-y-6 mb-8">
                  <div className={`text-4xl font-bold ${
                    battleState.battleWinner === 'me' ? 'text-green-400' :
                    battleState.battleWinner === 'opponent' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {battleState.battleWinner === 'me' ? '🏆 Victory!' :
                     battleState.battleWinner === 'opponent' ? '💔 Defeat' : '🤝 Tie Game!'}
                  </div>

                  <div className="bg-gray-800 rounded-lg p-6">
                    <h4 className="text-lg font-bold mb-4 text-yellow-400">Final Scores</h4>
                    <div className="flex justify-between mb-2 text-xl font-bold">
                      <span>You:</span>
                      <span className="text-green-400">{battleState.myTotalScore.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mb-4 text-xl font-bold">
                      <span>Opponent:</span>
                      <span className="text-blue-400">{battleState.oppTotalScore.toLocaleString()}</span>
                    </div>

                    <hr className="border-gray-600 my-4" />

                    <h5 className="text-sm font-bold mb-3 text-gray-300">Round Breakdown</h5>
                    {battleState.roundScores.map((round, idx) => (
                      <div key={idx} className="flex justify-between text-sm mb-1">
                        <span>Round {round.round}:</span>
                        <span>{round.myScore.toLocaleString()} - {round.oppScore.toLocaleString()}</span>
                        <span className={`ml-2 ${
                          round.winner === 'me' ? 'text-green-400' :
                          round.winner === 'opponent' ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {round.winner === 'me' ? 'W' : round.winner === 'opponent' ? 'L' : 'T'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setView('liveLobby')}
                    className="flex-1 px-6 py-3 bg-blue-700 text-white font-bold rounded hover:bg-blue-600"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={() => setView('menu')}
                    className="flex-1 px-6 py-3 bg-red-700 text-white font-bold rounded hover:bg-red-600"
                  >
                    Main Menu
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}