-- Shop System Migration
-- Creates tables for shop items, user purchases, and equipped items

-- 1. Create shop_items table
CREATE TABLE IF NOT EXISTS shop_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'title', 'map_theme', 'pin_style', etc.
  price INTEGER NOT NULL DEFAULT 0,
  rarity TEXT DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  is_available BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create user_purchases table
CREATE TABLE IF NOT EXISTS user_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- 3. Add equipped_title to profiles table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'equipped_title'
  ) THEN
    ALTER TABLE profiles ADD COLUMN equipped_title TEXT REFERENCES shop_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Insert initial title shop items
INSERT INTO shop_items (id, name, description, category, price, rarity, sort_order) VALUES
  ('title_explorer', 'The Explorer', 'For those who venture into the unknown', 'title', 100, 'common', 1),
  ('title_history_buff', 'History Buff', 'A student of the ages', 'title', 250, 'common', 2),
  ('title_time_traveler', 'Time Traveler', 'Across centuries and continents', 'title', 500, 'rare', 3),
  ('title_master_detective', 'Master Detective', 'Piecing together the past', 'title', 1000, 'rare', 4),
  ('title_ancient_scholar', 'Ancient Scholar', 'Keeper of forgotten knowledge', 'title', 2500, 'epic', 5),
  ('title_legendary_historian', 'Legendary Historian', 'Master of all eras', 'title', 5000, 'legendary', 6),
  ('title_archaeologist', 'The Archaeologist', 'Unearthing hidden truths', 'title', 750, 'rare', 7),
  ('title_cartographer', 'Master Cartographer', 'Mapping the world through time', 'title', 1500, 'epic', 8),
  ('title_oracle', 'The Oracle', 'Seer of past and present', 'title', 3500, 'legendary', 9),
  ('title_renaissance', 'Renaissance Mind', 'A scholar of many disciplines', 'title', 2000, 'epic', 10)
ON CONFLICT (id) DO NOTHING;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_purchases_user_id ON user_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_item_id ON user_purchases(item_id);
CREATE INDEX IF NOT EXISTS idx_shop_items_category ON shop_items(category);
CREATE INDEX IF NOT EXISTS idx_shop_items_available ON shop_items(is_available);

-- 6. Create function to purchase an item
CREATE OR REPLACE FUNCTION purchase_shop_item(
  p_user_id UUID,
  p_item_id TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  new_coin_balance INTEGER
) AS $$
DECLARE
  v_item_price INTEGER;
  v_user_coins INTEGER;
  v_already_owned BOOLEAN;
BEGIN
  -- Check if item exists and is available
  SELECT price INTO v_item_price
  FROM shop_items
  WHERE id = p_item_id AND is_available = TRUE;

  IF v_item_price IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Item not found or not available'::TEXT, 0::INTEGER;
    RETURN;
  END IF;

  -- Check if user already owns this item
  SELECT EXISTS(
    SELECT 1 FROM user_purchases
    WHERE user_id = p_user_id AND item_id = p_item_id
  ) INTO v_already_owned;

  IF v_already_owned THEN
    RETURN QUERY SELECT FALSE, 'You already own this item'::TEXT, 0::INTEGER;
    RETURN;
  END IF;

  -- Get user's current coins
  SELECT coins INTO v_user_coins
  FROM profiles
  WHERE id = p_user_id;

  -- Check if user has enough coins
  IF v_user_coins < v_item_price THEN
    RETURN QUERY SELECT FALSE, 'Not enough coins'::TEXT, v_user_coins;
    RETURN;
  END IF;

  -- Deduct coins from user
  UPDATE profiles
  SET coins = coins - v_item_price
  WHERE id = p_user_id;

  -- Add item to user's purchases
  INSERT INTO user_purchases (user_id, item_id)
  VALUES (p_user_id, p_item_id);

  -- Get new coin balance
  SELECT coins INTO v_user_coins
  FROM profiles
  WHERE id = p_user_id;

  RETURN QUERY SELECT TRUE, 'Purchase successful'::TEXT, v_user_coins;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to equip a title
CREATE OR REPLACE FUNCTION equip_title(
  p_user_id UUID,
  p_item_id TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_owns_item BOOLEAN;
  v_is_title BOOLEAN;
BEGIN
  -- Check if item is a title
  SELECT category = 'title' INTO v_is_title
  FROM shop_items
  WHERE id = p_item_id;

  IF NOT v_is_title THEN
    RETURN QUERY SELECT FALSE, 'Item is not a title'::TEXT;
    RETURN;
  END IF;

  -- Check if user owns this item
  SELECT EXISTS(
    SELECT 1 FROM user_purchases
    WHERE user_id = p_user_id AND item_id = p_item_id
  ) INTO v_owns_item;

  IF NOT v_owns_item THEN
    RETURN QUERY SELECT FALSE, 'You do not own this item'::TEXT;
    RETURN;
  END IF;

  -- Equip the title
  UPDATE profiles
  SET equipped_title = p_item_id
  WHERE id = p_user_id;

  RETURN QUERY SELECT TRUE, 'Title equipped successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to unequip title
CREATE OR REPLACE FUNCTION unequip_title(
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles
  SET equipped_title = NULL
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Add RLS policies
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;

-- Everyone can view shop items
CREATE POLICY "Shop items are viewable by everyone" ON shop_items
  FOR SELECT USING (true);

-- Users can view their own purchases
CREATE POLICY "Users can view their own purchases" ON user_purchases
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own purchases (handled by function, but allowing direct insert for flexibility)
CREATE POLICY "Users can insert their own purchases" ON user_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE shop_items IS 'Contains all purchasable items in the shop';
COMMENT ON TABLE user_purchases IS 'Tracks which items each user has purchased';
COMMENT ON FUNCTION purchase_shop_item IS 'Handles the complete purchase flow including coin deduction';
COMMENT ON FUNCTION equip_title IS 'Equips a title to a user profile';
COMMENT ON FUNCTION unequip_title IS 'Removes equipped title from a user profile';
