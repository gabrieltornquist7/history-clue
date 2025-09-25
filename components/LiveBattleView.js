// components/LiveBattleView.js
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
  const [currentRound, setCurrentRound] = useState(null);
  const [puzzle, setPuzzle] = useState(null);
  const [opponent, setOpponent] = useState(null);
  
  // Game state
  const [myTimer, setMyTimer] = useState(180);
  const [oppTimer, setOppTimer] = useState(180);
  const [myClues, setMyClues] = useState([1]);
  const [oppClues, setOppClues] = useState([1]);
  const [myScore, setMyScore] = useState(10000);
  const [selectedYear, setSelectedYear] = useState(1950);
  const [guessCoords, setGuessCoords] = useState(null);
  const [myGuess, setMyGuess] = useState(null);
  const [oppGuess, setOppGuess] = useState(null);
  
  // UI state
  const [gamePhase, setGamePhase] = useState('waiting'); // waiting, playing, finished
  const [roundResults, setRoundResults] = useState(null);
  const [matchResults, setMatchResults] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [showResults, setShowResults] = useState(false);

  const channelRef = useRef(null);
  const timerRef = useRef(null);

  const CLUE_COSTS = { 1: 0, 2: 1000, 3: 1500, 4: 2000, 5: 3000 };
  const SCORING_POINTS = [5000, 3500, 2500, 1500, 800];

  useEffect(() => {
    if (!battleId || !session?.user) return;

    const loadBattle = async () => {
      // Get battle info
      const { data: battleData, error: battleError } = await supabase
        .from('battles')
        .select(`
          *,
          player1_profile:profiles!battles_player1_fkey(username),
          player2_profile:profiles!battles_player2_fkey(username)
        `)
        .eq('id', battleId)
        .single();

      if (battleError) {
        console.error('Error loading battle:', battleError);
        setView('menu');
        return;
      }

      setBattle(battleData);
      
      // Set opponent
      const isPlayer1 = session.user.id === battleData.player1;
      const oppProfile = isPlayer1 ? battleData.player2_profile : battleData.player1_profile;
      setOpponent({
        id: isPlayer1 ? battleData.player2 : battleData.player1,
        username: oppProfile?.username || 'Anonymous'
      });

      // Get current round
      const { data: roundData, error: roundError } = await supabase
        .from('battle_rounds')
        .select('*')
        .eq('battle_id', battleId)
        .eq('status', 'active')
        .single();

      if (!roundError && roundData) {
        setCurrentRound(roundData);
        
        // Load puzzle
        const { data: puzzleData, error: puzzleError } = await supabase
          .from('puzzles')
          .select('*, puzzle_translations(*)')
          .eq('id', roundData.puzzle_id)
          .single();

        if (!puzzleError && puzzleData) {
          setPuzzle(puzzleData);
          setGamePhase('playing');
        }
      }
    };

    loadBattle();

    // Set up Realtime channel
    const channel = supabase.channel(`live_battle:${battleId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'start_round' }, ({ payload }) => {
        handleStartRound(payload);
      })
      .on('broadcast', { event: 'reveal_clue' }, ({ payload }) => {
        handleOpponentClue(payload);
      })
      .on('broadcast', { event: 'guess' }, ({ payload }) => {
        handleOpponentGuess(payload);
      })
      .on('broadcast', { event: 'opponent_correct' }, ({ payload }) => {
        handleOpponentCorrect(payload);
      })
      .on('broadcast', { event: 'round_result' }, ({ payload }) => {
        handleRoundResult(payload);
      })
      .on('broadcast', { event: 'match_result' }, ({ payload }) => {
        handleMatchResult(payload);
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [battleId, session?.user]);

  // Timer logic
  useEffect(() => {
    if (gamePhase !== 'playing') return;

    timerRef.current = setInterval(() => {
      setMyTimer(prev => {
        if (prev <= 0) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gamePhase]);

  const handleStartRound = async (payload) => {
    setCurrentRound(payload);
    
    // Load puzzle
    const { data: puzzleData, error } = await supabase
      .from('puzzles')
      .select('*, puzzle_translations(*)')
      .eq('id', payload.puzzle_id)
      .single();

    if (!error) {
      setPuzzle(puzzleData);
      setGamePhase('playing');
      setMyTimer(180);
      setOppTimer(180);
      setMyClues([1]);
      setOppClues([1]);
      setMyScore(10000);
      setSelectedYear(1950);
      setGuessCoords(null);
      setMyGuess(null);
      setOppGuess(null);
    }
  };

  const handleOpponentClue = (payload) => {
    if (payload.by !== session.user.id) {
      setOppClues(prev => [...prev, payload.clueIndex].sort());
    }
  };

  const handleOpponentGuess = (payload) => {
    if (payload.by !== session.user.id) {
      setOppGuess({
        lat: payload.lat,
        lng: payload.lng,
        year: payload.year,
        correct: payload.isCorrect
      });
    }
  };

  const handleOpponentCorrect = (payload) => {
    if (payload.by !== session.user.id) {
      setMyTimer(prev => Math.min(prev, 30));
    }
  };

  const handleRoundResult = (payload) => {
    setRoundResults(payload);
    setShowResults(true);
  };

  const handleMatchResult = (payload) => {
    setMatchResults(payload);
    setGamePhase('finished');
  };

  const handleTimeUp = async () => {
    if (!myGuess) {
      // Auto-submit with current location (center of map) and year
      await handleGuessSubmit(true);
    }
  };

  const handleRevealClue = async (clueIndex) => {
    if (myClues.includes(clueIndex) || myScore < CLUE_COSTS[clueIndex]) return;
    
    const newScore = myScore - CLUE_COSTS[clueIndex];
    setMyScore(newScore);
    setMyClues(prev => [...prev, clueIndex].sort());

    // Broadcast and record move
    await supabase.from('battle_moves').insert({
      round_id: currentRound.id,
      player: session.user.id,
      action: 'reveal_clue',
      payload: { clue_index: clueIndex }
    });

    channelRef.current.send({
      type: 'broadcast',
      event: 'reveal_clue',
      payload: { by: session.user.id, clueIndex }
    });
  };

  const handleMapGuess = (latlng) => {
    setGuessCoords(latlng);
  };

  const handleYearChange = (newYear) => {
    const year = Math.max(-1000, Math.min(2025, parseInt(newYear) || 1950));
    setSelectedYear(year);
  };

  const handleGuessSubmit = async (autoSubmit = false) => {
    if (myGuess) return;

    const coords = autoSubmit ? { lat: 0, lng: 0 } : guessCoords;
    if (!coords && !autoSubmit) {
      alert('Please place a pin on the map');
      return;
    }

    const distance = getDistance(
      coords.lat, coords.lng, 
      parseFloat(puzzle.latitude), parseFloat(puzzle.longitude)
    );
    
    const isCorrect = distance < 200; // Within 200km counts as correct
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
      correct: isCorrect,
      score: finalScore,
      distance: Math.round(distance)
    };

    setMyGuess(guessData);

    // Record move
    await supabase.from('battle_moves').insert({
      round_id: currentRound.id,
      player: session.user.id,
      action: 'guess',
      payload: guessData
    });

    // Broadcast guess
    channelRef.current.send({
      type: 'broadcast',
      event: 'guess',
      payload: { 
        by: session.user.id, 
        ...guessData,
        isCorrect: isCorrect 
      }
    });

    // If correct, trigger 30-second timer for opponent
    if (isCorrect) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'opponent_correct',
        payload: { by: session.user.id }
      });
    }

    // Check if round should end
    await checkRoundEnd();
  };

  const checkRoundEnd = async () => {
    // This would typically be handled by a server function
    // For now, we'll do basic client-side logic
    if (myGuess && oppGuess) {
      // Both players finished
      const result = {
        roundNo: currentRound.round_no,
        p1Score: session.user.id === battle.player1 ? myGuess.score : oppGuess.score,
        p2Score: session.user.id === battle.player2 ? myGuess.score : oppGuess.score,
        winner: myGuess.score > oppGuess.score ? session.user.id : opponent.id
      };

      channelRef.current.send({
        type: 'broadcast',
        event: 'round_result',
        payload: result
      });
    }
  };

  const handleNextRound = () => {
    setShowResults(false);
    setRoundResults(null);
    // In a real implementation, this would trigger starting the next round
  };

  const displayYear = (year) => {
    const yearNum = Number(year);
    if (yearNum < 0) return `${Math.abs(yearNum)} BC`;
    return yearNum;
  };

  const getClueText = (clueNumber) => {
    return puzzle?.puzzle_translations?.[0]?.[`clue_${clueNumber}_text`];
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!battle || !puzzle || gamePhase === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-2xl font-serif mb-4">Preparing Battle...</div>
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header Bar */}
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
            <p className="text-sm text-gray-300">
              Round {currentRound?.round_no || 1} of {battle?.best_of || 3}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
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
          {/* Battle Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Panel - Clues */}
            <div className="space-y-4">
              <h2 className="text-xl font-serif font-bold text-yellow-400 mb-4">Clues</h2>
              {[1, 2, 3, 4, 5].map((num) => {
                const isUnlocked = myClues.includes(num);
                const clueText = getClueText(num);
                
                return (
                  <div 
                    key={num}
                    className={`bg-gray-800 rounded-lg border-2 transition-all ${
                      isUnlocked ? 'border-yellow-500' : 'border-gray-600'
                    }`}
                  >
                    {isUnlocked ? (
                      <div className="p-4">
                        <div className="text-yellow-400 font-bold mb-2">Clue {num}</div>
                        <p className="text-gray-300">{clueText}</p>
                      </div>
                    ) : (
                      <button 
                        className="w-full p-4 text-left hover:bg-gray-700 rounded-lg"
                        onClick={() => handleRevealClue(num)}
                        disabled={myScore < CLUE_COSTS[num]}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">🔒 Unlock Clue {num}</span>
                          <span className="text-yellow-500 font-bold">
                            {CLUE_COSTS[num].toLocaleString()}
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

            {/* Center - Map */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl font-serif font-bold text-yellow-400 mb-4">Map</h2>
              <div className="h-96 rounded-lg overflow-hidden border border-gray-600">
                <Map onGuess={handleMapGuess} />
              </div>
              
              {/* Year Selector */}
              <div className="mt-4">
                <h3 className="text-lg font-bold text-white mb-2">Year Guess</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => handleYearChange(e.target.value)}
                    min="-1000"
                    max="2025"
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-center text-yellow-400 font-bold"
                  />
                  <button
                    onClick={() => setSelectedYear(prev => prev + 10)}
                    className="px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                  >
                    +10
                  </button>
                  <button
                    onClick={() => setSelectedYear(prev => prev - 10)}
                    className="px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                  >
                    -10
                  </button>
                </div>
                <div className="text-center mt-2">
                  <span className="text-lg font-bold text-yellow-400">
                    {displayYear(selectedYear)}
                  </span>
                </div>
              </div>

              {/* Guess Button */}
              <button 
                onClick={() => handleGuessSubmit()}
                disabled={!guessCoords || !!myGuess}
                className="w-full mt-4 px-6 py-3 bg-red-700 text-white font-bold rounded hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {!guessCoords ? 'Place Pin First' : myGuess ? 'Guess Submitted' : 'Submit Guess'}
              </button>
            </div>

            {/* Right Panel - Opponent */}
            <div className="space-y-4">
              <h2 className="text-xl font-serif font-bold text-yellow-400 mb-4">
                Opponent: {opponent?.username}
              </h2>
              
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                <p className="text-sm text-gray-400 mb-1">Opponent Timer</p>
                <p className={`text-2xl font-bold ${oppTimer <= 30 ? 'text-red-400' : 'text-white'}`}>
                  {formatTime(oppTimer)}
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                <p className="text-sm text-gray-400 mb-2">Opponent Progress</p>
                <p className="text-white">
                  Clues revealed: <span className="text-yellow-400 font-bold">{oppClues.length}</span>
                </p>
                {oppGuess && (
                  <p className="text-green-400 mt-2">✓ Guess submitted</p>
                )}
              </div>

              {myGuess && oppGuess && (
                <div className="bg-gray-800 rounded-lg p-4 border border-yellow-500">
                  <h3 className="text-lg font-bold text-yellow-400 mb-2">Round Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Your Score:</span>
                      <span className="font-bold">{myGuess.score.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Opponent Score:</span>
                      <span className="font-bold">{oppGuess.score.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-600">
                      <p className={`font-bold text-center ${
                        myGuess.score > oppGuess.score ? 'text-green-400' : 
                        myGuess.score < oppGuess.score ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {myGuess.score > oppGuess.score ? 'You Win This Round!' : 
                         myGuess.score < oppGuess.score ? 'Opponent Wins Round' : 'Round Tied!'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Round Results Modal */}
      {showResults && roundResults && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full text-center border-2 border-yellow-500">
            <h3 className="text-2xl font-serif font-bold text-yellow-400 mb-6">
              Round {roundResults.roundNo} Complete
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-lg">
                <span>You:</span>
                <span className="font-bold">{myGuess?.score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span>{opponent?.username}:</span>
                <span className="font-bold">{oppGuess?.score.toLocaleString()}</span>
              </div>
              
              <div className="pt-4 border-t border-gray-600">
                <p className="text-green-400 font-bold">Answer: {puzzle.city_name}, {puzzle.year}</p>
                <p className="text-sm text-gray-400 mt-1">
                  Your guess was {myGuess?.distance}km away
                </p>
              </div>
            </div>
            
            <button 
              onClick={handleNextRound}
              className="w-full px-6 py-3 bg-red-700 text-white font-bold rounded hover:bg-red-600"
            >
              Next Round
            </button>
          </div>
        </div>
      )}

      {/* Match Results Modal */}
      {matchResults && gamePhase === 'finished' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full text-center border-2 border-yellow-500">
            <h3 className="text-3xl font-serif font-bold text-yellow-400 mb-6">
              Battle Complete!
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="text-2xl font-bold">
                {matchResults.winner === session.user.id ? (
                  <span className="text-green-400">🏆 Victory!</span>
                ) : (
                  <span className="text-red-400">💔 Defeat</span>
                )}
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-lg">Final Score:</p>
                <p className="text-xl font-bold">
                  {matchResults.p1Rounds} - {matchResults.p2Rounds}
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={() => setView('menu')}
                className="w-full px-6 py-3 bg-red-700 text-white font-bold rounded hover:bg-red-600"
              >
                Back to Menu
              </button>
              <button 
                onClick={() => {/* Implement rematch */}}
                className="w-full px-6 py-3 bg-gray-700 text-white font-medium rounded hover:bg-gray-600"
              >
                Request Rematch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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

    // Join matchmaking queue
    const { error: queueError } = await supabase
      .from('match_queue')
      .upsert({ user_id: session.user.id });

    if (queueError) {
      console.error('Error joining queue:', queueError);
      setMode(null);
      setIsSearching(false);
      return;
    }

    // Listen for match found
    const channel = supabase.channel(`queue:${session.user.id}`);
    queueChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'match_found' }, ({ payload }) => {
        setActiveLiveMatch(payload.battleId);
        setView('liveGame');
      })
      .subscribe();

    // Simple matchmaking logic (in production, this would be server-side)
    setTimeout(async () => {
      const { data: queueData } = await supabase
        .from('match_queue')
        .select('user_id')
        .neq('user_id', session.user.id)
        .limit(1);

      if (queueData && queueData.length > 0) {
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

          // Notify both players
          channel.send({
            type: 'broadcast',
            event: 'match_found',
            payload: { battleId: battle.id }
          });

          const oppChannel = supabase.channel(`queue:${opponent.user_id}`);
          oppChannel.send({
            type: 'broadcast',
            event: 'match_found',
            payload: { battleId: battle.id }
          });
        }
      }
    }, 2000);
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
    const { data, error } = await supabase.rpc('create_battle_invite');

    if (error) {
      console.error('Error creating invite:', error);
      return;
    }

    setGeneratedInvite(data);
    setMode('waiting');

    // Listen for opponent joining
    const channel = supabase.channel(`invite:${data.battle_id}`);
    inviteChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'opponent_joined' }, ({ payload }) => {
        setActiveLiveMatch(data.battle_id);
        setView('liveGame');
      })
      .subscribe();
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) return;

    const { data, error } = await supabase.rpc('join_battle_by_code', {
      code: inviteCode.trim().toUpperCase()
    });

    if (error || data.error) {
      alert(data?.error || 'Failed to join battle');
      return;
    }

    setActiveLiveMatch(data.battle_id);
    setView('liveGame');
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
                  Enter a friend's invite code to join their battle.
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
  );}