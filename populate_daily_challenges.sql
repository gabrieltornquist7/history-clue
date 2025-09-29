-- Populate daily_challenge_puzzles with sample data for testing
-- This script creates daily challenges for the next 30 days

-- First, let's create some sample puzzles for each difficulty level
-- Note: You should replace these with actual historical puzzle data

DO $$
DECLARE
  current_date DATE := CURRENT_DATE;
  i INTEGER;
  puzzle_id UUID;
BEGIN
  -- Create daily challenges for the next 30 days
  FOR i IN 0..29 LOOP
    -- Difficulty 1 (Very Easy)
    INSERT INTO daily_challenge_puzzles (
      id,
      city_name,
      historical_entity,
      year,
      latitude,
      longitude,
      country_code,
      difficulty_level,
      scheduled_date,
      is_active
    ) VALUES (
      gen_random_uuid(),
      'Rome',
      'Roman Empire',
      100,
      41.9028,
      12.4964,
      'IT',
      1,
      current_date + i,
      true
    ) RETURNING id INTO puzzle_id;

    -- Add translations for difficulty 1
    INSERT INTO daily_challenge_translations (
      daily_challenge_id,
      language_code,
      clue_1_text,
      clue_2_text,
      clue_3_text,
      clue_4_text,
      clue_5_text
    ) VALUES (
      puzzle_id,
      'en',
      'This ancient city was the heart of a vast empire that spanned three continents.',
      'The empire''s legions conquered much of Europe, North Africa, and the Middle East.',
      'Famous for its Colosseum, Forum, and aqueducts.',
      'The city was built on seven hills along the Tiber River.',
      'All roads led to this eternal city, capital of the Roman Empire.'
    );

    -- Difficulty 2 (Easy)
    INSERT INTO daily_challenge_puzzles (
      id,
      city_name,
      historical_entity,
      year,
      latitude,
      longitude,
      country_code,
      difficulty_level,
      scheduled_date,
      is_active
    ) VALUES (
      gen_random_uuid(),
      'Athens',
      'Ancient Greece',
      -450,
      37.9755,
      23.7348,
      'GR',
      2,
      current_date + i,
      true
    ) RETURNING id INTO puzzle_id;

    -- Add translations for difficulty 2
    INSERT INTO daily_challenge_translations (
      daily_challenge_id,
      language_code,
      clue_1_text,
      clue_2_text,
      clue_3_text,
      clue_4_text,
      clue_5_text
    ) VALUES (
      puzzle_id,
      'en',
      'Birthplace of democracy and philosophy in the ancient world.',
      'Home to great thinkers like Socrates, Plato, and Aristotle.',
      'The Acropolis overlooks this city with its famous Parthenon temple.',
      'This city-state fought against Sparta in the Peloponnesian War.',
      'Named after the goddess of wisdom, this Greek city invented democracy.'
    );

    -- Difficulty 3 (Medium)
    INSERT INTO daily_challenge_puzzles (
      id,
      city_name,
      historical_entity,
      year,
      latitude,
      longitude,
      country_code,
      difficulty_level,
      scheduled_date,
      is_active
    ) VALUES (
      gen_random_uuid(),
      'Constantinople',
      'Byzantine Empire',
      550,
      41.0082,
      28.9784,
      'TR',
      3,
      current_date + i,
      true
    ) RETURNING id INTO puzzle_id;

    -- Add translations for difficulty 3
    INSERT INTO daily_challenge_translations (
      daily_challenge_id,
      language_code,
      clue_1_text,
      clue_2_text,
      clue_3_text,
      clue_4_text,
      clue_5_text
    ) VALUES (
      puzzle_id,
      'en',
      'This city served as the eastern capital of the Roman Empire.',
      'Founded by an emperor who shared his name with the city.',
      'It controlled the strategic waterway between Europe and Asia.',
      'The great church of Hagia Sophia dominated its skyline.',
      'Known as the "New Rome," this Byzantine capital straddled two continents.'
    );

    -- Difficulty 4 (Hard)
    INSERT INTO daily_challenge_puzzles (
      id,
      city_name,
      historical_entity,
      year,
      latitude,
      longitude,
      country_code,
      difficulty_level,
      scheduled_date,
      is_active
    ) VALUES (
      gen_random_uuid(),
      'Tenochtitlan',
      'Aztec Empire',
      1450,
      19.4326,
      -99.1332,
      'MX',
      4,
      current_date + i,
      true
    ) RETURNING id INTO puzzle_id;

    -- Add translations for difficulty 4
    INSERT INTO daily_challenge_translations (
      daily_challenge_id,
      language_code,
      clue_1_text,
      clue_2_text,
      clue_3_text,
      clue_4_text,
      clue_5_text
    ) VALUES (
      puzzle_id,
      'en',
      'This island capital was built on a lake in the central highlands.',
      'Canals and causeways connected this city to the mainland.',
      'The empire demanded tribute from conquered peoples across Mesoamerica.',
      'Spanish conquistadors marveled at its floating gardens and markets.',
      'This Aztec capital was larger than any European city of its time.'
    );

    -- Difficulty 5 (Very Hard)
    INSERT INTO daily_challenge_puzzles (
      id,
      city_name,
      historical_entity,
      year,
      latitude,
      longitude,
      country_code,
      difficulty_level,
      scheduled_date,
      is_active
    ) VALUES (
      gen_random_uuid(),
      'Angkor',
      'Khmer Empire',
      1200,
      13.4125,
      103.8670,
      'KH',
      5,
      current_date + i,
      true
    ) RETURNING id INTO puzzle_id;

    -- Add translations for difficulty 5
    INSERT INTO daily_challenge_translations (
      daily_challenge_id,
      language_code,
      clue_1_text,
      clue_2_text,
      clue_3_text,
      clue_4_text,
      clue_5_text
    ) VALUES (
      puzzle_id,
      'en',
      'This empire controlled the Mekong River valley and much of Southeast Asia.',
      'The capital featured the world''s largest religious monument.',
      'Sophisticated irrigation systems supported over a million inhabitants.',
      'The empire''s power declined after conflicts with neighboring kingdoms.',
      'This ancient Khmer capital''s temples were swallowed by jungle for centuries.'
    );

  END LOOP;
END $$;