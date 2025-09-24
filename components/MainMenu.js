// components/MainMenu.js
"use client";
import { supabase } from '../lib/supabaseClient';

export default function MainMenu({ setView, session, onSignOut }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-parchment p-4">
      <div className="text-center max-w-md w-full">
        <h1 className="text-6xl font-serif font-bold text-gold-rush mb-4">
          HistoryClue
        </h1>
        <p className="text-xl text-sepia mt-2 mb-8">The Historical Detective Game</p>
        
        <div className="p-8 bg-papyrus border border-sepia/20 rounded-2xl shadow-lg w-full flex flex-col gap-4">
          <button
            onClick={() => setView('endless')}
            className="w-full px-6 py-3 bg-sepia-dark text-white font-bold text-lg rounded-lg hover:bg-ink transition-colors shadow-md"
          >
            Endless Mode
          </button>
          <button
            onClick={() => setView('daily')}
            className="w-full px-6 py-3 bg-gold-rush text-ink font-bold text-lg rounded-lg hover:bg-amber-600 transition-colors shadow-md"
          >
            Daily Challenge
          </button>
          <button
            onClick={() => setView('challenge')}
            className="w-full px-6 py-3 bg-sepia-dark text-white font-bold text-lg rounded-lg hover:bg-ink transition-colors shadow-md"
          >
            Challenge a Friend
          </button>
          <button
            onClick={() => setView('liveLobby')}
            className="w-full px-6 py-3 bg-red-700 text-white font-bold text-lg rounded-lg hover:bg-red-800 transition-colors shadow-md animate-pulse"
          >
            Live Battle
          </button>
        </div>
        
        <div className="mt-8 text-center">
          {session ? (
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={onSignOut}
                className="font-bold text-gold-rush hover:text-amber-600 transition-colors"
              >
                Sign Out
              </button>
              <button
                onClick={() => setView('profile')}
                className="px-6 py-2 bg-gold-rush text-ink font-bold rounded-lg hover:bg-amber-600 transition-colors shadow-md"
              >
                Profile
              </button>
            </div>
          ) : (
            <button
              onClick={() => setView('auth')}
              className="px-6 py-2 bg-gold-rush text-ink font-bold rounded-lg hover:bg-amber-600 transition-colors shadow-md"
            >
              Login or Sign Up
            </button>
          )}
        </div>
      </div>
    </div>
  );
}