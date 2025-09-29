-- Enhanced RLS Policy Fix for Battle Updates
-- This fixes the issue where battle joins fail silently

-- Check current policies
SELECT 'Current UPDATE policies on battles table:' as info;
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'battles' AND cmd = 'UPDATE';

-- Drop any existing conflicting update policies
DROP POLICY IF EXISTS "battles_update" ON battles;
DROP POLICY IF EXISTS "battles_update_simple" ON battles;
DROP POLICY IF EXISTS "battles_update_players" ON battles;
DROP POLICY IF EXISTS "battles_update_comprehensive" ON battles;

-- Create new comprehensive update policy for battle joining
CREATE POLICY "battles_update_allow_join"
ON battles FOR UPDATE
TO authenticated
USING (
  -- Can update if you're player1 (creator)
  auth.uid() = player1
  -- Can update if you're already player2
  OR auth.uid() = player2
  -- Can update waiting battles to join as player2
  OR (status = 'waiting' AND player2 IS NULL)
)
WITH CHECK (
  -- After update, allow any valid state
  true
);

-- Test the new policy
SELECT 'Testing new UPDATE policy:' as test;

-- Try to find a waiting battle to test with
SELECT 'Looking for waiting battles:' as step;
SELECT id, invite_code, status, player1, player2
FROM battles
WHERE status = 'waiting'
LIMIT 3;

-- Create a test battle if none exist
INSERT INTO battles (player1, invite_code, status, created_at)
VALUES (auth.uid(), 'TESTUPD', 'waiting', NOW())
ON CONFLICT DO NOTHING;

-- Test updating the battle (simulating join)
SELECT 'Testing battle join update:' as step;
SELECT id, player1, player2, status FROM battles WHERE invite_code = 'TESTUPD';

-- Note: The actual update test would need to be done with a different user
-- UPDATE battles
-- SET player2 = 'different-user-id', status = 'ready'
-- WHERE invite_code = 'TESTUPD' AND status = 'waiting' AND player2 IS NULL;

-- Clean up test data
DELETE FROM battles WHERE invite_code = 'TESTUPD';

-- Show final policies
SELECT 'Final UPDATE policies:' as result;
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'battles' AND cmd = 'UPDATE';