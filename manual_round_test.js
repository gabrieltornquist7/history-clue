// Manual Round Creation Test
// Copy and paste this into browser console while logged in

const testRoundCreation = async () => {
  console.log('=== Manual Round Creation Test ===');

  // Check current user
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Current user:', session?.user?.id);

  if (!session?.user?.id) {
    console.error('No authenticated user!');
    return;
  }

  // Get current active battle
  const { data: battles, error: battleError } = await supabase
    .from('battles')
    .select('*')
    .eq('status', 'active')
    .or(`player1.eq.${session.user.id},player2.eq.${session.user.id}`)
    .order('created_at', { ascending: false })
    .limit(1);

  if (battleError || !battles?.length) {
    console.error('No active battle found:', battleError);
    return;
  }

  const battle = battles[0];
  console.log('Found active battle:', battle);

  // Check existing rounds
  const { data: existingRounds } = await supabase
    .from('battle_rounds')
    .select('*')
    .eq('battle_id', battle.id)
    .order('round_number', { ascending: true });

  console.log('Existing rounds:', existingRounds);

  const nextRoundNumber = (existingRounds?.length || 0) + 1;
  console.log('Next round number:', nextRoundNumber);

  // Get a puzzle
  const { data: puzzles, error: puzzleError } = await supabase
    .from('puzzles')
    .select('*')
    .limit(1);

  if (puzzleError || !puzzles?.length) {
    console.error('No puzzles available:', puzzleError);
    return;
  }

  const puzzle = puzzles[0];
  console.log('Using puzzle:', puzzle);

  // Try to create the round
  console.log('Attempting to create round...');

  const roundData = {
    battle_id: battle.id,
    round_number: nextRoundNumber,
    puzzle_id: puzzle.id,
    started_at: new Date().toISOString()
  };

  console.log('Round data:', roundData);

  const { data: newRound, error: roundError } = await supabase
    .from('battle_rounds')
    .insert(roundData)
    .select()
    .single();

  if (roundError) {
    console.error('❌ Round creation failed!');
    console.error('Error:', roundError);
    console.error('Error code:', roundError.code);
    console.error('Error message:', roundError.message);

    // Check RLS policies
    console.log('Checking RLS policies...');
    const { data: policies } = await supabase
      .rpc('exec_sql', {
        sql: "SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'battle_rounds'"
      });
    console.log('RLS policies:', policies);

  } else {
    console.log('✅ Round created successfully!', newRound);
  }
};

// Helper function to check database permissions
const checkPermissions = async () => {
  console.log('=== Permission Check ===');

  // Test select
  try {
    const { data: rounds, error: selectError } = await supabase
      .from('battle_rounds')
      .select('*')
      .limit(1);
    console.log('✅ SELECT permission:', selectError ? 'DENIED' : 'OK');
    if (selectError) console.error('Select error:', selectError);
  } catch (e) {
    console.error('❌ SELECT failed:', e);
  }

  // Test current user
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Current user ID:', session?.user?.id);

  // Test battles access
  try {
    const { data: battles, error: battleError } = await supabase
      .from('battles')
      .select('*')
      .limit(1);
    console.log('✅ Battles access:', battleError ? 'DENIED' : 'OK');
    if (battleError) console.error('Battles error:', battleError);
  } catch (e) {
    console.error('❌ Battles access failed:', e);
  }
};

// Run the tests
console.log('Run testRoundCreation() or checkPermissions() in console');