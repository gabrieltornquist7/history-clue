-- Fix battle_rounds RLS policies for Live Battle mode
-- This allows players in a battle to read and update their rounds

-- Drop existing policies if any
DROP POLICY IF EXISTS "battle_rounds_select_policy" ON battle_rounds;
DROP POLICY IF EXISTS "battle_rounds_insert_policy" ON battle_rounds;
DROP POLICY IF EXISTS "battle_rounds_update_policy" ON battle_rounds;

-- Enable RLS on battle_rounds
ALTER TABLE battle_rounds ENABLE ROW LEVEL SECURITY;

-- Allow players in a battle to SELECT their battle rounds
CREATE POLICY "battle_rounds_select_policy" ON battle_rounds
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM battles
    WHERE battles.id = battle_rounds.battle_id
    AND (battles.player1 = auth.uid() OR battles.player2 = auth.uid())
  )
);

-- Allow player1 (battle creator) to INSERT new rounds
CREATE POLICY "battle_rounds_insert_policy" ON battle_rounds
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM battles
    WHERE battles.id = battle_rounds.battle_id
    AND battles.player1 = auth.uid()
  )
);

-- Allow players in a battle to UPDATE their scores and completion timestamps
CREATE POLICY "battle_rounds_update_policy" ON battle_rounds
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM battles
    WHERE battles.id = battle_rounds.battle_id
    AND (battles.player1 = auth.uid() OR battles.player2 = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM battles
    WHERE battles.id = battle_rounds.battle_id
    AND (battles.player1 = auth.uid() OR battles.player2 = auth.uid())
  )
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON battle_rounds TO authenticated;
GRANT SELECT, INSERT, UPDATE ON battle_rounds TO anon;
