-- Simple RLS Fix for Battle Connection Issues
-- The existing policy is too complex and causing issues

-- First, check what policies currently exist
\echo 'Current policies on battles table:'
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'battles';

-- Drop the complex existing policy
DROP POLICY IF EXISTS "Users can access their battles and open invites" ON battles;

-- Create simple, separate policies that are easier to debug

-- 1. SELECT Policy: Allow reading waiting battles + own battles
CREATE POLICY "battles_select_simple"
ON battles FOR SELECT
TO authenticated
USING (
    -- Can see waiting battles (needed to join)
    status = 'waiting'
    -- Can see own battles
    OR auth.uid() = player1
    OR auth.uid() = player2
);

-- 2. INSERT Policy: Can create battles where you're player1
CREATE POLICY "battles_insert_simple"
ON battles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = player1);

-- 3. UPDATE Policy: Can update own battles or join waiting battles
CREATE POLICY "battles_update_simple"
ON battles FOR UPDATE
TO authenticated
USING (
    -- Can update if you're player1 (creator)
    auth.uid() = player1
    -- Can update if you're player2 (already joined)
    OR auth.uid() = player2
    -- Can update waiting battles to join them
    OR (status = 'waiting' AND player2 IS NULL)
)
WITH CHECK (
    -- After update, you must be a player
    auth.uid() = player1 OR auth.uid() = player2
);

-- 4. DELETE Policy: Can delete own battles
CREATE POLICY "battles_delete_simple"
ON battles FOR DELETE
TO authenticated
USING (auth.uid() = player1);

-- Test the policies with a real test
\echo 'Testing new policies:'

-- Create test battle
INSERT INTO battles (player1, invite_code, status, created_at)
VALUES (auth.uid(), 'SIMPLE_TEST', 'waiting', NOW());

-- Verify we can see it
SELECT 'Found waiting battles:' as test, count(*) as count
FROM battles
WHERE status = 'waiting';

-- Clean up
DELETE FROM battles WHERE invite_code = 'SIMPLE_TEST';

\echo 'Policy fix complete. New policies:'
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'battles'
ORDER BY policyname;