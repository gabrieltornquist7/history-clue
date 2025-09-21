'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { LOCATIONS } from '../lib/locations';
import ClueDisplay from '../components/ClueDisplay';
import ClueUnlockBar from '../components/ClueUnlockBar';
import GuessingInterface from '../components/GuessingInterface';
import ScoreDisplay from '../components/ScoreDisplay';
import ResultsScreen from '../components/ResultsScreen';

const CLUE_COSTS = { 1: 0, 2: 1000, 3: 1500, 4: 2000, 5: 3000 };

export default function HomePage() {
  const [puzzle, setPuzzle] = useState(null);
  const [unlockedClues, setUnlockedClues] = useState([1]);
  const [activeClue, setActiveClue] = useState(1);
  const [score, setScore] = useState(10000);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedYear, setSelectedYear] = useState(1950);
  const [gameState, setGameState] = useState('playing');
  const [results, setResults] = useState(null);

  const fetchNewPuzzle = async () => {
    const { count } = await supabase.from('puzzles').select('*', { count: 'exact', head: true });
    const randomIndex = Math.floor(Math.random() * count);
    const { data, error } = await supabase.from('puzzles').select(`*, puzzle_translations (*)`).eq('puzzle_translations.language_code', 'en-US').range(randomIndex, randomIndex).single();
    if (error) console.error('Error fetching puzzle:', error);
    else setPuzzle(data);
  };

  useEffect(() => {
    fetchNewPuzzle();
  }, []);

  const handleUnlockClue = (clueNumber) => {
    if (unlockedClues.includes(clueNumber)) {
      setActiveClue(clueNumber);
      return;
    }
    const cost = CLUE_COSTS[clueNumber];
    if (score >= cost) {
      setScore(score - cost);
      setUnlockedClues([...unlockedClues, clueNumber]);
      setActiveClue(clueNumber);
    }
  };

  const handleGuessSubmit = () => {
    if (!selectedCity || !selectedCountry) { alert('Please select a country and city.'); return; }
    const answer = { country: Object.keys(LOCATIONS).find(c => LOCATIONS[c].includes(puzzle.city_name)), city: puzzle.city_name, year: puzzle.year };
    const yearDifference = Math.abs(selectedYear - answer.year);
    const timePenalty = yearDifference * 50;
    let guessScore = score - timePenalty;
    guessScore = Math.max(0, guessScore);
    let finalScore;
    if (selectedCountry === answer.country && selectedCity === answer.city) { finalScore = guessScore; } 
    else if (selectedCountry === answer.country) { finalScore = guessScore * 0.5; } 
    else { finalScore = 0; }
    setResults({ guess: { country: selectedCountry, city: selectedCity, year: selectedYear }, answer: answer, finalScore: Math.round(finalScore) });
    setGameState('finished');
  };

  const handlePlayAgain = () => {
    setPuzzle(null); setUnlockedClues([1]); setActiveClue(1); setScore(10000);
    setSelectedCountry(''); setSelectedCity(''); setSelectedYear(1950);
    setResults(null); setGameState('playing'); fetchNewPuzzle();
  };

  return (
    <main className="min-h-screen p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <h1 className="text-4xl sm:text-5xl font-bold mt-4 mb-2 text-stone-800">HistoryClue</h1>
        <ScoreDisplay score={score} />
        <div className="bg-white/70 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg border border-stone-200 mt-4">
          <ClueDisplay puzzle={puzzle} activeClue={activeClue} />
          <ClueUnlockBar unlockedClues={unlockedClues} activeClue={activeClue} handleUnlockClue={handleUnlockClue} />
          <GuessingInterface
            locations={LOCATIONS}
            selectedCountry={selectedCountry} setSelectedCountry={setSelectedCountry}
            selectedCity={selectedCity} setSelectedCity={setSelectedCity}
            selectedYear={selectedYear} setSelectedYear={setSelectedYear}
            handleGuessSubmit={handleGuessSubmit}
          />
        </div>
      </div>
      {gameState === 'finished' && <ResultsScreen results={results} handlePlayAgain={handlePlayAgain} />}
    </main>
  );
}