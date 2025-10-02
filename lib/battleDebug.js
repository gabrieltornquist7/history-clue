// lib/battleDebug.js
// Debug utilities for testing battle system

import { supabase } from './supabaseClient';

/**
 * Get all active battles for debugging
 */
export async function listActiveBattles() {
  const { data, error } = await supabase
    .from('battles')
    .select(`
      *,
      player1:player1_id(username),
      player2:player2_id(username)
    `)
    .in('status', ['waiting', 'active'])
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error listing battles:', error);
    return null;
  }
  
  console.table(data);
  return data;
}

/**
 * Get battle details with all rounds
 */
export async function getBattleDetails(battleId) {
  const { data: battle, error: battleError } = await supabase
    .from('battles')
    .select(`
      *,
      player1:player1_id(username),
      player2:player2_id(username)
    `)
    .eq('id', battleId)
    .single();
  
  if (battleError) {
    console.error('Error fetching battle:', battleError);
    return null;
  }
  
  const { data: rounds, error: roundsError } = await supabase
    .from('battle_rounds')
    .select('*')
    .eq('battle_id', battleId)
    .order('round_number');
  
  if (roundsError) {
    console.error('Error fetching rounds:', roundsError);
    return null;
  }
  
  console.log('Battle:', battle);
  console.table(rounds);
  
  return { battle, rounds };
}

/**
 * Clean up stuck/abandoned battles
 */
export async function cleanupAbandonedBattles(olderThanMinutes = 30) {
  const cutoffTime = new Date();
  cutoffTime.setMinutes(cutoffTime.getMinutes() - olderThanMinutes);
  
  const { data, error } = await supabase
    .from('battles')
    .delete()
    .in('status', ['waiting', 'active'])
    .lt('created_at', cutoffTime.toISOString())
    .select();
  
  if (error) {
    console.error('Error cleaning up battles:', error);
    return null;
  }
  
  console.log(`Cleaned up ${data?.length || 0} abandoned battles`);
  return data;
}

/**
 * Force complete a battle (for testing)
 */
export async function forceCompleteBattle(battleId) {
  const { error } = await supabase
    .from('battles')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', battleId);
  
  if (error) {
    console.error('Error completing battle:', error);
    return false;
  }
  
  console.log('Battle marked as completed');
  return true;
}

/**
 * Test battle creation
 */
export async function testCreateBattle(userId) {
  console.log('Testing battle creation...');
  
  const { data, error } = await supabase.rpc('create_battle', {
    p_player1_id: userId
  });
  
  if (error) {
    console.error('❌ Create battle failed:', error);
    return null;
  }
  
  const result = data[0];
  console.log('✅ Battle created:', result);
  console.log('Invite code:', result.invite_code);
  
  return result;
}

/**
 * Test battle join
 */
export async function testJoinBattle(inviteCode, userId) {
  console.log('Testing battle join...');
  
  const { data, error } = await supabase.rpc('join_battle', {
    p_invite_code: inviteCode,
    p_player2_id: userId
  });
  
  if (error) {
    console.error('❌ Join battle failed:', error);
    return null;
  }
  
  const result = data[0];
  console.log('✅ Battle joined:', result);
  
  return result;
}

/**
 * Verify database setup
 */
export async function verifyDatabaseSetup() {
  console.log('🔍 Verifying database setup...\n');
  
  const checks = [];
  
  // Check battles table
  const { data: battles, error: battlesError } = await supabase
    .from('battles')
    .select('count')
    .limit(1);
  
  checks.push({
    check: 'battles table',
    status: !battlesError ? '✅' : '❌',
    error: battlesError?.message
  });
  
  // Check battle_rounds table
  const { data: rounds, error: roundsError } = await supabase
    .from('battle_rounds')
    .select('count')
    .limit(1);
  
  checks.push({
    check: 'battle_rounds table',
    status: !roundsError ? '✅' : '❌',
    error: roundsError?.message
  });
  
  // Check create_battle function
  const { error: createFnError } = await supabase.rpc('create_battle', {
    p_player1_id: '00000000-0000-0000-0000-000000000000' // Dummy ID
  });
  
  // Should fail with FK constraint, not "function doesn't exist"
  const createFnExists = createFnError && !createFnError.message.includes('does not exist');
  
  checks.push({
    check: 'create_battle function',
    status: createFnExists ? '✅' : '❌',
    error: !createFnExists ? 'Function not found' : null
  });
  
  // Check join_battle function
  const { error: joinFnError } = await supabase.rpc('join_battle', {
    p_invite_code: 'TEST00',
    p_player2_id: '00000000-0000-0000-0000-000000000000'
  });
  
  const joinFnExists = joinFnError && !joinFnError.message.includes('does not exist');
  
  checks.push({
    check: 'join_battle function',
    status: joinFnExists ? '✅' : '❌',
    error: !joinFnExists ? 'Function not found' : null
  });
  
  // Check submit_battle_guess function
  const { error: submitFnError } = await supabase.rpc('submit_battle_guess', {
    p_round_id: '00000000-0000-0000-0000-000000000000',
    p_player_id: '00000000-0000-0000-0000-000000000000',
    p_score: 0,
    p_distance_km: 0,
    p_year_guess: 0,
    p_clues_used: [1],
    p_guess_lat: 0,
    p_guess_lng: 0
  });
  
  const submitFnExists = submitFnError && !submitFnError.message.includes('does not exist');
  
  checks.push({
    check: 'submit_battle_guess function',
    status: submitFnExists ? '✅' : '❌',
    error: !submitFnExists ? 'Function not found' : null
  });
  
  console.table(checks);
  
  const allPassed = checks.every(c => c.status === '✅');
  
  if (allPassed) {
    console.log('\n🎉 All checks passed! Battle system is ready.\n');
  } else {
    console.log('\n⚠️ Some checks failed. Review errors above.\n');
  }
  
  return allPassed;
}

// Export for window access (useful in browser console)
if (typeof window !== 'undefined') {
  window.battleDebug = {
    listActiveBattles,
    getBattleDetails,
    cleanupAbandonedBattles,
    forceCompleteBattle,
    testCreateBattle,
    testJoinBattle,
    verifyDatabaseSetup
  };
}
