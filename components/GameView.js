// components/GameView.js
"use client";
import { useState, useEffect } from 'react';
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

export default function GameView({ setView, challenge = null, session, onChallengeComplete, dailyPuzzleInfo = null, onDailyStepComplete = null }) {
  const [puzzle, setPuzzle] = useState(null);
  const [unlockedClues, setUnlockedClues] = useState([1]);
  const [score, setScore] = useState(10000);
  const [selectedYear, setSelectedYear] = useState(1950);
  const [guessCoords, setGuessCoords] = useState(null);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameKey, setGameKey] = useState(0);
  const [xpResults, setXpResults] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const CLUE_COSTS = { 1: 0, 2: 1000, 3: 1500, 4: 2000, 5: 3000 };
  const DIFFICULTY_LABELS = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Super Hard'];

  // Sound effects
  useEffect(() => {
    if (results) {
      const isLevelUp = xpResults?.new_level > xpResults?.old_level;
      let soundFile;

      if (isLevelUp) {
        soundFile = '/sounds/levelup.mp3';
      } else if (results.finalScore >= 5000) {
        soundFile = '/sounds/high_score.mp3';
      } else {
        soundFile = '/sounds/low_score.mp3';
      }
      
      try {
        const audio = new Audio(soundFile);
        audio.play().catch(e => console.error("Audio playback failed:", e));
      } catch (e) {
        console.error("Failed to create audio object:", e);
      }
    }
  }, [results, xpResults]);

  useEffect(() => {
    const fetchPuzzleData = async () => {
      setResults(null);
      setXpResults(null);
      setUnlockedClues([1]);
      setScore(10000);
      setSelectedYear(1950);
      setGuessCoords(null);
      setError(null);
      setIsLoading(true);

      let puzzleData;
      
      try {
        if (challenge) {
          const roundIndex = challenge.current_round - 1;
          const puzzleId = challenge.puzzle_ids[roundIndex];
          const { data, error } = await supabase.from('puzzles').select('*, puzzle_translations(*)').eq('id', puzzleId).single();
          if (error) throw error;
          puzzleData = data;
        } else if (dailyPuzzleInfo) {
          const puzzleId = dailyPuzzleInfo.puzzleId;
          const { data, error } = await supabase
            .from('daily_challenge_puzzles')
            .select('*')
            .eq('id', puzzleId)
            .single();
          if (error) throw error;
          puzzleData = data;
        } else { 
          let attempts = 0;
          const maxAttempts = 3;
          
          while (!puzzleData && attempts < maxAttempts) {
            attempts++;
            
            try {
              const { data: puzzles, error: rpcError } = await supabase.rpc('get_random_puzzles', { limit_count: 1 });
              
              if (!rpcError && puzzles && puzzles.length > 0) {
                puzzleData = puzzles[0];
                break;
              }
              
              console.log(`RPC attempt ${attempts} failed:`, rpcError);
              
              const { count } = await supabase
                .from('puzzles')
                .select('*', { count: 'exact', head: true });
              
              if (count && count > 0) {
                const randomOffset = Math.floor(Math.random() * count);
                
                const { data: directPuzzles, error: directError } = await supabase
                  .from('puzzles')
                  .select('*, puzzle_translations(*)')
                  .range(randomOffset, randomOffset)
                  .limit(1);
                
                if (!directError && directPuzzles && directPuzzles.length > 0) {
                  puzzleData = directPuzzles[0];
                  break;
                }
                
                console.log(`Direct query attempt ${attempts} failed:`, directError);
              }
              
            } catch (attemptError) {
              console.error(`Attempt ${attempts} failed:`, attemptError);
            }
          }
          
          if (!puzzleData) {
            throw new Error("Unable to load puzzle after multiple attempts. Please try again later.");
          }
        }
        
        if (!puzzleData) {
          throw new Error("No puzzle data received.");
        }
        
        if (!puzzleData.latitude || !puzzleData.longitude) {
          throw new Error("Puzzle is missing location coordinates.");
        }
        
        if (dailyPuzzleInfo) {
          if (!puzzleData.clue_1_text) {
            throw new Error("Daily puzzle is missing clue data.");
          }
        } else {
          if (!puzzleData.puzzle_translations || puzzleData.puzzle_translations.length === 0) {
            throw new Error("Puzzle is missing translation data.");
          }
        }
        
        console.log("Successfully loaded puzzle:", puzzleData.id);
        setPuzzle(puzzleData);
        
      } catch (err) {
        console.error("Failed to fetch puzzle data:", err);
        setError(err.message || "Could not load a puzzle. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPuzzleData();
  }, [challenge, gameKey, dailyPuzzleInfo]);

  const handleMapGuess = (latlng) => { setGuessCoords(latlng); };
  const handleUnlockClue = (clueNumber) => { 
    if (results || unlockedClues.includes(clueNumber)) return; 
    const cost = CLUE_COSTS[clueNumber]; 
    if (score >= cost) { 
      setScore(score - cost); 
      setUnlockedClues([...unlockedClues, clueNumber].sort()); 
    } else { 
      alert('Not enough points!'); 
    } 
  };

  const handleYearChange = (newYear) => {
    const year = Math.max(-1000, Math.min(2025, parseInt(newYear) || 1950));
    setSelectedYear(year);
  };

  const adjustYear = (amount) => {
    const newYear = selectedYear + amount;
    setSelectedYear(Math.max(-1000, Math.min(2025, newYear)));
  };

  const handleGuessSubmit = async () => {
    if (!puzzle || !puzzle.latitude || !puzzle.longitude) { alert("Error: Puzzle data is missing location coordinates."); return; }
    if (!guessCoords) { alert('Please place a pin on the map to make a guess.'); return; }

    const distance = getDistance(guessCoords.lat, guessCoords.lng, parseFloat(puzzle.latitude), parseFloat(puzzle.longitude));
    const maxDistance = 20000;
    const distancePenalty = (distance / maxDistance) * 5000;
    const yearDifference = Math.abs(selectedYear - puzzle.year);
    const timePenalty = yearDifference * 25;
    const initialScore = 10000 - (10000 - score);
    let finalScore = Math.max(0, initialScore - distancePenalty - timePenalty);
    if (distance < 50) finalScore += 2000; else if (distance < 200) finalScore += 1000;
    const finalScoreRounded = Math.min(15000, Math.round(finalScore));

    if (session?.user) {
      const { data: xpData, error: xpError } = await supabase.rpc('grant_xp', {
        p_user_id: session.user.id,
        p_score: finalScoreRounded
      });

      if (xpError) {
        console.error('Error granting XP:', xpError);
      } else {
        setXpResults(xpData);
      }
    }

    if (challenge) {
        const isChallenger = session.user.id === challenge.challenger_id;
        const challengerScores = challenge.challenger_scores || [];
        const opponentScores = challenge.opponent_scores || [];
        const updatedScores = isChallenger ? [...challengerScores, finalScoreRounded] : [...opponentScores, finalScoreRounded];
        const scoreColumn = isChallenger ? 'challenger_scores' : 'opponent_scores';
        const isOpponentTurn = !isChallenger;
        const roundJustFinished = isOpponentTurn && (challengerScores.length === challenge.current_round);
        const nextRound = roundJustFinished ? challenge.current_round + 1 : challenge.current_round;
        const isMatchOver = nextRound > 3;

        const updateData = {
            [scoreColumn]: updatedScores,
            current_round: nextRound,
            next_player_id: isChallenger ? challenge.opponent_id : challenge.challenger_id,
            status: isMatchOver ? 'completed' : 'pending'
        };

        if(isMatchOver) {
            const finalChallengerScores = isChallenger ? updatedScores : challengerScores;
            const finalOpponentScores = isOpponentTurn ? updatedScores : opponentScores;
            let challengerWins = 0, opponentWins = 0;
            for(let i=0; i<3; i++){
                if((finalChallengerScores[i] || 0) > (finalOpponentScores[i] || 0)) challengerWins++;
                else if((finalOpponentScores[i] || 0) > (finalChallengerScores[i] || 0)) opponentWins++;
            }
            if (challengerWins > opponentWins) updateData.winner_id = challenge.challenger_id;
            else if (opponentWins > challengerWins) updateData.winner_id = challenge.opponent_id;
        }
        await supabase.from('challenges').update(updateData).eq('id', challenge.id);
    } else if (!dailyPuzzleInfo) {
        await supabase.from('scores').insert({ user_id: session.user.id, score: finalScoreRounded });
    }
    
    setResults({ 
      finalScore: finalScoreRounded, 
      distance: Math.round(distance), 
      answer: { 
        city: puzzle.city_name, 
        historical_entity: puzzle.historical_entity, 
        year: puzzle.year 
      }, 
      guess: { year: selectedYear },
      passedTarget: dailyPuzzleInfo ? finalScoreRounded >= dailyPuzzleInfo.scoreTarget : true
    });
    setShowConfirmModal(false);
  };

  const handlePlayAgain = () => { 
    if (challenge) onChallengeComplete(); 
    else if (dailyPuzzleInfo) onDailyStepComplete(results.finalScore); 
    else { setGameKey(prevKey => prevKey + 1); } 
  };
  
  const displayYear = (year) => { 
    const yearNum = Number(year); 
    if (yearNum < 0) return `${Math.abs(yearNum)} BC`; 
    return yearNum; 
  };

  const getClueText = (clueNumber) => {
    if (dailyPuzzleInfo) {
      return puzzle[`clue_${clueNumber}_text`];
    } else {
      return puzzle?.puzzle_translations?.[0]?.[`clue_${clueNumber}_text`];
    }
  };

  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%)',
          backgroundImage: `
            radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%),
            radial-gradient(circle at 70% 80%, rgba(212, 175, 55, 0.01) 0%, transparent 50%),
            radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)
          `
        }}
      >
        <div className="text-center">
          <div className="text-2xl font-serif text-white mb-4">Loading puzzle...</div>
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !puzzle) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-8"
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%)',
          backgroundImage: `
            radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%),
            radial-gradient(circle at 70% 80%, rgba(212, 175, 55, 0.01) 0%, transparent 50%),
            radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)
          `
        }}
      >
        <div 
          className="text-center p-8 backdrop-blur rounded-xl"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
          <p className="text-red-400 font-bold mb-4 text-2xl font-serif">An Error Occurred</p>
          <p className="text-gray-300 mb-6">{error || "Could not load the puzzle."}</p>
          <button 
            onClick={() => setView('menu')} 
            className="px-6 py-3 bg-gray-800 text-white font-medium rounded-md hover:bg-gray-700 transition-all duration-300 border border-gray-700/30"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%)',
        backgroundImage: `
          radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%),
          radial-gradient(circle at 70% 80%, rgba(212, 175, 55, 0.01) 0%, transparent 50%),
          radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)
        `
      }}
    >
      {/* Header */}
      <header className="flex items-center justify-center p-8 relative">
        <button 
          onClick={() => setView(challenge ? 'challenge' : dailyPuzzleInfo ? 'daily' : 'menu')} 
          className="absolute left-4 px-5 py-2.5 bg-gray-900 text-gray-300 font-medium rounded-md border border-gray-700/30 hover:border-yellow-500/50 hover:text-white transition-all duration-300 relative group"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.01em' }}
        >
          ← Back
          <div 
            className="absolute bottom-0 left-5 right-5 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
            style={{ backgroundColor: '#d4af37' }}
          ></div>
        </button>
        <div className="text-center">
          <h1 className="text-4xl font-serif font-bold text-white mb-2" style={{ letterSpacing: '0.02em' }}>
            HistoryClue
          </h1>
          <p className="text-sm text-gray-300">
            {dailyPuzzleInfo ? (
              <>
                Daily Challenge - Puzzle {dailyPuzzleInfo.step} 
                <span className="block text-xs" style={{ color: '#d4af37' }}>
                  ({DIFFICULTY_LABELS[dailyPuzzleInfo.step - 1]})
                </span>
              </>
            ) : challenge ? (
              `Challenge - Round ${challenge.current_round}`
            ) : (
              'Endless Mode'
            )}
          </p>
          {dailyPuzzleInfo && (
            <p className="text-lg font-bold mt-2" style={{ color: '#d4af37' }}>
              Score to Pass: {dailyPuzzleInfo.scoreTarget.toLocaleString()}
            </p>
          )}
        </div>
      </header>

      {/* Main Game Area */}
      <div className="px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          
          {/* Clues Section */}
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((num) => {
              const isUnlocked = unlockedClues.includes(num);
              const clueText = getClueText(num);
              
              return (
                <div 
                  key={num}
                  className="backdrop-blur rounded-lg border transition-all duration-300 hover:border-yellow-500/30"
                  style={{ 
                    backgroundColor: isUnlocked ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  {isUnlocked ? (
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#d4af37' }}></div>
                        <span className="font-serif font-bold text-white">Clue {num}</span>
                      </div>
                      <p className={`text-gray-300 leading-relaxed ${num === 1 ? 'italic text-lg' : ''}`}>
                        {clueText || 'Loading...'}
                      </p>
                    </div>
                  ) : (
                    <button 
                      className="w-full p-6 text-left group hover:bg-white/5 transition-all duration-300" 
                      onClick={() => handleUnlockClue(num)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full border-2 border-gray-600 flex items-center justify-center group-hover:border-yellow-500 transition-colors">
                            <svg className="w-4 h-4 text-gray-600 group-hover:text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <span className="font-semibold text-white group-hover:text-yellow-500 transition-colors">Unlock Clue {num}</span>
                            <p className="text-sm text-gray-500">Reveal the next piece of evidence</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-yellow-500">
                            {CLUE_COSTS[num].toLocaleString()}
                          </span>
                          <p className="text-xs text-gray-500">points</p>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Map & Guess Panel */}
          <div 
            className="backdrop-blur rounded-lg border p-6 space-y-6 hover:border-yellow-500/20 transition-all duration-300"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Map */}
            <div>
              <h3 className="text-lg font-serif font-bold text-white mb-3 text-center">Guess Location</h3>
              <div 
                className="rounded-lg overflow-hidden border-2 hover:border-yellow-500/50 transition-colors duration-300" 
                style={{ border: '2px solid rgba(255, 255, 255, 0.1)' }}
              >
                <div className="h-80">
                  <Map onGuess={handleMapGuess} />
                </div>
              </div>
            </div>

            {/* Year Selector */}
            <div>
              <h3 className="text-lg font-serif font-bold text-white mb-3">Year Guess</h3>
              <div className="space-y-4">
                {/* Direct Input */}
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => handleYearChange(e.target.value)}
                    min="-1000"
                    max="2025"
                    className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-md text-white font-mono text-center focus:border-yellow-500 focus:outline-none transition-colors"
                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => adjustYear(10)}
                      className="px-3 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 hover:text-white transition-colors text-sm"
                    >
                      +10
                    </button>
                    <button
                      onClick={() => adjustYear(1)}
                      className="px-3 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 hover:text-white transition-colors text-sm"
                    >
                      +1
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => adjustYear(-10)}
                      className="px-3 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 hover:text-white transition-colors text-sm"
                    >
                      -10
                    </button>
                    <button
                      onClick={() => adjustYear(-1)}
                      className="px-3 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 hover:text-white transition-colors text-sm"
                    >
                      -1
                    </button>
                  </div>
                </div>

                {/* Display */}
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                  <p className="text-sm text-gray-400 mb-1">Your guess:</p>
                  <p className="text-2xl font-bold text-white">{displayYear(selectedYear)}</p>
                </div>
              </div>
            </div>

            {/* Score Display */}
            <div className="p-4 rounded-lg border" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', borderColor: 'rgba(212, 175, 55, 0.2)' }}>
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-1 uppercase tracking-wide">Potential Score</p>
                <p className="text-2xl font-bold" style={{ color: '#d4af37' }}>
                  {score.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">points remaining</p>
              </div>
            </div>

            {/* Make Guess Button */}
            <button 
              onClick={() => setShowConfirmModal(true)}
              disabled={!guessCoords || !!results}
              className="w-full px-8 py-4 font-bold text-white rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                background: !guessCoords || !!results ? '#374151' : 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                letterSpacing: '-0.01em'
              }}
              onMouseEnter={(e) => {
                if (!e.target.disabled) {
                  e.target.style.boxShadow = '0 0 0 2px rgba(212, 175, 55, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = 'none';
              }}
            >
              {!guessCoords ? 'Place a Pin on the Map' : 'Make Guess'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div 
            className="backdrop-blur rounded-xl p-8 max-w-md w-full text-center"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <h3 className="text-2xl font-serif font-bold text-white mb-4">Confirm Your Guess</h3>
            <div className="space-y-3 mb-6">
              <p className="text-gray-300">
                <span className="font-semibold">Year:</span> {displayYear(selectedYear)}
              </p>
              <p className="text-gray-300">
                <span className="font-semibold">Potential Score:</span> 
                <span className="font-bold ml-1" style={{ color: '#d4af37' }}>
                  {score.toLocaleString()}
                </span>
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-3 bg-gray-800 text-gray-300 font-medium rounded-md hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGuessSubmit}
                className="flex-1 px-4 py-3 font-bold text-white rounded-md transition-colors"
                style={{ background: 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {results && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div 
            className="backdrop-blur rounded-xl p-8 max-w-md w-full text-center shadow-2xl"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              border: '2px solid rgba(212, 175, 55, 0.3)'
            }}
          >
            <h2 className="text-3xl font-serif font-bold text-white mb-6">Round Complete</h2>
            
            {/* Daily Challenge Result */}
            {dailyPuzzleInfo && (
              <div 
                className="mb-6 p-4 rounded-lg border-2"
                style={{ 
                  backgroundColor: results.passedTarget ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  borderColor: results.passedTarget ? '#22c55e' : '#ef4444'
                }}
              >
                <p className={`text-xl font-bold ${results.passedTarget ? 'text-green-400' : 'text-red-400'}`}>
                  {results.passedTarget ? '✓ Target Reached!' : '✗ Target Missed'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Target: {dailyPuzzleInfo.scoreTarget.toLocaleString()} | 
                  Your Score: {results.finalScore.toLocaleString()}
                </p>
              </div>
            )}
            
            <div className="space-y-4 mb-6">
              <div>
                <h4 className="text-lg font-serif font-bold text-gray-300 mb-2">Correct Answer</h4>
                <p className="text-green-400 font-semibold text-lg">{results.answer.city}, {results.answer.historical_entity}</p>
                <p className="text-green-400 font-semibold">{displayYear(results.answer.year)}</p>
              </div>
              <div>
                <h4 className="text-lg font-serif font-bold text-gray-300 mb-2">Distance</h4>
                <p className="text-white">Your guess was <span className="font-bold">{results.distance} km</span> away</p>
              </div>
            </div>
            
            <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)' }}>
              <h3 className="text-2xl font-serif font-bold mb-2" style={{ color: '#d4af37' }}>
                Final Score: {results.finalScore.toLocaleString()}
              </h3>
            </div>
            
            {xpResults && (
              <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                <p className="font-bold text-lg" style={{ color: '#d4af37' }}>
                  +{xpResults.xp_gained.toLocaleString()} XP
                </p>
                {xpResults.new_level > xpResults.old_level && (
                  <p className="font-bold text-2xl text-green-400 animate-pulse mt-2">
                    LEVEL UP! You are now Level {xpResults.new_level}!
                  </p>
                )}
                <div className="w-full bg-gray-700 rounded-full h-3 my-3 overflow-hidden">
                  <div 
                    className="h-3 rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${(xpResults.new_xp / xpResults.xp_for_new_level) * 100}%`,
                      backgroundColor: '#d4af37'
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400">
                  {xpResults.new_xp.toLocaleString()} / {xpResults.xp_for_new_level.toLocaleString()} XP
                </p>
              </div>
            )}
            
            <button 
              onClick={handlePlayAgain} 
              className="w-full px-8 py-4 font-bold text-white rounded-md transition-all duration-300"
              style={{ 
                background: 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
            >
              {challenge ? 'Back to Challenges' : dailyPuzzleInfo ? 'Continue' : 'Play Again'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}