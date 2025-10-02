-- Fix foreign keys to point to profiles instead of auth.users
-- This allows relationship queries to work properly

-- Drop existing foreign keys
ALTER TABLE battles DROP CONSTRAINT IF EXISTS battles_player1_id_fkey;
ALTER TABLE battles DROP CONSTRAINT IF EXISTS battles_player2_id_fkey;
ALTER TABLE battles DROP CONSTRAINT IF EXISTS battles_winner_id_fkey;

-- Add new foreign keys pointing to profiles
ALTER TABLE battles 
ADD CONSTRAINT battles_player1_id_fkey 
FOREIGN KEY (player1_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

ALTER TABLE battles 
ADD CONSTRAINT battles_player2_id_fkey 
FOREIGN KEY (player2_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

ALTER TABLE battles 
ADD CONSTRAINT battles_winner_id_fkey 
FOREIGN KEY (winner_id) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_battles_player1_id ON battles(player1_id);
CREATE INDEX IF NOT EXISTS idx_battles_player2_id ON battles(player2_id);
CREATE INDEX IF NOT EXISTS idx_battles_invite_code ON battles(invite_code);
CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status);
