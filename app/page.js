// app/page.js
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
    const { data, error } = await supabase
      .from('puzzles').select(`*, puzzle_translations (*)`).eq('puzzle_translations.language_code', 'en-US')
      .range(randomIndex, randomIndex).single();
    if (error) console.error('Error fetching puzzle:', error);
    else setPuzzle(data);
  };

  useEffect(() => {
    fetchNewPuzzle();
  }, []);

  const handleUnlockClue = (clueNumber) => {
    const cost = CLUE_COSTS[clueNumber];
    if (score >= cost && !unlockedClues.includes(clueNumber)) {
      setScore(score - cost);
      setUnlockedClues([...unlockedClues, clueNumber]);
      setActiveClue(clueNumber);
    } else if (unlockedClues.includes(clueNumber)) {
      setActiveClue(clueNumber);
    }
  };

  const handleGuessSubmit = () => {
    if (!selectedCity || !selectedCountry) {
      alert('Please select a country and city.');
      return;
    }
    const answer = { country: Object.keys(LOCATIONS).find(c => LOCATIONS[c].includes(puzzle.city_name)), city: puzzle.city_name, year: puzzle.year };
    const yearDifference = Math.abs(selectedYear - answer.year);