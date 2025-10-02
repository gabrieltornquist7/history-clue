// components/battle/BattleHeader.jsx
// Header component showing battle info, scores, and timer

"use client";

export default function BattleHeader({ 
  battle, 
  currentRound, 
  myProfile, 
  opponentProfile,
  timer,
  timerCapped = false 
}) {
  const myScore = myProfile?.id === battle?.player1_id 
    ? battle?.player1_total_score 
    : battle?.player2_total_score;
  
  const oppScore = opponentProfile?.id === battle?.player1_id 
    ? battle?.player1_total_score 
    : battle?.player2_total_score;
  
  const timerLow = timer !== null && timer < 30;
  const timerVeryLow = timer !== null && timer < 10;
  
  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div 
      className="backdrop-blur-xl p-4 border-b"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderBottom: '1px solid rgba(212, 175, 55, 0.2)'
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Round Info */}
        <div className="text-center mb-4">
          <h2 
            className="text-xl font-serif font-bold text-white mb-1"
            style={{ textShadow: '0 0 15px rgba(212, 175, 55, 0.3)' }}
          >
            Live Battle - Round {currentRound?.round_number || 1} of 3
          </h2>
          <p className="text-sm text-gray-400">
            {myProfile?.username} <span className="text-yellow-500">vs</span> {opponentProfile?.username}
          </p>
        </div>
        
        {/* Scores */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* My Score */}
          <div 
            className="backdrop-blur rounded-lg p-3 text-center"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              border: '2px solid rgba(34, 197, 94, 0.3)'
            }}
          >
            <p className="text-xs text-gray-400 uppercase mb-1">You</p>
            <p 
              className="text-2xl font-bold"
              style={{ color: '#22c55e', textShadow: '0 0 10px rgba(34, 197, 94, 0.3)' }}
            >
              {myScore?.toLocaleString() || 0}
            </p>
          </div>
          
          {/* VS */}
          <div className="flex items-center justify-center">
            <span 
              className="text-3xl font-bold"
              style={{ color: '#d4af37', textShadow: '0 0 20px rgba(212, 175, 55, 0.5)' }}
            >
              VS
            </span>
          </div>
          
          {/* Opponent Score */}
          <div 
            className="backdrop-blur rounded-lg p-3 text-center"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              border: '2px solid rgba(59, 130, 246, 0.3)'
            }}
          >
            <p className="text-xs text-gray-400 uppercase mb-1">Opponent</p>
            <p 
              className="text-2xl font-bold"
              style={{ color: '#3b82f6', textShadow: '0 0 10px rgba(59, 130, 246, 0.3)' }}
            >
              {oppScore?.toLocaleString() || 0}
            </p>
          </div>
        </div>
        
        {/* Timer */}
        {timer !== null && (
          <div 
            className="backdrop-blur rounded-lg p-4 text-center transition-all duration-300"
            style={{
              backgroundColor: timerVeryLow ? 'rgba(239, 68, 68, 0.3)' : timerLow ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 0, 0, 0.5)',
              border: timerLow ? '2px solid #ef4444' : '2px solid rgba(212, 175, 55, 0.2)',
              boxShadow: timerLow ? '0 0 20px rgba(239, 68, 68, 0.3)' : '0 0 20px rgba(212, 175, 55, 0.1)'
            }}
          >
            <p className="text-xs text-gray-400 uppercase mb-1">
              {timerCapped ? 'Hurry! Opponent submitted!' : 'Time Remaining'}
            </p>
            <p 
              className={`text-4xl font-bold ${timerVeryLow ? 'animate-pulse' : ''}`}
              style={{ 
                color: timerLow ? '#ef4444' : '#ffffff',
                textShadow: timerLow ? '0 0 20px rgba(239, 68, 68, 0.5)' : '0 0 20px rgba(212, 175, 55, 0.3)'
              }}
            >
              {formatTime(timer)}
            </p>
            {timerCapped && (
              <p className="text-xs text-orange-400 mt-1 animate-pulse">
                ⚡ 45 second speed round!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
