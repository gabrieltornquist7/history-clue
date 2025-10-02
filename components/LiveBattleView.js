// components/LiveBattleView.js - MINIMAL WORKING VERSION
"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import dynamic from 'next/dynamic';
import { subscribeToBattle, broadcastBattleEvent } from '../lib/realtimeHelpers';
import GlassBackButton from './GlassBackButton';
import { useBadgeNotifications } from '../contexts/BadgeNotificationContext';
import { useIsMobile } from '../lib/useIsMobile';
import ContinentButtons from './ContinentButtons';
import BottomControlBar from './BottomControlBar';

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

const GlobeMap = dynamic(() => import('./GlobeMap'), { ssr: false });

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
  const { queueBadgeNotification } = useBadgeNotifications();
  const isMobile = useIsMobile();

  // Safe score formatter to prevent toLocaleString errors
  const safeScore = (value) => {
    // Handle all edge cases that could cause toLocaleString to fail
    if (value === null || value === undefined || value === '' || typeof value === 'object') return '0';
    const numValue = Number(value);
    if (isNaN(numValue) || !isFinite(numValue)) return '0';
    return numValue.toLocaleString();
  };

  // Debug function to check variable availability
  const debugVariables = (location) => {
    console.log(`DEBUG [${location}] Available variables:`, {
      session: session ? 'exists' : 'undefined',
      battleId: battleId ? 'exists' : 'undefined',
      gameDataBattle: gameData?.battle ? 'exists' : 'undefined',
      gameDataCurrentRound: gameData?.currentRound ? 'exists' : 'undefined',
      gameDataPuzzle: gameData?.puzzle ? 'exists' : 'undefined',
      battleState: battleState ? 'exists' : 'undefined'
    });
  };

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
  const [timerCap, setTimerCap] = useState(180); // Cap for timer (reduces to 45 when opponent submits first)
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
  const [timerCapAppliedAt, setTimerCapAppliedAt] = useState(null); // Track when cap was applied

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
          console.log('Both players present, marking battle as active');
          await supabase
            .from('battles')
            .update({ status: 'active' })
            .eq('id', battleId);
          battleData.status = 'active';
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
              // Removed old logic - now using polling instead of realtime events
              console.log('[Realtime] guess_submitted event received (ignored - using polling):', payload);
              break;

            case 'first_guess':
              console.log('[Realtime] First guess submitted by:', payload.playerId);
              if (payload.playerId !== session.user.id && !firstGuessSubmitted) {
                console.log('Opponent submitted first! Reducing timer cap to 45s');
                // Opponent made first guess, set timer cap to 45s
                setTimerCap(45);
                // CRITICAL: Track when cap was applied for countdown calculation
                setTimerCapAppliedAt(Date.now());
                // CRITICAL: Force immediate timer update to reflect the cap
                setMyTimer(prev => {
                  const newTimer = Math.min(prev, 45);
                  console.log(`[Timer Cap Applied] prev=${prev}s -> new=${newTimer}s, capAppliedAt=${Date.now()}`);
                  return newTimer;
                });
                // Mark that we know opponent submitted first
                setFirstGuessSubmitted(true);
              }
              break;

            case 'clue_revealed':
              // Just for logging opponent moves, no action needed
              break;

            case 'battle_complete':
              if (payload.playerId !== session.user.id) {
                console.log('Battle completed - showing final results for Player 2');

                // Make sure Player 2 sees the final results
                setBattleState(prev => ({ ...prev, battleFinished: true }));

                // If Player 2 doesn't have round results showing, trigger them
                if (!roundResult && gameData.currentRound) {
                  const round = gameData.currentRound;
                  const isPlayer1 = session.user.id === gameData.battle?.player1;
                  const myScore = isPlayer1 ? round.p1_score : round.p2_score;
                  const oppScore = isPlayer1 ? round.p2_score : round.p1_score;

                  setRoundResult({
                    myScore: myScore || 0,
                    oppScore: oppScore || 0,
                    winner: myScore > oppScore ? 'me' :
                            myScore < oppScore ? 'opponent' : 'tie',
                    roundNumber: round.round_no
                  });
                  setGameFinished(true);

                  // Stop timer
                  if (timerRef.current) {
                    clearInterval(timerRef.current);
                  }
                }
              }
              break;

            case 'round_started':
              // New round started - for player2 to receive new round data
              console.log('Received round_started event:', payload);
              if (payload.roundNumber && payload.roundId && payload.puzzleId) {
                // Load the new round and puzzle data
                loadNewRoundData(payload.roundId, payload.puzzleId, payload.roundNumber);
              }
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

        // Setup database subscription for round changes
        const roundsChannel = supabase
          .channel(`battle-rounds-${battleId}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'battle_rounds',
            filter: `battle_id=eq.${battleId}`
          }, (payload) => {
            console.log('Battle rounds database update:', payload);

            if (payload.eventType === 'INSERT') {
              // New round created
              const newRound = payload.new;
              console.log('New round inserted:', newRound);

              // If this is not the current round, update it
              if (newRound.id !== gameData.currentRound?.id) {
                handleRoundUpdate(newRound);
              }
            } else if (payload.eventType === 'UPDATE') {
              // Round updated (scores added)
              const updatedRound = payload.new;
              console.log('Round updated:', updatedRound);
              handleRoundUpdate(updatedRound);
            }
          })
          .subscribe();

        // Store both subscriptions for cleanup
        const originalUnsubscribe = unsubscribe;
        unsubscribe = () => {
          if (originalUnsubscribe) originalUnsubscribe();
          supabase.removeChannel(roundsChannel);
        };

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

        // 5. Create round if none exists and battle is active (only Player 1)
        if (!existingRound && battleData.status === 'active') {
          console.log('No active round found and battle is active');

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
              started_at: initialRoundStartTime,
              p1_score: 0,
              p2_score: 0
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

        } else if (battleData.status === 'active') {
          // Battle is active but no round exists yet - show waiting state
          setBattleGameState('active');
          console.log('Battle active, waiting for round to be created...');
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
      let remaining;
      if (timerCapAppliedAt) {
        // If cap was applied, count down from when it was applied
        const elapsedSinceCap = Math.floor((Date.now() - timerCapAppliedAt) / 1000);
      remaining = Math.max(0, 45 - elapsedSinceCap);
      console.log(`[Timer Init] Using cap time: elapsedSinceCap=${elapsedSinceCap}s, remaining=${remaining}s`);
    } else {
      // Normal calculation from round start
      remaining = calculateTimeRemaining(serverRoundStartTime);
      const cappedRemaining = Math.min(remaining, timerCap);
      remaining = cappedRemaining;
      console.log(`[Timer Init] Using round start: remaining=${remaining}s, timerCap=${timerCap}s`);
    }
    setMyTimer(remaining);

      // Update timer every second based on server timestamp
      timerRef.current = setInterval(() => {
        let newRemaining;
        if (timerCapAppliedAt) {
          // If cap was applied, count down from when it was applied
          const elapsedSinceCap = Math.floor((Date.now() - timerCapAppliedAt) / 1000);
          newRemaining = Math.max(0, 45 - elapsedSinceCap);
          console.log(`[Timer Tick] Cap mode: elapsed=${elapsedSinceCap}s, remaining=${newRemaining}s`);
        } else {
          // Normal calculation from round start
          newRemaining = calculateTimeRemaining(serverRoundStartTime);
          const cappedNewRemaining = Math.min(newRemaining, timerCap);
          // Log when cap is actively limiting the timer
          if (newRemaining > timerCap) {
            console.log(`[Timer Tick] CAPPED: ${newRemaining}s -> ${cappedNewRemaining}s (cap=${timerCap}s)`);
          }
          newRemaining = cappedNewRemaining;
        }
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
  }, [serverRoundStartTime, battleGameState, myGuess, timerCap, timerCapAppliedAt]); // Added timerCapAppliedAt

  // Battle updates subscription for Player 2 to detect new rounds
  useEffect(() => {
    if (!gameData.battle?.id) return;

    console.log('Setting up battle updates subscription for round transitions');

    const battleUpdatesChannel = supabase
      .channel(`battle-updates-${gameData.battle.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'battles',
        filter: `id=eq.${gameData.battle.id}`
      }, async (payload) => {
        console.log('Battle updated:', payload.new);

        const newCurrentRound = payload.new.current_round;
        const currentRoundNumber = gameData.currentRound?.round_no || 1;

        if (newCurrentRound > currentRoundNumber) {
          console.log(`New round detected via battle update! Round ${newCurrentRound}`);

          // Fetch the new round data
          const { data: newRound, error: roundError } = await supabase
            .from('battle_rounds')
            .select('*, puzzle:puzzles(*)')
            .eq('battle_id', gameData.battle.id)
            .eq('round_no', newCurrentRound)
            .maybeSingle();

          if (newRound && !roundError) {
            console.log('Loading new round from battle update:', newRound);

            // Reset round-specific states
            setMyGuess(null);
            setOppGuess(null);
            setGameFinished(false);
            setRoundResult(null);
            setMyTimer(180);
            setMyClues([1]);
            setMyScore(10000);
            setSelectedYear(0);
            setGuessCoords(null);
            setFirstGuessSubmitted(false);

            // Update game data
            setGameData(prev => ({
              ...prev,
              currentRound: newRound,
              puzzle: newRound.puzzle
            }));

            // Update battle state
            setBattleState(prev => ({
              ...prev,
              currentRoundNum: newCurrentRound
            }));

            // Set server round start time for timer sync
            setServerRoundStartTime(new Date(newRound.started_at).getTime());

            console.log(`Successfully loaded round ${newCurrentRound} from battle update`);
          } else {
            console.error('Failed to fetch new round from battle update:', roundError);

            // RETRY FALLBACK: Try a different approach after delay
            console.log('Attempting retry fetch with maybeSingle...');
            setTimeout(async () => {
              const { data: retryRound, error: retryError } = await supabase
                .from('battle_rounds')
                .select('*, puzzle:puzzles(*)')
                .eq('battle_id', gameData.battle.id)
                .eq('round_no', newCurrentRound)
                .maybeSingle();  // Use maybeSingle instead of single

              if (retryRound && !retryError) {
                console.log('✅ Retry fetch succeeded:', retryRound);

                // Reset round-specific states
                setMyGuess(null);
                setOppGuess(null);
                setGameFinished(false);
                setRoundResult(null);
                setMyTimer(180);
                setMyClues([1]);
                setMyScore(10000);
                setSelectedYear(0);
                setGuessCoords(null);
                setFirstGuessSubmitted(false);
                setTimerCapAppliedAt(null); // Reset cap applied time

                // Update game data
                setGameData(prev => ({
                  ...prev,
                  currentRound: retryRound,
                  puzzle: retryRound.puzzle
                }));

                // Update battle state
                setBattleState(prev => ({
                  ...prev,
                  currentRoundNum: newCurrentRound
                }));

                // Set server round start time for timer sync
                setServerRoundStartTime(new Date(retryRound.started_at).getTime());

                console.log(`✅ Successfully loaded round ${newCurrentRound} via retry`);
              } else {
                console.error('❌ Retry fetch also failed:', retryError);
                console.log('🔄 Using force sync as last resort...');
                // Trigger force sync as last resort
                setTimeout(() => forceSyncRound(), 2000);
              }
            }, 1000); // Wait 1 second before retry
          }
        }
      })
      .subscribe();

    return () => {
      console.log('Cleaning up battle updates subscription');
      supabase.removeChannel(battleUpdatesChannel);
    };
  }, [gameData.battle?.id, gameData.currentRound?.round_no]);


  const handleRevealClue = async (clueIndex) => {
    if (myClues.includes(clueIndex) || myScore < CLUE_COSTS[clueIndex] || myGuess) return;

    const cost = CLUE_COSTS[clueIndex];
    const newScore = myScore - cost;

    setMyScore(newScore);
    setMyClues(prev => [...prev, clueIndex].sort());

    // Move saved to battle_rounds table via score updates only

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

    debugVariables('handleGuessSubmit');

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

    // Guess saved to battle_rounds table via score updates only

    // Update battle_rounds with completion timestamp
    if (!gameData.battle) {
      console.error('No battle data available for completion update');
      return;
    }

    const isPlayer1 = session.user.id === gameData.battle.player1;
    const scoreField = isPlayer1 ? 'p1_score' : 'p2_score';
    const completionField = isPlayer1 ? 'player1_completed_at' : 'player2_completed_at';

    // Debug session before update
    const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
    console.log('DEBUG user:', currentSession?.user?.id, 'battle:', {
      id: gameData.battle.id,
      player1: gameData.battle.player1,
      player2: gameData.battle.player2,
      userIsPlayer1: currentSession?.user?.id === gameData.battle.player1,
      userIsPlayer2: currentSession?.user?.id === gameData.battle.player2,
      userIsAuthorized: currentSession?.user?.id === gameData.battle.player1 || currentSession?.user?.id === gameData.battle.player2,
      sessionError,
      isPlayer1,
      scoreField,
      completionField,
      finalScore,
      roundId: currentRoundId.current
    });

    if (!currentSession?.user?.id) {
      console.error('No authenticated session for completion update');
      return;
    }

    const updatePayload = {
      [scoreField]: finalScore,
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
      console.error('Error saving score and completion:', completionError);

      if (completionError.code === '406') {
        console.error('406 Not Acceptable - RLS authorization failed:', {
          userId: currentSession?.user?.id,
          battlePlayers: { player1: gameData.battle.player1, player2: gameData.battle.player2 },
          userAuthorized: currentSession?.user?.id === gameData.battle.player1 || currentSession?.user?.id === gameData.battle.player2,
          message: 'Current session user is not authorized by RLS policy'
        });
      } else if (completionError.code === '400') {
        console.error('400 Bad Request - Invalid update payload:', {
          payload: updatePayload,
          conditions: { id: currentRoundId.current },
          message: 'Update call has missing/invalid payload or conditions'
        });
      }
    } else {
      // Successfully updated - refetch the round to verify and sync
      console.log('✅ Score and completion saved successfully! Refetching to verify...');
      const { data: updatedRound, error: refetchError } = await supabase
        .from('battle_rounds')
        .select('*')
        .eq('id', currentRoundId.current)
        .maybeSingle();

      if (updatedRound && !refetchError) {
        console.log('✅ Round data verified after save:', {
          roundId: updatedRound.id,
          p1_score: updatedRound.p1_score,
          p2_score: updatedRound.p2_score,
          p1_completed: !!updatedRound.player1_completed_at,
          p2_completed: !!updatedRound.player2_completed_at,
          myScore: finalScore,
          scoreField: scoreField
        });
        setGameData(prev => ({ ...prev, currentRound: updatedRound }));
      } else {
        console.error('❌ Error refetching round data:', refetchError);
      }
    }

    // Broadcast first guess if needed (do this BEFORE polling starts)
    if (!firstGuessSubmitted && !oppGuess) {
      console.log('Broadcasting first_guess event to opponent');
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

    // Start polling to check if both players have completed the round
    pollForRoundCompletion(guessData);
  };

  const pollForRoundCompletion = async (myGuessData) => {
    console.log('Starting to poll for round completion...');
    let pollCount = 0;
    const maxPolls = 30; // 60 seconds total (2 second intervals)

    const checkRoundCompletion = async () => {
      pollCount++;
      console.log(`Polling for round completion (attempt ${pollCount}/${maxPolls})`);

      try {
        // Fetch current round to check if both players have completed
        const { data: currentRound, error } = await supabase
          .from('battle_rounds')
          .select('*')
          .eq('id', gameData.currentRound?.id)
          .single();

        if (error) {
          console.error('Error polling for round completion:', error);
          return;
        }

        console.log(`[Polling ${pollCount}] Round status:`, {
          roundId: currentRound.id,
          p1_completed: !!currentRound.player1_completed_at,
          p2_completed: !!currentRound.player2_completed_at,
          p1_score: currentRound.p1_score,
          p2_score: currentRound.p2_score,
          status: currentRound.status
        });

        // Check opponent's completion status and update UI
        const isPlayer1 = session.user.id === gameData.battle?.player1;
        const oppCompleted = isPlayer1 ? currentRound.player2_completed_at : currentRound.player1_completed_at;
        const oppScore = isPlayer1 ? currentRound.p2_score : currentRound.p1_score;
        
        // If opponent completed but we haven't shown it yet, update oppGuess state
        if (oppCompleted && !oppGuess && oppScore !== undefined) {
          console.log('Opponent has completed! Updating UI...');
          setOppGuess({
            score: oppScore,
            distance: 0,
            completed_at: oppCompleted
          });
        }

        // Check if both players have completed (using completion timestamps)
        const bothCompleted = currentRound.player1_completed_at && currentRound.player2_completed_at;

        if (bothCompleted) {
          console.log('Both players completed! Fetching opponent score and showing results');

          // Determine which player I am
          const isPlayer1 = session.user.id === gameData.battle?.player1;
          const oppScore = isPlayer1 ? currentRound.p2_score : currentRound.p1_score;

          // Create opponent guess data with actual score from database
          const oppGuessData = {
            score: oppScore,
            distance: 0, // We don't track opponent's exact guess details
            completed_at: isPlayer1 ? currentRound.player2_completed_at : currentRound.player1_completed_at
          };

          // Set opponent guess state so UI shows they completed
          setOppGuess(oppGuessData);

          console.log('Showing results with scores:', {
            myScore: myGuessData.score,
            oppScore: oppScore,
            bothCompleted: true
          });

          // Show results to this player
          showResults(myGuessData, oppGuessData);
          return;
        }

        // Continue polling if not both completed and within max attempts
        if (pollCount < maxPolls) {
          setTimeout(checkRoundCompletion, 2000);
        } else {
          console.error('Polling timeout: Opponent did not complete round');
          // Could show a timeout message or force progression here
        }
      } catch (err) {
        console.error('Error in round completion polling:', err);
      }
    };

    // Start polling after a brief delay
    setTimeout(checkRoundCompletion, 1000);
  };

  const showResults = (myGuessData, oppGuessData) => {
    console.log('Showing results:', { myGuessData, oppGuessData });

    // Safeguard: Don't show results if we don't have valid data
    if (!myGuessData || !oppGuessData) {
      console.warn('Cannot show results - missing guess data');
      return;
    }
    
    if (myGuessData.score === undefined || myGuessData.score === null || 
        oppGuessData.score === undefined || oppGuessData.score === null) {
      console.warn('Cannot show results - missing score data');
      return;
    }

    const myRoundScore = myGuessData.score ?? 0;
    const oppRoundScore = oppGuessData.score ?? 0;
    const currentRoundNum = gameData.currentRound?.round_no || 1;

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

    // If this was round 3, broadcast battle completion and check badges
    if (currentRoundNum >= 3) {
      broadcastBattleEvent(battleId, 'battle_complete', {
        playerId: session.user.id
      });

      // Check battle badges (after final round)
      const checkBattleBadges = async () => {
        // Get final battle state after setState completes
        setBattleState(current => {
          const battleWinner = current.myTotalScore > current.oppTotalScore ? 'me' :
                              current.myTotalScore < current.oppTotalScore ? 'opponent' : 'tie';

          const userWon = battleWinner === 'me';

          (async () => {
            // Track battle win streak
            try {
              const { data: currentProgress } = await supabase
                .from('badge_progress')
                .select('current_value')
                .eq('user_id', session.user.id)
                .eq('badge_id', 'battle_win_streak_tracker')
                .maybeSingle();

              const currentStreak = currentProgress?.current_value || 0;
              const newStreak = userWon ? currentStreak + 1 : 0;

              await supabase.rpc('update_badge_progress', {
                p_user_id: session.user.id,
                p_badge_id: 'battle_win_streak_tracker',
                p_new_value: newStreak,
                p_metadata: null
              });

              console.log(`Battle win streak: ${newStreak}`);

              // Check streak badge if user won
              if (userWon) {
                const { data } = await supabase.rpc('check_and_award_badge', {
                  p_user_id: session.user.id,
                  p_badge_id: 'battle_streak_3'
                });
                if (data?.awarded) {
                  queueBadgeNotification(data);
                }
              }
            } catch (error) {
              console.error('Error tracking battle win streak:', error);
            }

            // Track friend battles
            try {
              const isPlayer1 = session.user.id === gameData.battle?.player1;
              const opponentId = isPlayer1 ? gameData.battle?.player2 : gameData.battle?.player1;

              // Check if opponent is a friend
              const { data: friendship } = await supabase
                .from('friendships')
                .select('id')
                .or(`and(user_id_1.eq.${session.user.id},user_id_2.eq.${opponentId}),and(user_id_1.eq.${opponentId},user_id_2.eq.${session.user.id})`)
                .eq('status', 'accepted')
                .maybeSingle();

              if (friendship) {
                const { data: currentProgress } = await supabase
                  .from('badge_progress')
                  .select('current_value')
                  .eq('user_id', session.user.id)
                  .eq('badge_id', 'friend_battles_tracker')
                  .maybeSingle();

                const currentCount = currentProgress?.current_value || 0;

                await supabase.rpc('update_badge_progress', {
                  p_user_id: session.user.id,
                  p_badge_id: 'friend_battles_tracker',
                  p_new_value: currentCount + 1,
                  p_metadata: null
                });

                console.log(`Friend battles played: ${currentCount + 1}`);

                // Check friend battle badges
                const friendBadges = ['social_friend_battles_50', 'social_legend'];
                for (const badgeId of friendBadges) {
                  const { data } = await supabase.rpc('check_and_award_badge', {
                    p_user_id: session.user.id,
                    p_badge_id: badgeId
                  });
                  if (data?.awarded) {
                    queueBadgeNotification(data);
                  }
                }
              }
            } catch (error) {
              console.error('Error tracking friend battles:', error);
            }

            // Check badges if we won
            if (userWon) {
              // Check battle win count badges
              const battleBadges = [
                'battle_first_win',
                'battle_wins_25',
                'battle_wins_100',
                'battle_wins_500'
              ];

              for (const badgeId of battleBadges) {
                const { data } = await supabase.rpc('check_and_award_badge', {
                  p_user_id: session.user.id,
                  p_badge_id: badgeId
                });
                if (data?.awarded) {
                  queueBadgeNotification(data);
                }
              }

              // Check for perfect victory (won all 3 rounds)
              const wonAllRounds = current.roundScores.every(round => round.winner === 'me');
              if (wonAllRounds && current.roundScores.length === 3) {
                const { data } = await supabase.rpc('check_and_award_badge', {
                  p_user_id: session.user.id,
                  p_badge_id: 'battle_perfect'
                });
                if (data?.awarded) {
                  queueBadgeNotification(data);
                }
              }
            }
          })();

          return current;
        });
      };

      checkBattleBadges();
    } else {
      // Not the final round - schedule progression to next round
      console.log(`Round ${currentRoundNum} completed, scheduling next round...`);

      const nextRoundNum = currentRoundNum + 1;
      const isPlayer1 = session.user.id === gameData.battle?.player1;

      if (isPlayer1) {
        // Only Player 1 creates and manages rounds
        console.log('Player 1 managing round progression...');
        setTimeout(() => {
          console.log(`Player 1 starting round ${nextRoundNum}`);
          startNextRound(nextRoundNum);
        }, 3000); // Show results for 3 seconds before next round
      } else {
        // Player 2 waits and polls for the new round
        console.log('Player 2 waiting for next round...');
        setTimeout(() => {
          pollForNewRound(nextRoundNum);
        }, 4000); // Start polling after Player 1 has had time to create the round
      }
    }
  };

  const pollForNewRound = async (nextRoundNumber) => {
    console.log(`Player 2 polling for round ${nextRoundNumber}...`);
    let pollCount = 0;
    const maxPolls = 30; // 60 seconds total

    const checkForNewRound = async () => {
      pollCount++;
      console.log(`Polling for round ${nextRoundNumber} (attempt ${pollCount}/${maxPolls})`);

      try {
        // Check for the new round
        const { data: newRound, error } = await supabase
          .from('battle_rounds')
          .select('*, puzzle:puzzles(*)')
          .eq('battle_id', gameData.battle.id)
          .eq('round_no', nextRoundNumber)
          .maybeSingle();

        if (newRound && !error) {
          console.log(`Player 2 found round ${nextRoundNumber}!`, newRound);
          loadNewRoundData(newRound.id, newRound.puzzle_id, nextRoundNumber);
          return;
        }

        // Check if battle is finished instead of new round
        const { data: battleData } = await supabase
          .from('battles')
          .select('status')
          .eq('id', gameData.battle.id)
          .single();

        if (battleData?.status === 'completed') {
          console.log('Player 2 detected battle is completed - showing final results');

          // Fetch all rounds to calculate final scores
          const { data: allRounds } = await supabase
            .from('battle_rounds')
            .select('*')
            .eq('battle_id', gameData.battle.id)
            .order('round_no');

          if (allRounds && allRounds.length > 0) {
            const isPlayer1 = session.user.id === gameData.battle?.player1;

            // Calculate total scores from all rounds
            let myTotal = 0;
            let oppTotal = 0;
            let finalRound = allRounds[allRounds.length - 1];

            allRounds.forEach(round => {
              const myRoundScore = isPlayer1 ? (round.p1_score || 0) : (round.p2_score || 0);
              const oppRoundScore = isPlayer1 ? (round.p2_score || 0) : (round.p1_score || 0);
              myTotal += myRoundScore;
              oppTotal += oppRoundScore;
            });

            // Determine battle winner
            const battleWinner = myTotal > oppTotal ? 'me' :
                               myTotal < oppTotal ? 'opponent' : 'tie';

            // Set up battle state with final scores
            setBattleState(prev => ({
              ...prev,
              myTotalScore: myTotal,
              oppTotalScore: oppTotal,
              battleFinished: true,
              battleWinner: battleWinner
            }));

            // Set up final round result to show modal
            const finalMyScore = isPlayer1 ? (finalRound.p1_score || 0) : (finalRound.p2_score || 0);
            const finalOppScore = isPlayer1 ? (finalRound.p2_score || 0) : (finalRound.p1_score || 0);

            setRoundResult({
              myScore: finalMyScore,
              oppScore: finalOppScore,
              winner: finalMyScore > finalOppScore ? 'me' :
                      finalMyScore < finalOppScore ? 'opponent' : 'tie',
              roundNumber: finalRound.round_no
            });
            setGameFinished(true);

            // Stop timer
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
          }
          return;
        }

        // Continue polling
        if (pollCount < maxPolls) {
          setTimeout(checkForNewRound, 2000);
        } else {
          console.error(`Player 2 timed out waiting for round ${nextRoundNumber}`);
        }
      } catch (err) {
        console.error('Error polling for new round:', err);
      }
    };

    // Start polling
    checkForNewRound();
  };

  const startNextRound = async (nextRoundNumber) => {
    try {
      console.log(`Creating round ${nextRoundNumber}`);
      debugVariables('startNextRound');

      // Reset round-specific states
      setMyGuess(null);
      setOppGuess(null);
      setGameFinished(false);
      setRoundResult(null);
      setMyTimer(180);
      setTimerCap(180); // Reset timer cap
      setTimerCapAppliedAt(null); // Reset cap applied time
      setMyClues([1]);
      setMyScore(10000);
      setSelectedYear(0);
      setGuessCoords(null);
      setFirstGuessSubmitted(false);

      // Update battle state for new round
      setBattleState(prev => ({
        ...prev,
        currentRoundNum: nextRoundNumber
      }));

      // Only player1 creates the next round in database
      if (session.user.id === gameData.battle?.player1) {
        console.log('Player1 creating new round...');
        console.log('Round creation details:', {
          userId: session.user.id,
          battlePlayer1: gameData.battle?.player1,
          isPlayer1: session.user.id === gameData.battle?.player1,
          battleId: gameData.battle?.id,
          nextRoundNumber: nextRoundNumber,
          currentRound: gameData.currentRound?.round_no
        });

        // Get a new puzzle (different from current one)
        const { data: puzzles, error: puzzleError } = await supabase
          .from('puzzles')
          .select('*')
          .neq('id', gameData.puzzle?.id || 0) // Don't repeat puzzles
          .limit(50);

        if (puzzleError || !puzzles?.length) {
          console.error('Error fetching new puzzle:', puzzleError);
          console.log('Available puzzles count:', puzzles?.length);
          return;
        }

        console.log(`Found ${puzzles.length} available puzzles`);

        // Pick a random puzzle
        const randomPuzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
        console.log('Selected puzzle:', { id: randomPuzzle.id, title: randomPuzzle.title });

        // Check if round already exists
        const { data: existingRounds } = await supabase
          .from('battle_rounds')
          .select('*')
          .eq('battle_id', gameData.battle.id)
          .eq('round_no', nextRoundNumber);

        if (existingRounds?.length > 0) {
          console.log('Round already exists!', existingRounds[0]);
          setGameData(prev => ({ ...prev, currentRound: existingRounds[0] }));
          return;
        }

        // Prepare round data
        const roundData = {
          battle_id: gameData.battle.id,
          round_no: nextRoundNumber,
          puzzle_id: randomPuzzle.id,
          started_at: new Date().toISOString(),
          status: 'active',
          p1_score: 0,
          p2_score: 0
        };

        console.log('Creating round with data:', roundData);

        // Create new round
        const { data: newRound, error: roundError } = await supabase
          .from('battle_rounds')
          .insert(roundData)
          .select('*, puzzle:puzzles(*)')
          .single();

        if (roundError?.code === 'PGRST204' || (!roundError && !newRound)) {
          // Insert succeeded but didn't return data (PGRST204) - fetch it manually
          console.log('Round created (PGRST204), fetching manually...');
          console.log('Insert result analysis:', {
            hasError: !!roundError,
            errorCode: roundError?.code,
            errorMessage: roundError?.message,
            hasData: !!newRound,
            dataValue: newRound
          });

          console.log('Attempting manual fetch with:', {
            battle_id: gameData.battle.id,
            round_no: nextRoundNumber,
            table: 'battle_rounds'
          });

          const { data: fetchedRound, error: fetchError } = await supabase
            .from('battle_rounds')
            .select('*, puzzle:puzzles(*)')
            .eq('battle_id', gameData.battle.id)
            .eq('round_no', nextRoundNumber)
            .maybeSingle();

          console.log('Fetch result:', {
            hasData: !!fetchedRound,
            dataCount: fetchedRound ? 1 : 0,
            hasError: !!fetchError,
            errorDetails: fetchError ? {
              code: fetchError.code,
              message: fetchError.message,
              details: fetchError.details,
              hint: fetchError.hint,
              fullError: fetchError
            } : null
          });

          if (fetchedRound && !fetchError) {
            console.log('✅ Fetched new round successfully:', fetchedRound);

            // Update game data
            setGameData(prev => ({
              ...prev,
              currentRound: fetchedRound,
              puzzle: fetchedRound.puzzle
            }));

            // Update battle to trigger Player 2 sync
            await supabase
              .from('battles')
              .update({
                current_round: nextRoundNumber,
                updated_at: new Date().toISOString()
              })
              .eq('id', gameData.battle.id);

            // Set server round start time for timer sync
            setServerRoundStartTime(new Date(fetchedRound.started_at).getTime());

            // Broadcast new round to opponent
            broadcastBattleEvent(battleId, 'round_started', {
              roundNumber: nextRoundNumber,
              roundId: fetchedRound.id,
              puzzleId: fetchedRound.puzzle_id,
              roundStartTime: new Date(fetchedRound.started_at).getTime()
            });

          } else {
            console.error('❌ Failed to fetch created round:', fetchError);
            console.error('Fetch error details:', {
              code: fetchError?.code,
              message: fetchError?.message,
              details: fetchError?.details,
              hint: fetchError?.hint
            });

            // OPTIMISTIC FALLBACK: Proceed with assumed round data
            console.log('🔄 Using optimistic fallback approach...');

            const optimisticRound = {
              id: `temp-${Date.now()}`, // Temporary ID
              battle_id: gameData.battle.id,
              round_no: nextRoundNumber,
              puzzle_id: randomPuzzle.id,
              puzzle: randomPuzzle,
              started_at: new Date().toISOString(),
              p1_score: null,
              p2_score: null,
              player1_completed_at: null,
              player2_completed_at: null
            };

            console.log('Using optimistic round data:', optimisticRound);

            // Update game data with optimistic round
            setGameData(prev => ({
              ...prev,
              currentRound: optimisticRound,
              puzzle: randomPuzzle
            }));

            // Update battle to trigger Player 2 sync (they'll fetch real data)
            await supabase
              .from('battles')
              .update({
                current_round: nextRoundNumber,
                updated_at: new Date().toISOString()
              })
              .eq('id', gameData.battle.id);

            // Set server round start time for timer sync
            setServerRoundStartTime(new Date(optimisticRound.started_at).getTime());

            // Broadcast new round to opponent
            broadcastBattleEvent(battleId, 'round_started', {
              roundNumber: nextRoundNumber,
              roundId: optimisticRound.id,
              puzzleId: optimisticRound.puzzle_id,
              roundStartTime: new Date(optimisticRound.started_at).getTime()
            });

            console.log('✅ Optimistic fallback completed - round should progress');
            return;
          }

        } else if (roundError) {
          console.error('Round creation failed!');
          console.error('Error details:', JSON.stringify(roundError, null, 2));
          console.error('Error code:', roundError.code);
          console.error('Error message:', roundError.message);

          // Check current session
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          console.log('Current session:', currentSession?.user?.id);

          return;

        } else if (newRound) {
          console.log('✅ Round created with data:', newRound);

          // Update game data
          setGameData(prev => ({
            ...prev,
            currentRound: newRound,
            puzzle: newRound.puzzle
          }));

          // Update battle to trigger Player 2 sync
          await supabase
            .from('battles')
            .update({
              current_round: nextRoundNumber,
              updated_at: new Date().toISOString()
            })
            .eq('id', gameData.battle.id);

          // Set server round start time for timer sync
          setServerRoundStartTime(new Date(newRound.started_at).getTime());

          // Broadcast new round to opponent
          broadcastBattleEvent(battleId, 'round_started', {
            roundNumber: nextRoundNumber,
            roundId: newRound.id,
            puzzleId: newRound.puzzle_id,
            roundStartTime: new Date(newRound.started_at).getTime()
          });
        }

      } else {
        console.log('Player2 should not reach startNextRound - using pollForNewRound instead');
        // This shouldn't happen with the new logic, but just in case
      }

    } catch (error) {
      console.error('Error starting next round:', error);
    }
  };

  const loadNewRoundData = async (roundId, puzzleId, roundNumber) => {
    try {
      console.log(`Player2 loading round ${roundNumber} data...`);

      // Reset round-specific states for player2
      setMyGuess(null);
      setOppGuess(null);
      setGameFinished(false);
      setRoundResult(null);
      setMyTimer(180);
      setTimerCap(180); // Reset timer cap for new round
      setTimerCapAppliedAt(null); // Reset cap applied time
      setMyClues([1]);
      setMyScore(10000);
      setSelectedYear(0);
      setGuessCoords(null);
      setFirstGuessSubmitted(false);

      // Update battle state for new round
      setBattleState(prev => ({
        ...prev,
        currentRoundNum: roundNumber
      }));

      // Load the round data
      const { data: roundData, error: roundError } = await supabase
        .from('battle_rounds')
        .select('*')
        .eq('id', roundId)
        .maybeSingle();

      if (roundError) {
        console.error('Error loading round data:', roundError);
        return;
      }

      // Load the puzzle data
      const { data: puzzleData, error: puzzleError } = await supabase
        .from('puzzles')
        .select('*, puzzle_translations(*)')
        .eq('id', puzzleId)
        .maybeSingle();

      if (puzzleError) {
        console.error('Error loading puzzle data:', puzzleError);
        return;
      }

      // Update game data
      setGameData(prev => ({
        ...prev,
        currentRound: roundData,
        puzzle: puzzleData
      }));

      // Set server round start time for timer sync
      setServerRoundStartTime(new Date(roundData.started_at).getTime());

      console.log(`Player2 loaded round ${roundNumber} successfully`);

    } catch (error) {
      console.error('Error loading new round data:', error);
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
            isPlayer1: session?.user?.id === gameData.battle?.player1,
            battlePlayer1: gameData.battle?.player1
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
                    p1_score: 0,
                    p2_score: 0,
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
            // Mark battle as completed and broadcast completion
            setTimeout(async () => {
              // Fetch all rounds to calculate winner
              const { data: allRounds } = await supabase
                .from('battle_rounds')
                .select('*')
                .eq('battle_id', round.battle_id)
                .order('round_no');

              if (allRounds && allRounds.length > 0) {
                // Calculate total scores
                let p1Total = 0;
                let p2Total = 0;

                allRounds.forEach(r => {
                  p1Total += r.p1_score || 0;
                  p2Total += r.p2_score || 0;
                });

                // Determine winner_id
                let winnerId = null;
                if (p1Total > p2Total) {
                  winnerId = gameData.battle?.player1;
                } else if (p2Total > p1Total) {
                  winnerId = gameData.battle?.player2;
                }
                // If tie, winner_id stays null

                console.log('Battle results:', { p1Total, p2Total, winnerId });

                // Update battle with winner_id
                await supabase
                  .from('battles')
                  .update({ status: 'completed', winner_id: winnerId })
                  .eq('id', round.battle_id);
              } else {
                // Fallback if no rounds found
                await supabase
                  .from('battles')
                  .update({ status: 'completed' })
                  .eq('id', round.battle_id);
              }

              // Broadcast battle completion so Player 2 sees final results
              broadcastBattleEvent(round.battle_id, 'battle_complete', {
                playerId: session.user.id
              });
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
      setTimerCapAppliedAt(null); // Reset cap applied time

      // Load new puzzle
      const loadNewPuzzle = async () => {
        try {
          const { data: newPuzzleData, error: newPuzzleError } = await supabase
            .from('puzzles')
            .select('*, puzzle_translations(*)')
            .eq('id', round.puzzle_id)
            .single();

          if (!newPuzzleError && newPuzzleData) {
            setGameData(prev => ({ ...prev, puzzle: newPuzzleData }));
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
    return gameData.puzzle?.puzzle_translations?.[0]?.[`clue_${clueNumber}_text`];
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Force sync function for debugging
  const forceSyncRound = async () => {
    if (!gameData.battle?.id) return;

    console.log('Force syncing to latest round...');

    const { data: rounds, error } = await supabase
      .from('battle_rounds')
      .select('*, puzzle:puzzles(*)')
      .eq('battle_id', gameData.battle.id)
      .order('round_no', { ascending: false })
      .limit(1);

    if (rounds?.[0] && !error) {
      const latestRound = rounds[0];
      console.log('Force syncing to round:', latestRound);

      // Reset round-specific states
      setMyGuess(null);
      setOppGuess(null);
      setGameFinished(false);
      setRoundResult(null);
      setMyTimer(180);
      setMyClues([1]);
      setMyScore(10000);
      setSelectedYear(0);
      setGuessCoords(null);
      setFirstGuessSubmitted(false);

      // Update game data
      setGameData(prev => ({
        ...prev,
        currentRound: latestRound,
        puzzle: latestRound.puzzle
      }));

      // Update battle state
      setBattleState(prev => ({
        ...prev,
        currentRoundNum: latestRound.round_no
      }));

      // Set server round start time for timer sync
      setServerRoundStartTime(new Date(latestRound.started_at).getTime());

      alert(`Force synced to Round ${latestRound.round_no}`);
    } else {
      console.error('Failed to force sync:', error);
      alert('Force sync failed - check console');
    }
  };

  const displayYear = (year) => {
    const yearNum = Number(year);
    if (yearNum < 0) return `${Math.abs(yearNum)} BCE`;
    if (yearNum === 0) return `Year 0`;
    return `${yearNum} CE`;
  };

  // Ensure battleState is defined
  if (!battleState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-xl text-yellow-400">Initializing...</div>
        </div>
      </div>
    );
  }

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

  // DESKTOP LAYOUT - Full-screen map with floating panels
  if (!isMobile) {
    return (
      <div className="fixed inset-0 overflow-hidden">
        {/* Full-screen Map Background */}
        <div className="absolute inset-0">
          <GlobeMap 
            onGuess={handleMapGuess} 
            guessCoords={guessCoords}
            selectedYear={selectedYear}
          />
        </div>

        {/* Back Button */}
        <div className="absolute top-4 left-4 z-50">
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
        </div>

        {/* Floating Clue Panel (Left Side) */}
        <div 
          className="absolute top-4 left-20 w-80 max-h-[calc(100vh-8rem)] overflow-y-auto backdrop-blur-xl rounded-2xl p-6 z-40"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
          }}
        >
          <h2 
            className="text-2xl font-bold text-yellow-400 mb-6"
            style={{
              textShadow: '0 0 15px rgba(212, 175, 55, 0.3)'
            }}
          >
            Clues
          </h2>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((num) => {
              const isUnlocked = myClues.includes(num);
              const clueText = getClueText(num);
              
              return (
                <div 
                  key={num}
                  className="backdrop-blur rounded-lg p-4 transition-all duration-300"
                  style={{
                    backgroundColor: isUnlocked ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
                    border: isUnlocked ? '2px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: isUnlocked ? '0 0 20px rgba(212, 175, 55, 0.1)' : 'none'
                  }}
                >
                  {isUnlocked ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ 
                            backgroundColor: '#d4af37',
                            boxShadow: '0 0 10px rgba(212, 175, 55, 0.5)'
                          }}
                        ></div>
                        <span 
                          className="font-bold"
                          style={{ 
                            color: '#d4af37',
                            textShadow: '0 0 10px rgba(212, 175, 55, 0.3)'
                          }}
                        >
                          Clue {num}
                        </span>
                      </div>
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
            
            <div 
              className="rounded-lg p-4"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(212, 175, 55, 0.2)'
              }}
            >
              <div className="text-center">
                <p className="text-sm text-gray-400">Potential Score</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {safeScore(myScore)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Battle Info Panel (Right Side) */}
        <div 
          className="absolute top-4 right-4 w-80 backdrop-blur-xl rounded-2xl p-6 z-40"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Battle Header */}
          <div className="text-center mb-6">
            <h1 
              className="text-2xl font-serif font-bold text-yellow-400 mb-2"
              style={{
                textShadow: '0 0 20px rgba(212, 175, 55, 0.5)',
                letterSpacing: '0.02em'
              }}
            >
              Live Battle
            </h1>
            <p className="text-sm text-gray-300">vs {gameData.opponent?.username || 'Loading...'}</p>
            <div className="text-xs text-gray-400 mt-1">
              Round {battleState.currentRoundNum} of {battleState.totalRounds}
            </div>
          </div>

          {/* Battle Scores */}
          <div 
            className="rounded-lg p-4 mb-4"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(212, 175, 55, 0.1)'
            }}
          >
            <div className="flex justify-between items-center">
              <div className="text-center flex-1">
                <p className="text-xs text-gray-400">You</p>
                <p className="text-xl font-bold text-green-400">
                  {safeScore(battleState.myTotalScore)}
                </p>
              </div>
              <div className="text-gray-500 text-2xl font-bold">VS</div>
              <div className="text-center flex-1">
                <p className="text-xs text-gray-400">Them</p>
                <p className="text-xl font-bold text-blue-400">
                  {safeScore(battleState.oppTotalScore)}
                </p>
              </div>
            </div>
          </div>

          {/* Timer */}
          <div 
            className="rounded-lg p-4 mb-4"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              border: myTimer <= 30 ? '2px solid #ef4444' : myTimer <= 45 && firstGuessSubmitted ? '2px solid #f97316' : '2px solid rgba(212, 175, 55, 0.2)',
              boxShadow: myTimer <= 30 ? '0 0 20px rgba(239, 68, 68, 0.3)' : myTimer <= 45 && firstGuessSubmitted ? '0 0 20px rgba(249, 115, 22, 0.3)' : '0 0 20px rgba(212, 175, 55, 0.1)'
            }}
          >
            <p className="text-xs text-gray-400 uppercase tracking-wide text-center">Your Timer</p>
            <p 
              className={`text-4xl font-bold text-center ${
                myTimer <= 30 ? 'text-red-400' : 
                myTimer <= 45 && firstGuessSubmitted ? 'text-orange-400' : 
                'text-white'
              }`}
              style={{
                textShadow: myTimer <= 30 ? '0 0 20px rgba(239, 68, 68, 0.5)' : myTimer <= 45 && firstGuessSubmitted ? '0 0 20px rgba(249, 115, 22, 0.5)' : '0 0 20px rgba(212, 175, 55, 0.3)'
              }}
            >
              {formatTime(myTimer)}
            </p>
            {myTimer <= 45 && firstGuessSubmitted && !myGuess && (
              <p className="text-xs text-orange-400 mt-2 text-center animate-pulse">
                ⚡ Hurry! Opponent submitted!
              </p>
            )}
          </div>

          {/* Invite Code */}
          {gameData.battle?.invite_code && (
            <div 
              className="rounded-lg p-4 mb-4"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(212, 175, 55, 0.1)'
              }}
            >
              <p className="text-xs text-gray-400 uppercase tracking-wide text-center mb-2">Invite Code</p>
              <div className="flex items-center justify-center gap-2">
                <span
                  className="text-sm font-mono font-bold text-yellow-400 px-3 py-1 bg-black/30 rounded border border-yellow-500/30"
                  style={{ textShadow: '0 0 10px rgba(212, 175, 55, 0.3)' }}
                >
                  {gameData.battle.invite_code}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(gameData.battle.invite_code)}
                  className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                  title="Copy invite code"
                >
                  📋
                </button>
              </div>
            </div>
          )}

          {/* Debug Button */}
          <button
            onClick={forceSyncRound}
            className="w-full bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-xs transition-colors"
            title="Force sync to latest round (debug)"
          >
            🔄 Force Sync Round
          </button>
        </div>

        {/* Continent Navigation */}
        <ContinentButtons 
          continents={CONTINENTS}
          onContinentClick={(lat, lng) => handleMapGuess({ lat, lng })}
          disabled={!!myGuess}
        />

        {/* Bottom Control Bar */}
        <BottomControlBar
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
          historicalEras={historicalEras}
          guessCoords={guessCoords}
          onSubmit={() => handleGuessSubmit(false)}
          disabled={!!myGuess}
          displayYear={displayYear}
        />

        {/* Round Result Modal */}
        {gameFinished && roundResult && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => {
              if (battleState.battleFinished) {
                setView('menu');
              } else {
                setGameFinished(false);
              }
            }}
          >
            <div 
              className="backdrop-blur-xl rounded-2xl p-8 max-w-2xl w-full mx-4"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                border: '2px solid rgba(212, 175, 55, 0.3)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-3xl font-bold text-center mb-6">
                {battleState.battleFinished ? (
                  <span className="text-yellow-400">Battle Complete!</span>
                ) : (
                  <span className="text-yellow-400">Round {roundResult.roundNumber} Complete!</span>
                )}
              </h2>

              {battleState.battleFinished ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-6xl mb-4">
                      {battleState.battleWinner === 'me' ? '🏆' : battleState.battleWinner === 'opponent' ? '😔' : '🤝'}
                    </p>
                    <p className="text-2xl font-bold mb-2">
                      {battleState.battleWinner === 'me' ? 'Victory!' : battleState.battleWinner === 'opponent' ? 'Defeat' : "It's a Tie!"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-sm text-gray-400">Your Total</p>
                      <p className="text-3xl font-bold text-green-400">
                        {safeScore(battleState?.myTotalScore ?? 0)}
                      </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-sm text-gray-400">Their Total</p>
                      <p className="text-3xl font-bold text-blue-400">
                        {safeScore(battleState?.oppTotalScore ?? 0)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-center text-gray-300">Round Breakdown</h3>
                    {(battleState?.roundScores || []).map((round, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-800/30 rounded p-3">
                        <span className="text-gray-400">Round {round?.round ?? idx + 1}</span>
                        <div className="flex gap-4">
                          <span className="text-green-400">{safeScore(round?.myScore ?? 0)}</span>
                          <span className="text-gray-500">-</span>
                          <span className="text-blue-400">{safeScore(round?.oppScore ?? 0)}</span>
                        </div>
                        <span className="text-yellow-400">
                          {round.winner === 'me' ? '✓' : round.winner === 'opponent' ? '✗' : '='}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setView('menu')}
                    className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 text-black font-bold rounded-lg transition-colors"
                  >
                    Return to Menu
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-6xl mb-4">
                      {roundResult.winner === 'me' ? '🎯' : roundResult.winner === 'opponent' ? '😔' : '🤝'}
                    </p>
                    <p className="text-xl">
                      {roundResult.winner === 'me' ? 'You won this round!' : roundResult.winner === 'opponent' ? 'Opponent won this round' : 'Round tied!'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-sm text-gray-400">Your Score</p>
                      <p className="text-2xl font-bold text-green-400">
                        {safeScore(roundResult?.myScore ?? 0)}
                      </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-sm text-gray-400">Their Score</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {safeScore(roundResult?.oppScore ?? 0)}
                      </p>
                    </div>
                  </div>

                  <div className="text-center bg-gray-800/30 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-2">Battle Score</p>
                    <div className="flex justify-center gap-6">
                      <div>
                        <p className="text-xs text-gray-500">You</p>
                        <p className="text-xl font-bold text-green-400">
                          {safeScore(battleState?.myTotalScore ?? 0)}
                        </p>
                      </div>
                      <div className="flex items-center text-gray-500">-</div>
                      <div>
                        <p className="text-xs text-gray-500">Them</p>
                        <p className="text-xl font-bold text-blue-400">
                          {safeScore(battleState?.oppTotalScore ?? 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-center text-gray-400">
                    Next round starting soon...
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // MOBILE LAYOUT - Original 3-column grid
  return (
    <div
      className="min-h-screen relative text-white"
      style={{
        background: `
          linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%),
          radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%),
          radial-gradient(circle at 70% 80%, rgba(212, 175, 55, 0.01) 0%, transparent 50%),
          radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)
        `
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
        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .slide-up {
          animation: slideUp 0.6s ease-out;
        }
        .pulse-glow {
          animation: pulse 2s ease-in-out infinite;
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
      <div 
        className="border-b p-4 slide-up"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-center flex-1">
            <h1 
              className="text-2xl font-serif font-bold text-yellow-400"
              style={{
                textShadow: '0 0 20px rgba(212, 175, 55, 0.5)',
                letterSpacing: '0.02em'
              }}
            >
              Live Battle
            </h1>
            <p className="text-sm text-gray-300">vs {gameData.opponent?.username || 'Loading...'}</p>
            <div className="text-xs text-gray-400 mt-1">
              Round {battleState.currentRoundNum} of {battleState.totalRounds}
            </div>
            <div className="flex justify-center gap-4 mt-2 text-sm">
              <span className="text-green-400">You: {safeScore(battleState?.myTotalScore)}</span>
              <span className="text-blue-400">Them: {safeScore(battleState?.oppTotalScore)}</span>
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

            {/* Debug Force Sync Button */}
            <div className="mb-2">
              <button
                onClick={forceSyncRound}
                className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs transition-colors w-full"
                title="Force sync to latest round (debug)"
              >
                🔄 Force Sync Round
              </button>
            </div>

            {/* Timer */}
            <div 
              className="text-center p-3 rounded-lg"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                border: myTimer <= 30 ? '2px solid #ef4444' : myTimer <= 45 && firstGuessSubmitted ? '2px solid #f97316' : '2px solid rgba(212, 175, 55, 0.2)',
                boxShadow: myTimer <= 30 ? '0 0 20px rgba(239, 68, 68, 0.3)' : myTimer <= 45 && firstGuessSubmitted ? '0 0 20px rgba(249, 115, 22, 0.3)' : '0 0 20px rgba(212, 175, 55, 0.1)'
              }}
            >
              <p className="text-xs text-gray-400 uppercase tracking-wide">Your Timer</p>
              <p 
                className={`text-3xl font-bold ${
                  myTimer <= 30 ? 'text-red-400' : 
                  myTimer <= 45 && firstGuessSubmitted ? 'text-orange-400' : 
                  'text-white'
                }`}
                style={{
                  textShadow: myTimer <= 30 ? '0 0 20px rgba(239, 68, 68, 0.5)' : myTimer <= 45 && firstGuessSubmitted ? '0 0 20px rgba(249, 115, 22, 0.5)' : '0 0 20px rgba(212, 175, 55, 0.3)'
                }}
              >
                {formatTime(myTimer)}
              </p>
              {myTimer <= 45 && firstGuessSubmitted && !myGuess && (
                <p className="text-xs text-orange-400 mt-1 animate-pulse">
                  ⚡ Hurry! Opponent submitted!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Panel - Clues */}
            <div className="space-y-4 slide-up">
              <h2 
                className="text-xl font-bold text-yellow-400"
                style={{
                  textShadow: '0 0 15px rgba(212, 175, 55, 0.3)'
                }}
              >
                Clues
              </h2>
              {[1, 2, 3, 4, 5].map((num) => {
                const isUnlocked = myClues.includes(num);
                const clueText = getClueText(num);
                
                return (
                  <div 
                  key={num}
                  className={`backdrop-blur rounded-lg p-4 transition-all duration-300`}
                  style={{
                    backgroundColor: isUnlocked ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
                    border: isUnlocked ? '2px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: isUnlocked ? '0 0 20px rgba(212, 175, 55, 0.1)' : 'none'
                  }}
                  >
                    {isUnlocked ? (
                    <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ 
                            backgroundColor: '#d4af37',
                            boxShadow: '0 0 10px rgba(212, 175, 55, 0.5)'
                          }}
                        ></div>
                        <span 
                          className="font-bold"
                          style={{ 
                            color: '#d4af37',
                            textShadow: '0 0 10px rgba(212, 175, 55, 0.3)'
                          }}
                        >
                          Clue {num}
                        </span>
                      </div>
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
                    {safeScore(myScore)}
                  </p>
                </div>
              </div>
            </div>

            {/* Center - Map and Controls */}
            <div className="space-y-4 slide-up" style={{ animationDelay: '0.1s' }}>
              <h2 
                className="text-xl font-bold text-yellow-400"
                style={{
                  textShadow: '0 0 15px rgba(212, 175, 55, 0.3)'
                }}
              >
                Map
              </h2>
              
              <div 
                className="backdrop-blur rounded-lg p-4 border hover:border-yellow-500/20 transition-all duration-300"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
                }}
              >
                <div className="h-64 sm:h-80 rounded-lg overflow-hidden border border-gray-600">
                  <GlobeMap 
                    onGuess={handleMapGuess} 
                    guessCoords={guessCoords}
                    selectedYear={selectedYear}
                  />
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
              <div 
                className="backdrop-blur rounded-lg p-4 border hover:border-yellow-500/20 transition-all duration-300"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
                }}
              >
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
                className="w-full px-6 py-4 font-bold text-white rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  background: !guessCoords || !!myGuess ? '#374151' : 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)',
                  boxShadow: !guessCoords || !!myGuess ? 'none' : '0 10px 30px rgba(139, 0, 0, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.boxShadow = '0 0 0 2px rgba(212, 175, 55, 0.4), 0 15px 40px rgba(139, 0, 0, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.boxShadow = '0 10px 30px rgba(139, 0, 0, 0.3)';
                  }
                }}
              >
                {!guessCoords ? 'Place Pin on Map' : myGuess ? 'Guess Submitted' : 'Submit Guess'}
              </button>
            </div>

            {/* Right Panel - Status */}
            <div className="space-y-4 slide-up" style={{ animationDelay: '0.2s' }}>
              <h2 
                className="text-xl font-bold text-yellow-400"
                style={{
                  textShadow: '0 0 15px rgba(212, 175, 55, 0.3)'
                }}
              >
                Battle Status
              </h2>
              
              {/* Opponent Status Indicator */}
              <div 
                className="backdrop-blur rounded-lg p-4 border transition-all duration-300"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
                }}
              >
                <h3 className="font-bold text-blue-400 mb-2">
                  {gameData.opponent?.username || 'Opponent'}
                </h3>
                {oppGuess ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <span className="text-2xl">✅</span>
                    <span className="font-bold">Guess Submitted!</span>
                  </div>
                ) : firstGuessSubmitted && !myGuess ? (
                  <div className="flex items-center gap-2 text-yellow-400">
                    <span className="text-2xl">⏱️</span>
                    <span className="font-bold">Submitted First!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="text-2xl">🤔</span>
                    <span>Thinking...</span>
                  </div>
                )}
              </div>
              
              {myGuess ? (
                <div 
                  className="backdrop-blur rounded-lg p-4 border"
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    border: '2px solid #22c55e',
                    boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)'
                  }}
                >
                  <h3 className="font-bold text-green-400 mb-2">Your Result</h3>
                  <p>Score: <span className="font-bold">{safeScore(myGuess.score)}</span></p>
                  <p>Distance: <span className="font-bold">{myGuess.distance}km</span></p>
                  {!oppGuess && (
                    <div className="mt-2">
                      <div className="text-yellow-400 font-semibold">Waiting for opponent...</div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                        <div className="bg-yellow-400 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div 
                  className="backdrop-blur rounded-lg p-4 border"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <h3 className="font-bold text-white mb-2">Your Turn</h3>
                  <p className="text-gray-300">Place your pin on the map, select a year, and submit your guess!</p>
                  {firstGuessSubmitted && (
                    <div className="mt-3 p-2 bg-orange-500/20 border border-orange-500/30 rounded">
                      <p className="text-orange-400 text-sm font-bold">⚡ Opponent submitted first!</p>
                      <p className="text-orange-300 text-xs mt-1">Timer reduced to 45 seconds</p>
                    </div>
                  )}
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
                      <span className="font-bold">{safeScore(roundResult.myScore)}</span>
                    </div>
                    <div className="flex justify-between mb-3">
                      <span>Opponent Round Score:</span>
                      <span className="font-bold">{safeScore(roundResult.oppScore)}</span>
                    </div>
                    <hr className="border-gray-600 my-3" />
                    <div className="flex justify-between mb-2 text-lg font-bold">
                      <span>Your Total:</span>
                      <span className="text-green-400">{safeScore(battleState.myTotalScore)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Their Total:</span>
                      <span className="text-blue-400">{safeScore(battleState.oppTotalScore)}</span>
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
                      <span className="text-green-400">{safeScore(battleState.myTotalScore)}</span>
                    </div>
                    <div className="flex justify-between mb-4 text-xl font-bold">
                      <span>Opponent:</span>
                      <span className="text-blue-400">{safeScore(battleState.oppTotalScore)}</span>
                    </div>

                    <hr className="border-gray-600 my-4" />

                    <h5 className="text-sm font-bold mb-3 text-gray-300">Round Breakdown</h5>
                    {battleState.roundScores.map((round, idx) => (
                      <div key={idx} className="flex justify-between text-sm mb-1">
                        <span>Round {round.round}:</span>
                        <span>{safeScore(round.myScore)} - {safeScore(round.oppScore)}</span>
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