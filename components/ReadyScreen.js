// components/ReadyScreen.js
"use client";
import { useEffect } from 'react';

export default function ReadyScreen({ mode, info, onStart }) {
  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onStart();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onStart]);

  const renderContent = () => {
    switch (mode) {
      case 'endless':
        return (
          <>
            <h2 
              className="text-3xl font-serif font-bold mb-2"
              style={{ 
                color: '#d4af37',
                textShadow: '0 0 20px rgba(212, 175, 55, 0.4)'
              }}
            >
              ENDLESS MODE
            </h2>
            <div className="text-white text-lg mb-6 space-y-1">
              <p className="font-bold">Level {info.level}: {info.difficulty}</p>
              <p className="text-gray-300">Score {info.threshold?.toLocaleString()}+ to advance</p>
            </div>
            <div className="text-gray-400 text-sm space-y-2 mb-8">
              <p>• You start with <span className="text-yellow-500 font-bold">10,000 points</span></p>
              <p>• Each clue costs points from your total</p>
              <p>• Use fewer clues for higher scores!</p>
            </div>
          </>
        );

      case 'challenge':
        return (
          <>
            <h2 
              className="text-3xl font-serif font-bold mb-2"
              style={{ 
                color: '#d4af37',
                textShadow: '0 0 20px rgba(212, 175, 55, 0.4)'
              }}
            >
              CHALLENGE FRIEND
            </h2>
            <div className="text-white text-lg mb-6 space-y-1">
              <p className="font-bold">Round {info.round} of 3 (Turn-Based)</p>
              <p className="text-gray-300">Best of 3 wins</p>
            </div>
            <div className="text-gray-400 text-sm space-y-2 mb-8">
              <p>• Take turns solving puzzles</p>
              <p>• Start with <span className="text-yellow-500 font-bold">10,000 points</span></p>
              <p>• Clues reduce your possible score</p>
            </div>
          </>
        );

      case 'live':
        return (
          <>
            <h2 
              className="text-3xl font-serif font-bold mb-2"
              style={{ 
                color: '#d4af37',
                textShadow: '0 0 20px rgba(212, 175, 55, 0.4)'
              }}
            >
              LIVE BATTLE
            </h2>
            <div className="text-white text-lg mb-6 space-y-1">
              <p className="font-bold">Real-Time PvP</p>
              <p className="text-gray-300">Best of 3 rounds</p>
            </div>
            <div className="text-gray-400 text-sm space-y-2 mb-8">
              <p>• <span className="text-yellow-500 font-bold">3 minutes</span> per round</p>
              <p>• Timer drops to <span className="text-red-400 font-bold">45 seconds</span> when opponent submits!</p>
              <p>• Clues cost points - use wisely</p>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)'
      }}
      onClick={onStart}
    >
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>

      <div 
        className="backdrop-blur rounded-2xl p-8 max-w-md w-full text-center relative animate-scale-in"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          border: '2px solid rgba(212, 175, 55, 0.4)',
          boxShadow: '0 0 60px rgba(212, 175, 55, 0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative icon */}
        <div className="mb-6">
          <div 
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
            style={{ 
              backgroundColor: 'rgba(212, 175, 55, 0.15)',
              border: '2px solid rgba(212, 175, 55, 0.4)'
            }}
          >
            <svg className="w-8 h-8" style={{ color: '#d4af37' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {renderContent()}

        {/* Start button */}
        <button
          onClick={onStart}
          className="w-full px-8 py-4 font-bold text-white rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ 
            background: 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)',
            boxShadow: '0 4px 20px rgba(139, 0, 0, 0.4)'
          }}
          onMouseEnter={(e) => {
            e.target.style.boxShadow = '0 6px 30px rgba(139, 0, 0, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.target.style.boxShadow = '0 4px 20px rgba(139, 0, 0, 0.4)';
          }}
        >
          Start Mission
        </button>

        {/* Hint text */}
        <p className="text-gray-500 text-xs mt-4">
          Click anywhere or press ESC to start
        </p>
      </div>
    </div>
  );
}
