-- RLS Policy Fixes for Battles Table
-- Run this to fix the battle connection issues

-- First, let's see what policies currently exist
SELECT 'Current policies before fixes:' as info;
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'battles';

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "battles_select_waiting" ON battles;
DROP POLICY IF EXISTS "battles_update_allow_join" ON battles;

-- Create comprehensive SELECT policy
-- This allows users to see:
-- 1. Waiting battles (needed to join)
-- 2. Battles where they are a player
CREATE POLICY "battles_select_comprehensive"
ON battles FOR SELECT
TO authenticated
USING (
  status = 'waiting'
  OR auth.uid() = player1
  OR auth.uid() = player2
);

-- Create comprehensive UPDATE policy
-- This allows users to:
-- 1. Update their own battles (as player1)
-- 2. Join waiting battles (set themselves as player2)
-- 3. Update battles where they're already a player
DROP POLICY IF EXISTS "rls_battles_update_canon_4c9184f3" ON battles;

CREATE POLICY "battles_update_comprehensive"
ON battles FOR UPDATE
TO authenticated
USING (
  -- Can update if you're the creator
  auth.uid() = player1
  -- OR if you're already player2
  OR auth.uid() = player2
  -- OR if it's a waiting battle and you're becoming player2
  OR (status = 'waiting' AND player2 IS NULL)
)
WITH CHECK (
  -- After update, you must be either player1 or player2
  auth.uid() = player1
  OR auth.uid() = player2
);

-- Create INSERT policy (for battle creation)
CREATE POLICY "battles_insert_own"
ON battles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = player1);

-- Create DELETE policy (for cleanup)
CREATE POLICY "battles_delete_own"
ON battles FOR DELETE
TO authenticated
USING (auth.uid() = player1);

-- Test the new policies
SELECT 'Testing new policies:' as info;

-- Test 1: Create a battle
INSERT INTO battles (player1, invite_code, status, created_at)
VALUES (auth.uid(), 'POLICY_TEST', 'waiting', NOW());

-- Test 2: Find waiting battles
SELECT 'Can see waiting battles:' as test;
SELECT id, invite_code, status, player1, player2
FROM battles
WHERE status = 'waiting'
LIMIT 3;

-- Test 3: Simulate joining (Note: This will fail if you try to join your own battle)
-- UPDATE battles
-- SET player2 = auth.uid(), status = 'ready'
-- WHERE invite_code = 'POLICY_TEST' AND status = 'waiting';

-- Clean up test
DELETE FROM battles WHERE invite_code = 'POLICY_TEST';

-- Show final policies
SELECT 'Final policies after fixes:' as info;
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'battles';