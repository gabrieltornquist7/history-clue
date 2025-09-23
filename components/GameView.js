// components/GameView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { LOCATIONS } from '../lib/locations';

export default function GameView({
  setView,
  challenge = null,
  session,
  onChallengeComplete,
  dailyPuzzleInfo = null,
  onDailyStepComplete = null,
}) {
  const [puzzle, setPuzzle] = useState(null);
  const [unlockedClues, setUnlockedClues] = useState([1]);
  const [score, setScore] = useState(10000);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedYear, setSelectedYear] = useState(1950);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameKey, setGameKey] = useState(0);

  const CLUE_COSTS = { 1: 0, 2: 1000, 3: 1500, 4: 2000, 5: 3000 };

  useEffect(() => {
    const fetchPuzzleData = async () => {
      setResults(null);
      setUnlockedClues([1]);
      setScore(10000);
      setSelectedCountry('');
      setSelectedCity('');
      setSelectedYear(1950);
      setError(null);
      setIsLoading(true);

      let puzzleData;
      let puzzleId;
      
      try {
        if (challenge) {
          const roundIndex = challenge.current_round - 1;
          puzzleId = challenge.puzzle_ids[roundIndex];
        } else if (dailyPuzzleInfo) {
          puzzleId = dailyPuzzleInfo.puzzleId;
        }

        if (puzzleId) {
          const { data, error } = await supabase
            .from('puzzles')
            .select('*, puzzle_translations(*)')
            .eq('id', puzzleId)
            .single();
          if (error) throw error;
          puzzleData = data;
        } else if (!challenge && !dailyPuzzleInfo) { // Endless Mode
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

  const handleGuessSubmit = async () => {
    if (!puzzle) return; // Safety check
    if (!selectedCity || !selectedCountry)
      return alert('Please select a country and city.');

    const modernCountry = Object.keys(LOCATIONS).find((c) =>
      LOCATIONS[c].includes(puzzle.city_name)
    );
    const answer = {
      country: modernCountry,
      city: puzzle.city_name,
      year: puzzle.year,
      historical_entity: puzzle.historical_entity || modernCountry,
    };

    const yearDifference = Math.abs(selectedYear - answer.year);
    const timePenalty = yearDifference * 50;
    let scoreAfterPenalty = Math.max(0, score - timePenalty);
    let finalScore;
    if (selectedCountry === answer.country && selectedCity === answer.city)
      finalScore = scoreAfterPenalty;
    else if (selectedCountry === answer.country)
      finalScore = scoreAfterPenalty * 0.5;
    else finalScore = 0;
    const finalScoreRounded = Math.round(finalScore);

    if (challenge) {
        const isChallenger = session.user.id === challenge.challenger_id;
        const currentScores = isChallenger ? challenge.challenger_scores || [] : challenge.opponent_scores || [];
        // Ensure scores are properly initialized if null
        const challengerScores = challenge.challenger_scores || [];
        const opponentScores = challenge.opponent_scores || [];

        const updatedScores = [...currentScores, finalScoreRounded];

        const scoreColumn = isChallenger ? 'challenger_scores' : 'opponent_scores';
        
        const isOpponentTurn = !isChallenger;
        const bothPlayedThisRound = isOpponentTurn && (challengerScores.length === challenge.current_round);
        const nextRound = bothPlayedThisRound ? challenge.current_round + 1 : challenge.current_round;
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

            let challengerWins = 0;
            let opponentWins = 0;
            for(let i=0; i<3; i++){
                if(finalChallengerScores[i] > finalOpponentScores[i]) challengerWins++;
                else if(finalOpponentScores[i] > finalChallengerScores[i]) opponentWins++;
            }

            if (challengerWins > opponentWins) updateData.winner_id = challenge.challenger_id;
            else if (opponentWins > challengerWins) updateData.winner_id = challenge.opponent_id;
        }
        
        await supabase.from('challenges').update(updateData).eq('id', challenge.id);
    }
    
    setResults({
      guess: { country: selectedCountry, city: selectedCity, year: selectedYear },
      answer,
      finalScore: finalScoreRounded,
    });
  };

  const handlePlayAgain = () => {
    if (challenge) onChallengeComplete();
    else if (dailyPuzzleInfo) onDailyStepComplete(results.finalScore);
    else {
      setGameKey((prevKey) => prevKey + 1);
    }
  };

  const displayYear = (year) => {
    if (year < 0) return `${Math.abs(year)} BC`;
    return year;
  }

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center text-ink text-2xl font-serif">
        Loading puzzle...
      </div>
    );

  if (error || !puzzle)
    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-ink text-2xl font-serif text-center p-4">
            <p className="text-red-600 font-bold mb-4">An Error Occurred</p>
            <p>{error || "Could not load the puzzle."}</p>
            <button
                onClick={() => setView('menu')}
                className="mt-8 px-6 py-2 bg-sepia-dark text-white font-bold rounded-lg hover:bg-ink transition-colors shadow-sm"
            >
                Back to Menu
            </button>
        </div>
    );


  // JSX for the game view
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-8 text-center relative">
        <button
          onClick={() =>
            setView(
              challenge ? 'challenge' : dailyPuzzleInfo ? 'daily' : 'menu'
            )
          }
          className="absolute left-0 top-1/2 -translate-y-1/2 px-4 py-2 bg-sepia-dark text-white font-bold rounded-lg hover:bg-ink transition-colors shadow-sm"
        >
          &larr; Back
        </button>
        <div>
          <h1 className="text-5xl font-serif font-bold text-gold-rush">
            HistoryClue
          </h1>
          <p className="text-lg text-sepia mt-2">
            {dailyPuzzleInfo ? `Daily Challenge - Puzzle ${dailyPuzzleInfo.step}`
              : challenge ? `Challenge - Round ${challenge.current_round}`
              : 'Endless Mode'}
          </p>
        </div>
      </header>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          {[1, 2, 3, 4, 5].map((num) => {
            const isUnlocked = unlockedClues.includes(num);
            const clueText =
              puzzle?.puzzle_translations?.[0]?.[`clue_${num}_text`];
            return isUnlocked ? (
              <article key={num} className="p-4 bg-papyrus border border-sepia/20 rounded-lg shadow-sm">
                <span className="block font-serif font-bold text-ink">Clue {num}</span>
                <p className={`mt-1 text-sepia-dark ${num === 1 ? 'italic text-lg' : ''}`}>
                  {clueText || 'Loading...'}
                </p>
              </article>
            ) : (
              <button key={num} className="w-full p-4 border border-sepia/30 rounded-lg hover:bg-sepia/10 text-left transition-colors" onClick={() => handleUnlockClue(num)}>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg text-ink">Unlock Clue {num}</span>
                  <span className="text-sm font-semibold text-sepia-dark">{CLUE_COSTS[num].toLocaleString()} pts</span>
                </div>
              </button>
            );
          })}
        </div>
        <aside>
          <div className="p-5 border border-sepia/20 rounded-lg bg-papyrus shadow-lg">
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1 text-ink">Country</label>
              <select className="w-full p-2 border border-sepia/40 rounded bg-parchment text-ink focus:ring-2 focus:ring-sepia-dark" value={selectedCountry} onChange={(e) => {setSelectedCountry(e.target.value); setSelectedCity('');}}>
                <option value="">Select Country...</option>
                {Object.keys(LOCATIONS).sort().map((country) => (<option key={country} value={country}>{country}</option>))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1 text-ink">City</label>
              <select className="w-full p-2 border border-sepia/40 rounded bg-parchment text-ink focus:ring-2 focus:ring-sepia-dark" disabled={!selectedCountry} value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
                <option value="">{selectedCountry ? 'Select City...' : 'Select a country first'}</option>
                {selectedCountry && LOCATIONS[selectedCountry].sort().map((city) => (<option key={city} value={city}>{city}</option>))}
              </select>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-bold mb-1 text-ink">Year</label>
              <input type="range" min={-1000} max={2025} value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full accent-sepia-dark"/>
              <div className="mt-2 text-center text-sm text-ink">Guess year:{' '}<span className="font-bold text-lg">{displayYear(selectedYear)}</span></div>
            </div>
            <div className="flex justify-center">
              <button className="px-8 py-3 bg-sepia-dark text-white font-bold text-lg rounded-lg hover:bg-ink transition-colors shadow-md" onClick={handleGuessSubmit} disabled={!!results}>Make Guess</button>
            </div>
            <div className="mt-6 pt-4 border-t border-sepia/20 text-center space-y-1">
              <p className="text-lg text-sepia">Potential Score:{' '}<span className="font-bold text-ink">{score.toLocaleString()}</span></p>
            </div>
          </div>
        </aside>
      </section>
      
      {results && (
        <section className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-parchment p-8 rounded-2xl shadow-2xl w-full max-w-md text-center border-2 border-gold-rush">
            <h2 className="text-3xl font-serif font-bold text-ink mb-4">Round Over</h2>
            <div className="flex justify-around bg-papyrus p-4 rounded-lg border border-sepia/20 my-6">
              <div className="text-left">
                <h4 className="text-lg font-serif font-bold text-sepia">Your Guess</h4>
                <p>{results.guess.city}, {results.guess.country}</p>
                <p>{displayYear(results.guess.year)}</p>
              </div>
              <div className="text-left">
                <h4 className="text-lg font-serif font-bold text-sepia">Correct Answer</h4>
                <p className="text-green-700 font-semibold">{results.answer.city}, {results.answer.historical_entity}</p>
                <p className="text-green-700 font-semibold">{displayYear(results.answer.year)}</p>
              </div>
            </div>
            <h3 className="text-2xl font-serif font-bold text-ink mb-6">Final Score: {results.finalScore.toLocaleString()}</h3>
            <button onClick={handlePlayAgain} className="p-4 bg-sepia-dark text-white font-bold text-lg rounded-lg hover:bg-ink transition-colors duration-200 w-full">
              {challenge ? 'Back to Challenges' : dailyPuzzleInfo ? 'Continue' : 'Play Again'}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}