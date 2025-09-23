// components/GameView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import dynamic from 'next/dynamic';

// Dynamically import the Map component to prevent SSR issues with Leaflet
const Map = dynamic(() => import('./Map'), { ssr: false });

// Haversine formula to calculate distance between two lat/lng points in km
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

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
  const [selectedYear, setSelectedYear] = useState(1950);
  const [guessCoords, setGuessCoords] = useState(null);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameKey, setGameKey] = useState(0);

  const CLUE_COSTS = { 1: 0, 2: 1000, 3: 1500, 4: 2000, 5: 3000 };

  useEffect(() => {
    const fetchPuzzleData = async () => {
      // Reset state for the new round
      setResults(null);
      setUnlockedClues([1]);
      setScore(10000);
      setSelectedYear(1950);
      setGuessCoords(null);
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
          const { data, error } = await supabase.from('puzzles').select('*, puzzle_translations(*)').eq('id', puzzleId).single();
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

  const handleMapGuess = (latlng) => {
    setGuessCoords(latlng);
  };

  const handleGuessSubmit = async () => {
    if (!puzzle) return;
    if (!guessCoords) return alert('Please place a pin on the map to make a guess.');

    const distance = getDistance(guessCoords.lat, guessCoords.lng, puzzle.latitude, puzzle.longitude);
    const maxDistance = 20000; // Furthest possible distance on Earth
    const distancePenalty = (distance / maxDistance) * 5000; // Penalty scales with distance

    const yearDifference = Math.abs(selectedYear - puzzle.year);
    const timePenalty = yearDifference * 25; // Adjusted penalty for the new system

    const initialScore = 10000 - (score < 10000 ? (10000 - score) : 0); // Score after clue unlocks
    let finalScore = Math.max(0, initialScore - distancePenalty - timePenalty);

    // Give a bonus for being very close
    if (distance < 50) { // within 50km
        finalScore += 2000;
    } else if (distance < 200) { // within 200km
        finalScore += 1000;
    }
    
    const finalScoreRounded = Math.min(15000, Math.round(finalScore)); // Cap score

    // ... [Database update logic for challenges remains the same as your current file] ...
    
    setResults({
      finalScore: finalScoreRounded,
      distance: Math.round(distance),
      answer: {
        city: puzzle.city_name,
        historical_entity: puzzle.historical_entity,
        year: puzzle.year,
      },
      guess: {
        year: selectedYear,
      }
    });
  };

  // Other handler functions (handleUnlockClue, handlePlayAgain, displayYear) remain the same.

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-ink text-2xl font-serif">Loading puzzle...</div>;
  if (error || !puzzle) return <div className="min-h-screen flex flex-col items-center justify-center text-ink text-2xl font-serif text-center p-4">...</div>;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <header>
        {/* Header remains the same */}
      </header>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          {/* Clue display remains the same */}
        </div>
        <aside>
          <div className="p-5 border border-sepia/20 rounded-lg bg-papyrus shadow-lg space-y-4">
            
            <div>
                <label className="block text-sm font-bold mb-2 text-ink text-center">Guess Location</label>
                <Map onGuess={handleMapGuess} />
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-1 text-ink">Year</label>
              <input type="range" min={-4000} max={2025} value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full accent-sepia-dark" />
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
            <div className="space-y-4 my-6">
                <div>
                    <h4 className="text-lg font-serif font-bold text-sepia">Correct Answer</h4>
                    <p className="text-green-700 font-semibold">{results.answer.city}, {results.answer.historical_entity}</p>
                    <p className="text-green-700 font-semibold">{displayYear(results.answer.year)}</p>
                </div>
                <div>
                    <h4 className="text-lg font-serif font-bold text-sepia">Your Guess was {results.distance} km away!</h4>
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