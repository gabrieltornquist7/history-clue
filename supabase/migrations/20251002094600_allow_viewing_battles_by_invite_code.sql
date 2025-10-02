-- Allow users to view battles by invite code so they can join them
-- This is needed for the join flow to work

-- Add policy to allow viewing waiting battles (for joining)
CREATE POLICY "Anyone can view waiting battles by invite code" ON battles
FOR SELECT
USING (status = 'waiting');

-- Keep the existing policy for viewing your own battles
-- (The "Users can view their own battles" policy already exists)
