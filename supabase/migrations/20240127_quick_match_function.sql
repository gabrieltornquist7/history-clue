-- Quick match function using your existing generate_invite_code()
CREATE OR REPLACE FUNCTION quick_match_player(player_id UUID)
RETURNS TABLE (
  battle_id UUID,
  invite_code TEXT,
  is_new BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_battle_id UUID;
  v_invite_code TEXT;
  v_is_new BOOLEAN DEFAULT FALSE;
BEGIN
  -- First try to find an open battle not created by this player
  SELECT id, battles.invite_code INTO v_battle_id, v_invite_code
  FROM battles
  WHERE status = 'waiting'
    AND player2 IS NULL
    AND player1 != player_id
    AND created_at > NOW() - INTERVAL '10 minutes'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_battle_id IS NOT NULL THEN
    -- Join the battle
    UPDATE battles
    SET player2 = player_id,
        status = 'active'
    WHERE id = v_battle_id
      AND player2 IS NULL;

    IF NOT FOUND THEN
      v_battle_id := NULL;
    END IF;
  END IF;

  -- If no battle found or join failed, create new one
  IF v_battle_id IS NULL THEN
    -- Use your existing generate_invite_code function
    SELECT generate_invite_code() INTO v_invite_code;

    INSERT INTO battles (player1, status, invite_code)
    VALUES (player_id, 'waiting', v_invite_code)
    RETURNING id INTO v_battle_id;

    v_is_new := TRUE;
  END IF;

  RETURN QUERY SELECT v_battle_id, v_invite_code, v_is_new;
END;
$$;

GRANT EXECUTE ON FUNCTION quick_match_player TO authenticated;