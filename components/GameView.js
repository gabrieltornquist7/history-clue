// components/GameView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { LOCATIONS } from '../lib/locations';

export default function GameView({
  setView,
  challenge = null, // Expect the full challenge object now
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

      setIsLoading(true);
      let puzzleData;
      let puzzleId;
      
      if (challenge) {
        // Determine the current puzzle ID from the challenge object
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
        if (error) console.error('Error fetching puzzle:', error);
        else puzzleData = data;
      } else if (!challenge && !dailyPuzzleInfo) { // Endless Mode
        const { data: puzzles, error } = await supabase.rpc('get_random_puzzles', { limit_count: 1 });
        if (error || !puzzles || puzzles.length === 0) console.error('Error fetching random puzzle', error);
        else puzzleData = puzzles[0];
      }
      
      setPuzzle(puzzleData);
      setIsLoading(false);
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
    if (!selectedCity || !selectedCountry)
      return alert('Please select a country and city.');
    if (!puzzle) return;

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
        const updatedScores = [...currentScores, finalScoreRounded];

        const scoreColumn = isChallenger ? 'challenger_scores' : 'opponent_scores';
        
        const nextRound = challenge.current_round + (isChallenger ? 0 : 1);
        const isMatchOver = nextRound > 3;

        const updateData = {
            [scoreColumn]: updatedScores,
            current_round: isMatchOver ? challenge.current_round : nextRound,
            next_player_id: isChallenger ? challenge.opponent_id : challenge.challenger_id,
            status: isMatchOver ? 'completed' : 'pending'
        };

        if(isMatchOver) {
            const finalChallengerScores = isChallenger ? updatedScores : challenge.challenger_scores;
            const finalOpponentScores = !isChallenger ? updatedScores : challenge.opponent_scores;

            const challengerWins = finalChallengerScores.filter((s, i) => s > finalOpponentScores[i]).length;
            const opponentWins = finalOpponentScores.filter((s, i) => s > finalChallengerScores[i]).length;

            if (challengerWins > opponentWins) updateData.winner_id = challenge.challenger_id;
            else if (opponentWins > challengerWins) updateData.winner_id = challenge.opponent_id;
            // if draw, winner_id remains null
        }
        
        await supabase.from('challenges').update(updateData).eq('id', challenge.id);

    } else if (dailyPuzzleInfo) {
      // Daily challenge logic is handled by the parent
    } else { // Endless Mode
      // This is where a score would be saved for endless, if we had a table.
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

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* ... The rest of your JSX for rendering the game remains largely the same ... */}
    </main>
  );
}