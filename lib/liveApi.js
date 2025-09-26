// lib/liveApi.js
import { supabase } from './supabaseClient';
import { normalizeInvite } from './shared';

export async function fetchJoinableMatchByInvite(inviteCode, uid) {
  const code = normalizeInvite(inviteCode);
  const filter =
    `and(status.eq.waiting,player2.is.null),` +
    `and(status.eq.active,or(player1.eq.${uid},player2.eq.${uid}))`;

  console.debug('[liveApi] invite filter', { code, filter });

  // Primary: single-shot or()
  const primary = await supabase
    .from('battles')
    .select('id,status,player1,player2,invite_code')
    .eq('invite_code', code)
    .or(filter)
    .limit(1);

  if (!primary.error && primary.data?.[0]) {
    console.debug('[liveApi] primary matched battle', primary.data[0].id);
    return { data: primary.data[0], error: null };
  }

  // If the error is PostgREST parsing/Accept weirdness, fall back.
  if (primary.error) {
    console.warn('[liveApi] primary failed; falling back', primary.error);
  } else {
    console.debug('[liveApi] primary returned no rows; checking fallbacks');
  }

  // Fallback A: waiting + player2 is null
  const a = await supabase
    .from('battles')
    .select('id,status,player1,player2,invite_code')
    .eq('invite_code', code)
    .eq('status', 'waiting')
    .is('player2', null)
    .limit(1);
  if (!a.error && a.data?.[0]) {
    console.debug('[liveApi] fallback A matched (waiting)', a.data[0].id);
    return { data: a.data[0], error: null };
  }

  // Fallback B: active + user is a participant
  const b = await supabase
    .from('battles')
    .select('id,status,player1,player2,invite_code')
    .eq('invite_code', code)
    .eq('status', 'active')
    .or(`player1.eq.${uid},player2.eq.${uid}`)
    .limit(1);
  if (!b.error && b.data?.[0]) {
    console.debug('[liveApi] fallback B matched (active)', b.data[0].id);
    return { data: b.data[0], error: null };
  }

  return { data: null, error: primary.error || a.error || b.error || null };
}

// Re-export for convenience
export { normalizeInvite } from './shared';