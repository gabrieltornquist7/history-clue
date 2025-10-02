// lib/useBattleState.js
// Custom hook for managing battle state with polling

import { useState, useEffect, useCallback } from 'react';
import { fetchBattleState } from './battleDatabase';

const POLL_INTERVAL = 2000; // Poll every 2 seconds

/**
 * Custom hook to manage battle state with automatic polling
 */
export function useBattleState(battleId) {
  const [battle, setBattle] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [puzzle, setPuzzle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  // Refresh function that can be called manually
  const refreshBattleState = useCallback(async () => {
    if (!battleId) return;
    
    const state = await fetchBattleState(battleId);
    
    if (state) {
      setBattle(state.battle);
      setCurrentRound(state.currentRound);
      setPuzzle(state.puzzle);
      setError(null);
      setLastUpdate(Date.now());
    } else {
      setError('Failed to load battle state');
    }
    
    setLoading(false);
  }, [battleId]);
  
  // Initial load
  useEffect(() => {
    refreshBattleState();
  }, [refreshBattleState]);
  
  // Polling
  useEffect(() => {
    if (!battleId) return;
    
    const interval = setInterval(() => {
      refreshBattleState();
    }, POLL_INTERVAL);
    
    return () => clearInterval(interval);
  }, [battleId, refreshBattleState]);
  
  return {
    battle,
    currentRound,
    puzzle,
    loading,
    error,
    lastUpdate,
    refresh: refreshBattleState
  };
}
