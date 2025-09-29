-- RLS Test Script for Battles Table
-- Run this in your Supabase SQL Editor to test policies

-- Step 1: Check if you can see waiting battles
SELECT 'Testing SELECT on waiting battles...' as test_step;
SELECT id, invite_code, status, player1, player2
FROM battles
WHERE status = 'waiting'
LIMIT 5;

-- Step 2: Check your user ID
SELECT 'Checking current user ID...' as test_step;
SELECT auth.uid() as your_user_id;

-- Step 3: Try to create a test battle
SELECT 'Creating test battle...' as test_step;
INSERT INTO battles (player1, invite_code, status, created_at)
VALUES (auth.uid(), 'TEST99', 'waiting', NOW())
RETURNING *;

-- Step 4: Try to find the test battle (simulating search by invite code)
SELECT 'Finding test battle by invite code...' as test_step;
SELECT * FROM battles WHERE invite_code = 'TEST99' AND status = 'waiting';

-- Step 5: Try to update it (simulating join)
SELECT 'Attempting to join test battle...' as test_step;
UPDATE battles
SET player2 = auth.uid(), status = 'active'
WHERE invite_code = 'TEST99' AND status = 'waiting'
RETURNING *;

-- Step 6: Clean up
SELECT 'Cleaning up test data...' as test_step;
DELETE FROM battles WHERE invite_code = 'TEST99';

-- Step 7: Test viewing policies
SELECT 'Testing current RLS policies...' as test_step;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'battles';