-- Fix battles table RLS policies for Live Battle mode
-- This allows players to manage their battle sessions

-- Drop existing policies if any
DROP POLICY IF EXISTS "battles_select_policy" ON battles;
DROP POLICY IF EXISTS "battles_insert_policy" ON battles;
DROP POLICY IF EXISTS "battles_update_policy" ON battles;

-- Enable RLS on battles
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;

-- Allow users to SELECT battles they are part of
CREATE POLICY "battles_select_policy" ON battles
FOR SELECT
USING (
  player1 = auth.uid() OR player2 = auth.uid()
);

-- Allow authenticated users to INSERT new battles (as player1)
CREATE POLICY "battles_insert_policy" ON battles
FOR INSERT
WITH CHECK (
  player1 = auth.uid()
);

-- Allow players in a battle to UPDATE it
CREATE POLICY "battles_update_policy" ON battles
FOR UPDATE
USING (
  player1 = auth.uid() OR player2 = auth.uid()
)
WITH CHECK (
  player1 = auth.uid() OR player2 = auth.uid()
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON battles TO authenticated;
GRANT SELECT ON battles TO anon;  -- Allow joining via invite code
