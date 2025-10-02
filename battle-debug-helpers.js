// Add this at the very top of LiveBattleView.js after imports
// to catch any undefined values before they cause errors

const DEBUG_MODE = true;

const debugLog = (...args) => {
  if (DEBUG_MODE) {
    console.log('[DEBUG LiveBattle]', ...args);
  }
};

const safeBattleStateAccess = (battleState, path) => {
  if (!battleState) {
    debugLog('❌ battleState is undefined/null');
    return null;
  }
  
  const parts = path.split('.');
  let current = battleState;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      debugLog(`❌ Path "${path}" failed at "${part}"`);
      return null;
    }
    current = current[part];
  }
  
  debugLog(`✓ Path "${path}" =`, current);
  return current;
};

// Usage example:
// Instead of: battleState.myTotalScore
// Use: safeBattleStateAccess(battleState, 'myTotalScore') ?? 0
