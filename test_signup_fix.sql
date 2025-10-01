-- Test the fixed handle_new_user function
-- Run this in Supabase SQL Editor to verify the fix

BEGIN;

-- Test 1: User with email should get username from email
INSERT INTO auth.users (
  id,
  email,
  raw_user_meta_data
) VALUES (
  gen_random_uuid(),
  'testuser@example.com',
  '{}'::jsonb
);

-- Check if profile was created
SELECT username, email FROM profiles WHERE email = 'testuser@example.com';

-- Test 2: User with custom username in metadata
INSERT INTO auth.users (
  id,
  email,
  raw_user_meta_data
) VALUES (
  gen_random_uuid(),
  'another@example.com',
  '{"username": "customname"}'::jsonb
);

-- Check if custom username was used
SELECT username, email FROM profiles WHERE email = 'another@example.com';

-- Test 3: User with no email (edge case)
INSERT INTO auth.users (
  id,
  raw_user_meta_data
) VALUES (
  gen_random_uuid(),
  '{}'::jsonb
);

-- Check if UUID-based username was generated
SELECT username, email FROM profiles WHERE email IS NULL ORDER BY created_at DESC LIMIT 1;

ROLLBACK; -- Don't actually create test users

-- If all three tests pass without errors, the fix is working!
