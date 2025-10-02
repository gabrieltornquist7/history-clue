// components/battle/BattleRoundResults.jsx
// Modal showing round results with staggered animations

"use client";
import { useState, useEffect } from 'react';

export default function BattleRoundResults({
  roundNumber,
  myScore,
  oppScore,
  myTotalScore,
  oppTotalScore,
  winner, // 'me', 'opponent', or 'tie'
  onContinue
}) {
  const [stage, setStage] = useState(0);
  
  useEffect(() => {
    // Staggered reveal animation
    const timers = [
      setTimeout(() => setStage(1), 300),  // Winner
      setTimeout(() => setStage(2), 700),  // Scores
      setTimeout(() => setStage(3), 1100), // Total scores
      setTimeout(() => setStage(4), 1500), // Button
    ];
    
    return () => timers.forEach(t => clearTimeout(t));
  }, []);
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div 
        className="backdrop-blur rounded-xl max-w-md w-full"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          border: '2px solid rgba(212, 175, 55, 0.3)',
          boxShadow: '0 0 80px rgba(0, 0, 0, 0.8)'
        }}
      >
        {/* Header */}
        <div className="p-6">
          <h2 
            className="text-3xl font-serif font-bold text-white text-center"
            style={{ textShadow: '0 0 15px rgba(212, 175, 55, 0.3)' }}
          >
            Round {roundNumber} Complete
          </h2>
        </div>
        
        {/* Content */}
        <div className="px-6 py-2 space-y-4">
          {/* Winner - Stage 1 */}
          {stage >= 1 && (
            <div className="fade-in-scale text-center">
              <div className="text-6xl mb-2">
                {winner === 'me' ? '🎯' : winner === 'opponent' ? '😔' : '🤝'}
              </div>
              <p 
                className={`text-2xl font-bold ${
                  winner === 'me' ? 'text-green-400' : 
                  winner === 'opponent' ? 'text-red-400' : 
                  'text-yellow-400'
                }`}
              >
                {winner === 'me' ? 'You Won This Round!' : 
                 winner === 'opponent' ? 'Opponent Won' : 
                 'Round Tied!'}
              </p>
            </div>
          )}
          
          {/* Round Scores - Stage 2 */}
          {stage >= 2 && (
            <div className="fade-in-scale grid grid-cols-2 gap-4">
              <div 
                className="rounded-lg p-4 text-center"
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
              >
                <p className="text-sm text-gray-400 mb-1">Your Score</p>
                <p className="text-2xl font-bold text-green-400">
                  {myScore?.toLocaleString() || 0}
                </p>
              </div>
              <div 
                className="rounded-lg p-4 text-center"
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
              >
                <p className="text-sm text-gray-400 mb-1">Opponent</p>
                <p className="text-2xl font-bold text-blue-400">
                  {oppScore?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          )}
          
          {/* Battle Score - Stage 3 */}
          {stage >= 3 && (
            <div 
              className="fade-in-scale rounded-lg p-4"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            >
              <p className="text-sm text-gray-400 text-center mb-2">Battle Score</p>
              <div className="flex justify-center gap-6 items-center">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">You</p>
                  <p className="text-3xl font-bold text-green-400">
                    {myTotalScore?.toLocaleString() || 0}
                  </p>
                </div>
                <div 
                  className="text-2xl font-bold"
                  style={{ color: '#d4af37' }}
                >
                  -
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Them</p>
                  <p className="text-3xl font-bold text-blue-400">
                    {oppTotalScore?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Next Round Notice - Stage 4 */}
          {stage >= 4 && roundNumber < 3 && (
            <p className="fade-in-scale text-center text-gray-400">
              Round {roundNumber + 1} starting soon...
            </p>
          )}
        </div>
        
        {/* Button - Stage 4 */}
        {stage >= 4 && roundNumber === 3 && (
          <div className="p-6 pt-2 fade-in-scale">
            <button
              onClick={onContinue}
              className="w-full px-8 py-3 font-bold text-white rounded-md transition-all"
              style={{ 
                background: 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.target.style.boxShadow = '0 0 0 2px rgba(212, 175, 55, 0.4), 0 15px 40px rgba(139, 0, 0, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = 'none';
              }}
            >
              View Final Results
            </button>
          </div>
        )}
      </div>
      
      <style jsx>{`
        @keyframes fadeInScale {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        .fade-in-scale {
          animation: fadeInScale 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
