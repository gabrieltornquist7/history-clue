-- Allow users to join battles as player2
-- This is needed so users can set themselves as player2 when joining

CREATE POLICY "Users can join waiting battles as player2" ON battles
FOR UPDATE
USING (
  status = 'waiting' 
  AND player2_id IS NULL
  AND auth.uid() != player1_id  -- Prevent joining your own battle
)
WITH CHECK (
  status IN ('waiting', 'active')  -- Allow setting to active when joining
  AND player2_id = auth.uid()      -- Can only set yourself as player2
);
