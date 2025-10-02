-- Create award_coins function with VIP bonus multipliers
-- This function awards coins to users and tracks transactions
-- VIP members get bonus coins: Bronze +10%, Silver +20%, Gold +30%

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
  v_vip_tier text := 'none';
  v_bonus_multiplier numeric := 1.0;
  v_base_amount integer := p_amount;
  v_bonus_amount integer := 0;
  v_final_amount integer := p_amount;
BEGIN
  -- Get current coin balance and VIP tier (default to 0 coins and 'none' tier if profile doesn't exist)
  SELECT COALESCE(coins, 0), COALESCE(vip_tier, 'none')
  INTO v_old_coins, v_vip_tier
  FROM profiles
  WHERE id = p_user_id;

  -- If profile doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO profiles (id, coins, vip_tier)
    VALUES (p_user_id, 0, 'none')
    ON CONFLICT (id) DO NOTHING;
    v_old_coins := 0;
    v_vip_tier := 'none';
  END IF;

  -- Calculate VIP bonus multiplier
  v_bonus_multiplier := CASE v_vip_tier
    WHEN 'bronze' THEN 1.10  -- +10% bonus
    WHEN 'silver' THEN 1.20  -- +20% bonus
    WHEN 'gold' THEN 1.30    -- +30% bonus
    ELSE 1.0                 -- No bonus
  END;

  -- Calculate final amount with VIP bonus
  v_final_amount := FLOOR(v_base_amount * v_bonus_multiplier);
  v_bonus_amount := v_final_amount - v_base_amount;

  -- Calculate new coin total
  v_new_coins := v_old_coins + v_final_amount;

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
      v_final_amount,  -- Store the final amount including bonus
      p_source,
      p_game_mode,
      jsonb_build_object(
        'base_amount', v_base_amount,
        'bonus_amount', v_bonus_amount,
        'vip_tier', v_vip_tier,
        'bonus_multiplier', v_bonus_multiplier
      ) || COALESCE(p_metadata, '{}'::jsonb),  -- Merge with existing metadata
      NOW()
    ) RETURNING id INTO v_transaction_id;
  EXCEPTION
    WHEN undefined_table THEN
      -- coin_transactions table doesn't exist, skip logging
      v_transaction_id := NULL;
  END;

  -- Return coin transaction details including VIP bonus info
  RETURN jsonb_build_object(
    'coins_earned', v_final_amount,
    'base_coins', v_base_amount,
    'bonus_coins', v_bonus_amount,
    'vip_tier', v_vip_tier,
    'bonus_multiplier', v_bonus_multiplier,
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

-- Example usage:
-- SELECT award_coins('user-uuid-here', 100, 'game_complete', 'endless_mode');
-- 
-- For a Bronze VIP user earning 100 coins:
--   base_coins: 100
--   bonus_coins: 10
--   total_coins: 110
--
-- For a Silver VIP user earning 100 coins:
--   base_coins: 100
--   bonus_coins: 20
--   total_coins: 120
--
-- For a Gold VIP user earning 100 coins:
--   base_coins: 100
--   bonus_coins: 30
--   total_coins: 130
