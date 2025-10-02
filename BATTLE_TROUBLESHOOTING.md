# Live Battle System - Troubleshooting Guide

## 🔍 Common Issues & Solutions

### 1. "Failed to create battle" Error

**Symptoms:**
- Clicking "Create Battle" shows an error
- Console shows database errors

**Possible Causes & Solutions:**

#### A. Database functions not created
```sql
-- Test in Supabase SQL Editor:
SELECT * FROM create_battle('00000000-0000-0000-0000-000000000000');
```
If you get "function does not exist":
- Re-run the migration: `rebuild_battle_system`
- Check Supabase logs for migration errors

#### B. RLS policies blocking access
```sql
-- Verify you're authenticated:
SELECT auth.uid();
-- Should return your user ID, not null
```
If null, you're not authenticated properly.

#### C. User not in profiles table
```sql
-- Check if your user exists:
SELECT * FROM profiles WHERE id = auth.uid();
```
If empty, your profile wasn't created. Sign out and sign in again.

---

### 2. "Battle not found" When Joining

**Symptoms:**
- Valid invite code shows "Battle not found"
- Cannot join battle

**Possible Causes & Solutions:**

#### A. Battle already started or completed
```sql
-- Check battle status:
SELECT * FROM battles WHERE invite_code = 'X7K9P2';
```
Status should be 'waiting'. If 'active' or 'completed', it cannot be joined.

#### B. Invite code typo
- Codes are case-sensitive
- Must be exactly 6 characters
- No spaces or special characters

#### C. Battle was deleted
```sql
-- List all waiting battles:
SELECT invite_code, created_at FROM battles WHERE status = 'waiting';
```

---

### 3. Timer Not Counting Down

**Symptoms:**
- Timer stuck at a value
- Timer shows null or --:--

**Possible Causes & Solutions:**

#### A. Round not started
```sql
-- Check if round has started_at:
SELECT started_at FROM battle_rounds WHERE id = 'your-round-id';
```
If null, round hasn't started yet.

#### B. Already submitted
- Timer stops after you submit
- Check if you see "✓ Submitted!" message

#### C. Component not re-rendering
- Check browser console for errors
- Try refreshing the page
- Battle state should recover from database

---

### 4. Stuck on "Waiting for opponent..."

**Symptoms:**
- Created battle but opponent joined
- Still shows waiting screen

**Possible Causes & Solutions:**

#### A. Battle status not updated
```sql
-- Check battle status:
SELECT status, player2_id FROM battles WHERE id = 'your-battle-id';
```
Should be 'active' with player2_id set.

#### B. Polling not working
- Check browser console for errors
- Verify network tab shows periodic requests
- Try manual refresh

#### C. Component state desync
- Refresh the page
- Battle state will be loaded from database

---

### 5. Round Results Not Showing

**Symptoms:**
- Submitted guess but no results
- Stuck in game view

**Possible Causes & Solutions:**

#### A. Opponent hasn't submitted
```sql
-- Check submission status:
SELECT 
  player1_submitted_at,
  player2_submitted_at,
  status
FROM battle_rounds 
WHERE id = 'your-round-id';
```
Results only show when BOTH have submitted.

#### B. Round completion didn't trigger
```sql
-- Manually complete the round:
SELECT complete_battle_round('your-round-id');
```

#### C. Database function error
- Check Supabase logs
- Look for errors in `complete_battle_round`

---

### 6. Score Calculation Seems Wrong

**Symptoms:**
- Score doesn't match expected value
- Penalties seem incorrect

**Debug the Calculation:**

```javascript
import { calculateBattleScore } from './lib/battleScoring';

const result = calculateBattleScore({
  puzzle: yourPuzzle,
  guessLat: yourGuessLat,
  guessLng: yourGuessLng,
  guessYear: yourGuessYear,
  cluesUsed: [1, 2, 3],
  timeRemaining: 120
});

console.log('Score breakdown:', result.breakdown);
```

**Expected Values:**
- Base score: 5000, 3500, 2500, 1500, or 800 (based on clues)
- Distance penalty: Max 50% of base
- Year penalty: Max 30% of base
- Time bonus: Up to 20% of base (if < 30s remaining)
- Proximity bonus: 1000 (if < 50km) or 500 (if < 200km)

---

### 7. Can't See Opponent's Status

**Symptoms:**
- Don't know if opponent submitted
- No indication of opponent progress

**Solutions:**

#### A. Check database directly
```sql
SELECT 
  player1_submitted_at,
  player2_submitted_at
FROM battle_rounds 
WHERE battle_id = 'your-battle-id'
AND round_number = 1;
```

#### B. Verify polling
- Open browser dev tools → Network tab
- Should see requests every 2 seconds
- Filter for "battles" or "battle_rounds"

---

### 8. Battle Completed But No Winner

**Symptoms:**
- All 3 rounds done
- No final results
- winner_id is null

**Possible Causes:**

#### A. Tie game
```sql
-- Count wins per player:
SELECT 
  b.id,
  COUNT(CASE WHEN br.round_winner_id = b.player1_id THEN 1 END) as p1_wins,
  COUNT(CASE WHEN br.round_winner_id = b.player2_id THEN 1 END) as p2_wins
FROM battles b
JOIN battle_rounds br ON br.battle_id = b.id
WHERE b.id = 'your-battle-id'
GROUP BY b.id;
```
If equal wins, winner_id is null (tie).

#### B. Battle not marked complete
```sql
-- Manually complete:
UPDATE battles 
SET status = 'completed', completed_at = NOW()
WHERE id = 'your-battle-id';
```

---

### 9. Mobile Performance Issues

**Symptoms:**
- Slow loading
- Laggy map
- Timer jumps

**Solutions:**

#### A. Reduce polling frequency (if needed)
In `lib/useBattleState.js`, change:
```javascript
const POLL_INTERVAL = 2000; // Increase to 3000 or 4000
```

#### B. Check network connection
- Use Chrome DevTools → Network → Throttling
- Test with "Fast 3G" or "Slow 3G"

#### C. Disable animations
Add to component:
```javascript
const ANIMATIONS_ENABLED = false;
```

---

### 10. Database Permission Errors

**Symptoms:**
- "permission denied" errors
- Can't read/write battle data

**Solutions:**

#### A. Verify RLS policies exist
```sql
-- List policies:
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('battles', 'battle_rounds');
```

Should see policies like:
- `select_own_battles`
- `insert_own_battle`
- `update_own_battles`
- `select_battle_rounds`
- `update_battle_rounds`

#### B. Re-apply RLS policies
Re-run the migration section with RLS policies.

#### C. Check if authenticated
```sql
SELECT auth.uid();
-- Should return your UUID, not null
```

---

## 🛠️ Debug Commands

### Use in Browser Console

```javascript
// Load debug utilities
import * as battleDebug from './lib/battleDebug';

// List active battles
await battleDebug.listActiveBattles();

// Get details of specific battle
await battleDebug.getBattleDetails('battle-id-here');

// Clean up old battles
await battleDebug.cleanupAbandonedBattles(30); // 30 minutes old

// Verify database setup
await battleDebug.verifyDatabaseSetup();
```

### Use in Supabase SQL Editor

```sql
-- See all active battles
SELECT 
  b.id,
  b.invite_code,
  b.status,
  p1.username as player1,
  p2.username as player2,
  b.current_round_number,
  b.created_at
FROM battles b
LEFT JOIN profiles p1 ON p1.id = b.player1_id
LEFT JOIN profiles p2 ON p2.id = b.player2_id
WHERE b.status IN ('waiting', 'active')
ORDER BY b.created_at DESC;

-- See rounds for a battle
SELECT 
  round_number,
  status,
  player1_score,
  player2_score,
  player1_submitted_at,
  player2_submitted_at,
  started_at,
  completed_at
FROM battle_rounds
WHERE battle_id = 'your-battle-id'
ORDER BY round_number;

-- Clean up stuck battles
DELETE FROM battles 
WHERE status = 'waiting' 
AND created_at < NOW() - INTERVAL '30 minutes';
```

---

## 📊 Performance Monitoring

### What to Check

1. **Polling Rate**
   - Open Network tab in DevTools
   - Should see request every 2 seconds
   - If not, check console for errors

2. **Database Response Time**
   - Check "Time" column in Network tab
   - Should be < 500ms
   - If > 1s, check database performance

3. **Component Render Time**
   - Use React DevTools Profiler
   - Battle view should render in < 100ms
   - If slow, check for unnecessary re-renders

4. **Memory Usage**
   - Check Chrome Task Manager
   - Should be < 100MB
   - If growing, check for memory leaks

---

## 🚨 Emergency Recovery

### If Everything Breaks

1. **Force reload**
   ```
   Ctrl + Shift + R (Chrome)
   Cmd + Shift + R (Mac)
   ```

2. **Clear all battles**
   ```sql
   DELETE FROM battle_rounds;
   DELETE FROM battles;
   ```

3. **Re-run migration**
   - Go to Supabase SQL Editor
   - Run the `rebuild_battle_system` migration again

4. **Check logs**
   - Supabase Dashboard → Logs
   - Look for errors in database functions

5. **Contact support**
   - Check GitHub issues
   - Post error details

---

## 📞 Getting Help

### What to Include

When reporting issues, include:

1. **Error message** (exact text from console)
2. **Steps to reproduce**
3. **Battle ID** (if applicable)
4. **Browser and version**
5. **Database query results** (from debug queries above)

### Where to Ask

1. GitHub Issues
2. Discord (if available)
3. Email: support@historyclue.com

---

## ✅ Health Check Checklist

Run this before reporting issues:

- [ ] Database migration applied successfully
- [ ] Can create a battle
- [ ] Can join a battle with code
- [ ] Timer counts down
- [ ] Can unlock clues
- [ ] Can place map pin
- [ ] Can submit guess
- [ ] Round results appear
- [ ] Next round starts automatically
- [ ] Final results show after round 3
- [ ] Can return to menu

If all checked, system is working! 🎉

---

**Last Updated:** October 2025
**System Version:** 1.0.0
