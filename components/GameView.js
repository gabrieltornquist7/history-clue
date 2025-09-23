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
  const [xpResults, setXpResults] = useState(null); // <-- NEW: State for XP results

  const CLUE_COSTS = { 1: 0, 2: 1000, 3: 1500, 4: 2000, 5: 3000 };

  useEffect(() => {
    const fetchPuzzleData = async () => {
      setResults(null);
      setXpResults(null); // <-- NEW: Reset XP results
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
          const { data, error } = await supabase.from('puzzles').select('*, puzzle_translations(*)').eq('id', puzzleId).single();
          if (error) throw error;
          puzzleData = data;
        } else { // Endless Mode
          const { data: puzzles, error } = await supabase.rpc('get_random_puzzles', { limit_count: 1 });
          if (error) throw error;
          if (!puzzles || puzzles.length === 0) throw new Error("No puzzles returned from database.");
          puzzleData = puzzles[0];
        }
        
        setPuzzle(puzzleData);
      } catch (err) {
        console.error("Failed to fetch puzzle data:", err);
        setError("Could not load a puzzle. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPuzzleData();
  }, [challenge, gameKey, dailyPuzzleInfo]);

  const handleMapGuess = (latlng) => { setGuessCoords(latlng); };
  const handleUnlockClue = (clueNumber) => { if (results || unlockedClues.includes(clueNumber)) return; const cost = CLUE_COSTS[clueNumber]; if (score >= cost) { setScore(score - cost); setUnlockedClues([...unlockedClues, clueNumber].sort()); } else { alert('Not enough points!'); } };

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

    // --- UPDATED: Capture returned XP data ---
    if (session?.user) {
      const { data: xpData, error: xpError } = await supabase.rpc('grant_xp', {
        p_user_id: session.user.id,
        p_score: finalScoreRounded
      });

      if (xpError) {
        console.error('Error granting XP:', xpError);
      } else {
        setXpResults(xpData); // <-- NEW: Store the XP results
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
    } else if (!dailyPuzzleInfo) { // Endless Mode
        await supabase.from('scores').insert({ user_id: session.user.id, score: finalScoreRounded });
    }
    
    setResults({ finalScore: finalScoreRounded, distance: Math.round(distance), answer: { city: puzzle.city_name, historical_entity: puzzle.historical_entity, year: puzzle.year }, guess: { year: selectedYear } });
  };

  const handlePlayAgain = () => { if (challenge) onChallengeComplete(); else if (dailyPuzzleInfo) onDailyStepComplete(results.finalScore); else { setGameKey(prevKey => prevKey + 1); } };
  const displayYear = (year) => { const yearNum = Number(year); if (yearNum < 0) return `${Math.abs(yearNum)} BC`; return yearNum; };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-ink text-2xl font-serif">Loading puzzle...</div>;
  if (error || !puzzle) return <div className="min-h-screen flex flex-col items-center justify-center text-ink text-2xl font-serif text-center p-4"><p className="text-red-600 font-bold mb-4">An Error Occurred</p><p>{error || "Could not load the puzzle."}</p><button onClick={() => setView('menu')} className="mt-8 px-6 py-2 bg-sepia-dark text-white font-bold rounded-lg hover:bg-ink transition-colors shadow-sm">Back to Menu</button></div>;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-8 text-center relative">
        <button onClick={() => setView(challenge ? 'challenge' : dailyPuzzleInfo ? 'daily' : 'menu')} className="absolute left-0 top-1/2 -translate-y-1/2 px-4 py-2 bg-sepia-dark text-white font-bold rounded-lg hover:bg-ink transition-colors shadow-sm">&larr; Back</button>
        <div>
          <h1 className="text-5xl font-serif font-bold text-gold-rush">HistoryClue</h1>
          <p className="text-lg text-sepia mt-2">{dailyPuzzleInfo ? `Daily Challenge - Puzzle ${dailyPuzzleInfo.step}` : challenge ? `Challenge - Round ${challenge.current_round}` : 'Endless Mode'}</p>
        </div>
      </header>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          {[1, 2, 3, 4, 5].map((num) => {
            const isUnlocked = unlockedClues.includes(num); const clueText = puzzle?.puzzle_translations?.[0]?.[`clue_${num}_text`];
            return isUnlocked ? (<article key={num} className="p-4 bg-papyrus border border-sepia/20 rounded-lg shadow-sm"><span className="block font-serif font-bold text-ink">Clue {num}</span><p className={`mt-1 text-sepia-dark ${num === 1 ? 'italic text-lg' : ''}`}>{clueText || 'Loading...'}</p></article>) 
            : (<button key={num} className="w-full p-4 border border-sepia/30 rounded-lg hover:bg-sepia/10 text-left transition-colors" onClick={() => handleUnlockClue(num)}><div className="flex justify-between items-center"><span className="font-semibold text-lg text-ink">Unlock Clue {num}</span><span className="text-sm font-semibold text-sepia-dark">{CLUE_COSTS[num].toLocaleString()} pts</span></div></button>);
          })}
        </div>
        <aside>
          <div className="p-5 border border-sepia/20 rounded-lg bg-papyrus shadow-lg space-y-4">
            <div><label className="block text-sm font-bold mb-2 text-ink text-center">Guess Location</label><Map onGuess={handleMapGuess} /></div>
            <div><label className="block text-sm font-bold mb-1 text-ink">Year</label><input type="range" min={-4000} max={2025} value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full accent-sepia-dark"/><div className="mt-2 text-center text-sm text-ink">Guess year:{' '}<span className="font-bold text-lg">{displayYear(selectedYear)}</span></div></div>
            <div className="flex justify-center"><button className="px-8 py-3 bg-sepia-dark text-white font-bold text-lg rounded-lg hover:bg-ink transition-colors shadow-md" onClick={handleGuessSubmit} disabled={!!results}>Make Guess</button></div>
            <div className="mt-6 pt-4 border-t border-sepia/20 text-center space-y-1"><p className="text-lg text-sepia">Potential Score:{' '}<span className="font-bold text-ink">{score.toLocaleString()}</span></p></div>
          </div>
        </aside>
      </section>
      {results && (
        <section className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-parchment p-8 rounded-2xl shadow-2xl w-full max-w-md text-center border-2 border-gold-rush">
            <h2 className="text-3xl font-serif font-bold text-ink mb-4">Round Over</h2>
            <div className="space-y-4 my-6">
                <div><h4 className="text-lg font-serif font-bold text-sepia">Correct Answer</h4><p className="text-green-700 font-semibold">{results.answer.city}, {results.answer.historical_entity}</p><p className="text-green-700 font-semibold">{displayYear(results.answer.year)}</p></div>
                <div><h4 className="text-lg font-serif font-bold text-sepia">Your guess was {results.distance} km away!</h4></div>
            </div>
            <h3 className="text-2xl font-serif font-bold text-ink mb-6">Final Score: {results.finalScore.toLocaleString()}</h3>
            
            {/* --- NEW: VISUAL XP DISPLAY --- */}
            {xpResults && (
              <div className="mb-6 p-4 bg-papyrus rounded-lg border border-sepia/20">
                <p className="font-bold text-lg text-gold-rush">+{xpResults.xp_gained.toLocaleString()} XP</p>
                {xpResults.new_level > xpResults.old_level && (
                  <p className="font-bold text-2xl text-green-600 animate-pulse">LEVEL UP! You are now Level {xpResults.new_level}!</p>
                )}
                <div className="w-full bg-sepia/20 rounded-full h-3 my-2 overflow-hidden border border-sepia/30 shadow-inner">
                  <div 
                    className="bg-gold-rush h-3 rounded-full" 
                    style={{ width: `${(xpResults.new_xp / xpResults.xp_for_new_level) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-sepia">
                  {xpResults.new_xp.toLocaleString()} / {xpResults.xp_for_new_level.toLocaleString()} XP
                </p>
              </div>
            )}
            {/* --- END OF XP DISPLAY --- */}
            
            <button onClick={handlePlayAgain} className="p-4 bg-sepia-dark text-white font-bold text-lg rounded-lg hover:bg-ink transition-colors duration-200 w-full">{challenge ? 'Back to Challenges' : dailyPuzzleInfo ? 'Continue' : 'Play Again'}</button>
          </div>
        </section>
      )}
    </main>
  );
}