-- Performance Optimization Indexes
-- Run these commands in your Supabase SQL editor to optimize query performance
-- This reduces database load by creating proper indexes for battle/battle_rounds queries

-- 1. Battle Rounds Optimization
-- Index for battle_id lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_battle_rounds_battle_id ON battle_rounds (battle_id);

-- Index for status filtering (active, finished, etc.)
CREATE INDEX IF NOT EXISTS idx_battle_rounds_status ON battle_rounds (status);

-- Composite index for battle_id + status (covers most queries)
CREATE INDEX IF NOT EXISTS idx_battle_rounds_battle_status ON battle_rounds (battle_id, status);

-- Index for round progression queries
CREATE INDEX IF NOT EXISTS idx_battle_rounds_round_no ON battle_rounds (battle_id, round_no);

-- Index for completion timestamp queries
CREATE INDEX IF NOT EXISTS idx_battle_rounds_completion ON battle_rounds (player1_completed_at, player2_completed_at);

-- 2. Battles Optimization
-- Index for player lookups (RLS policy checks)
CREATE INDEX IF NOT EXISTS idx_battles_player1 ON battles (player1);
CREATE INDEX IF NOT EXISTS idx_battles_player2 ON battles (player2);

-- Composite index for both players (covers RLS OR conditions)
CREATE INDEX IF NOT EXISTS idx_battles_players ON battles (player1, player2);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_battles_status ON battles (status);

-- Index for invite code lookups
CREATE INDEX IF NOT EXISTS idx_battles_invite_code ON battles (invite_code) WHERE invite_code IS NOT NULL;

-- 3. Battle Moves Optimization (if used)
-- Index for round_id lookups
CREATE INDEX IF NOT EXISTS idx_battle_moves_round_id ON battle_moves (round_id);

-- Index for player filtering
CREATE INDEX IF NOT EXISTS idx_battle_moves_player ON battle_moves (player);

-- Composite index for round + player
CREATE INDEX IF NOT EXISTS idx_battle_moves_round_player ON battle_moves (round_id, player);

-- 4. Profiles Optimization
-- Index for username lookups (if needed for search)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles (username);

-- Index for is_founder filtering (if used)
CREATE INDEX IF NOT EXISTS idx_profiles_founder ON profiles (is_founder) WHERE is_founder = true;

-- 5. Friendships Optimization (if used)
-- Indexes for friendship queries
CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships (user_id_1);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships (user_id_2);

-- Composite index for friendship lookups
CREATE INDEX IF NOT EXISTS idx_friendships_users ON friendships (user_id_1, user_id_2);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships (status);

-- 6. Challenges Optimization (if used)
-- Index for challenger/challenged lookups
CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON challenges (challenger_id);
CREATE INDEX IF NOT EXISTS idx_challenges_challenged ON challenges (challenged_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges (status);

-- 7. Realtime Optimization
-- Ensure tables are added to realtime publication (if not already done)
DO $$
BEGIN
    -- Enable realtime for battles (if not already enabled)
    ALTER PUBLICATION supabase_realtime ADD TABLE battles;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'battles already in realtime publication';
    WHEN undefined_table THEN
        RAISE NOTICE 'battles table does not exist';
END $$;

DO $$
BEGIN
    -- Enable realtime for battle_rounds (if not already enabled)
    ALTER PUBLICATION supabase_realtime ADD TABLE battle_rounds;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'battle_rounds already in realtime publication';
    WHEN undefined_table THEN
        RAISE NOTICE 'battle_rounds table does not exist';
END $$;

-- 8. Query Performance Analysis
-- Use these queries to analyze performance after creating indexes

-- Check index usage
-- SELECT schemaname, tablename, attname, n_distinct, correlation
-- FROM pg_stats
-- WHERE tablename IN ('battles', 'battle_rounds', 'profiles')
-- ORDER BY tablename, attname;

-- Check query execution plans (example)
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM battle_rounds
-- WHERE battle_id = 'some-uuid' AND status = 'active';

-- Monitor index usage
-- SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE tablename IN ('battles', 'battle_rounds')
-- ORDER BY idx_tup_read DESC;

COMMENT ON INDEX idx_battle_rounds_battle_id IS 'Optimizes battle_id lookups in battle_rounds';
COMMENT ON INDEX idx_battle_rounds_battle_status IS 'Optimizes battle_id + status composite queries';
COMMENT ON INDEX idx_battles_players IS 'Optimizes RLS policy checks for player1/player2';
COMMENT ON INDEX idx_battles_invite_code IS 'Optimizes invite code lookups for joining battles';

-- Performance Tips:
-- 1. Use these indexes with queries that filter on the indexed columns
-- 2. Monitor pg_stat_user_indexes to see which indexes are being used
-- 3. Drop unused indexes to reduce storage overhead
-- 4. Consider partial indexes for frequently filtered subsets
-- 5. Use EXPLAIN ANALYZE to verify query performance improvements