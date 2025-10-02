# Live Battle System - Developer Quick Reference

## 🚀 Quick Start

### Creating a Battle
```javascript
import { createBattle } from './lib/battleDatabase';

const result = await createBattle(userId);
// Returns: { battleId: 'uuid', inviteCode: 'X7K9P2' }
```

### Joining a Battle
```javascript
import { joinBattle } from './lib/battleDatabase';

const result = await joinBattle('X7K9P2', userId);
// Returns: { battleId: 'uuid', puzzleId: 123 }
// Or: { error: 'Battle not found' }
```

### Using the Battle State Hook
```javascript
import { useBattleState } from './lib/useBattleState';

function MyComponent({ battleId }) {
  const { battle, currentRound, puzzle, loading, error, refresh } = useBattleState(battleId);
  
  // battle: Full battle object with scores and status
  // currentRound: Active round data
  // puzzle: Current puzzle with clues
  // loading: Boolean loading state
  // error: Error message if any
  // refresh: Manual refresh function
}
```

### Calculating Score
```javascript
import { calculateBattleScore } from './lib/battleScoring';

const result = calculateBattleScore({
  puzzle: puzzleObject,
  guessLat: 45.0,
  guessLng: -93.0,
  guessYear: 1492,
  cluesUsed: [1, 2, 3], // Array of clue numbers
  timeRemaining: 120 // Seconds
});

// Returns:
// {
//   finalScore: 4250,
//   distance: 1234, // km
//   yearDiff: 50,
//   breakdown: {
//     baseScore: 5000,
//     distancePenalty: 500,
//     yearPenalty: 250,
//     timeBonus: 0,
//     proximityBonus: 0
//   }
// }
```

### Submitting a Guess
```javascript
import { submitGuess } from './lib/battleDatabase';

const result = await submitGuess({
  roundId: 'round-uuid',
  playerId: 'user-uuid',
  score: 4250,
  distanceKm: 1234,
  yearGuess: 1492,
  cluesUsed: [1, 2, 3],
  guessLat: 45.0,
  guessLng: -93.0
});

// Returns: { success: true, bothSubmitted: false }
```

## 📋 Database Schema Reference

### Battles Table
```typescript
interface Battle {
  id: string;                    // UUID
  invite_code: string;           // 6-char code like "X7K9P2"
  status: 'waiting' | 'active' | 'completed';
  player1_id: string;            // UUID
  player2_id: string | null;     // UUID
  current_round_number: 1 | 2 | 3;
  player1_total_score: number;
  player2_total_score: number;
  winner_id: string | null;      // UUID
  created_at: string;            // ISO timestamp
  started_at: string | null;     // ISO timestamp
  completed_at: string | null;   // ISO timestamp
}
```

### Battle Rounds Table
```typescript
interface BattleRound {
  id: string;                    // UUID
  battle_id: string;             // UUID
  round_number: 1 | 2 | 3;
  puzzle_id: number;             // Puzzle ID
  status: 'pending' | 'active' | 'completed';
  
  // Player 1 data
  player1_score: number | null;
  player1_distance_km: number | null;
  player1_year_guess: number | null;
  player1_clues_used: number[];  // Array like [1, 2, 3]
  player1_submitted_at: string | null;
  player1_guess_lat: number | null;
  player1_guess_lng: number | null;
  
  // Player 2 data (same structure)
  player2_score: number | null;
  player2_distance_km: number | null;
  player2_year_guess: number | null;
  player2_clues_used: number[];
  player2_submitted_at: string | null;
  player2_guess_lat: number | null;
  player2_guess_lng: number | null;
  
  // Round outcome
  round_winner_id: string | null; // UUID
  started_at: string | null;
  completed_at: string | null;
}
```

## 🎮 Game Flow

```
1. Player 1 creates battle → Gets invite code
2. Player 2 joins with code → Battle starts
3. Round 1 begins → Both players solve puzzle
4. Players submit guesses → Round ends
5. Show round results
6. Round 2 begins (auto)
7. Players submit guesses → Round ends
8. Show round results
9. Round 3 begins (auto)
10. Players submit guesses → Battle ends
11. Show final results
```

## ⏱️ Timer Rules

- **Base Timer**: 180 seconds (3 minutes)
- **Speed Round**: 45 seconds (triggered when opponent submits first)
- **Auto-Submit**: If timer hits 0, current state is submitted
- **Visual Warnings**: 
  - Yellow at <30 seconds
  - Red/pulsing at <10 seconds

## 🏆 Scoring Formula

```javascript
// Base score (from clues used)
const baseScore = [5000, 3500, 2500, 1500, 800][cluesUsed.length - 1];

// Distance penalty (max 50% of base)
const distancePenalty = (distance / 20000) * 0.5 * baseScore;

// Year penalty (max 30% of base)
const yearPenalty = (Math.abs(yearDiff) / 4000) * 0.3 * baseScore;

// Time bonus (only if submitted quickly)
const timeBonus = timeRemaining > 30 ? ((timeRemaining - 30) / 150) * 0.2 * baseScore : 0;

// Proximity bonus
const proximityBonus = distance < 50 ? 1000 : distance < 200 ? 500 : 0;

// Final score
const finalScore = baseScore - distancePenalty - yearPenalty + timeBonus + proximityBonus;
```

## 🔒 Security

All database operations use Row Level Security (RLS):
- Players can only read/update their own battles
- Invite codes are validated server-side
- Cannot join own battles
- Database functions handle all game logic

## 🐛 Error Handling

```javascript
// All database functions return null on error
const result = await createBattle(userId);
if (!result) {
  // Handle error - already logged to console
  showError('Failed to create battle');
  return;
}

// Some functions return error object
const joinResult = await joinBattle(code, userId);
if (joinResult.error) {
  showError(joinResult.error); // e.g., "Battle not found"
  return;
}
```

## 📱 Component Props

### LiveBattleView
```typescript
interface LiveBattleViewProps {
  battleId: string;           // UUID of battle
  session: Session;           // Supabase session
  setView: (view: string) => void;
}
```

### LiveLobbyView
```typescript
interface LiveLobbyViewProps {
  session: Session;           // Supabase session
  setView: (view: string) => void;
  setBattleId: (id: string) => void;
}
```

## 🎯 Common Tasks

### Get Battle Status
```javascript
const { battle } = useBattleState(battleId);
console.log(battle.status); // 'waiting', 'active', or 'completed'
```

### Check if My Turn
```javascript
const isPlayer1 = session.user.id === battle.player1_id;
const mySubmittedAt = isPlayer1 
  ? currentRound.player1_submitted_at 
  : currentRound.player2_submitted_at;
const waitingForMe = !mySubmittedAt;
```

### Get Current Scores
```javascript
const myScore = isPlayer1 
  ? battle.player1_total_score 
  : battle.player2_total_score;
const oppScore = isPlayer1 
  ? battle.player2_total_score 
  : battle.player1_total_score;
```

### Determine Winner
```javascript
if (battle.status === 'completed') {
  if (battle.winner_id === session.user.id) {
    console.log('I won!');
  } else if (battle.winner_id) {
    console.log('I lost!');
  } else {
    console.log('It was a tie!');
  }
}
```

## 📊 Polling Strategy

The `useBattleState` hook polls every 2 seconds:
- Fetches complete battle state
- Updates automatically
- No manual intervention needed
- Stops polling when component unmounts

```javascript
// This is all you need - polling happens automatically!
const { battle, currentRound, puzzle } = useBattleState(battleId);
```

## 🔄 State Updates

The database is the ONLY source of truth:
1. User action triggers database update
2. Polling detects change (within 2 seconds)
3. UI updates automatically
4. No complex state management needed

## 💡 Pro Tips

1. **Always check for null**: All data might be null while loading
2. **Use the hook**: Don't query database directly in components
3. **Trust the database**: Don't try to predict state changes
4. **Handle errors**: All database calls can fail
5. **Test with 2 devices**: Best way to test multiplayer

---

That's it! The battle system is clean, simple, and production-ready. 🚀
