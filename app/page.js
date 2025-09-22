"use client";
import { useState, useEffect } from "react";
import { supabase } from '../lib/supabaseClient';
import { LOCATIONS } from '../lib/locations';

export default function Page() {
  const [puzzle, setPuzzle] = useState(null);
  const [unlockedClues, setUnlockedClues] = useState([1]);
  const [score, setScore] = useState(10000);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedYear, setSelectedYear] = useState(1950);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const CLUE_COSTS = { 1: 0, 2: 1000, 3: 1500, 4: 2000, 5: 3000 };

  const fetchNewPuzzle = async () => {
    setIsLoading(true);
    const { count } = await supabase.from('puzzles').select('*', { count: 'exact', head: true });
    if (count === 0 || !count) {
      console.error("No puzzles found in the database.");
      setIsLoading(false);
      return;
    }
    const randomIndex = Math.floor(Math.random() * count);
    const { data, error } = await supabase.from('puzzles').select(`*, puzzle_translations (*)`).eq('puzzle_translations.language_code', 'en-US').range(randomIndex, randomIndex).single();
    
    if (error) {
      console.error('Error fetching puzzle:', error);
    } else {
      setPuzzle(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNewPuzzle();
  }, []);

  const handleUnlockClue = (clueNumber) => {
    if (results || unlockedClues.includes(clueNumber)) return;
    const cost = CLUE_COSTS[clueNumber];
    if (score >= cost) {
      setScore(score - cost);
      setUnlockedClues([...unlockedClues, clueNumber].sort());
    } else {
      alert("Not enough points to unlock this clue!");
    }
  };

  const handleGuessSubmit = () => {
    if (!selectedCity || !selectedCountry) {
      alert('Please select a country and city.');
      return;
    }
    if (!puzzle) return;

    const answer = {
      country: Object.keys(LOCATIONS).find(c => LOCATIONS[c].includes(puzzle.city_name)),
      city: puzzle.city_name,
      year: puzzle.year
    };

    const yearDifference = Math.abs(selectedYear - answer.year);
    const timePenalty = yearDifference * 50;
    let scoreAfterPenalty = Math.max(0, score - timePenalty);

    let finalScore;
    if (selectedCountry === answer.country && selectedCity === answer.city) {
      finalScore = scoreAfterPenalty;
    } else if (selectedCountry === answer.country) {
      finalScore = scoreAfterPenalty * 0.5;
    } else {
      finalScore = 0;
    }

    setResults({
      guess: { country: selectedCountry, city: selectedCity, year: selectedYear },
      answer: answer,
      finalScore: Math.round(finalScore)
    });
  };

  const handlePlayAgain = () => {
    setPuzzle(null);
    setUnlockedClues([1]);
    setScore(10000);
    setSelectedCountry('');
    setSelectedCity('');
    setSelectedYear(1950);
    setResults(null);
    fetchNewPuzzle();
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-ink text-2xl font-serif">Loading a new mystery...</div>;
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-5xl font-serif font-bold text-gold-rush">HistoryClue</h1>
        <p className="text-lg text-sepia mt-2">
          Deduce the city and year from a series of clues.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          {[1, 2, 3, 4, 5].map((num) => {
            const isUnlocked = unlockedClues.includes(num);
            const clueText = puzzle?.puzzle_translations?.[0]?.[`clue_${num}_text`];

            return isUnlocked ? (
              <article key={num} className="p-4 bg-papyrus border border-sepia/20 rounded-lg shadow-sm">
                <span className="block font-serif font-bold text-ink">Clue {num}</span>
                <p className={`mt-1 text-sepia-dark ${num === 1 ? "italic text-lg" : ""}`}>
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
            )
          })}
        </div>

        <aside className="space-y-6">
          <div className="p-5 border border-sepia/20 rounded-lg bg-papyrus shadow-lg">
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1 text-ink">Country</label>
              <select className="w-full p-2 border border-sepia/40 rounded bg-parchment text-ink focus:ring-2 focus:ring-sepia-dark" value={selectedCountry} onChange={(e) => { setSelectedCountry(e.target.value); setSelectedCity(''); }}>
                <option value="">Select Country...</option>
                {Object.keys(LOCATIONS).sort().map((country) => <option key={country} value={country}>{country}</option>)}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold mb-1 text-ink">City</label>
              <select className="w-full p-2 border border-sepia/40 rounded bg-parchment text-ink focus:ring-2 focus:ring-sepia-dark" disabled={!selectedCountry} value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
                <option value="">{selectedCountry ? 'Select City...' : 'Select a country first'}</option>
                {selectedCountry && LOCATIONS[selectedCountry].sort().map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold mb-1 text-ink">Year</label>
              <input type="range" min={1800} max={2025} value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full accent-sepia-dark" />
              <div className="mt-2 text-center text-sm text-ink">
                Guess year: <span className="font-bold text-lg">{selectedYear}</span>
              </div>
            </div>

            <div className="flex justify-center">
              <button className="px-8 py-3 bg-sepia-dark text-white font-bold text-lg rounded-lg hover:bg-ink transition-colors shadow-md" onClick={handleGuessSubmit} disabled={!!results}>
                Make Guess
              </button>
            </div>
            
            <div className="mt-6 pt-4 border-t border-sepia/20 text-center space-y-1">
              <p className="text-lg text-sepia">Potential Score: <span className="font-bold text-ink">{score.toLocaleString()}</span></p>
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
                <p>{results.guess.year}</p>
              </div>
              <div className="text-left">
                <h4 className="text-lg font-serif font-bold text-sepia">Correct Answer</h4>
                <p className="text-green-700 font-semibold">{results.answer.city}, {results.answer.country}</p>
                <p className="text-green-700 font-semibold">{results.answer.year}</p>
              </div>
            </div>
            <h3 className="text-2xl font-serif font-bold text-ink mb-6">Final Score: {results.finalScore.toLocaleString()}</h3>
            <button onClick={handlePlayAgain} className="p-4 bg-sepia-dark text-white font-bold text-lg rounded-lg hover:bg-ink transition-colors duration-200 w-full">
              Play Again
            </button>
          </div>
        </section>
      )}
    </main>
  );
}