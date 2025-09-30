-- Create award_coins function to match award_xp pattern
-- This function awards coins to users and tracks transactions

CREATE OR REPLACE FUNCTION award_coins(
  p_user_id uuid,
  p_amount integer,
  p_source text DEFAULT 'game',
  p_game_mode text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_coins integer := 0;
  v_new_coins integer := 0;
  v_transaction_id uuid;
BEGIN
  -- Get current coin balance (default to 0 if profile doesn't exist)
  SELECT COALESCE(coins, 0) INTO v_old_coins
  FROM profiles
  WHERE id = p_user_id;

  -- If profile doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO profiles (id, coins)
    VALUES (p_user_id, 0)
    ON CONFLICT (id) DO NOTHING;
    v_old_coins := 0;
  END IF;

  -- Calculate new coin total
  v_new_coins := v_old_coins + p_amount;

  -- Update user's coin balance
  UPDATE profiles
  SET coins = v_new_coins,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Record the transaction (if coin_transactions table exists)
  BEGIN
    INSERT INTO coin_transactions (
      user_id,
      amount,
      source,
      game_mode,
      metadata,
      created_at
    ) VALUES (
      p_user_id,
      p_amount,
      p_source,
      p_game_mode,
      p_metadata,
      NOW()
    ) RETURNING id INTO v_transaction_id;
  EXCEPTION
    WHEN undefined_table THEN
      -- coin_transactions table doesn't exist, skip logging
      v_transaction_id := NULL;
  END;

  -- Return coin transaction details
  RETURN jsonb_build_object(
    'coins_earned', p_amount,
    'old_coins', v_old_coins,
    'new_coins', v_new_coins,
    'source', p_source,
    'game_mode', p_game_mode,
    'transaction_id', v_transaction_id
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION award_coins TO authenticated;