// components/Auth.js
"use client";
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Auth({ setView }) {
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
        options: { data: { username: username } },
      });
      if (error) alert(error.error_description || error.message);
      else alert('Check your email for the confirmation link!');
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) alert(error.error_description || error.message);
      else setView('menu');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-parchment">
      <div className="p-8 bg-papyrus border border-sepia/20 rounded-2xl shadow-lg w-full max-w-sm">
        <h1 className="text-3xl font-serif font-bold text-gold-rush text-center mb-2">
          {isSigningUp ? 'Create Account' : 'Sign In'}
        </h1>
        <p className="text-center text-sepia mb-6">
          {isSigningUp
            ? 'Join the adventure.'
            : 'Welcome back, detective.'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSigningUp && (
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-bold mb-1 text-ink"
              >
                Username
              </label>
              <input
                id="username"
                className="w-full p-2 border border-sepia/40 rounded bg-parchment text-ink focus:ring-2 focus:ring-sepia-dark"
                type="text"
                placeholder="Your username"
                value={username}
                required
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-bold mb-1 text-ink"
            >
              Email
            </label>
            <input
              id="email"
              className="w-full p-2 border border-sepia/40 rounded bg-parchment text-ink focus:ring-2 focus:ring-sepia-dark"
              type="email"
              placeholder="Your email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-bold mb-1 text-ink"
            >
              Password
            </label>
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
          <div className="pt-4">
            <button
              type="submit"
              className="w-full px-4 py-3 bg-sepia-dark text-white font-bold rounded-lg hover:bg-ink transition-colors shadow-md"
              disabled={loading}
            >
              {loading ? (
                <span>Loading...</span>
              ) : (
                <span>{isSigningUp ? 'Sign Up' : 'Sign In'}</span>
              )}
            </button>
          </div>
        </form>
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSigningUp(!isSigningUp)}
            className="text-sm text-sepia hover:text-ink underline"
          >
            {isSigningUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </button>
        </div>
        <button
          onClick={() => setView('menu')}
          className="w-full mt-4 text-sm text-center text-sepia hover:text-ink"
        >
          &larr; Back to Main Menu
        </button>
      </div>
    </div>
  );
}