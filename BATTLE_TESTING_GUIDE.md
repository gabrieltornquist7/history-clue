# Live Battle System - Testing Guide

## 🧪 Manual Testing Scenarios

### Scenario 1: Happy Path - Full Battle

**Objective:** Complete a full 3-round battle successfully

**Prerequisites:**
- 2 test accounts signed in
- Each in a different browser or incognito window

**Steps:**

1. **Player 1 - Create Battle**
   - [ ] Go to Main Menu
   - [ ] Click "Live Battle"
   - [ ] Click "Create Battle"
   - [ ] Verify invite code appears (6 characters)
   - [ ] Copy the invite code
   - [ ] See "Waiting for opponent..." message

2. **Player 2 - Join Battle**
   - [ ] Go to Main Menu  
   - [ ] Click "Live Battle"
   - [ ] Click "Join with Code"
   - [ ] Enter the invite code
   - [ ] Click "Join Battle"
   - [ ] Verify battle starts immediately

3. **Both Players - Round 1**
   - [ ] See the same puzzle (verify city/entity)
   - [ ] Timer shows 3:00 and counts down
   - [ ] First clue is visible
   - [ ] Can unlock clue 2 (costs 1000 points)
   - [ ] Can unlock clue 3 (costs 1500 points)
   - [ ] Score decreases when unlocking
   - [ ] Can place pin on map
   - [ ] Can select year
   - [ ] Can submit guess

4. **Player 1 - Submit First**
   - [ ] Click "Submit Guess"
   - [ ] See confirmation modal
   - [ ] Click "Confirm"
   - [ ] See "✓ Submitted!" message
   - [ ] Timer stops for Player 1

5. **Player 2 - Speed Round**
   - [ ] Timer caps at 45 seconds (or less if more time passed)
   - [ ] See "Hurry! Opponent submitted!" message
   - [ ] Submit guess
   - [ ] See "✓ Submitted!" message

6. **Both Players - Round Results**
   - [ ] Results modal appears
   - [ ] Shows winner (or tie)
   - [ ] Shows both scores
   - [ ] Shows battle score (X-Y)
   - [ ] Animations play in stages
   - [ ] Auto-advances after a few seconds

7. **Both Players - Round 2**
   - [ ] New puzzle loads
   - [ ] Scores reset to 10000
   - [ ] Timer resets to 3:00
   - [ ] First clue only is visible
   - [ ] Can play normally
   - [ ] Complete round

8. **Both Players - Round 3**
   - [ ] Third puzzle loads
   - [ ] Play through round
   - [ ] Complete round

9. **Both Players - Final Results**
   - [ ] Final results modal appears
   - [ ] Shows overall winner
   - [ ] Shows rounds won (e.g., 2-1)
   - [ ] Shows total scores
   - [ ] Shows round-by-round breakdown
   - [ ] Has "Back to Menu" button
   - [ ] Returns to menu properly

**Expected Results:** ✅ All checkboxes checked

---

### Scenario 2: Timer Expiration

**Objective:** Test auto-submit when timer runs out

**Steps:**

1. Create and join a battle
2. Start round but DON'T submit
3. Wait for timer to reach 0:00
4. **Expected:** Guess auto-submits with current state
5. **Expected:** Round proceeds normally
6. **Expected:** Score is calculated (even if no pin placed)

---

### Scenario 3: Disconnect & Reconnect

**Objective:** Test state recovery after page refresh

**Steps:**

1. Create and join a battle
2. Start round 1
3. Player 1: Unlock 2 clues, place pin
4. Player 1: Refresh page
5. **Expected:** Battle reloads from database
6. **Expected:** Returns to same round
7. **Expected:** Can continue playing
8. Player 1: Submit guess
9. **Expected:** Works normally

---

### Scenario 4: Invalid Join Codes

**Objective:** Test error handling for invalid codes

**Test Cases:**

1. **Non-existent code**
   - Enter: `ZZZZZZ`
   - **Expected:** "Battle not found"

2. **Already started battle**
   - Use code from active battle
   - **Expected:** "Battle already started or completed"

3. **Own battle code**
   - Try to join your own battle
   - **Expected:** "You cannot join your own battle"

4. **Too short code**
   - Enter: `ABC`
   - **Expected:** Button disabled (6 chars required)

5. **Special characters**
   - Enter: `ABC!@#`
   - **Expected:** Characters stripped/rejected

---

### Scenario 5: Tie Game

**Objective:** Test tie scenario

**Steps:**

1. Create and join battle
2. **Round 1:** Player 1 wins
3. **Round 2:** Player 2 wins
4. **Round 3:** Same score (coordinate!)
5. **Expected:** Final results show tie
6. **Expected:** winner_id is null in database
7. **Expected:** UI shows "Draw!" message

---

### Scenario 6: Mobile Testing

**Objective:** Test on mobile devices

**Test on:**
- [ ] iPhone Safari
- [ ] Android Chrome
- [ ] iPad Safari

**Check:**
- [ ] Layout looks correct
- [ ] Buttons are tap-able
- [ ] Map works with touch
- [ ] Timer is visible
- [ ] Animations play smoothly
- [ ] Clues are readable
- [ ] Can complete full battle

---

### Scenario 7: Edge Cases

**Test these scenarios:**

1. **Player abandons lobby**
   - Create battle
   - Leave page
   - **Expected:** Battle stays in "waiting" (can be cleaned up)

2. **Both players submit simultaneously**
   - Coordinate to click submit at same time
   - **Expected:** Both submissions recorded
   - **Expected:** Round completes normally

3. **Slow connection**
   - Enable Chrome throttling → Fast 3G
   - **Expected:** Still works, just slower
   - **Expected:** No data loss

4. **Background tab**
   - Create/join battle
   - Switch to different tab
   - Wait 30 seconds
   - Switch back
   - **Expected:** State catches up via polling
   - **Expected:** Timer updates

---

## 🤖 Automated Testing (SQL)

### Test Database Functions

Run these in Supabase SQL Editor:

```sql
-- Test 1: Create battle function
DO $$
DECLARE
  test_user_id UUID;
  result RECORD;
BEGIN
  -- Create test user (if not exists)
  INSERT INTO auth.users (id, email)
  VALUES (gen_random_uuid(), 'test1@example.com')
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO test_user_id;
  
  -- Test create_battle
  SELECT * INTO result FROM create_battle(test_user_id);
  
  RAISE NOTICE 'Battle created: % with code: %', result.battle_id, result.invite_code;
  
  -- Verify battle exists
  IF EXISTS (SELECT 1 FROM battles WHERE id = result.battle_id) THEN
    RAISE NOTICE 'Test PASSED: Battle exists in database';
  ELSE
    RAISE EXCEPTION 'Test FAILED: Battle not in database';
  END IF;
END $$;

-- Test 2: Join battle function
DO $$
DECLARE
  test_user1_id UUID;
  test_user2_id UUID;
  test_battle_id UUID;
  test_invite_code TEXT;
  join_result RECORD;
BEGIN
  -- Create two test users
  INSERT INTO auth.users (id, email)
  VALUES (gen_random_uuid(), 'test1@example.com')
  ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
  RETURNING id INTO test_user1_id;
  
  INSERT INTO auth.users (id, email)
  VALUES (gen_random_uuid(), 'test2@example.com')
  ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
  RETURNING id INTO test_user2_id;
  
  -- Create battle
  SELECT * INTO join_result FROM create_battle(test_user1_id);
  test_battle_id := join_result.battle_id;
  test_invite_code := join_result.invite_code;
  
  -- Join battle
  SELECT * INTO join_result FROM join_battle(test_invite_code, test_user2_id);
  
  -- Verify battle is active
  IF EXISTS (
    SELECT 1 FROM battles 
    WHERE id = test_battle_id 
    AND status = 'active'
    AND player2_id = test_user2_id
  ) THEN
    RAISE NOTICE 'Test PASSED: Battle joined successfully';
  ELSE
    RAISE EXCEPTION 'Test FAILED: Battle not active or player2 not set';
  END IF;
  
  -- Verify round 1 created
  IF EXISTS (
    SELECT 1 FROM battle_rounds
    WHERE battle_id = test_battle_id
    AND round_number = 1
  ) THEN
    RAISE NOTICE 'Test PASSED: Round 1 created';
  ELSE
    RAISE EXCEPTION 'Test FAILED: Round 1 not created';
  END IF;
END $$;

-- Test 3: Submit guess function
DO $$
DECLARE
  test_round_id UUID;
  test_player_id UUID;
BEGIN
  -- Get any active round
  SELECT id, battle_id INTO test_round_id
  FROM battle_rounds
  WHERE status = 'active'
  LIMIT 1;
  
  IF test_round_id IS NULL THEN
    RAISE NOTICE 'No active rounds to test';
    RETURN;
  END IF;
  
  -- Get player1 ID
  SELECT player1_id INTO test_player_id
  FROM battles b
  JOIN battle_rounds br ON br.battle_id = b.id
  WHERE br.id = test_round_id;
  
  -- Submit guess
  PERFORM submit_battle_guess(
    test_round_id,
    test_player_id,
    5000,
    1234.5,
    1492,
    ARRAY[1, 2],
    45.0,
    -93.0
  );
  
  -- Verify submission
  IF EXISTS (
    SELECT 1 FROM battle_rounds
    WHERE id = test_round_id
    AND player1_submitted_at IS NOT NULL
  ) THEN
    RAISE NOTICE 'Test PASSED: Guess submitted';
  ELSE
    RAISE EXCEPTION 'Test FAILED: Guess not submitted';
  END IF;
END $$;
```

---

## 📊 Performance Testing

### Load Testing

Test with multiple concurrent battles:

```javascript
// Create N battles simultaneously
async function loadTest(numBattles) {
  const battles = [];
  
  for (let i = 0; i < numBattles; i++) {
    const result = await createBattle(testUserId);
    battles.push(result);
    console.log(`Created battle ${i + 1}/${numBattles}`);
  }
  
  console.log(`Successfully created ${battles.length} battles`);
  return battles;
}

// Test with 10 battles
loadTest(10);
```

**Expected Results:**
- All battles created successfully
- Each has unique invite code
- No database errors
- Response time < 1 second per battle

---

### Memory Leak Testing

Test for memory leaks:

```javascript
// Monitor memory over time
const initial = performance.memory.usedJSHeapSize;

// Play 10 battles in a row
for (let i = 0; i < 10; i++) {
  // Create, join, play, complete battle
  await playFullBattle();
  
  const current = performance.memory.usedJSHeapSize;
  const increase = (current - initial) / 1024 / 1024;
  console.log(`After battle ${i + 1}: +${increase.toFixed(2)}MB`);
}

// Memory increase should be < 50MB after 10 battles
```

---

## ✅ Testing Checklist

### Pre-Release Testing

Before deploying, verify:

- [ ] All manual scenarios pass
- [ ] All SQL tests pass
- [ ] Mobile testing complete
- [ ] Performance acceptable
- [ ] No memory leaks
- [ ] Error handling works
- [ ] Database cleanup works
- [ ] RLS policies secure
- [ ] Documentation complete
- [ ] No console errors

### Post-Release Monitoring

After deploying, monitor:

- [ ] Battle creation rate
- [ ] Completion rate
- [ ] Average battle duration
- [ ] Error rate
- [ ] Database performance
- [ ] User feedback

---

## 🐛 Bug Report Template

```markdown
### Bug Description
[Clear description of the issue]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happened]

### Environment
- Browser: [e.g., Chrome 118]
- Device: [e.g., iPhone 14, Desktop]
- OS: [e.g., iOS 17, Windows 11]

### Battle Details
- Battle ID: [if applicable]
- Invite Code: [if applicable]
- Round Number: [if applicable]

### Screenshots/Logs
[Attach any relevant images or console logs]

### Database State
```sql
-- Run and attach results:
SELECT * FROM battles WHERE id = 'battle-id';
SELECT * FROM battle_rounds WHERE battle_id = 'battle-id';
```
```

---

## 📈 Success Metrics

Track these KPIs:

1. **Battle Completion Rate**
   - Target: > 80% of started battles complete
   - Formula: (completed_battles / started_battles) * 100

2. **Average Response Time**
   - Target: < 500ms for all database calls
   - Measure: Check network tab timestamps

3. **Error Rate**
   - Target: < 1% of requests fail
   - Track: Database errors, network errors

4. **User Engagement**
   - Target: > 5 battles per active user per week
   - Track: battles table entries

5. **Abandon Rate**
   - Target: < 20% of battles abandoned
   - Formula: (waiting_battles > 10min old / total_battles)

---

**Testing Version:** 1.0.0
**Last Updated:** October 2025
