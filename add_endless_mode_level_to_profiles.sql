-- Add endless_mode_level column to profiles table
-- This tracks the user's current/highest level in Endless Mode specifically
-- Separate from their profile level/XP system

ALTER TABLE profiles
ADD COLUMN endless_mode_level INTEGER DEFAULT 1 NOT NULL;

-- Add a comment to document the column
COMMENT ON COLUMN profiles.endless_mode_level IS 'Current/highest level reached in Endless Mode (separate from profile level)';

-- Create index for efficient leaderboard queries
CREATE INDEX idx_profiles_endless_mode_level ON profiles(endless_mode_level DESC);

-- Migrate existing data from users table to profiles table
UPDATE profiles
SET endless_mode_level = users.endless_mode_level
FROM users
WHERE profiles.id = users.id;