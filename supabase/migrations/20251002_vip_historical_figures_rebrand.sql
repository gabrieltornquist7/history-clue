-- VIP Historical Figures Rebranding Migration
-- Updates VIP tier names and descriptions from generic Bronze/Silver/Gold to historical figures

-- Update Bronze VIP to Leonardo da Vinci
UPDATE shop_items 
SET 
  name = 'Leonardo da Vinci',
  description = 'The Renaissance Master - Unlock the genius of history''s greatest polymath'
WHERE id = 'vip_bronze';

-- Update Silver VIP to Alexander the Great
UPDATE shop_items 
SET 
  name = 'Alexander the Great',
  description = 'The Conqueror - Command the power of history''s greatest military mind'
WHERE id = 'vip_silver';

-- Update Gold VIP to Genghis Khan
UPDATE shop_items 
SET 
  name = 'Genghis Khan',
  description = 'The Empire Builder - Rule with the might of history''s most successful conqueror'
WHERE id = 'vip_gold';

-- Update VIP Frame names to match
UPDATE shop_items 
SET name = 'Leonardo''s Frame' 
WHERE id = 'frame_vip_bronze';

UPDATE shop_items 
SET name = 'Alexander''s Frame' 
WHERE id = 'frame_vip_silver';

UPDATE shop_items 
SET name = 'Genghis'' Frame' 
WHERE id = 'frame_vip_gold';
