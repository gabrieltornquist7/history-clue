// components/battle/BattleRoundResults.jsx
// Modal showing round results with puzzle answer and staggered animations

"use client";
import { useState, useEffect } from 'react';

export default function BattleRoundResults({
  roundNumber,
  myScore,
  oppScore,
  myTotalScore,
  oppTotalScore,
  winner, // 'me', 'opponent', or 'tie'
  puzzle, // The puzzle data with answer
  onContinue
}) {
  const [stage, setStage] = useState(0);
  
  useEffect(() => {
    // Staggered reveal animation
    const timers = [
      setTimeout(() => setStage(1), 300),  // Puzzle reveal
      setTimeout(() => setStage(2), 800),  // Winner
      setTimeout(() => setStage(3), 1300), // Scores
      setTimeout(() => setStage(4), 1800), // Total scores
      setTimeout(() => setStage(5), 2300), // Button
    ];
    
    return () => timers.forEach(t => clearTimeout(t));
  }, []);
  
  // Auto-continue after delay for non-final rounds
  useEffect(() => {
    if (roundNumber < 3 && stage >= 5) {
      const timer = setTimeout(() => {
        onContinue();
      }, 3000); // 3 second delay before next round
      
      return () => clearTimeout(timer);
    }
  }, [roundNumber, stage, onContinue]);
  
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div 
        className="backdrop-blur-xl rounded-2xl max-w-lg w-full"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          border: '2px solid rgba(212, 175, 55, 0.3)',
          boxShadow: '0 0 100px rgba(0, 0, 0, 0.9)'
        }}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b" style={{ borderColor: 'rgba(212, 175, 55, 0.2)' }}>
          <h2 
            className="text-3xl font-serif font-bold text-white text-center mb-2"
            style={{ textShadow: '0 0 20px rgba(212, 175, 55, 0.5)' }}
          >
            Round {roundNumber} Complete
          </h2>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Puzzle Answer - Stage 1 */}
          {stage >= 1 && puzzle && (
            <div 
              className="fade-in-scale rounded-xl p-5 text-center"
              style={{ 
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid rgba(212, 175, 55, 0.3)'
              }}
            >
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-bold">The Answer Was</p>
              <h3 
                className="text-2xl font-serif font-bold mb-1"
                style={{ color: '#d4af37', textShadow: '0 0 15px rgba(212, 175, 55, 0.3)' }}
              >
                {puzzle.city_name}
              </h3>
              <p className="text-lg text-gray-300">
                {puzzle.year < 0 ? `${Math.abs(puzzle.year)} BCE` : `${puzzle.year} CE`}
              </p>
              {puzzle.historical_entity && (
                <p className="text-sm text-gray-400 mt-2">{puzzle.historical_entity}</p>
              )}
            </div>
          )}
          
          {/* Winner - Stage 2 */}
          {stage >= 2 && (
            <div className="fade-in-scale text-center py-4">
              <p 
                className={`text-3xl font-bold mb-2 ${
                  winner === 'me' ? 'text-green-400' : 
                  winner === 'opponent' ? 'text-blue-400' : 
                  'text-yellow-400'
                }`}
                style={{
                  textShadow: winner === 'me' 
                    ? '0 0 20px rgba(34, 197, 94, 0.5)' 
                    : winner === 'opponent'
                    ? '0 0 20px rgba(59, 130, 246, 0.5)'
                    : '0 0 20px rgba(212, 175, 55, 0.5)'
                }}
              >
                {winner === 'me' ? 'You Won This Round!' : 
                 winner === 'opponent' ? 'Opponent Won This Round' : 
                 'Round Tied!'}
              </p>
            </div>
          )}
          
          {/* Round Scores - Stage 3 */}
          {stage >= 3 && (
            <div className="fade-in-scale grid grid-cols-2 gap-4">
              <div 
                className="rounded-lg p-4 text-center"
                style={{ 
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)'
                }}
              >
                <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Your Score</p>
                <p className="text-3xl font-bold text-green-400">
                  {myScore?.toLocaleString() || 0}
                </p>
              </div>
              <div 
                className="rounded-lg p-4 text-center"
                style={{ 
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}
              >
                <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Opponent</p>
                <p className="text-3xl font-bold text-blue-400">
                  {oppScore?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          )}
          
          {/* Battle Total Score - Stage 4 */}
          {stage >= 4 && (
            <div 
              className="fade-in-scale rounded-xl p-5"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <p className="text-xs text-gray-400 text-center mb-3 uppercase tracking-wider font-bold">Battle Total</p>
              <div className="flex justify-center gap-8 items-center">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1.5">You</p>
                  <p className="text-4xl font-bold text-green-400">
                    {myTotalScore?.toLocaleString() || 0}
                  </p>
                </div>
                <div 
                  className="text-3xl font-bold"
                  style={{ color: '#d4af37' }}
                >
                  -
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1.5">Them</p>
                  <p className="text-4xl font-bold text-blue-400">
                    {oppTotalScore?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer - Stage 5 */}
        {stage >= 5 && (
          <div className="p-6 pt-0 fade-in-scale">
            {roundNumber < 3 ? (
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-3">Starting Round {roundNumber + 1} in 3 seconds...</p>
                <button
                  onClick={onContinue}
                  className="w-full px-8 py-3 font-medium text-white rounded-lg transition-all"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  Continue Now
                </button>
              </div>
            ) : (
              <button
                onClick={onContinue}
                className="w-full px-8 py-4 font-bold text-white rounded-lg transition-all"
                style={{ 
                  background: 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  boxShadow: '0 10px 30px rgba(139, 0, 0, 0.4)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 15px 40px rgba(139, 0, 0, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 10px 30px rgba(139, 0, 0, 0.4)';
                }}
              >
                View Final Results
              </button>
            )}
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
