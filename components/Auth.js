'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.error_description || error.message);
    } else {
      alert('Check your email for the login link!');
    }
    setLoading(false);
  };

  const handleSignUp = async (event) => {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert(error.error_description || error.message);
    } else {
      alert('Check your email for the confirmation link!');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-parchment">
      <div className="p-8 bg-papyrus border border-sepia/20 rounded-2xl shadow-lg w-full max-w-sm">
        <h1 className="text-3xl font-serif font-bold text-gold-rush text-center mb-6">HistoryClue</h1>
        <p className="text-center text-sepia mb-6">Sign in or create an account to play.</p>
        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-bold mb-1 text-ink">Email</label>
            <input
              id="email"
              className="w-full p-2 border border-sepia/40 rounded bg-parchment text-ink focus:ring-2 focus:ring-sepia-dark"
              type="email"
              placeholder="Your email address"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-bold mb-1 text-ink">Password</label>
            <input
              id="password"
              className="w-full p-2 border border-sepia/40 rounded bg-parchment text-ink focus:ring-2 focus:ring-sepia-dark"
              type="password"
              placeholder="Your password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleLogin}
              className="flex-1 px-4 py-2 bg-sepia-dark text-white font-bold rounded-lg hover:bg-ink transition-colors shadow-md"
              disabled={loading}
            >
              {loading ? <span>Loading...</span> : <span>Sign In</span>}
            </button>
            <button
              onClick={handleSignUp}
              className="flex-1 px-4 py-2 bg-gold-rush text-ink font-bold rounded-lg hover:bg-amber-600 transition-colors shadow-md"
              disabled={loading}
            >
              {loading ? <span>Loading...</span> : <span>Sign Up</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}