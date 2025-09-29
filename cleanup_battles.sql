-- Cleanup Script for Old Battles
-- Run this in your Supabase SQL Editor to clean up old battle data

-- Option 1: Delete only waiting battles (safer)
SELECT 'Cleaning up waiting battles...' as action;
DELETE FROM battles WHERE status = 'waiting';

-- Check remaining battles
SELECT 'Remaining battles:' as info;
SELECT status, count(*) as count
FROM battles
GROUP BY status;

-- Option 2: Complete cleanup (uncomment if you want to start completely fresh)
-- WARNING: This will delete ALL battle data including completed matches
--
-- SELECT 'Complete cleanup - deleting all battles...' as action;
-- TRUNCATE TABLE battles CASCADE;
-- TRUNCATE TABLE battle_rounds CASCADE;
--
-- SELECT 'All battle data cleared.' as result;