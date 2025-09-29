// components/GameView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { SILENT_AUDIO_URL } from '../public/sounds/silence.js';
import dynamic from 'next/dynamic';
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

export default function GameView({ setView, challenge = null, session, onChallengeComplete, dailyPuzzleInfo = null, onDailyStepComplete = null }) {
  console.log('[GameView] Rendered with setView:', typeof setView);
  const [puzzle, setPuzzle] = useState(null);
  const [unlockedClues, setUnlockedClues] = useState([1]);
  const [score, setScore] = useState(10000);
  const [selectedYear, setSelectedYear] = useState(0);
  const [guessCoords, setGuessCoords] = useState(null);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameKey, setGameKey] = useState(0);
  const [xpResults, setXpResults] = useState(null);
  const [coinResults, setCoinResults] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [endlessModeLevel, setEndlessModeLevel] = useState(1);
  const [endlessLevelResults, setEndlessLevelResults] = useState(null);

  const CLUE_COSTS = { 1: 0, 2: 1000, 3: 1500, 4: 2000, 5: 3000 };
  const DIFFICULTY_LABELS = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Super Hard'];

  // Endless Mode Level System
  const getEndlessDifficulty = (level) => {
    const cycleLevel = ((level - 1) % 10) + 1;
    if (cycleLevel <= 4) return 'easy';
    if (cycleLevel <= 8) return 'medium';
    return 'hard';
  };

  const getScoreThreshold = (level) => {
    const difficulty = getEndlessDifficulty(level);
    switch (difficulty) {
      case 'easy': return 3000;
      case 'medium': return 5000;
      case 'hard': return 7500;
      default: return 3000;
    }
  };

  const getDifficultyLabel = (level) => {
    const difficulty = getEndlessDifficulty(level);
    const cycleLevel = ((level - 1) % 10) + 1;
    return {
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard'
    }[difficulty];
  };

  const getXpMultiplier = (level) => {
    const difficulty = getEndlessDifficulty(level);
    switch (difficulty) {
      case 'easy': return 0.5;    // Lower XP for easy levels
      case 'medium': return 1.0;  // Normal XP for medium levels
      case 'hard': return 1.5;    // Higher XP for hard levels
      default: return 1.0;
    }
  };

  const getCoinReward = (level) => {
    const difficulty = getEndlessDifficulty(level);
    switch (difficulty) {
      case 'easy': return 15;     // Easy difficulty: 15 coins
      case 'medium': return 25;   // Medium difficulty: 25 coins
      case 'hard': return 35;     // Hard difficulty: 35 coins
      default: return 15;
    }
  };

  // Fetch puzzle based on difficulty level for endless mode
  const fetchPuzzleByDifficulty = async (difficulty) => {
    console.log(`Fetching puzzle for difficulty: ${difficulty}`);

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        // Get count of puzzles matching difficulty criteria
        const { count } = await supabase
          .from('puzzles')
          .select('*', { count: 'exact', head: true })
          .eq('difficulty', difficulty);

        if (count && count > 0) {
          const randomOffset = Math.floor(Math.random() * count);

          const { data: puzzles, error } = await supabase
            .from('puzzles')
            .select('*, puzzle_translations(*)')
            .eq('difficulty', difficulty)
            .range(randomOffset, randomOffset)
            .limit(1);

          if (!error && puzzles && puzzles.length > 0) {
            console.log(`Found ${difficulty} puzzle:`, puzzles[0].id, puzzles[0].city_name);
            return puzzles[0];
          }

          console.log(`Difficulty-based query attempt ${attempts} failed:`, error);
        }
      } catch (attemptError) {
        console.error(`Difficulty fetch attempt ${attempts} failed:`, attemptError);
      }

      // If difficulty-based selection fails, try falling back to easier criteria
      if (attempts === maxAttempts - 1 && difficulty !== 'easy') {
        console.log('Falling back to easy difficulty...');
        return await fetchPuzzleByDifficulty('easy');
      }
    }

    // Ultimate fallback - get any random puzzle (no difficulty filter)
    console.log('Using ultimate fallback - any random puzzle');
    const { data: fallbackPuzzles, error: fallbackError } = await supabase.rpc('get_random_puzzles', { limit_count: 1 });
    if (!fallbackError && fallbackPuzzles && fallbackPuzzles.length > 0) {
      return fallbackPuzzles[0];
    }

    throw new Error('Unable to load any puzzle');
  };

  // Fetch user's endless mode level on component load
  useEffect(() => {
    const fetchEndlessModeLevel = async () => {
      if (session?.user && !challenge && !dailyPuzzleInfo) {
        // Only fetch for endless mode (not challenges or daily puzzles)
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('endless_mode_level')
            .eq('id', session.user.id)
            .single();

          if (!error && data) {
            setEndlessModeLevel(data.endless_mode_level || 1);
          }
        } catch (err) {
          console.error('Error fetching endless mode level:', err);
        }
      }
    };

    fetchEndlessModeLevel();
  }, [session, challenge, dailyPuzzleInfo]);

  // Sound effects
  useEffect(() => {
    if (results) {
      try {
        // Use silent audio for development - all sound effects use the same placeholder
        const audio = new Audio(SILENT_AUDIO_URL);
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
      setCoinResults(null);
      setEndlessLevelResults(null);
      setUnlockedClues([1]);
      setScore(10000);
      setSelectedYear(0);
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
            .select(`
              *,
              daily_challenge_translations!daily_challenge_id (
                language_code,
                clue_1_text,
                clue_2_text,
                clue_3_text,
                clue_4_text,
                clue_5_text
              )
            `)
            .eq('id', puzzleId)
            .eq('daily_challenge_translations.language_code', 'en')
            .single();
          if (error) throw error;
          puzzleData = data;
        } else {
          // Endless mode - fetch puzzle based on difficulty level
          const currentDifficulty = getEndlessDifficulty(endlessModeLevel);
          puzzleData = await fetchPuzzleByDifficulty(currentDifficulty);
        }
        
        if (!puzzleData) {
          throw new Error("No puzzle data received.");
        }
        
        if (!puzzleData.latitude || !puzzleData.longitude) {
          throw new Error("Puzzle is missing location coordinates.");
        }
        
        if (dailyPuzzleInfo) {
          if (!puzzleData.daily_challenge_translations || puzzleData.daily_challenge_translations.length === 0) {
            throw new Error("Daily puzzle is missing translation data.");
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
  }, [challenge, gameKey, dailyPuzzleInfo, endlessModeLevel]);

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
    const year = Math.max(-3000, Math.min(2025, parseInt(newYear) || 0));
    setSelectedYear(year);
  };

  const adjustYear = (amount) => {
    const newYear = selectedYear + amount;
    const adjustedYear = Math.max(-3000, Math.min(2025, newYear));
    setSelectedYear(adjustedYear);
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
      // For endless mode, apply XP multiplier based on difficulty
      let xpScore = finalScoreRounded;
      let endlessLevelProgress = null;

      if (!challenge && !dailyPuzzleInfo) {
        // This is endless mode
        const xpMultiplier = getXpMultiplier(endlessModeLevel);
        xpScore = Math.round(finalScoreRounded * xpMultiplier);

        // Check if user passed the current endless mode level
        const threshold = getScoreThreshold(endlessModeLevel);
        const passedLevel = finalScoreRounded >= threshold;

        if (passedLevel) {
          // Update user's endless mode level
          const newLevel = endlessModeLevel + 1;
          const { error: levelUpdateError } = await supabase
            .from('profiles')
            .update({ endless_mode_level: newLevel })
            .eq('id', session.user.id);

          if (!levelUpdateError) {
            setEndlessModeLevel(newLevel);
            endlessLevelProgress = {
              oldLevel: endlessModeLevel,
              newLevel: newLevel,
              threshold: threshold,
              score: finalScoreRounded,
              passed: true
            };
          }
        } else {
          endlessLevelProgress = {
            oldLevel: endlessModeLevel,
            newLevel: endlessModeLevel,
            threshold: threshold,
            score: finalScoreRounded,
            passed: false
          };
        }

        setEndlessLevelResults(endlessLevelProgress);
      }

      // Grant XP (with multiplier for endless mode)
      const { data: xpData, error: xpError } = await supabase.rpc('grant_xp', {
        p_user_id: session.user.id,
        p_score: xpScore
      });

      if (xpError) {
        console.error('Error granting XP:', xpError);
      } else {
        setXpResults(xpData);
      }

      // Award coins for endless mode
      if (!challenge && !dailyPuzzleInfo) {
        const coinsEarned = getCoinReward(endlessModeLevel);
        const difficulty = getEndlessDifficulty(endlessModeLevel);

        const { data: coinData, error: coinError } = await supabase.rpc('award_coins', {
          user_id: session.user.id,
          amount: coinsEarned,
          source: `endless_${difficulty}`,
          game_mode: 'endless',
          metadata: { difficulty: difficulty, level: endlessModeLevel }
        });

        if (coinError) {
          console.error('Error awarding coins:', coinError);
        } else {
          setCoinResults({
            coinsEarned: coinsEarned,
            difficulty: difficulty,
            level: endlessModeLevel
          });
        }
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

        // Award coins for completed challenge friend match
        if(isMatchOver && updateData.winner_id) {
          const winnerId = updateData.winner_id;
          const loserId = winnerId === challenge.challenger_id ? challenge.opponent_id : challenge.challenger_id;

          // Award coins to winner (50 coins)
          const { error: winnerCoinError } = await supabase.rpc('award_coins', {
            user_id: winnerId,
            amount: 50,
            source: 'challenge_friend_win',
            game_mode: 'challenge_friend',
            metadata: { opponent_id: loserId, challenge_id: challenge.id }
          });

          if (winnerCoinError) {
            console.error('Error awarding coins to winner:', winnerCoinError);
          }

          // Set coin results if current user is the winner
          if (session.user.id === winnerId) {
            setCoinResults({
              coinsEarned: 50,
              result: 'win',
              gameMode: 'challenge_friend'
            });
          } else {
            // Current user is the loser, gets 0 coins
            setCoinResults({
              coinsEarned: 0,
              result: 'loss',
              gameMode: 'challenge_friend'
            });
          }
        }
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
    // Reset results for next game
    setCoinResults(null);
    setXpResults(null);
    setResults(null);
    setEndlessLevelResults(null);

    if (challenge) onChallengeComplete();
    else if (dailyPuzzleInfo) onDailyStepComplete(results.finalScore);
    else { setGameKey(prevKey => prevKey + 1); }
  };
  
  const displayYear = (year) => {
    const yearNum = Number(year);
    if (yearNum < 0) return `${Math.abs(yearNum)} BCE`;
    if (yearNum === 0) return `Year 0`;
    return `${yearNum} CE`;
  };

  const getClueText = (clueNumber) => {
    if (dailyPuzzleInfo) {
      return puzzle?.daily_challenge_translations?.[0]?.[`clue_${clueNumber}_text`];
    } else {
      return puzzle?.puzzle_translations?.[0]?.[`clue_${clueNumber}_text`];
    }
  };

  if (isLoading) {
    return (
      <div 
        className="min-h-screen relative flex items-center justify-center"
        style={{
          background: `
            linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%),
            radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%),
            radial-gradient(circle at 70% 80%, rgba(212, 175, 55, 0.01) 0%, transparent 50%),
            radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)
          `
        }}
      >
        {/* Metallic shine overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(115deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.08) 100%)",
            backgroundSize: "200% 200%",
            animation: "shine 12s linear infinite",
          }}
        ></div>

        <style jsx>{`
          @keyframes shine {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>

        <div className="text-center relative z-10">
          <div className="text-2xl font-serif text-white mb-4">Loading puzzle...</div>
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !puzzle) {
    return (
      <div 
        className="min-h-screen relative flex flex-col items-center justify-center p-8"
        style={{
          background: `
            linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%),
            radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%),
            radial-gradient(circle at 70% 80%, rgba(212, 175, 55, 0.01) 0%, transparent 50%),
            radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)
          `
        }}
      >
        {/* Metallic shine overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(115deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.08) 100%)",
            backgroundSize: "200% 200%",
            animation: "shine 12s linear infinite",
          }}
        ></div>

        <style jsx>{`
          @keyframes shine {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>

        <div 
          className="text-center p-8 backdrop-blur rounded-xl relative z-10"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 0 0 1px rgba(212, 175, 55, 0.2)'
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
      className="min-h-screen relative"
      style={{
        background: `
          linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%),
          radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%),
          radial-gradient(circle at 70% 80%, rgba(212, 175, 55, 0.01) 0%, transparent 50%),
          radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)
        `
      }}
    >
      {/* Metallic shine overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(115deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.08) 100%)",
          backgroundSize: "200% 200%",
          animation: "shine 12s linear infinite",
        }}
      ></div>

      <style jsx>{`
        @keyframes shine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes shimmerLock {
          0% { opacity: 0.3; }
          50% { opacity: 0.8; }
          100% { opacity: 0.3; }
        }
        @keyframes goldReveal {
          0% { 
            opacity: 0; 
            transform: scale(0.95); 
            box-shadow: 0 0 0 rgba(212, 175, 55, 0);
          }
          100% { 
            opacity: 1; 
            transform: scale(1); 
            box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
          }
        }
        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .shimmer-lock {
          animation: shimmerLock 2s ease-in-out infinite;
        }
        .gold-reveal {
          animation: goldReveal 0.5s ease-out;
        }
        .slide-up {
          animation: slideUp 0.6s ease-out;
        }
      `}</style>

      <GlassBackButton
        onClick={() => {
          console.log('[GameView] Back button clicked');
          const targetView = challenge ? 'challenge' : dailyPuzzleInfo ? 'daily' : 'menu';
          if (setView && typeof setView === 'function') {
            setView(targetView);
          } else {
            console.error('[GameView] setView is not a function:', setView);
          }
        }}
        fallbackUrl="/"
      />

      {/* Header */}
      <header className="p-8 relative z-10">
        <div className="text-center max-w-7xl mx-auto">
            <h1 
              className="text-3xl sm:text-4xl font-serif font-bold text-white mb-2" 
              style={{ 
                letterSpacing: '0.02em',
                textShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
              }}
            >
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
                <>
                  Level {endlessModeLevel}: {getDifficultyLabel(endlessModeLevel)}
                </>
              )}
            </p>
            {dailyPuzzleInfo && (
              <p className="text-lg font-bold mt-2" style={{ color: '#d4af37' }}>
                Score to Pass: {dailyPuzzleInfo.scoreTarget.toLocaleString()}
              </p>
            )}
            {!challenge && !dailyPuzzleInfo && (
              <p className="text-lg font-bold mt-2" style={{ color: '#d4af37' }}>
                Score to Pass Level: {getScoreThreshold(endlessModeLevel).toLocaleString()}
              </p>
            )}
          </div>
      </header>

      {/* Main Game Area */}
      <div className="px-4 sm:px-8 pb-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 max-w-7xl mx-auto">
          
          {/* Clues Section */}
          <div className="space-y-4 slide-up">
            {[1, 2, 3, 4, 5].map((num) => {
              const isUnlocked = unlockedClues.includes(num);
              const clueText = getClueText(num);
              
              return (
                <div 
                  key={num}
                  className={`backdrop-blur rounded-lg border transition-all duration-300 ${isUnlocked ? 'gold-reveal' : ''}`}
                  style={{ 
                    backgroundColor: isUnlocked ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
                    border: isUnlocked 
                      ? '2px solid rgba(212, 175, 55, 0.3)' 
                      : '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: isUnlocked 
                      ? '0 0 20px rgba(212, 175, 55, 0.1)' 
                      : 'none'
                  }}
                >
                  {isUnlocked ? (
                    <div className="p-4 sm:p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ 
                            backgroundColor: '#d4af37',
                            boxShadow: '0 0 10px rgba(212, 175, 55, 0.5)'
                          }}
                        ></div>
                        <span 
                          className="font-serif font-bold text-lg"
                          style={{ 
                            color: '#d4af37',
                            textShadow: '0 0 10px rgba(212, 175, 55, 0.3)'
                          }}
                        >
                          Clue {num}
                        </span>
                      </div>
                      <p className={`text-gray-300 leading-relaxed ${num === 1 ? 'italic text-lg' : ''}`}>
                        {clueText || 'Loading...'}
                      </p>
                    </div>
                  ) : (
                    <button 
                      className="w-full p-4 sm:p-6 text-left group hover:bg-white/5 transition-all duration-300 shimmer-lock" 
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
            className="backdrop-blur rounded-lg border p-4 sm:p-6 space-y-6 hover:border-yellow-500/20 transition-all duration-300 slide-up"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Map */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-serif font-bold text-white">Guess Location</h3>
                <button
                  onClick={() => setIsMapFullscreen(!isMapFullscreen)}
                  className="p-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 hover:text-white transition-colors"
                  title="Toggle Fullscreen"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
              <div 
                className="rounded-lg overflow-hidden border-2 hover:border-yellow-500/50 transition-colors duration-300" 
                style={{ border: '2px solid rgba(255, 255, 255, 0.1)' }}
              >
                <div className={isMapFullscreen ? "h-96" : "h-64 sm:h-80"}>
                  <Map onGuess={handleMapGuess} guessCoords={guessCoords} />
                </div>
              </div>
            </div>

            {/* Continent Quick Jump */}
            <div className="mb-3">
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
                      className="relative px-2 py-1 text-xs font-medium rounded transition-all duration-300 group"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        color: '#9ca3af',
                        border: '1px solid rgba(156, 163, 175, 0.15)',
                        backdropFilter: 'blur(4px)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.7)';
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.color = '#d4af37';
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
                      className="relative px-2 py-1 text-xs font-medium rounded transition-all duration-300 group"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        color: '#9ca3af',
                        border: '1px solid rgba(156, 163, 175, 0.15)',
                        backdropFilter: 'blur(4px)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.7)';
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.color = '#d4af37';
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
                  className="w-full px-3 py-2 bg-black/50 border rounded-md text-white text-sm"
                  style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}
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
            <div>
              <h3 className="text-lg font-serif font-bold text-white mb-3">Year Guess</h3>
              <div className="space-y-4">
                {/* Direct Input */}
                {/* Direct Input */}
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => handleYearChange(e.target.value)}
                    min="-1000"
                    max="2025"
                    className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-md text-white font-mono text-center focus:border-yellow-500 focus:outline-none transition-colors text-lg"
                    style={{ 
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      color: '#d4af37',
                      textShadow: '0 0 10px rgba(212, 175, 55, 0.3)',
                      boxShadow: '0 0 0 0 rgba(212, 175, 55, 0.2)'
                    }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => adjustYear(10)}
                      className="px-3 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 hover:text-yellow-400 transition-colors text-sm font-medium"
                      style={{ minWidth: '50px' }}
                    >
                      +10
                    </button>
                    <button
                      onClick={() => adjustYear(1)}
                      className="px-3 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 hover:text-yellow-400 transition-colors text-sm font-medium"
                      style={{ minWidth: '50px' }}
                    >
                      +1
                    </button>
                    <button
                      onClick={() => adjustYear(-10)}
                      className="px-3 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 hover:text-yellow-400 transition-colors text-sm font-medium"
                      style={{ minWidth: '50px' }}
                    >
                      -10
                    </button>
                    <button
                      onClick={() => adjustYear(-1)}
                      className="px-3 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 hover:text-yellow-400 transition-colors text-sm font-medium"
                      style={{ minWidth: '50px' }}
                    >
                      -1
                    </button>
                  </div>
                </div>

                {/* Historical Era Quick Jump */}
                <div className="space-y-2">
                  <div className="text-xs text-gray-400 text-center font-medium uppercase tracking-wide">
                    Jump to Historical Era
                  </div>

                  {/* Desktop: Era buttons in grid */}
                  <div className="hidden sm:block">
                    <div className="grid grid-cols-4 gap-1 mb-1">
                      {historicalEras.slice(0, 4).map((era) => (
                        <button
                          key={era.label}
                          onClick={() => setSelectedYear(era.value)}
                          title={era.tooltip}
                          className="relative px-2 py-1 text-xs font-medium rounded transition-all duration-300 group"
                          style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            color: Math.abs(selectedYear - era.value) < 100 ? '#d4af37' : '#9ca3af',
                            border: '1px solid',
                            borderColor: Math.abs(selectedYear - era.value) < 100
                              ? 'rgba(212, 175, 55, 0.5)'
                              : 'rgba(156, 163, 175, 0.15)',
                            backdropFilter: 'blur(4px)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.7)';
                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.color = '#d4af37';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = Math.abs(selectedYear - era.value) < 100
                              ? 'rgba(212, 175, 55, 0.5)'
                              : 'rgba(156, 163, 175, 0.15)';
                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                            e.currentTarget.style.transform = 'translateY(0)';
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
                          onClick={() => setSelectedYear(era.value)}
                          title={era.tooltip}
                          className="relative px-2 py-1 text-xs font-medium rounded transition-all duration-300 group"
                          style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            color: Math.abs(selectedYear - era.value) < 100 ? '#d4af37' : '#9ca3af',
                            border: '1px solid',
                            borderColor: Math.abs(selectedYear - era.value) < 100
                              ? 'rgba(212, 175, 55, 0.5)'
                              : 'rgba(156, 163, 175, 0.15)',
                            backdropFilter: 'blur(4px)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.7)';
                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.color = '#d4af37';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = Math.abs(selectedYear - era.value) < 100
                              ? 'rgba(212, 175, 55, 0.5)'
                              : 'rgba(156, 163, 175, 0.15)';
                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                            e.currentTarget.style.transform = 'translateY(0)';
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
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      value={selectedYear}
                      className="w-full px-3 py-2 bg-black/50 border rounded-md text-white text-sm"
                      style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}
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

                {/* Display */}
                <div 
                  className="text-center p-4 rounded-lg border"
                  style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(212, 175, 55, 0.2)'
                  }}
                >
              <p className="text-sm text-gray-400 mb-1 uppercase tracking-wider">Your guess:</p>
                  <p 
                    className="text-2xl font-bold"
                    style={{ 
                      color: '#d4af37',
                      textShadow: '0 0 15px rgba(212, 175, 55, 0.5)'
                    }}
                  >
                    {displayYear(selectedYear)}
                  </p>
                </div>
              </div>
            </div>

            {/* Score Display */}
            <div 
              className="p-4 rounded-lg border"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                border: '2px solid rgba(212, 175, 55, 0.2)',
                boxShadow: '0 0 20px rgba(212, 175, 55, 0.1)'
              }}
            >
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-1 uppercase tracking-wide">Potential Score</p>
                <p 
                  className="text-3xl font-bold mb-1"
                  style={{ 
                    color: '#d4af37',
                    textShadow: '0 0 20px rgba(212, 175, 55, 0.5)'
                  }}
                >
                  {score.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">points remaining</p>
              </div>
            </div>

            {/* Make Guess Button */}
            <button 
              onClick={() => setShowConfirmModal(true)}
              disabled={!guessCoords || !!results}
              className="w-full px-8 py-4 font-bold text-white rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative group"
              style={{ 
                background: !guessCoords || !!results ? '#374151' : 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                letterSpacing: '-0.01em',
                fontSize: '18px'
              }}
              onMouseEnter={(e) => {
                if (!e.target.disabled) {
                  e.target.style.boxShadow = '0 0 0 2px rgba(212, 175, 55, 0.4), 0 10px 30px rgba(139, 0, 0, 0.3)';
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
              border: '2px solid rgba(212, 175, 55, 0.3)',
              boxShadow: '0 0 50px rgba(0, 0, 0, 0.8)'
            }}
          >
            <h3 className="text-2xl font-serif font-bold text-white mb-4">Confirm Your Guess</h3>
            <div className="space-y-3 mb-6">
              <p className="text-gray-300">
                <span className="font-semibold">Year:</span> 
                <span 
                  className="font-bold ml-2"
                  style={{ color: '#d4af37' }}
                >
                  {displayYear(selectedYear)}
                </span>
              </p>
              <p className="text-gray-300">
                <span className="font-semibold">Potential Score:</span> 
                <span 
                  className="font-bold ml-2"
                  style={{ 
                    color: '#d4af37',
                    textShadow: '0 0 10px rgba(212, 175, 55, 0.3)'
                  }}
                >
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
            className="backdrop-blur rounded-xl max-w-sm sm:max-w-md w-full text-center shadow-2xl slide-up flex flex-col"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              border: '2px solid rgba(212, 175, 55, 0.3)',
              boxShadow: '0 0 80px rgba(0, 0, 0, 0.8)',
              maxHeight: '90vh'
            }}
          >
            {/* Fixed Header */}
            <div className="p-4 sm:p-6 pb-0">
              <h2
                className="text-2xl sm:text-3xl font-serif font-bold text-white mb-4"
                style={{ textShadow: '0 0 15px rgba(212, 175, 55, 0.3)' }}
              >
                Round Complete
              </h2>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-4" style={{ maxHeight: 'calc(90vh - 160px)' }}>
            
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
            
            {/* Answer & Distance Info - Compact */}
            <div className="bg-black/30 rounded-lg p-4 space-y-3">
              <div className="text-center">
                <h4 className="text-base font-serif font-bold text-gray-300 mb-1">Correct Answer</h4>
                <p className="text-green-400 font-semibold text-lg">{results.answer.city}, {results.answer.historical_entity}</p>
                <p className="text-green-400 font-semibold text-sm">{displayYear(results.answer.year)}</p>
              </div>
              <div className="text-center border-t border-gray-600/30 pt-3">
                <h4 className="text-base font-serif font-bold text-gray-300 mb-1">Distance</h4>
                <p className="text-white">Your guess was <span className="font-bold text-yellow-400">{results.distance} km</span> away</p>
              </div>
            </div>

            {/* Endless Mode Level Results */}
            {endlessLevelResults && (
              <div
                className="mb-6 p-4 rounded-lg border-2"
                style={{
                  backgroundColor: endlessLevelResults.passed ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  borderColor: endlessLevelResults.passed ? '#22c55e' : '#ef4444'
                }}
              >
                <p className={`text-xl font-bold ${endlessLevelResults.passed ? 'text-green-400' : 'text-red-400'}`}>
                  {endlessLevelResults.passed ? '✓ Level Passed!' : '✗ Level Not Passed'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Threshold: {endlessLevelResults.threshold.toLocaleString()} |
                  Your Score: {endlessLevelResults.score.toLocaleString()}
                </p>
                {endlessLevelResults.passed && (
                  <p className="font-bold text-lg text-green-400 animate-pulse mt-2">
                    ENDLESS MODE LEVEL UP! Now Level {endlessLevelResults.newLevel}!
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Difficulty: {getDifficultyLabel(endlessLevelResults.passed ? endlessLevelResults.oldLevel : endlessLevelResults.newLevel)}
                </p>
              </div>
            )}

            {/* Final Score - Prominent but Compact */}
            <div
              className="p-4 rounded-lg border text-center"
              style={{
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                border: '2px solid rgba(212, 175, 55, 0.3)',
                boxShadow: '0 0 20px rgba(212, 175, 55, 0.1)'
              }}
            >
              <h3
                className="text-xl sm:text-2xl font-serif font-bold"
                style={{
                  color: '#d4af37',
                  textShadow: '0 0 15px rgba(212, 175, 55, 0.5)'
                }}
              >
                Final Score: {results.finalScore.toLocaleString()}
              </h3>
            </div>
            
            {/* XP & Coins Rewards */}
            {(xpResults || coinResults) && (
              <div className="space-y-3">
                {/* XP Display */}
                {xpResults && (
                  <div
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                  >
                    <p
                      className="font-bold text-lg"
                      style={{
                        color: '#d4af37',
                        textShadow: '0 0 15px rgba(212, 175, 55, 0.5)'
                      }}
                    >
                      +{xpResults.xp_gained.toLocaleString()} XP
                    </p>
                    {xpResults.new_level > xpResults.old_level && (
                      <p className="font-bold text-lg sm:text-2xl text-green-400 animate-pulse mt-2">
                        LEVEL UP! You are now Level {xpResults.new_level}!
                      </p>
                    )}
                    <div className="w-full bg-gray-700 rounded-full h-3 my-3 overflow-hidden">
                      <div
                        className="h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${(xpResults.new_xp / xpResults.xp_for_new_level) * 100}%`,
                          backgroundColor: '#d4af37',
                          boxShadow: '0 0 10px rgba(212, 175, 55, 0.5)'
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-400">
                      {xpResults.new_xp.toLocaleString()} / {xpResults.xp_for_new_level.toLocaleString()} XP
                    </p>
                  </div>
                )}

                {/* Coins Display */}
                {coinResults && (
                  <div
                    className="p-4 rounded-lg border-2"
                    style={{
                      backgroundColor: 'rgba(255, 215, 0, 0.1)',
                      borderColor: 'rgba(255, 215, 0, 0.3)',
                      boxShadow: '0 0 20px rgba(255, 215, 0, 0.1)'
                    }}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-2xl">🪙</span>
                      <p
                        className="font-bold text-xl"
                        style={{
                          color: '#ffd700',
                          textShadow: '0 0 15px rgba(255, 215, 0, 0.5)'
                        }}
                      >
                        +{coinResults.coinsEarned.toLocaleString()} Coins
                      </p>
                    </div>
                    <p className="text-sm text-gray-300 text-center">
                      {coinResults.gameMode === 'challenge_friend'
                        ? (coinResults.result === 'win' ? 'Challenge Victory!' : 'Challenge Complete')
                        : coinResults.difficulty
                        ? `${coinResults.difficulty.charAt(0).toUpperCase() + coinResults.difficulty.slice(1)} Difficulty Reward`
                        : 'Daily Challenge Reward'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
            </div>

            {/* Fixed Button at Bottom */}
            <div className="p-4 sm:p-6 pt-2 border-t border-gray-700/30">
              <button
                onClick={handlePlayAgain}
                className="w-full px-8 py-4 font-bold text-white rounded-md transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  boxShadow: '0 10px 30px rgba(139, 0, 0, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = '0 0 0 2px rgba(212, 175, 55, 0.4), 0 15px 40px rgba(139, 0, 0, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = '0 10px 30px rgba(139, 0, 0, 0.3)';
                }}
              >
                {challenge ? 'Back to Challenges' : dailyPuzzleInfo ? 'Continue' : 'Play Again'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}