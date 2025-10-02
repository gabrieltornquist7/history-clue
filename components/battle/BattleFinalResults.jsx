// components/battle/BattleFinalResults.jsx
// Final results modal showing overall battle winner

"use client";
import { useState, useEffect } from 'react';

export default function BattleFinalResults({
  rounds,
  battle,
  myProfile,
  opponentProfile,
  onExit
}) {
  const [stage, setStage] = useState(0);
  
  // Calculate wins
  const myWins = rounds.filter(r => 
    (myProfile.id === battle.player1_id && r.round_winner_id === battle.player1_id) ||
    (myProfile.id === battle.player2_id && r.round_winner_id === battle.player2_id)
  ).length;
  
  const oppWins = rounds.filter(r => 
    (opponentProfile.id === battle.player1_id && r.round_winner_id === battle.player1_id) ||
    (opponentProfile.id === battle.player2_id && r.round_winner_id === battle.player2_id)
  ).length;
  
  const iWon = myWins > oppWins;
  const isTie = myWins === oppWins;
  
  const myTotalScore = myProfile.id === battle.player1_id ? battle.player1_total_score : battle.player2_total_score;
  const oppTotalScore = opponentProfile.id === battle.player1_id ? battle.player1_total_score : battle.player2_total_score;
  
  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 300),  // Winner
      setTimeout(() => setStage(2), 700),  // Wins
      setTimeout(() => setStage(3), 1100), // Scores
      setTimeout(() => setStage(4), 1500), // Rounds
      setTimeout(() => setStage(5), 1900), // Button
    ];
    
    return () => timers.forEach(t => clearTimeout(t));
  }, []);
  
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div 
        className="backdrop-blur rounded-xl max-w-lg w-full"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          border: '2px solid rgba(212, 175, 55, 0.3)',
          boxShadow: '0 0 100px rgba(0, 0, 0, 0.9)'
        }}
      >
        {/* Header */}
        <div className="p-6">
          <h2 
            className="text-4xl font-serif font-bold text-white text-center mb-2"
            style={{ textShadow: '0 0 20px rgba(212, 175, 55, 0.5)' }}
          >
            Battle Complete!
          </h2>
        </div>
        
        {/* Content */}
        <div className="px-6 py-2 space-y-4">
          {/* Winner - Stage 1 */}
          {stage >= 1 && (
            <div className="fade-in-scale text-center">
              <div className="text-8xl mb-4">
                {iWon ? '🏆' : isTie ? '🤝' : '💪'}
              </div>
              <p 
                className={`text-3xl font-bold ${
                  iWon ? 'text-yellow-400' : isTie ? 'text-gray-400' : 'text-blue-400'
                }`}
                style={{ textShadow: '0 0 20px rgba(212, 175, 55, 0.3)' }}
              >
                {iWon ? 'Victory!' : isTie ? 'Draw!' : 'Valiant Effort!'}
              </p>
            </div>
          )}
          
          {/* Wins - Stage 2 */}
          {stage >= 2 && (
            <div className="fade-in-scale">
              <div 
                className="rounded-lg p-4"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              >
                <p className="text-sm text-gray-400 text-center mb-3">Rounds Won</p>
                <div className="flex justify-center gap-8 items-center">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">{myProfile.username}</p>
                    <p className="text-4xl font-bold text-green-400">{myWins}</p>
                  </div>
                  <div className="text-2xl text-gray-500">-</div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">{opponentProfile.username}</p>
                    <p className="text-4xl font-bold text-blue-400">{oppWins}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Total Scores - Stage 3 */}
          {stage >= 3 && (
            <div className="fade-in-scale">
              <div 
                className="rounded-lg p-4"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              >
                <p className="text-sm text-gray-400 text-center mb-3">Total Score</p>
                <div className="flex justify-center gap-8 items-center">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">You</p>
                    <p className="text-2xl font-bold text-green-400">
                      {myTotalScore?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="text-2xl text-gray-500">-</div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Them</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {oppTotalScore?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Round Breakdown - Stage 4 */}
          {stage >= 4 && (
            <div className="fade-in-scale space-y-2">
              <p className="text-sm text-gray-400 text-center">Round Breakdown</p>
              {rounds.map((round, idx) => {
                const myRoundScore = myProfile.id === battle.player1_id ? round.player1_score : round.player2_score;
                const oppRoundScore = opponentProfile.id === battle.player1_id ? round.player1_score : round.player2_score;
                const iWonRound = myRoundScore > oppRoundScore;
                
                return (
                  <div 
                    key={idx}
                    className="flex justify-between items-center bg-gray-800/30 rounded p-2"
                  >
                    <span className="text-gray-400 text-sm">Round {idx + 1}</span>
                    <div className="flex gap-4 items-center">
                      <span className={`font-bold ${iWonRound ? 'text-green-400' : 'text-gray-400'}`}>
                        {myRoundScore?.toLocaleString() || 0}
                      </span>
                      <span className="text-gray-500">-</span>
                      <span className={`font-bold ${!iWonRound && myRoundScore !== oppRoundScore ? 'text-blue-400' : 'text-gray-400'}`}>
                        {oppRoundScore?.toLocaleString() || 0}
                      </span>
                      <span className="text-yellow-400 w-4">
                        {iWonRound ? '✓' : myRoundScore === oppRoundScore ? '=' : '✗'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Button - Stage 5 */}
        {stage >= 5 && (
          <div className="p-6 pt-2 fade-in-scale">
            <button
              onClick={onExit}
              className="w-full px-8 py-4 font-bold text-white rounded-md transition-all"
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
              Back to Menu
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
