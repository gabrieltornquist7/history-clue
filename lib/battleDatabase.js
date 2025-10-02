// lib/battleDatabase.js
// All database operations for battle mode

import { supabase } from './supabaseClient';

/**
 * Fetch complete battle state (battle + current round + puzzle + profiles)
 */
export async function fetchBattleState(battleId) {
  try {
    // Fetch battle with player profiles
    const { data: battle, error: battleError } = await supabase
      .from('battles')
      .select(`
        *,
        player1:player1_id (id, username, avatar_url, level, equipped_avatar_frame),
        player2:player2_id (id, username, avatar_url, level, equipped_avatar_frame)
      `)
      .eq('id', battleId)
      .single();
    
    if (battleError) {
      console.error('Error fetching battle:', battleError);
      return null;
    }
    
    if (!battle) {
      console.error('Battle not found');
      return null;
    }
    
    // Fetch current round with puzzle
    const { data: currentRound, error: roundError } = await supabase
      .from('battle_rounds')
      .select(`
        *,
        puzzle:puzzle_id (
          *,
          puzzle_translations (*)
        )
      `)
      .eq('battle_id', battleId)
      .eq('round_number', battle.current_round_number)
      .single();
    
    if (roundError && roundError.code !== 'PGRST116') { // Ignore "not found" errors
      console.error('Error fetching round:', roundError);
    }
    
    return {
      battle,
      currentRound: currentRound || null,
      puzzle: currentRound?.puzzle || null
    };
  } catch (error) {
    console.error('Exception in fetchBattleState:', error);
    return null;
  }
}

/**
 * Create a new battle
 */
export async function createBattle(creatorId) {
  try {
    const { data, error } = await supabase.rpc('create_battle', {
      p_player1_id: creatorId
    });
    
    if (error) {
      console.error('Error creating battle:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.error('No data returned from create_battle');
      return null;
    }
    
    const result = data[0];
    return {
      battleId: result.battle_id,
      inviteCode: result.invite_code
    };
  } catch (error) {
    console.error('Exception in createBattle:', error);
    return null;
  }
}

/**
 * Join an existing battle using invite code
 */
export async function joinBattle(inviteCode, playerId) {
  try {
    const { data, error } = await supabase.rpc('join_battle', {
      p_invite_code: inviteCode,
      p_player2_id: playerId
    });
    
    if (error) {
      console.error('Error joining battle:', error);
      return { error: error.message };
    }
    
    if (!data || data.length === 0) {
      console.error('No data returned from join_battle');
      return { error: 'Failed to join battle' };
    }
    
    const result = data[0];
    return {
      battleId: result.battle_id,
      puzzleId: result.puzzle_id
    };
  } catch (error) {
    console.error('Exception in joinBattle:', error);
    return { error: error.message || 'Failed to join battle' };
  }
}

/**
 * Submit a guess for a round
 */
export async function submitGuess({
  roundId,
  playerId,
  score,
  distanceKm,
  yearGuess,
  cluesUsed,
  guessLat,
  guessLng
}) {
  try {
    const { data, error } = await supabase.rpc('submit_battle_guess', {
      p_round_id: roundId,
      p_player_id: playerId,
      p_score: score,
      p_distance_km: distanceKm,
      p_year_guess: yearGuess,
      p_clues_used: cluesUsed,
      p_guess_lat: guessLat,
      p_guess_lng: guessLng
    });
    
    if (error) {
      console.error('Error submitting guess:', error);
      return { success: false, error: error.message };
    }
    
    return {
      success: true,
      bothSubmitted: data?.both_submitted || false
    };
  } catch (error) {
    console.error('Exception in submitGuess:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all rounds for a battle (for history/results)
 */
export async function fetchBattleRounds(battleId) {
  try {
    const { data, error } = await supabase
      .from('battle_rounds')
      .select(`
        *,
        puzzle:puzzle_id (city_name, historical_entity, year)
      `)
      .eq('battle_id', battleId)
      .order('round_number');
    
    if (error) {
      console.error('Error fetching battle rounds:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception in fetchBattleRounds:', error);
    return null;
  }
}

/**
 * Find a battle by invite code (for validation before joining)
 */
export async function findBattleByInviteCode(inviteCode) {
  try {
    const { data, error } = await supabase
      .from('battles')
      .select(`
        id,
        status,
        player1_id,
        player2_id,
        player1:player1_id (username)
      `)
      .eq('invite_code', inviteCode)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return { error: 'Battle not found' };
      }
      console.error('Error finding battle:', error);
      return { error: error.message };
    }
    
    // Check if battle is joinable
    if (data.status !== 'waiting') {
      return { error: 'Battle already started or completed' };
    }
    
    if (data.player2_id) {
      return { error: 'Battle is full' };
    }
    
    return { battle: data };
  } catch (error) {
    console.error('Exception in findBattleByInviteCode:', error);
    return { error: error.message };
  }
}

/**
 * Cancel a waiting battle (only if not started)
 */
export async function cancelBattle(battleId, playerId) {
  try {
    const { error } = await supabase
      .from('battles')
      .delete()
      .eq('id', battleId)
      .eq('player1_id', playerId)
      .eq('status', 'waiting');
    
    if (error) {
      console.error('Error canceling battle:', error);
      return { success: false };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Exception in cancelBattle:', error);
    return { success: false };
  }
}
