-- Add columns to battles table for round tracking and sync

-- Add current_round column if not exists
ALTER TABLE battles
ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 1;

-- Add updated_at column if not exists
ALTER TABLE battles
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing battles to have current_round = 1 if NULL
UPDATE battles
SET current_round = 1
WHERE current_round IS NULL;

-- Update existing battles to have updated_at = created_at if NULL
UPDATE battles
SET updated_at = created_at
WHERE updated_at IS NULL;

-- Verify the columns were added
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'battles'
AND column_name IN ('current_round', 'updated_at');

-- Show sample data
SELECT
    id,
    status,
    current_round,
    created_at,
    updated_at
FROM battles
ORDER BY created_at DESC
LIMIT 5;