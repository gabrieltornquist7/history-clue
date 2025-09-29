-- Fix daily_attempts table schema to use challenge_date instead of daily_puzzle_id
-- This resolves the UUID error where "daily-2025-09-29" was being inserted into a UUID field

-- 1. Add the new challenge_date column (if not already exists)
ALTER TABLE daily_attempts
ADD COLUMN IF NOT EXISTS challenge_date DATE;

-- 2. Update existing records to use challenge_date (if there are any with daily_puzzle_id)
-- Note: This assumes daily_puzzle_id was in format "daily-YYYY-MM-DD"
-- UPDATE daily_attempts
-- SET challenge_date = CAST(SUBSTRING(daily_puzzle_id FROM 7) AS DATE)
-- WHERE daily_puzzle_id LIKE 'daily-%';

-- 3. Remove the problematic daily_puzzle_id column (after data migration)
-- ALTER TABLE daily_attempts DROP COLUMN IF EXISTS daily_puzzle_id;

-- 4. Create index on challenge_date for performance
CREATE INDEX IF NOT EXISTS idx_daily_attempts_challenge_date
ON daily_attempts(challenge_date);

-- 5. Create composite index for efficient user lookups
CREATE INDEX IF NOT EXISTS idx_daily_attempts_user_date
ON daily_attempts(user_id, challenge_date);

-- 6. Add constraint to ensure one attempt per user per day
ALTER TABLE daily_attempts
ADD CONSTRAINT IF NOT EXISTS unique_user_daily_attempt
UNIQUE(user_id, challenge_date);

-- 7. Updated daily_attempts table structure should be:
-- CREATE TABLE daily_attempts (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   challenge_date DATE NOT NULL,
--   puzzles_completed INTEGER DEFAULT 0,
--   final_score INTEGER DEFAULT 0,
--   step_1_score INTEGER DEFAULT 0,
--   step_2_score INTEGER DEFAULT 0,
--   step_3_score INTEGER DEFAULT 0,
--   step_4_score INTEGER DEFAULT 0,
--   step_5_score INTEGER DEFAULT 0,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );