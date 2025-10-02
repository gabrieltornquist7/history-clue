-- Fix the RLS policy conflict for create_battle function
-- The SECURITY DEFINER function needs to be able to insert on behalf of the user

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create battles as player1" ON battles;

-- Create new INSERT policy that works with SECURITY DEFINER functions
-- This allows either direct inserts OR inserts through SECURITY DEFINER functions
CREATE POLICY "Users can create battles as player1" ON battles
FOR INSERT
WITH CHECK (
  auth.uid() = player1_id OR 
  (SELECT auth.uid() FROM auth.users WHERE id = player1_id) IS NOT NULL
);

-- Alternative: Recreate the create_battle function to set proper auth context
DROP FUNCTION IF EXISTS create_battle(uuid);

CREATE OR REPLACE FUNCTION create_battle(p_player1_id uuid)
RETURNS TABLE(battle_id uuid, invite_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_code TEXT;
  v_battle_id UUID;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  -- Verify the calling user matches the player1_id parameter
  IF auth.uid() != p_player1_id THEN
    RAISE EXCEPTION 'Cannot create battle for another user';
  END IF;
  
  LOOP
    attempt := attempt + 1;
    v_invite_code := generate_invite_code();
    
    -- Try to insert
    BEGIN
      INSERT INTO battles (player1_id, invite_code)
      VALUES (p_player1_id, v_invite_code)
      RETURNING id INTO v_battle_id;
      
      -- Success!
      RETURN QUERY SELECT v_battle_id, v_invite_code;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      -- Code collision, try again
      IF attempt >= max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique invite code after % attempts', max_attempts;
      END IF;
    END;
  END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_battle(uuid) TO authenticated;
