// lib/liveApi.js
import { supabase } from './supabaseClient';
import { normalizeInvite } from './shared';

/**
 * Find a joinable battle for an invite code.
 * Return shape: { battle, path, error }
 *  - battle: row or null
 *  - path: 'waiting' | 'activeSelf' | 'none'
 */
export async function fetchJoinableMatchByInvite(inviteCode, uid) {
  const code = normalizeInvite(inviteCode);
  console.debug('[liveApi] fetchJoinableBattleByInvite()', { code, uid });

  // 1) Prefer a fresh waiting match where player2 is empty
  const waiting = await supabase
    .from('battles')
    .select('id,status,player1,player2,invite_code,created_at')
    .eq('invite_code', code)
    .eq('status', 'waiting')
    .is('player2', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (waiting.error) {
    console.warn('[liveApi] waiting query error', waiting.error);
  } else if (waiting.data?.[0]) {
    console.debug('[liveApi] waiting match found', waiting.data[0].id);
    return { battle: waiting.data[0], path: 'waiting', error: null };
  }

  // 2) If user is already in an active match with that code, allow rejoin
  if (uid) {
    const activeSelf = await supabase
      .from('battles')
      .select('id,status,player1,player2,invite_code,created_at')
      .eq('invite_code', code)
      .eq('status', 'active')
      .or(`player1.eq.${uid},player2.eq.${uid}`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (activeSelf.error) {
      console.warn('[liveApi] activeSelf query error', activeSelf.error);
    } else if (activeSelf.data?.[0]) {
      console.debug('[liveApi] activeSelf match found', activeSelf.data[0].id);
      return { battle: activeSelf.data[0], path: 'activeSelf', error: null };
    }
  }

  console.debug('[liveApi] no joinable match for code');
  return { battle: null, path: 'none', error: waiting.error || null };
}

// Re-export for convenience
export { normalizeInvite } from './shared';