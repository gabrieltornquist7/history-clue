-- Add coins column to profiles table
-- This migration adds coin balance tracking to user profiles

-- Add coins column with default value of 0
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;

-- Create index for efficient coin queries
CREATE INDEX IF NOT EXISTS idx_profiles_coins
ON profiles(coins);

-- Update any existing profiles that don't have coins set
UPDATE profiles
SET coins = 0
WHERE coins IS NULL;

-- Add constraint to ensure coins are never negative
ALTER TABLE profiles
ADD CONSTRAINT IF NOT EXISTS check_coins_non_negative
CHECK (coins >= 0);