-- Foreign Key Migration for scores.user_id -> profiles.id
-- Ensures referential integrity between scores and profiles tables

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    -- Check if foreign key constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'scores_user_id_fkey'
        AND table_name = 'scores'
    ) THEN
        -- Add foreign key constraint
        ALTER TABLE scores
        ADD CONSTRAINT scores_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

        RAISE NOTICE 'Foreign key constraint scores_user_id_fkey added successfully';
    ELSE
        RAISE NOTICE 'Foreign key constraint scores_user_id_fkey already exists';
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Either scores or profiles table does not exist';
    WHEN others THEN
        RAISE NOTICE 'Error adding foreign key constraint: %', SQLERRM;
END $$;

-- Verify the constraint was created
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'scores'
    AND tc.constraint_name = 'scores_user_id_fkey';