-- Add endless_mode_level column to users table
-- This tracks the user's current/highest level in Endless Mode specifically
-- Separate from their profile level/XP system

ALTER TABLE users
ADD COLUMN endless_mode_level INTEGER DEFAULT 1 NOT NULL;

-- Add a comment to document the column
COMMENT ON COLUMN users.endless_mode_level IS 'Current/highest level reached in Endless Mode (separate from profile level)';

-- Create index for efficient leaderboard queries
CREATE INDEX idx_users_endless_mode_level ON users(endless_mode_level DESC);