// components/LiveBattleView.jsx
"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useBattleState } from '../lib/useBattleState';
import { calculateBattleScore, CLUE_COSTS } from '../lib/battleScoring';
import { submitGuess, fetchBattleRounds } from '../lib/battleDatabase';
import { useIsMobile } from '../lib/useIsMobile';
import dynamic from 'next/dynamic';
import GlassBackButton from './GlassBackButton';
import ContinentButtons from './ContinentButtons';
import BottomControlBar from './BottomControlBar';
import BattleHeader from './battle/BattleHeader';
import BattleRoundResults from './battle/BattleRoundResults';
import BattleFinalResults from './battle/BattleFinalResults';

const GlobeMap = dynamic(() => import('./GlobeMap'), { ssr: false });

const ROUND_TIMER = 180; // 3 minutes per round
const SPEED_ROUND_TIMER = 45; // 45 seconds after opponent submits

export default function LiveBattleView({ battleId, session, setView }) {
  const isMobile = useIsMobile();
  const { battle, currentRound, puzzle, loading, error } = useBattleState(battleId);
  
  // Game state
  const [unlockedClues, setUnlockedClues] = useState([1]);
  const [score, setScore] = useState(10000);
  const [selectedYear, setSelectedYear] = useState(0);
  const [guessCoords, setGuessCoords] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [timer, setTimer] = useState(null);
  const [timerCapped, setTimerCapped] = useState(false);
  
  // Results state
  const [showRoundResults, setShowRoundResults] = useState(false);
  const [showFinalResults, setShowFinalResults] = useState(false);
  const [roundResults, setRoundResults] = useState(null);
  const [allRounds, setAllRounds] = useState(null);
  
  // Confirmation
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Determine player roles
  const isPlayer1 = session?.user?.id === battle?.player1_id;
  const myProfile = isPlayer1 ? battle?.player1 : battle?.player2;
  const opponentProfile = isPlayer1 ? battle?.player2 : battle?.player1;
  
  const mySubmittedAt = isPlayer1 ? currentRound?.player1_submitted_at : currentRound?.player2_submitted_at;
  const oppSubmittedAt = isPlayer1 ? currentRound?.player2_submitted_at : currentRound?.player1_submitted_at;
  
  // Reset state when round changes
  useEffect(() => {
    if (currentRound) {
      const alreadySubmitted = isPlayer1 ? currentRound.player1_submitted_at : currentRound.player2_submitted_at;
      if (alreadySubmitted) {
        setSubmitted(true);
        setTimer(null);
      } else {
        setUnlockedClues([1]);
        setScore(10000);
        setSelectedYear(0);
        setGuessCoords(null);
        setSubmitted(false);
        setShowRoundResults(false);
        setTimerCapped(false);
        
        // Start timer
        if (currentRound.started_at) {
          const startTime = new Date(currentRound.started_at).getTime();
          const now = Date.now();
          const elapsed = Math.floor((now - startTime) / 1000);
          setTimer(Math.max(0, ROUND_TIMER - elapsed));
        }
      }
    }
  }, [currentRound?.id]);
  
  // Timer countdown
  useEffect(() => {
    if (timer === null || timer <= 0 || submitted) return;
    
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          // Auto-submit on timeout
          if (!submitted) {
            handleAutoSubmit();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [timer, submitted]);
  
  // Speed round timer (when opponent submits first)
  useEffect(() => {
    if (oppSubmittedAt && !mySubmittedAt && !timerCapped) {
      const oppSubmitTime = new Date(oppSubmittedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - oppSubmitTime) / 1000);
      const remaining = Math.max(0, SPEED_ROUND_TIMER - elapsed);
      
      setTimer(remaining);
      setTimerCapped(true);
    }
  }, [oppSubmittedAt, mySubmittedAt, timerCapped]);
  
  // Check for round completion
  useEffect(() => {
    if (currentRound && currentRound.status === 'completed' && !showRoundResults && mySubmittedAt) {
      // Show round results
      const myScore = isPlayer1 ? currentRound.player1_score : currentRound.player2_score;
      const oppScore = isPlayer1 ? currentRound.player2_score : currentRound.player1_score;
      const myTotalScore = isPlayer1 ? battle.player1_total_score : battle.player2_total_score;
      const oppTotalScore = isPlayer1 ? battle.player2_total_score : battle.player1_total_score;
      
      let winner = 'tie';
      if (myScore > oppScore) winner = 'me';
      else if (oppScore > myScore) winner = 'opponent';
      
      setRoundResults({
        roundNumber: currentRound.round_number,
        myScore,
        oppScore,
        myTotalScore,
        oppTotalScore,
        winner
      });
      setShowRoundResults(true);
    }
  }, [currentRound?.status, mySubmittedAt]);
  
  // Check for battle completion
  useEffect(() => {
    if (battle && battle.status === 'completed' && !showFinalResults && allRounds === null) {
      // Fetch all rounds and show final results
      fetchBattleRounds(battleId).then(rounds => {
        if (rounds) {
          setAllRounds(rounds);
          setShowFinalResults(true);
        }
      });
    }
  }, [battle?.status, allRounds]);
  
  const handleMapGuess = (latlng) => {
    if (!submitted) {
      setGuessCoords(latlng);
    }
  };
  
  const handleUnlockClue = (clueNumber) => {
    if (submitted || unlockedClues.includes(clueNumber)) return;
    const cost = CLUE_COSTS[clueNumber];
    if (score >= cost) {
      setScore(score - cost);
      setUnlockedClues([...unlockedClues, clueNumber].sort());
    }
  };
  
  const handleYearChange = (newYear) => {
    if (!submitted) {
      const year = Math.max(-3000, Math.min(2025, parseInt(newYear) || 0));
      setSelectedYear(year);
    }
  };
  
  const adjustYear = (amount) => {
    if (!submitted) {
      const newYear = selectedYear + amount;
      const adjustedYear = Math.max(-3000, Math.min(2025, newYear));
      setSelectedYear(adjustedYear);
    }
  };
  
  const handleAutoSubmit = useCallback(async () => {
    if (!puzzle || !currentRound || submitted) return;
    
    // Submit with current state (or defaults if nothing set)
    const coords = guessCoords || { lat: 0, lng: 0 };
    
    const result = calculateBattleScore({
      puzzle,
      guessLat: coords.lat,
      guessLng: coords.lng,
      guessYear: selectedYear,
      cluesUsed: unlockedClues,
      timeRemaining: 0
    });
    
    await submitGuess({
      roundId: currentRound.id,
      playerId: session.user.id,
      score: result.finalScore,
      distanceKm: result.distance,
      yearGuess: selectedYear,
      cluesUsed: unlockedClues,
      guessLat: coords.lat,
      guessLng: coords.lng
    });
    
    setSubmitted(true);
    setTimer(null);
  }, [puzzle, currentRound, guessCoords, selectedYear, unlockedClues, submitted]);
  
  const handleGuessSubmit = async () => {
    if (!puzzle || !currentRound || !guessCoords || submitted) return;
    
    setShowConfirmModal(false);
    
    const timeRemaining = timer || 0;
    
    const result = calculateBattleScore({
      puzzle,
      guessLat: guessCoords.lat,
      guessLng: guessCoords.lng,
      guessYear: selectedYear,
      cluesUsed: unlockedClues,
      timeRemaining
    });
    
    await submitGuess({
      roundId: currentRound.id,
      playerId: session.user.id,
      score: result.finalScore,
      distanceKm: result.distance,
      yearGuess: selectedYear,
      cluesUsed: unlockedClues,
      guessLat: guessCoords.lat,
      guessLng: guessCoords.lng
    });
    
    setSubmitted(true);
    setTimer(null);
  };
  
  const displayYear = (year) => {
    const yearNum = Number(year);
    if (yearNum < 0) return `${Math.abs(yearNum)} BCE`;
    if (yearNum === 0) return `Year 0`;
    return `${yearNum} CE`;
  };
  
  const getClueText = (clueNumber) => {
    return puzzle?.puzzle_translations?.[0]?.[`clue_${clueNumber}_text`];
  };
  
  const handleRoundContinue = () => {
    setShowRoundResults(false);
    setRoundResults(null);
  };
  
  const handleExit = () => {
    setView('menu');
  };
  
  if (loading) {
    return (
      <div 
        className="min-h-screen relative flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%)`
        }}
      >
        <div className="text-center">
          <div className="text-2xl font-serif text-white mb-4">Loading battle...</div>
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }
  
  if (error || !battle || !currentRound || !puzzle) {
    return (
      <div 
        className="min-h-screen relative flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%)`
        }}
      >
        <div className="text-center p-8">
          <p className="text-red-400 font-bold mb-4 text-2xl">Error</p>
          <p className="text-gray-300 mb-6">{error || "Could not load battle"}</p>
          <button 
            onClick={handleExit}
            className="px-6 py-3 bg-gray-800 text-white font-medium rounded-md hover:bg-gray-700"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }
  
  // Mobile layout
  if (isMobile) {
    return (
      <div 
        className="min-h-screen relative"
        style={{
          background: `
            linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%),
            radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%),
            radial-gradient(circle at 70% 80%, rgba(212, 175, 55, 0.01) 0%, transparent 50%)
          `
        }}
      >
        <GlassBackButton onClick={handleExit} fallbackUrl="/" />
        
        <BattleHeader
          battle={battle}
          currentRound={currentRound}
          myProfile={myProfile}
          opponentProfile={opponentProfile}
          timer={timer}
          timerCapped={timerCapped}
        />
        
        <div className="px-4 pb-8 pt-4 space-y-4">
          {/* Clues */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((num) => {
              const isUnlocked = unlockedClues.includes(num);
              const clueText = getClueText(num);
              
              return (
                <div 
                  key={num}
                  className="backdrop-blur rounded-lg border"
                  style={{ 
                    backgroundColor: isUnlocked ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
                    border: isUnlocked ? '2px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  {isUnlocked ? (
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#d4af37' }}></div>
                        <span className="font-serif font-bold text-sm" style={{ color: '#d4af37' }}>
                          Clue {num}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm">{clueText}</p>
                    </div>
                  ) : (
                    <button 
                      className="w-full p-3 text-left hover:bg-white/5"
                      onClick={() => handleUnlockClue(num)}
                      disabled={submitted}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white text-sm">Unlock Clue {num}</span>
                        <span className="text-yellow-500 font-bold text-sm">
                          {CLUE_COSTS[num].toLocaleString()}
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Map */}
          <div className="backdrop-blur rounded-lg border p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
            <h3 className="text-lg font-serif font-bold text-white mb-3">Guess Location</h3>
            <div className="rounded-lg overflow-hidden" style={{ border: '2px solid rgba(255, 255, 255, 0.1)' }}>
              <div className="h-64">
                <GlobeMap onGuess={handleMapGuess} guessCoords={guessCoords} selectedYear={selectedYear} />
              </div>
            </div>
          </div>
          
          {/* Year Selector */}
          <div className="backdrop-blur rounded-lg border p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
            <h3 className="text-lg font-serif font-bold text-white mb-3">Year Guess</h3>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                disabled={submitted}
                className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-md text-white text-center"
                style={{ color: '#d4af37' }}
              />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => adjustYear(10)} disabled={submitted} className="px-3 py-2 bg-gray-800 text-gray-300 rounded">+10</button>
                <button onClick={() => adjustYear(1)} disabled={submitted} className="px-3 py-2 bg-gray-800 text-gray-300 rounded">+1</button>
                <button onClick={() => adjustYear(-10)} disabled={submitted} className="px-3 py-2 bg-gray-800 text-gray-300 rounded">-10</button>
                <button onClick={() => adjustYear(-1)} disabled={submitted} className="px-3 py-2 bg-gray-800 text-gray-300 rounded">-1</button>
              </div>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
              <p className="text-sm text-gray-400 mb-1">Your guess:</p>
              <p className="text-xl font-bold" style={{ color: '#d4af37' }}>{displayYear(selectedYear)}</p>
            </div>
          </div>
          
          {/* Score */}
          <div className="backdrop-blur rounded-lg border p-4 text-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <p className="text-sm text-gray-400 mb-1">Potential Score</p>
            <p className="text-3xl font-bold" style={{ color: '#d4af37' }}>{score.toLocaleString()}</p>
          </div>
          
          {/* Submit Button */}
          {!submitted && (
            <button 
              onClick={() => setShowConfirmModal(true)}
              disabled={!guessCoords}
              className="w-full px-8 py-4 font-bold text-white rounded-md"
              style={{ background: guessCoords ? 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)' : '#374151' }}
            >
              {!guessCoords ? 'Place a Pin on the Map' : 'Submit Guess'}
            </button>
          )}
          
          {submitted && (
            <div className="text-center py-4">
              <p className="text-green-400 font-bold text-lg">✓ Submitted!</p>
              <p className="text-gray-400 text-sm">Waiting for opponent...</p>
            </div>
          )}
        </div>
        
        {/* Confirm Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="backdrop-blur rounded-xl p-8 max-w-md w-full" style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}>
              <h3 className="text-2xl font-serif font-bold text-white mb-4 text-center">Confirm Your Guess</h3>
              <div className="space-y-3 mb-6">
                <p className="text-gray-300">Year: <span className="font-bold" style={{ color: '#d4af37' }}>{displayYear(selectedYear)}</span></p>
                <p className="text-gray-300">Score: <span className="font-bold" style={{ color: '#d4af37' }}>{score.toLocaleString()}</span></p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowConfirmModal(false)} className="flex-1 px-4 py-3 bg-gray-800 text-gray-300 rounded">Cancel</button>
                <button onClick={handleGuessSubmit} className="flex-1 px-4 py-3 font-bold text-white rounded" style={{ background: 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)' }}>Confirm</button>
              </div>
            </div>
          </div>
        )}
        
        {/* Round Results */}
        {showRoundResults && roundResults && (
          <BattleRoundResults {...roundResults} onContinue={handleRoundContinue} />
        )}
        
        {/* Final Results */}
        {showFinalResults && allRounds && (
          <BattleFinalResults
            rounds={allRounds}
            battle={battle}
            myProfile={myProfile}
            opponentProfile={opponentProfile}
            onExit={handleExit}
          />
        )}
      </div>
    );
  }
  
  // Desktop layout
  return (
    <div className="h-screen relative overflow-hidden flex flex-col" style={{ background: `linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%)` }}>
      <GlassBackButton onClick={handleExit} fallbackUrl="/" />
      
      <BattleHeader
        battle={battle}
        currentRound={currentRound}
        myProfile={myProfile}
        opponentProfile={opponentProfile}
        timer={timer}
        timerCapped={timerCapped}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Clues */}
        <div className="w-80 flex flex-col overflow-hidden" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {[1, 2, 3, 4, 5].map((num) => {
            const isUnlocked = unlockedClues.includes(num);
            const clueText = getClueText(num);
            
            return (
              <div 
                key={num}
                className="backdrop-blur rounded-lg border"
                style={{ 
                  backgroundColor: isUnlocked ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
                  border: isUnlocked ? '2px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                {isUnlocked ? (
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#d4af37' }}></div>
                      <span className="font-serif font-bold text-xs" style={{ color: '#d4af37' }}>Clue {num}</span>
                    </div>
                    <p className="text-gray-300 text-xs leading-relaxed">{clueText}</p>
                  </div>
                ) : (
                  <button 
                    className="w-full p-2.5 text-left hover:bg-white/5 transition-colors disabled:opacity-50"
                    onClick={() => handleUnlockClue(num)}
                    disabled={submitted}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white text-xs">Unlock Clue {num}</span>
                      <span className="text-yellow-500 font-bold text-xs">{CLUE_COSTS[num].toLocaleString()}</span>
                    </div>
                  </button>
                )}
              </div>
            );
          })}
          
          </div>
          
          {/* Bottom sticky section with score and button */}
          <div className="p-4 space-y-2 border-t" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', borderColor: 'rgba(212, 175, 55, 0.2)' }}>
            {/* Score */}
            <div className="backdrop-blur rounded-lg border p-3 text-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
              <p className="text-xs text-gray-400 mb-1">Potential Score</p>
              <p className="text-xl font-bold" style={{ color: '#d4af37' }}>{score.toLocaleString()}</p>
            </div>
            
            {!submitted && (
              <button 
                onClick={() => setShowConfirmModal(true)}
                disabled={!guessCoords}
                className="w-full px-6 py-3 font-bold text-white rounded-md transition-all"
                style={{ background: guessCoords ? 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)' : '#374151' }}
                onMouseEnter={(e) => {
                  if (guessCoords) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 8px 20px rgba(139, 0, 0, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                {!guessCoords ? 'Place Pin First' : 'Submit Guess'}
              </button>
            )}
            
            {submitted && (
              <div className="text-center py-3 bg-green-900/20 rounded-lg border border-green-500/30">
                <p className="text-green-400 font-bold text-lg">✓ Submitted!</p>
                <p className="text-gray-400 text-xs mt-1">Waiting for opponent...</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Center - Map */}
        <div className="flex-1 relative">
          <GlobeMap onGuess={handleMapGuess} guessCoords={guessCoords} selectedYear={selectedYear} />
          <ContinentButtons onJumpToContinent={handleMapGuess} />
          <BottomControlBar
            year={selectedYear}
            onYearChange={handleYearChange}
            onAdjustYear={adjustYear}
            onEraSelect={setSelectedYear}
            score={score}
            guessCoords={guessCoords}
            results={null}
            onMakeGuess={() => setShowConfirmModal(true)}
          />
        </div>
      </div>
      
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur rounded-xl p-8 max-w-md w-full" style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}>
            <h3 className="text-2xl font-serif font-bold text-white mb-4 text-center">Confirm</h3>
            <div className="space-y-3 mb-6">
              <p className="text-gray-300">Year: <span className="font-bold" style={{ color: '#d4af37' }}>{displayYear(selectedYear)}</span></p>
              <p className="text-gray-300">Score: <span className="font-bold" style={{ color: '#d4af37' }}>{score.toLocaleString()}</span></p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 px-4 py-3 bg-gray-800 text-gray-300 rounded">Cancel</button>
              <button onClick={handleGuessSubmit} className="flex-1 px-4 py-3 font-bold text-white rounded" style={{ background: 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
      
      {showRoundResults && roundResults && (
        <BattleRoundResults {...roundResults} onContinue={handleRoundContinue} />
      )}
      
      {showFinalResults && allRounds && (
        <BattleFinalResults
          rounds={allRounds}
          battle={battle}
          myProfile={myProfile}
          opponentProfile={opponentProfile}
          onExit={handleExit}
        />
      )}
    </div>
  );
}
