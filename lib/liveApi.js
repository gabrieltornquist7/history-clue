// /lib/liveApi.js
import { supabase } from './supabaseClient';
import { normalizeInvite } from './shared';

export async function fetchJoinableMatchByInvite(inviteCode, uid) {
  const code = normalizeInvite(inviteCode);
  const filter =
    `and(status.eq.waiting,player2.is.null),` +
    `and(status.eq.active,or(player1.eq.${uid},player2.eq.${uid}))`;

  console.debug('[liveApi] invite join filter', { code, filter });

  // Primary: single round-trip using Supabase builder (handles encoding safely)
  let { data, error, status } = await supabase
    .from('battles')
    .select('*')
    .eq('invite_code', code)
    .or(filter)
    .single();

  if (error && (status === 400 || String(error.message || '').includes('or='))) {
    console.warn('[liveApi] primary or/and filter failed; falling back', { status, error });
    // Fallback A: waiting + player2 is null
    const a = await supabase
      .from('battles')
      .select('*')
      .eq('invite_code', code)
      .eq('status', 'waiting')
      .is('player2', null)
      .single();
    if (a.data) return { data: a.data, error: null };

    // Fallback B: active + current user is participant
    const b = await supabase
      .from('battles')
      .select('*')
      .eq('invite_code', code)
      .eq('status', 'active')
      .or(`player1.eq.${uid},player2.eq.${uid}`)
      .single();
    if (b.error) return { data: null, error: b.error };
    return { data: b.data ?? null, error: null };
  }

  return { data, error };
}