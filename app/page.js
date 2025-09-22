"use client";
import { useState } from "react";

const countryCities = {
  IT: ["Rome", "Florence", "Venice", "Milan"],
  FR: ["Paris", "Lyon", "Marseille"],
  US: ["New York", "Boston", "Chicago"],
  GB: ["London", "Edinburgh", "Manchester"]
};

const samplePuzzle = {
  id: "sample-rome-1850",
  country: "IT",
  city: "Rome",
  year: 1850,
  clues: [
    "Cobblestones echo with revolutions whispered in cafés.",
    "Patriots debate the peninsula’s future under foreign shadows.",
    "EXTRA! “Pope returns, republic fades as Europe trembles.”",
    "A hill of seven views, obelisks and triumphal stones.",
    "Telegram: “ITALY STIRS—CAPITAL WAITS ITS FATE.”"
  ]
};

export default function Page() {
  const [puzzle] = useState(samplePuzzle);
  const [unlocked, setUnlocked] = useState([true, false, false, false, false]);
  const costs = [0, 1000, 1500, 2000, 3000];
  const [spent, setSpent] = useState(0);
  const [potential, setPotential] = useState(10000);
  const [guessedCountry, setGuessedCountry] = useState('IT');
  const [guessedCity, setGuessedCity] = useState('Rome');
  const [guessYear, setGuessYear] = useState(1850);
  const [result, setResult] = useState(null);

  function unlock(i) {
    if (unlocked[i] || result) return;
    setUnlocked((s) => {
      const next = [...s];
      next[i] = true;
      return next;
    });
    setSpent((s) => s + costs[i]);
    setPotential((s) => Math.max(0, s - costs[i]));
  }

  function handleGuess() {
    if (result) return;
    const timePenalty = Math.abs(guessYear - puzzle.year) * 50;
    const afterTime = Math.max(0, potential - timePenalty);
    let locMatch = "none";
    if (guessedCountry === puzzle.country) {
      locMatch = guessedCity.toLowerCase() === puzzle.city.toLowerCase() ? "city" : "country";
    }
    const multiplier = locMatch === "city" ? 1 : locMatch === "country" ? 0.5 : 0;
    const final = Math.max(0, Math.round(afterTime * multiplier));
    setResult({ correct: { ...puzzle }, final, timePenalty, locMatch });
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-5xl font-serif font-bold text-ink">HistoryClue</h1>
        <p className="text-lg text-sepia mt-2">
          Deduce the city and year from five clues. Unlock more clues at a cost.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Clues */}
        <div className="md:col-span-2 space-y-4">
          {puzzle.clues.map((clue, i) =>
            unlocked[i] ? (
              <article key={i} className="p-4 bg-papyrus border border-sepia/20 rounded-lg shadow-sm">
                <span className="block font-serif font-bold text-ink">Clue {i + 1}</span>
                <p className={`mt-1 text-sepia-dark ${i === 0 ? "italic text-lg" : ""} ${i === 2 ? "font-bold" : ""} ${i === 4 ? "font-mono uppercase tracking-wider" : ""}`}>
                  {clue}
                </p>
              </article>
            ) : (
              <button key={i} className="w-full p-4 border border-sepia/30 rounded-lg hover:bg-sepia/10 text-left transition-colors" onClick={() => unlock(i)}>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg text-ink">Unlock Clue {i + 1}</span>
                  <span className="text-sm font-semibold text-sepia-dark">{costs[i]} pts</span>
                </div>
              </button>
            )
          )}
        </div>

        {/* Right: Controls */}
        <aside className="space-y-6">
          <div className="p-5 border border-sepia/20 rounded-lg bg-papyrus shadow-lg">
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1 text-ink">Country</label>
              <select className="w-full p-2 border border-sepia/40 rounded bg-parchment text-ink focus:ring-2 focus:ring-sepia-dark" value={guessedCountry} onChange={(e) => { setGuessedCountry(e.target.value); setGuessedCity(countryCities[e.target.value][0]); }}>
                {Object.keys(countryCities).map((code) => <option key={code} value={code}>{code}</option>)}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold mb-1 text-ink">City</label>
              <select className="w-full p-2 border border-sepia/40 rounded bg-parchment text-ink focus:ring-2 focus:ring-sepia-dark" value={guessedCity} onChange={(e) => setGuessedCity(e.target.value)}>
                {(countryCities[guessedCountry] || []).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold mb-1 text-ink">Year</label>
              <input type="range" min={1600} max={2025} value={guessYear} onChange={(e) => setGuessYear(Number(e.target.value))} className="w-full accent-sepia-dark" />
              <div className="mt-2 text-center text-sm text-ink">
                Guess year: <span className="font-bold text-lg">{guessYear}</span>
              </div>
            </div>

            <div className="flex justify-center">
              <button className="px-8 py-3 bg-sepia-dark text-white font-bold text-lg rounded-lg hover:bg-ink transition-colors shadow-md" onClick={handleGuess}>
                Make Guess
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-sepia/20 text-sm text-sepia text-center space-y-1">
              <div>Potential Score: <span className="font-bold text-ink">{potential.toLocaleString()}</span></div>
              <div>Spent: <span className="font-bold text-ink">{spent.toLocaleString()}</span></div>
            </div>
          </div>
        </aside>
      </section>

      {/* Results card */}
      {result && (
        <section className="mt-8 p-6 bg-papyrus rounded-lg shadow-xl border-2 border-sepia-dark">
          <h2 className="text-3xl font-serif font-bold mb-4 text-ink text-center">Results</h2>
          <div className="text-center space-y-2 text-lg">
            <p>Correct Answer: <span className="font-bold">{result.correct.city}, {result.correct.country} — {result.correct.year}</span></p>
            <p>Location Match: <span className="font-bold capitalize">{result.locMatch}</span></p>
            <p>Time Penalty: <span className="font-bold">{result.timePenalty.toLocaleString()}</span></p>
            <p className="text-2xl font-bold pt-2 text-ink">Final Score: {result.final.toLocaleString()}</p>
          </div>
        </section>
      )}
    </main>
  );
}