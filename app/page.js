// app/page.jsx
"use client";

import { useState } from "react";

/*
  Simple local UI implementation (no Supabase calls).
  This file focuses on the styling changes you requested:
  - white page background & black text (root layout)
  - country/city selects are black text on white bg
  - visible borders around buttons
  - results card has its own solid background
  - clue cards styled consistently
*/

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

  // unlocked flags (clue 1 free)
  const [unlocked, setUnlocked] = useState([true, false, false, false, false]);
  const costs = [0, 1000, 1500, 2000, 3000];
  const [spent, setSpent] = useState(0);
  const [potential, setPotential] = useState(10000);

  const [guessedCountry, setGuessedCountry] = useState(puzzle.country);
  const [guessedCity, setGuessedCity] = useState(puzzle.city);
  const [guessYear, setGuessYear] = useState(puzzle.year);

  const [result, setResult] = useState(null);

  function unlock(i) {
    if (unlocked[i]) return;
    setUnlocked((s) => {
      const next = [...s];
      next[i] = true;
      return next;
    });
    setSpent((s) => s + costs[i]);
    setPotential((s) => Math.max(0, s - costs[i]));
  }

  function handleGuess() {
    const timePenalty = Math.abs(guessYear - puzzle.year) * 50;
    const afterTime = Math.max(0, potential - timePenalty);

    let locMatch = "none";
    if (guessedCountry === puzzle.country) {
      locMatch =
        guessedCity.toLowerCase() === puzzle.city.toLowerCase() ? "city" : "country";
    }

    const multiplier = locMatch === "city" ? 1 : locMatch === "country" ? 0.5 : 0;
    const final = Math.max(0, Math.round(afterTime * multiplier));

    setResult({ correct: { ...puzzle }, final, timePenalty, locMatch });
  }

  function resetRound() {
    setUnlocked([true, false, false, false, false]);
    setSpent(0);
    setPotential(10000);
    setResult(null);
    setGuessedCountry(puzzle.country);
    setGuessedCity(puzzle.city);
    setGuessYear(puzzle.year);
  }

  return (
    <main>
      <header className="mb-6">
        <h1 className="text-4xl font-bold">HistoryClue</h1>
        <p className="text-sm text-gray-600 mt-1">
          Deduce the city and year from five clues. Unlock more clues at a cost.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Clues */}
        <div className="md:col-span-2">
          <div className="space-y-3">
            {puzzle.clues.map((clue, i) =>
              unlocked[i] ? (
                <article
                  key={i}
                  className="p-4 mb-0 bg-gray-50 border border-gray-300 rounded-lg hc-card"
                >
                  <span className="block font-semibold text-gray-800">Clue {i + 1}</span>

                  <p
                    className={
                      i === 0
                        ? "mt-1 text-gray-800 italic text-lg"
                        : i === 2
                        ? "mt-1 text-gray-800 font-bold"
                        : i === 4
                        ? "mt-1 font-mono uppercase tracking-wider text-gray-800"
                        : "mt-1 text-gray-700"
                    }
                  >
                    {clue}
                  </p>
                </article>
              ) : (
                <button
                  key={i}
                  className="w-full px-4 py-3 mb-3 border border-gray-400 rounded hover:bg-gray-100 text-left"
                  onClick={() => unlock(i)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Unlock Clue {i + 1}</span>
                    <span className="text-sm text-gray-600">{costs[i]} pts</span>
                  </div>
                </button>
              )
            )}
          </div>
        </div>

        {/* Right: Controls */}
        <aside>
          <div className="p-4 border border-gray-300 rounded-lg bg-white">
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Country</label>
              <select
                className="w-full p-2 border border-gray-400 rounded text-black bg-white"
                value={guessedCountry}
                onChange={(e) => {
                  const nextCountry = e.target.value;
                  setGuessedCountry(nextCountry);
                  const cities = countryCities[nextCountry] || [];
                  setGuessedCity(cities[0] || "");
                }}
              >
                {Object.entries(countryCities).map(([code]) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">City</label>
              <select
                className="w-full p-2 border border-gray-400 rounded text-black bg-white"
                value={guessedCity}
                onChange={(e) => setGuessedCity(e.target.value)}
              >
                {(countryCities[guessedCountry] || []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Year</label>
              <input
                type="range"
                min={1600}
                max={2025}
                value={guessYear}
                onChange={(e) => setGuessYear(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-2 text-sm">
                Guess year: <span className="font-semibold">{guessYear}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                className="flex-1 px-4 py-2 border border-gray-600 rounded hover:bg-gray-100"
                onClick={handleGuess}
              >
                Make Guess
              </button>
              <button
                className="px-3 py-2 border border-gray-400 rounded hover:bg-gray-100"
                onClick={resetRound}
              >
                Reset
              </button>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <div>
                Potential: <span className="font-semibold">{potential}</span>
              </div>
              <div>
                Spent: <span className="font-semibold">{spent}</span>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {/* Results card */}
      {result && (
        <section className="mt-6 p-6 bg-gray-100 rounded-lg shadow-lg border border-gray-300">
          <h2 className="text-2xl font-bold mb-2">Results</h2>
          <p className="mb-1">
            Correct:{" "}
            <span className="font-semibold">
              {result.correct.city}, {result.correct.country} — {result.correct.year}
            </span>
          </p>
          <p className="mb-1">
            Location match: <span className="font-semibold">{result.locMatch}</span>
          </p>
          <p className="mb-1">
            Time penalty: <span className="font-semibold">{result.timePenalty}</span>
          </p>
          <p className="text-lg font-semibold">Final score: {result.final}</p>
        </section>
      )}
    </main>
  );
}
