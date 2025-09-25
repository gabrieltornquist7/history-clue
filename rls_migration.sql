-- RLS Migration for Live Battle Security
-- This file contains SQL commands to set up Row Level Security for live battle features
-- Run these commands in your Supabase SQL editor or via CLI

-- Enable RLS on battles table
ALTER TABLE IF EXISTS battles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access battles they're participating in
DO $$
BEGIN
    -- Drop policy if it exists to avoid conflicts
    DROP POLICY IF EXISTS "Users can access their own battles" ON battles;
    DROP POLICY IF EXISTS "Users can access their battles and open invites" ON battles;

    -- Create the policy allowing access to own battles and open invites
    CREATE POLICY "Users can access their battles and open invites" ON battles
        FOR ALL USING (
            -- Users can access battles they're participating in
            auth.uid() = player1 OR
            auth.uid() = player2 OR
            -- Anyone can view open invites to join them
            (status = 'waiting' AND player2 IS NULL AND invite_code IS NOT NULL)
        ) WITH CHECK (
            -- Can only insert/update if you're player1 or becoming player2
            auth.uid() = player1 OR
            (OLD.player2 IS NULL AND NEW.player2 = auth.uid()) OR
            -- Allow creating new battles where you're player1
            (NEW.player1 = auth.uid() AND OLD IS NULL)
        );
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'battles table does not exist, skipping RLS setup';
END $$;

-- Enable RLS on battle_rounds table
DO $$
BEGIN
    ALTER TABLE IF EXISTS battle_rounds ENABLE ROW LEVEL SECURITY;

    -- Drop policy if it exists
    DROP POLICY IF EXISTS "Users can access rounds of their battles" ON battle_rounds;

    -- Policy: Users can only access rounds of battles they're in
    CREATE POLICY "Users can access rounds of their battles" ON battle_rounds
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM battles
                WHERE battles.id = battle_rounds.battle_id
                AND (battles.player1 = auth.uid() OR battles.player2 = auth.uid())
            )
        );
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'battle_rounds table does not exist, skipping RLS setup';
END $$;

-- Enable RLS on battle_moves table
DO $$
BEGIN
    ALTER TABLE IF EXISTS battle_moves ENABLE ROW LEVEL SECURITY;

    -- Drop policy if it exists
    DROP POLICY IF EXISTS "Users can access moves from their battle rounds" ON battle_moves;

    -- Policy: Users can access moves from rounds they're participating in
    CREATE POLICY "Users can access moves from their battle rounds" ON battle_moves
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM battle_rounds
                JOIN battles ON battles.id = battle_rounds.battle_id
                WHERE battle_rounds.id = battle_moves.round_id
                AND (battles.player1 = auth.uid() OR battles.player2 = auth.uid())
            )
        );
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'battle_moves table does not exist, skipping RLS setup';
END $$;

-- Enable realtime for the tables (if not already enabled)
DO $$
BEGIN
    -- Enable realtime publication for battles
    ALTER PUBLICATION supabase_realtime ADD TABLE battles;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'battles already in realtime publication';
    WHEN undefined_table THEN
        RAISE NOTICE 'battles table does not exist';
END $$;

DO $$
BEGIN
    -- Enable realtime publication for battle_rounds
    ALTER PUBLICATION supabase_realtime ADD TABLE battle_rounds;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'battle_rounds already in realtime publication';
    WHEN undefined_table THEN
        RAISE NOTICE 'battle_rounds table does not exist';
END $$;

DO $$
BEGIN
    -- Enable realtime publication for battle_moves
    ALTER PUBLICATION supabase_realtime ADD TABLE battle_moves;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'battle_moves already in realtime publication';
    WHEN undefined_table THEN
        RAISE NOTICE 'battle_moves table does not exist';
END $$;

-- Grant necessary permissions for realtime channels
-- Note: This assumes the tables exist. If they don't, create them first.

-- Optional: Create indexes for better performance
DO $$
BEGIN
    -- Index for battle player lookups
    CREATE INDEX IF NOT EXISTS idx_battles_player1 ON battles(player1);
    CREATE INDEX IF NOT EXISTS idx_battles_player2 ON battles(player2);

    -- Index for battle rounds
    CREATE INDEX IF NOT EXISTS idx_battle_rounds_battle_id ON battle_rounds(battle_id);
    CREATE INDEX IF NOT EXISTS idx_battle_rounds_status ON battle_rounds(status);

    -- Index for battle moves
    CREATE INDEX IF NOT EXISTS idx_battle_moves_round_id ON battle_moves(round_id);
    CREATE INDEX IF NOT EXISTS idx_battle_moves_player ON battle_moves(player);
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Some tables do not exist, skipping index creation';
END $$;

-- Instructions:
-- 1. Run this script in your Supabase SQL editor
-- 2. Verify that the policies are created by checking the "Policies" tab in your Supabase dashboard
-- 3. Test that users can only access their own battle data
-- 4. If you encounter errors about missing tables, create the battle tables first

COMMENT ON TABLE battles IS 'Live battle sessions between two players';
COMMENT ON TABLE battle_rounds IS 'Individual rounds within a live battle';
COMMENT ON TABLE battle_moves IS 'Player actions (clue reveals, guesses) within battle rounds';

-- Create secure invite code generation function
-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.generate_invite_code();

-- Create the secure function
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    invite_code TEXT;
    code_exists BOOLEAN := TRUE;
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    i INTEGER;
BEGIN
    -- Generate unique invite codes until we find one that doesn't exist
    WHILE code_exists LOOP
        invite_code := '';

        -- Generate 6-character code
        FOR i IN 1..6 LOOP
            invite_code := invite_code || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
        END LOOP;

        -- Check if code already exists in battles table
        SELECT EXISTS (
            SELECT 1 FROM public.battles
            WHERE invite_code = generate_invite_code.invite_code
        ) INTO code_exists;
    END LOOP;

    RETURN invite_code;
END;
$$;

-- Set function permissions (revoke from PUBLIC, grant to authenticated users and service_role)
REVOKE ALL ON FUNCTION public.generate_invite_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_invite_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invite_code() TO service_role;

-- Add comment
COMMENT ON FUNCTION public.generate_invite_code() IS 'Securely generates unique 6-character invite codes for battles';