// components/Auth.js
"use client";
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import GlassBackButton from './GlassBackButton';

export default function Auth({ setView }) {
  console.log('[Auth] Rendered with setView:', typeof setView);
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
    <div
      className="min-h-screen relative"
      style={{
        background: `
          linear-gradient(145deg, #0d0d0d 0%, #1a1a1a 40%, #2a2a2a 100%),
          radial-gradient(circle at 25% 25%, rgba(255, 215, 0, 0.05), transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.04), transparent 50%)
        `,
        backgroundBlendMode: "overlay"
      }}
    >
      {/* Animated shine overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(115deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.08) 100%)",
          backgroundSize: "200% 200%",
          animation: "shine 12s linear infinite"
        }}
      />

      <style jsx>{`
        @keyframes shine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <GlassBackButton
        onClick={() => {
          console.log('[Auth] Back button clicked');
          if (setView && typeof setView === 'function') {
            setView('menu');
          } else {
            console.error('[Auth] setView is not a function:', setView);
          }
        }}
        fallbackUrl="/"
      />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div
          className="backdrop-blur rounded-xl w-full max-w-md"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)"
          }}
        >
          <div className="p-6 sm:p-8">
            {/* Logo/Title */}
            <h1
              className="text-3xl sm:text-4xl font-serif font-bold text-white text-center mb-2"
              style={{
                letterSpacing: '0.02em',
                textShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
              }}
            >
              HistoryClue
            </h1>
            <p
              className="text-sm italic text-center mb-2"
              style={{ color: '#d4af37', opacity: 0.9 }}
            >
              Journey Through Time
            </p>
            <p className="text-center text-gray-300 mb-8">
              {isSigningUp
                ? 'Join the adventure and start your quest through history.'
                : 'Welcome back, detective. Your next mystery awaits.'}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSigningUp && (
                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium mb-2 text-gray-300"
                  >
                    Username
                  </label>
                  <input
                    id="username"
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700/30 rounded-md text-white placeholder-gray-500 focus:border-yellow-500/50 focus:outline-none transition-all"
                    style={{ backdropFilter: 'blur(4px)' }}
                    type="text"
                    placeholder="Choose your username"
                    value={username}
                    required
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-2 text-gray-300"
                >
                  Email
                </label>
                <input
                  id="email"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700/30 rounded-md text-white placeholder-gray-500 focus:border-yellow-500/50 focus:outline-none transition-all"
                  style={{ backdropFilter: 'blur(4px)' }}
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-2 text-gray-300"
                >
                  Password
                </label>
                <input
                  id="password"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700/30 rounded-md text-white placeholder-gray-500 focus:border-yellow-500/50 focus:outline-none transition-all"
                  style={{ backdropFilter: 'blur(4px)' }}
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3 font-bold text-white rounded-md transition-all duration-300"
                  style={{
                    background: loading ? 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)' : 'linear-gradient(135deg, #d4af37 0%, #f4e4bc 100%)',
                    color: '#1a1a1a',
                    boxShadow: '0 10px 30px rgba(212, 175, 55, 0.3)'
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <span>Loading...</span>
                  ) : (
                    <span>{isSigningUp ? 'Create Account' : 'Sign In'}</span>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsSigningUp(!isSigningUp)}
                className="text-sm text-gray-400 hover:text-white transition-colors underline"
              >
                {isSigningUp
                  ? 'Already have an account? Sign In'
                  : "Don't have an account? Create Account"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}