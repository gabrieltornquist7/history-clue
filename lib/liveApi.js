// lib/liveApi.js - Live battle API helpers
import { supabase } from './supabaseClient';

export function normalizeInvite(code) {
  return String(code || '').trim().toUpperCase();
}

/**
 * Find a joinable battle for an invite code.
 * Return shape: { battle, path, error }
 *  - battle: row or null
 *  - path: 'waiting' | 'activeSelf' | 'none'
 *  - error: error object or null
 */
export async function fetchJoinableMatchByInvite(inviteCode, uid) {
  const code = normalizeInvite(inviteCode);
  console.log('[liveApi] fetchJoinableMatchByInvite START', { code, uid });

  try {
    // Verify we have a valid session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('[liveApi] No valid session', sessionError);
      return { battle: null, path: 'none', error: new Error('Not authenticated') };
    }

    // 1) First, look for a waiting match where player2 is empty
    console.log('[liveApi] Checking for waiting matches...');
    const { data: waitingMatches, error: waitingError } = await supabase
      .from('battles')
      .select('*')
      .eq('invite_code', code)
      .eq('status', 'waiting');

    console.log('[liveApi] Waiting query result:', { waitingMatches, waitingError });

    if (waitingError) {
      console.error('[liveApi] Waiting query error:', waitingError);
      return { battle: null, path: 'none', error: waitingError };
    }

    if (waitingMatches && waitingMatches.length > 0) {
      // Filter for matches where player2 is null
      const joinableMatch = waitingMatches.find(m => !m.player2);
      if (joinableMatch) {
        console.log('[liveApi] Found joinable waiting match:', joinableMatch);
        return { battle: joinableMatch, path: 'waiting', error: null };
      }
    }

    // 2) Check if user is already in an active match with that code
    if (uid) {
      console.log('[liveApi] Checking for active matches where user is participant...');
      const { data: activeMatches, error: activeError } = await supabase
        .from('battles')
        .select('*')
        .eq('invite_code', code)
        .eq('status', 'active');

      console.log('[liveApi] Active query result:', { activeMatches, activeError });

      if (activeError) {
        console.error('[liveApi] Active query error:', activeError);
        return { battle: null, path: 'none', error: activeError };
      }

      if (activeMatches && activeMatches.length > 0) {
        // Check if user is a participant
        const userMatch = activeMatches.find(m => m.player1 === uid || m.player2 === uid);
        if (userMatch) {
          console.log('[liveApi] Found active match where user is participant:', userMatch);
          return { battle: userMatch, path: 'activeSelf', error: null };
        }
      }
    }

    console.log('[liveApi] No joinable match found for code:', code);
    return { battle: null, path: 'none', error: null };

  } catch (err) {
    console.error('[liveApi] Unexpected error in fetchJoinableMatchByInvite:', err);
    return { battle: null, path: 'none', error: err };
  }
}