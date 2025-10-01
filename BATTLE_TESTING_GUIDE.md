# Live Battle Testing Guide

## How to Test the Fix

### Setup
1. Open the game in **two different browser windows** (or use incognito for one)
2. Sign in as two different players
3. Open **Developer Console** (F12) in both windows
4. Start a live battle between the two players

### What to Watch For

When **Player 1** submits their guess, check console for:
```
✅ Score and completion saved successfully! Refetching to verify...
✅ Round data verified after save: {
  roundId: "...",
  p1_score: 5000,  // Should show actual score
  p2_score: 0,     // Should still be 0
  p1_completed: true,  // Should be true
  p2_completed: false, // Should be false
  ...
}
[Polling 1] Round status: {
  p1_completed: true,
  p2_completed: false,  // Should be false until Player 2 submits
  ...
}
```

When **Player 2** submits their guess, check console for:
```
✅ Score and completion saved successfully! Refetching to verify...
✅ Round data verified after save: {
  roundId: "...",
  p1_score: 5000,  // Player 1's score
  p2_score: 4500,  // Player 2's score
  p1_completed: true,
  p2_completed: true,  // NOW both are true
  ...
}
```

Then **BOTH** players should see:
```
[Polling X] Round status: {
  p1_completed: true,
  p2_completed: true,  // Both true!
  p1_score: 5000,
  p2_score: 4500,
  status: "active"
}
Both players completed! Fetching opponent score and showing results
Showing results with scores: {
  myScore: ...,
  oppScore: ...,
  bothCompleted: true
}
```

### Expected Behavior

✅ **CORRECT**:
- Player 1 submits → Sees "Waiting for opponent..." 
- Player 2 submits → BOTH players see results modal
- Results show both players' actual scores
- Winner is correctly determined
- After 3 seconds, next round starts

❌ **INCORRECT** (current bug):
- Player 1 submits → Immediately sees results
- Round ends without waiting for Player 2
- Shows "You won" even though opponent didn't finish

### Key Things to Check

1. **Score Saving**: Do you see "✅ Score and completion saved successfully!" in console?
2. **Polling Status**: Do the polling logs show both `p1_completed` and `p2_completed` becoming true?
3. **Opponent Guess**: Do you see `setOppGuess` being called with the opponent's score?
4. **Results Timing**: Do results only show AFTER both players complete?

### If Still Broken

Share these console logs:
1. Everything from when you click "Submit Guess"
2. Everything from the polling logs
3. Any errors in red

This will help me see exactly where the synchronization is failing.
