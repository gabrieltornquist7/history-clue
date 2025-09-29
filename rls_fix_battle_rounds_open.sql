-- EMERGENCY FIX: Open RLS policies for battle_rounds to fix Round 2 creation

-- First, check current policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'battle_rounds';

-- Drop ALL existing policies on battle_rounds
DROP POLICY IF EXISTS "battle_rounds_all" ON battle_rounds;
DROP POLICY IF EXISTS "battle_rounds_all_simple" ON battle_rounds;
DROP POLICY IF EXISTS "battle_rounds_insert" ON battle_rounds;
DROP POLICY IF EXISTS "battle_rounds_select" ON battle_rounds;
DROP POLICY IF EXISTS "battle_rounds_update" ON battle_rounds;
DROP POLICY IF EXISTS "battle_rounds_delete" ON battle_rounds;
DROP POLICY IF EXISTS "battle_rounds_open" ON battle_rounds;

-- Create completely open policy for testing
CREATE POLICY "battle_rounds_test_open"
ON battle_rounds
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Verify the policy was created
SELECT
    policyname,
    cmd,
    permissive,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'battle_rounds';

-- Test if user can select from battle_rounds
SELECT 'Can select from battle_rounds' as test_result;
SELECT COUNT(*) as total_rounds FROM battle_rounds;

-- Show current user for debugging
SELECT 'Current user: ' || auth.uid()::text as current_user;