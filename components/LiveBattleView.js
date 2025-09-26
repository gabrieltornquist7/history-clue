// components/LiveBattleView.js - SIMPLE VERSION THAT ACTUALLY WORKS
"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import dynamic from 'next/dynamic';

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
  const [battle, setBattle] = useState(null);
  const [puzzle, setPuzzle] = useState(null);
  const [opponent, setOpponent] = useState(null);
  
  // Game state
  const [myTimer, setMyTimer] = useState(180);
  const [myClues, setMyClues] = useState([1]);
  const [myScore, setMyScore] = useState(10000);
  const [selectedYear, setSelectedYear] = useState(1950);
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
    let battleChannel = null;
    let roundChannel = null;

    const initializeBattle = async () => {
      try {
        console.log('Initializing battle:', battleId);

        // 1. Load battle info
        const { data: battleData, error: battleError } = await supabase
          .from('battles')
          .select('*')
          .eq('id', battleId)
          .single();

        if (battleError || !battleData) {
          throw new Error('Battle not found');
        }

        if (!isMounted) return;

        // 2. Load related player profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', [battleData.player1, battleData.player2].filter(Boolean));

        if (profilesError) {
          console.error('Failed to load profiles:', profilesError);
        }

        // 3. Attach profiles back to battle object
        battleData.player1_profile = profiles?.find(p => p.id === battleData.player1) || null;
        battleData.player2_profile = profiles?.find(p => p.id === battleData.player2) || null;

        setBattle(battleData);
        console.log('Battle loaded:', battleData);

        // Set opponent
        const isPlayer1 = session.user.id === battleData.player1;
        const oppProfile = isPlayer1 ? battleData.player2_profile : battleData.player1_profile;
        setOpponent({
          id: isPlayer1 ? battleData.player2 : battleData.player1,
          username: oppProfile?.username || 'Anonymous'
        });

        // 2. Setup realtime channel for battle
        battleChannel = supabase.channel(`live_battle:${battleId}`);

        battleChannel
          .on('broadcast', { event: 'opponent_joined' }, ({ payload }) => {
            console.log('Opponent joined:', payload);
          })
          .on('broadcast', { event: 'opponent_guess' }, ({ payload }) => {
            console.log('Opponent made guess:', payload);
            setOppGuess(payload.guess);

            // Both players finished, show results
            if (myGuess) {
              setRoundResult({
                myScore: myGuess.score,
                oppScore: payload.guess.score,
                winner: myGuess.score > payload.guess.score ? 'me' : myGuess.score < payload.guess.score ? 'opponent' : 'tie'
              });
              setGameFinished(true);
            }
          })
          .on('broadcast', { event: 'clue_revealed' }, ({ payload }) => {
            console.log('Opponent revealed clue:', payload);
          })
          .on('broadcast', { event: 'guess_made' }, ({ payload }) => {
            console.log('First guess made by:', payload.by);
            if (payload.by !== session.user.id && !firstGuessSubmitted) {
              // Timer drop to 45 seconds when opponent makes first guess
              setMyTimer(45);
            }
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && isMounted) {
              console.log('Connected to battle channel');
              // Announce that we've joined
              await battleChannel.send({
                type: 'broadcast',
                event: 'opponent_joined',
                payload: {
                  player: session.user.id,
                  username: session.user.user_metadata?.username || 'Player'
                }
              });
            }
          });

        // 3. Setup realtime channel for round changes
        roundChannel = supabase.channel(`battle_rounds:${battleId}`);

        roundChannel
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'battle_rounds', filter: `battle_id=eq.${battleId}` },
            (payload) => {
              console.log('Round update:', payload);
              handleRoundUpdate(payload.new);
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('Connected to rounds channel');
            }
          });

        // 4. Check if there's an active round
        let { data: existingRound, error: roundError } = await supabase
          .from('battle_rounds')
          .select('*')
          .eq('battle_id', battleId)
          .eq('status', 'active')
          .single();

        if (roundError && roundError.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error('Error checking for rounds:', roundError);
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

          const { data: newRound, error: createError } = await supabase
            .from('battle_rounds')
            .insert({
              battle_id: battleId,
              round_no: 1,
              puzzle_id: randomPuzzle.id,
              status: 'active',
              started_at: new Date().toISOString()
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating round:', createError);
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

        // 7. Load any existing moves
        const { data: moves } = await supabase
          .from('battle_moves')
          .select('*')
          .eq('round_id', existingRound.id)
          .eq('player', session.user.id);

        if (moves && moves.length > 0) {
          // Process existing moves
          let clues = [1];
          let score = 10000;
          let guess = null;

          moves.forEach(move => {
            if (move.action === 'reveal_clue') {
              clues.push(move.payload.clue_index);
              score -= CLUE_COSTS[move.payload.clue_index] || 0;
            } else if (move.action === 'guess') {
              guess = move.payload;
            }
          });

          setMyClues([...new Set(clues)].sort());
          setMyScore(Math.max(0, score));
          if (guess) {
            setMyGuess(guess);
            setGuessCoords({ lat: guess.lat, lng: guess.lng });
            setSelectedYear(guess.year);
          }
        }

        // 8. Check for existing opponent guess
        const { data: oppMoves } = await supabase
          .from('battle_moves')
          .select('payload')
          .eq('round_id', existingRound.id)
          .neq('player', session.user.id)
          .eq('action', 'guess');

        if (oppMoves && oppMoves.length > 0) {
          setOppGuess(oppMoves[0].payload);
        }

        setLoading(false);
        startTimer();

      } catch (err) {
        console.error('Error initializing battle:', err);
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
      if (battleChannel) {
        supabase.removeChannel(battleChannel);
      }
      if (roundChannel) {
        supabase.removeChannel(roundChannel);
      }
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

    // Broadcast clue reveal to opponent
    const battleChannel = supabase.getChannels().find(c => c.topic === `live_battle:${battleId}`);
    if (battleChannel) {
      await battleChannel.send({
        type: 'broadcast',
        event: 'clue_revealed',
        payload: {
          player: session.user.id,
          clue_index: clueIndex
        }
      });
    }
  };

  const handleMapGuess = (latlng) => {
    if (myGuess) return;
    setGuessCoords(latlng);
  };

  const handleYearChange = (newYear) => {
    if (myGuess) return;
    const year = Math.max(-1000, Math.min(2025, parseInt(newYear) || 1950));
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

    // Broadcast first guess event to trigger timer drop
    const battleChannel = supabase.getChannels().find(c => c.topic === `live_battle:${battleId}`);
    if (battleChannel) {
      // First broadcast the guess_made event for timer drop
      if (!firstGuessSubmitted && !oppGuess) {
        await battleChannel.send({
          type: 'broadcast',
          event: 'guess_made',
          payload: { by: session.user.id }
        });
        setFirstGuessSubmitted(true);
      }

      // Then broadcast the actual guess
      await battleChannel.send({
        type: 'broadcast',
        event: 'opponent_guess',
        payload: {
          player: session.user.id,
          guess: guessData
        }
      });
    }

    // Check if opponent already finished (for late joiners)
    if (oppGuess) {
      setRoundResult({
        myScore: guessData.score,
        oppScore: oppGuess.score,
        winner: guessData.score > oppGuess.score ? 'me' : guessData.score < oppGuess.score ? 'opponent' : 'tie'
      });
      setGameFinished(true);
    }
  };

  const handleRoundUpdate = (round) => {
    if (!round) return;

    console.log('Processing round update:', round);
    setCurrentRound(round);

    // Check if both players have submitted guesses in this round
    const checkBothPlayersGuessed = async () => {
      try {
        const { data: allMoves, error } = await supabase
          .from('battle_moves')
          .select('player, action')
          .eq('round_id', round.id)
          .eq('action', 'guess');

        if (error) {
          console.error('Error checking moves:', error);
          return;
        }

        const uniquePlayers = new Set(allMoves?.map(move => move.player) || []);
        console.log('Players who have guessed:', uniquePlayers.size, 'out of 2');

        if (uniquePlayers.size >= 2 && round.status === 'active') {
          console.log('Both players have guessed, finishing round and starting next');

          // Mark current round as finished
          await supabase
            .from('battle_rounds')
            .update({ status: 'finished', finished_at: new Date().toISOString() })
            .eq('id', round.id);

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

              const { data: newRound, error: createError } = await supabase
                .from('battle_rounds')
                .insert({
                  battle_id: round.battle_id,
                  round_no: (round.round_no || 1) + 1,
                  puzzle_id: randomPuzzle.id,
                  status: 'active',
                  started_at: new Date().toISOString()
                })
                .select()
                .single();

              if (createError) {
                console.error('Error creating next round:', createError);
                return;
              }

              console.log('Created next round:', newRound);

              // Reset game state for new round
              currentRoundId.current = newRound.id;
              setMyTimer(180); // Reset to 3 minutes
              setMyClues([1]);
              setMyScore(10000);
              setMyGuess(null);
              setOppGuess(null);
              setGuessCoords(null);
              setSelectedYear(1950);
              setGameFinished(false);
              setRoundResult(null);
              setFirstGuessSubmitted(false);

              // Load new puzzle
              const { data: newPuzzleData, error: newPuzzleError } = await supabase
                .from('puzzles')
                .select('*, puzzle_translations(*)')
                .eq('id', newRound.puzzle_id)
                .single();

              if (!newPuzzleError && newPuzzleData) {
                setPuzzle(newPuzzleData);
                console.log('Loaded new puzzle for round', newRound.round_no);
              }

              // Restart timer
              startTimer();

            } catch (err) {
              console.error('Error setting up next round:', err);
            }
          }, 3000); // 3 second delay to show results
        }
      } catch (err) {
        console.error('Error in round progression:', err);
      }
    };

    // Only check for round progression if the round just became active or got updated
    if (round.status === 'active') {
      checkBothPlayersGuessed();
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
    if (yearNum < 0) return `${Math.abs(yearNum)} BC`;
    return yearNum;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl">Loading Battle...</div>
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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => setView('menu')}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700"
          >
            ← Exit Battle
          </button>
          
          <div className="text-center">
            <h1 className="text-2xl font-serif font-bold text-yellow-400">Live Battle</h1>
            <p className="text-sm text-gray-300">vs {opponent?.username}</p>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-400">Your Timer</p>
            <p className={`text-2xl font-bold ${myTimer <= 30 ? 'text-red-400' : 'text-white'}`}>
              {formatTime(myTimer)}
            </p>
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
                <div className="text-center">
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
                  {!oppGuess && <p className="text-yellow-400 mt-2">Waiting for opponent...</p>}
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
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
  );
}