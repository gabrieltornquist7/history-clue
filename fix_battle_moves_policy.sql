-- Fix battle_moves 403 error by adding RLS policy
-- Run this in Supabase SQL Editor

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'battle_moves'
);

-- Add a simple policy to allow authenticated users to access battle_moves
CREATE POLICY "battle_moves_allow_all"
ON battle_moves
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Alternative: If you want more restrictive policy, use this instead:
-- CREATE POLICY "battle_moves_allow_own"
-- ON battle_moves
-- FOR ALL
-- TO authenticated
-- USING (auth.uid() = player)
-- WITH CHECK (auth.uid() = player);