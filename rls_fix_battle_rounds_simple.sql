-- Fix RLS policies for battle_rounds table
-- This will allow round creation and updates to work properly

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "battle_rounds_insert" ON battle_rounds;
DROP POLICY IF EXISTS "battle_rounds_select" ON battle_rounds;
DROP POLICY IF EXISTS "battle_rounds_update" ON battle_rounds;
DROP POLICY IF EXISTS "battle_rounds_delete" ON battle_rounds;

-- Create simple, permissive policies for testing
-- Users can do anything with battle_rounds if they're authenticated
CREATE POLICY "battle_rounds_all_simple"
ON battle_rounds
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Alternative: More restrictive but still functional policies
-- Uncomment these if you want more security after testing

/*
-- Users can select rounds from battles they're part of
CREATE POLICY "battle_rounds_select_participant"
ON battle_rounds FOR SELECT
TO authenticated
USING (
  battle_id IN (
    SELECT id FROM battles
    WHERE player1 = auth.uid() OR player2 = auth.uid()
  )
);

-- Users can insert rounds for battles they're player1 of (battle creator)
CREATE POLICY "battle_rounds_insert_creator"
ON battle_rounds FOR INSERT
TO authenticated
WITH CHECK (
  battle_id IN (
    SELECT id FROM battles
    WHERE player1 = auth.uid()
  )
);

-- Users can update rounds from battles they're part of
CREATE POLICY "battle_rounds_update_participant"
ON battle_rounds FOR UPDATE
TO authenticated
USING (
  battle_id IN (
    SELECT id FROM battles
    WHERE player1 = auth.uid() OR player2 = auth.uid()
  )
)
WITH CHECK (
  battle_id IN (
    SELECT id FROM battles
    WHERE player1 = auth.uid() OR player2 = auth.uid()
  )
);

-- Only battle creator can delete rounds
CREATE POLICY "battle_rounds_delete_creator"
ON battle_rounds FOR DELETE
TO authenticated
USING (
  battle_id IN (
    SELECT id FROM battles
    WHERE player1 = auth.uid()
  )
);
*/