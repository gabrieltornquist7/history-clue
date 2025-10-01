# Live Battle Round Completion Fix

## Problem
Rounds don't wait for both players to finish - they progress immediately because scores aren't being saved to the database.

## Solution
Update the `handleGuessSubmit` function in `LiveBattleView.js` to save both the score AND completion timestamp to the database.

## Code Changes Needed

Find the section in `handleGuessSubmit` that says:
```javascript
// Update battle_rounds with completion timestamp
if (!gameData.battle) {
  console.error('No battle data available for completion update');
  return;
}

const isPlayer1 = session.user.id === gameData.battle.player1;
const completionField = isPlayer1 ? 'player1_completed_at' : 'player2_completed_at';
```

Replace the database update section (around line 1100-1150) with:

```javascript
// Update battle_rounds with BOTH score and completion timestamp
if (!gameData.battle) {
  console.error('No battle data available for completion update');
  return;
}

const isPlayer1 = session.user.id === gameData.battle.player1;
const scoreField = isPlayer1 ? 'p1_score' : 'p2_score';
const completionField = isPlayer1 ? 'player1_completed_at' : 'player2_completed_at';

const updatePayload = {
  [scoreField]: finalScore,  // ADD THIS - save the score!
  [completionField]: new Date().toISOString()
};

console.log('Round update attempt:', {
  roundId: currentRoundId.current,
  payload: updatePayload,
  finalScore: finalScore
});

const { error: completionError } = await supabase
  .from('battle_rounds')
  .update(updatePayload)
  .eq('id', currentRoundId.current);
```

Also update the `pollForRoundCompletion` function to check for completion timestamps instead of scores:

```javascript
// Check if both players have completed (using completion timestamps is more reliable)
const bothCompleted = currentRound.player1_completed_at && currentRound.player2_completed_at;
```

## Why This Fixes It

1. **Saves Score**: Now when a player submits, their score is written to `p1_score` or `p2_score`
2. **Saves Timestamp**: The completion timestamp is also saved
3. **Polling Works**: The polling function can now detect when both players have completed by checking timestamps
4. **Prevents Race**: Using timestamps (which are null until set) is more reliable than scores (which default to 0)
