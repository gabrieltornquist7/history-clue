"use client";
import { useState, useEffect } from "react";
import { supabase } from '../lib/supabaseClient';
import { LOCATIONS } from '../lib/locations';

// --- AUTH COMPONENT ---
function Auth({ setView }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    if (isSigningUp) {
      if (!username) {
        alert('Please enter a username.');
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: username }
        }
      });
      if (error) alert(error.error_description || error.message);
      else alert('Check your email for the confirmation link!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.error_description || error.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-parchment">
      <div className="p-8 bg-papyrus border border-sepia/20 rounded-2xl shadow-lg w-full max-w-sm">
        <h1 className="text-3xl font-serif font-bold text-gold-rush text-center mb-2">{isSigningUp ? 'Create Account' : 'Sign In'}</h1>
        <p className="text-center text-sepia mb-6">{isSigningUp ? 'Join the adventure.' : 'Welcome back, detective.'}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSigningUp && (
            <div>
              <label htmlFor="username" className="block text-sm font-bold mb-1 text-ink">Username</label>
              <input id="username" className="w-full p-2 border border-sepia/40 rounded bg-parchment text-ink focus:ring-2 focus:ring-sepia-dark" type="text" placeholder="Your username" value={username} required onChange={(e) => setUsername(e.target.value)} />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-bold mb-1 text-ink">Email</label>
            <input id="email" className="w-full p-2 border border-sepia/40 rounded bg-parchment text-ink focus:ring-2 focus:ring-sepia-dark" type="email" placeholder="Your email" value={email} required onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-bold mb-1 text-ink">Password</label>
            <input id="password" className="w-full p-2 border border-sepia/40 rounded bg-parchment text-ink focus:ring-2 focus:ring-sepia-dark" type="password" placeholder="Your password" value={password} required onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="pt-4">
            <button type="submit" className="w-full px-4 py-3 bg-sepia-dark text-white font-bold rounded-lg hover:bg-ink transition-colors shadow-md" disabled={loading}>
              {loading ? <span>Loading...</span> : <span>{isSigningUp ? 'Sign Up' : 'Sign In'}</span>}
            </button>
          </div>
        </form>
        <div className="mt-6 text-center">
          <button onClick={() => setIsSigningUp(!isSigningUp)} className="text-sm text-sepia hover:text-ink underline">
            {isSigningUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
        <button onClick={() => setView('menu')} className="w-full mt-4 text-sm text-center text-sepia hover:text-ink">
          &larr; Back to Main Menu
        </button>
      </div>
    </div>
  );
}


// --- MAIN MENU COMPONENT ---
function MainMenu({ setView, session, onSignOut }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-parchment">
      <div className="text-center">
        <h1 className="text-6xl font-serif font-bold text-gold-rush">HistoryClue</h1>
        <p className="text-xl text-sepia mt-2">The Historical Detective Game</p>
      </div>
      <div className="mt-12 p-8 bg-papyrus border border-sepia/20 rounded-2xl shadow-lg w-full max-w-sm flex flex-col gap-4">
        <button onClick={() => setView('endless')} className="w-full px-6 py-3 bg-sepia-dark text-white font-bold text-lg rounded-lg hover:bg-ink transition-colors shadow-md">
          Endless Mode
        </button>
        <button className="w-full px-6 py-3 bg-sepia/50 text-sepia-dark font-bold text-lg rounded-lg cursor-not-allowed" disabled>
          Daily Challenge (Coming Soon)
        </button>
        <button className="w-full px-6 py-3 bg-sepia/50 text-sepia-dark font-bold text-lg rounded-lg cursor-not-allowed" disabled>
          1v1 PvP (Coming Soon)
        </button>
      </div>
      <div className="mt-8 text-center">
        {session ? (
          <>
            <p className="text-sepia">Signed in as {session.user.email}</p>
            <button onClick={onSignOut} className="mt-2 font-bold text-gold-rush hover:text-amber-600">
              Sign Out
            </button>
          </>
        ) : (
          <button onClick={() => setView('auth')} className="px-6 py-2 bg-gold-rush text-ink font-bold rounded-lg hover:bg-amber-600 transition-colors shadow-md">
            Login or Sign Up
          </button>
        )}
      </div>
    </div>
  );
}

// --- ENDLESS MODE (GAME) COMPONENT ---
function GameView({ setView }) {
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
    
    if (error) console.error('Error fetching puzzle:', error);
    else setPuzzle(data);
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
      alert("Not enough points!");
    }
  };

  const handleGuessSubmit = async () => {
    if (!selectedCity || !selectedCountry) return alert('Please select a country and city.');
    if (!puzzle) return;
    const answer = { country: Object.keys(LOCATIONS).find(c => LOCATIONS[c].includes(puzzle.city_name)), city: puzzle.city_name, year: puzzle.year };
    const yearDifference = Math.abs(selectedYear - answer.year);
    const timePenalty = yearDifference * 50;
    let scoreAfterPenalty = Math.max(0, score - timePenalty);
    let finalScore;
    if (selectedCountry === answer.country && selectedCity === answer.city) finalScore = scoreAfterPenalty;
    else if (selectedCountry === answer.country) finalScore = scoreAfterPenalty * 0.5;
    else finalScore = 0;
    
    const finalScoreRounded = Math.round(finalScore);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('scores').insert({ user_id: user.id, score: finalScoreRounded });
      if (error) console.error("Error saving score:", error);
    }

    setResults({ guess: { country: selectedCountry, city: selectedCity, year: selectedYear }, answer, finalScore: finalScoreRounded });
  };

  const handlePlayAgain = () => {
    setPuzzle(null); setUnlockedClues([1]); setScore(10000); setSelectedCountry(''); setSelectedCity(''); setSelectedYear(1950); setResults(null);
    fetchNewPuzzle();
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-ink text-2xl font-serif">Loading a new mystery...</div>;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-8 text-center relative">
        <button onClick={() => setView('menu')} className="absolute left-0 top-1/2 -translate-y-1/2 px-4 py-2 bg-sepia-dark text-white font-bold rounded-lg hover:bg-ink transition-colors shadow-sm">
          &larr; Menu
        </button>
        <div>
          <h1 className="text-5xl font-serif font-bold text-gold-rush">HistoryClue</h1>
          <p className="text-lg text-sepia mt-2">Endless Mode</p>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          {[1, 2, 3, 4, 5].map((num) => {
            const isUnlocked = unlockedClues.includes(num);
            const clueText = puzzle?.puzzle_translations?.[0]?.[`clue_${num}_text`];
            return isUnlocked ? (
              <article key={num} className="p-4 bg-papyrus border border-sepia/20 rounded-lg shadow-sm">
                <span className="block font-serif font-bold text-ink">Clue {num}</span>
                <p className={`mt-1 text-sepia-dark ${num === 1 ? "italic text-lg" : ""}`}>{clueText || 'Loading...'}</p>
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
              <div className="mt-2 text-center text-sm text-ink">Guess year: <span className="font-bold text-lg">{selectedYear}</span></div>
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
              <div className="text-left"><h4 className="text-lg font-serif font-bold text-sepia">Your Guess</h4><p>{results.guess.city}, {results.guess.country}</p><p>{results.guess.year}</p></div>
              <div className="text-left"><h4 className="text-lg font-serif font-bold text-sepia">Correct Answer</h4><p className="text-green-700 font-semibold">{results.answer.city}, {results.answer.country}</p><p className="text-green-700 font-semibold">{results.answer.year}</p></div>
            </div>
            <h3 className="text-2xl font-serif font-bold text-ink mb-6">Final Score: {results.finalScore.toLocaleString()}</h3>
            <button onClick={handlePlayAgain} className="p-4 bg-sepia-dark text-white font-bold text-lg rounded-lg hover:bg-ink transition-colors duration-200 w-full">Play Again</button>
          </div>
        </section>
      )}
    </main>
  );
}

// --- MAIN PAGE CONTROLLER ---
export default function Page() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('menu'); // 'menu', 'endless', 'auth'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setView('menu');
  };

  // Prevent non-logged-in users from playing endless mode
  if (view === 'endless' && !session) {
    return <Auth setView={setView} />;
  }
  
  if (view === 'endless') {
    return <GameView setView={setView} />;
  }

  if (view === 'auth') {
    return <Auth setView={setView} />;
  }
  
  return <MainMenu setView={setView} session={session} onSignOut={handleSignOut} />;
}