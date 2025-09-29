-- Migration: Daily Challenge Translations Table Structure
-- This migration updates the daily challenge system to use separate translations table

-- 1. Create daily_challenge_translations table
CREATE TABLE IF NOT EXISTS daily_challenge_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_challenge_id UUID NOT NULL REFERENCES daily_challenge_puzzles(id) ON DELETE CASCADE,
  language_code VARCHAR(5) NOT NULL DEFAULT 'en',
  clue_1_text TEXT NOT NULL,
  clue_2_text TEXT NOT NULL,
  clue_3_text TEXT NOT NULL,
  clue_4_text TEXT NOT NULL,
  clue_5_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(daily_challenge_id, language_code)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_challenge_translations_puzzle_id
ON daily_challenge_translations(daily_challenge_id);

CREATE INDEX IF NOT EXISTS idx_daily_challenge_translations_language
ON daily_challenge_translations(language_code);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE daily_challenge_translations ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Daily challenge translations are viewable by everyone"
ON daily_challenge_translations FOR SELECT
USING (true);

-- 5. Migrate existing clue data from daily_challenge_puzzles to daily_challenge_translations
-- (Only run this if daily_challenge_puzzles currently has clue columns)
-- INSERT INTO daily_challenge_translations (
--   daily_challenge_id,
--   language_code,
--   clue_1_text,
--   clue_2_text,
--   clue_3_text,
--   clue_4_text,
--   clue_5_text
-- )
-- SELECT
--   id,
--   'en',
--   clue_1_text,
--   clue_2_text,
--   clue_3_text,
--   clue_4_text,
--   clue_5_text
-- FROM daily_challenge_puzzles
-- WHERE clue_1_text IS NOT NULL;

-- 6. Update daily_challenge_puzzles table structure
-- Remove clue columns from daily_challenge_puzzles (after migration)
-- ALTER TABLE daily_challenge_puzzles
-- DROP COLUMN IF EXISTS clue_1_text,
-- DROP COLUMN IF EXISTS clue_2_text,
-- DROP COLUMN IF EXISTS clue_3_text,
-- DROP COLUMN IF EXISTS clue_4_text,
-- DROP COLUMN IF EXISTS clue_5_text;

-- 7. Add updated_at trigger for daily_challenge_translations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_daily_challenge_translations_updated_at
BEFORE UPDATE ON daily_challenge_translations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();