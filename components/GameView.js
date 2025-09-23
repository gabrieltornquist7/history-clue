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

  const CLUE_COSTS = { 1: 0, 2: 1000, 3: 1500, 4: 2000, 5: 3000 };

  useEffect(() => {
    // ... fetchPuzzleData logic remains the same
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

    if (challenge) {
        // Challenge logic remains the same
    } else if (dailyPuzzleInfo) {
      // Daily challenge logic is handled by the parent
    } else { // Endless Mode - SAVE THE SCORE
      await supabase.from('scores').insert({ user_id: session.user.id, score: finalScoreRounded });
    }
    
    setResults({ finalScore: finalScoreRounded, distance: Math.round(distance), answer: { city: puzzle.city_name, historical_entity: puzzle.historical_entity, year: puzzle.year }, guess: { year: selectedYear } });
  };

  const handlePlayAgain = () => { if (challenge) onChallengeComplete(); else if (dailyPuzzleInfo) onDailyStepComplete(results.finalScore); else { setGameKey(prevKey => prevKey + 1); } };
  const displayYear = (year) => { const yearNum = Number(year); if (yearNum < 0) return `${Math.abs(yearNum)} BC`; return yearNum; };

  // ... All JSX and loading/error states remain the same
}