# Live Battle Mode Fix - October 3, 2025

## Issues Found

### Bug 1: Wrong View Name When Joining
**Problem:** When a player joined a battle using an invite code, the code called `setView('battle')`, but that view doesn't exist in the app. The correct view name is `'liveGame'`.

**Location:** `components/LiveLobbyView.jsx` line 62

**Fix:** Changed `setView('battle')` to `setView('liveGame')`

### Bug 2: Creator Stuck in Lobby
**Problem:** When player 1 created a battle and waited for an opponent, there was no realtime listener to detect when player 2 joined. This caused player 1 to be stuck on the "Waiting for opponent..." screen forever.

**Location:** `components/LiveLobbyView.jsx`

**Fix:** Added a `useEffect` hook with a Supabase realtime subscription that:
1. Listens for UPDATE events on the `battles` table
2. Filters by the specific invite code
3. When `player2_id` is set and `status` becomes 'active', automatically redirects player 1 to the game

### Bug 3: Realtime Not Enabled
**Problem:** The `battles` and `battle_rounds` tables were not in the realtime publication, so realtime subscriptions wouldn't work.

**Location:** Supabase database

**Fix:** Enabled realtime for both tables:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE battles;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_rounds;
```

## How the Join Flow Works Now

### Player 1 (Creator):
1. Clicks "Create Battle"
2. Gets an invite code (e.g., "ABC123")
3. Shares code with opponent
4. **Realtime listener starts** watching for updates to their battle
5. When player 2 joins → automatically redirected to game view

### Player 2 (Joiner):
1. Clicks "Join with Code"
2. Enters invite code
3. Code validation checks:
   - Battle exists
   - Status is 'waiting'
   - Not already full
   - Not trying to join own battle
4. Joins successfully → redirected to `'liveGame'` view (correct view name)
5. Backend function automatically:
   - Sets player2_id
   - Changes status to 'active'
   - Creates round 1
   - Picks a random puzzle

### What Triggers Player 1's Redirect:
When player 2 joins, the `join_battle` database function:
```sql
UPDATE battles
SET player2_id = p_player2_id,
    status = 'active',
    started_at = NOW()
WHERE invite_code = p_invite_code
```

This UPDATE triggers the realtime listener that player 1 subscribed to, which then redirects them to the game!

## Testing Instructions

1. **Open two browsers/devices** (or incognito + regular)
2. **Browser A (Player 1):**
   - Sign in
   - Click "Live Battle"
   - Click "Create Battle"
   - Copy the invite code
   - **Should see:** "Waiting for opponent to join..." with spinning loader

3. **Browser B (Player 2):**
   - Sign in
   - Click "Live Battle"
   - Click "Join with Code"
   - Paste the invite code
   - Click "Join Battle"
   - **Should see:** Immediately taken to the battle game view

4. **Browser A (Player 1) - Automatically:**
   - **Should see:** Automatically taken to the battle game view (no manual refresh needed!)

5. **Both players should now be:**
   - In the same battle
   - Seeing the same puzzle
   - Seeing each other's profile info in the header
   - Seeing the round timer counting down
   - Able to unlock clues, place pins, and submit guesses

## What Could Still Go Wrong

### If Player 1 Still Gets Stuck:
- Check browser console for errors
- Make sure realtime connection is established (look for "SUBSCRIBED" in console)
- Verify internet connection is stable
- Try refreshing the page

### If Player 2 Gets Sent to Main Menu:
- Check that the fix was deployed (should see `setView('liveGame')` in LiveLobbyView.jsx)
- Check browser console for errors
- Verify the battle exists and is in 'waiting' status

### If Both Players Can't See Each Other:
- Check RLS policies on battles and battle_rounds tables
- Verify both players are authenticated
- Check that battle_id is being passed correctly

## Files Modified

1. `components/LiveLobbyView.jsx`
   - Added import for useEffect and supabase
   - Fixed view name from 'battle' to 'liveGame'
   - Added realtime subscription for battle updates

2. Supabase Database
   - Enabled realtime on `battles` table
   - Enabled realtime on `battle_rounds` table

## Next Steps

If issues persist:
1. Check the Supabase logs: Database → Logs → API logs
2. Check browser console in both player's browsers
3. Verify the battle record in Supabase dashboard (should show both player1_id and player2_id)
4. Check that battle status changed from 'waiting' to 'active'

## Notes

- The realtime subscription is cleaned up when component unmounts
- The subscription only activates when in 'create' mode with a valid invite code
- The subscription filters specifically by invite_code for efficiency
- Both bugs needed to be fixed for the feature to work
