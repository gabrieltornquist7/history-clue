// lib/leaderboardApi.js
import { supabase } from './supabaseClient';

/**
 * Fetch top scores with profile fields.
 * Returns { rows: Array<{score, username, avatar_url}>, error }
 */
export async function fetchTopScores(limit = 10) {
  console.debug('[leaderboardApi] fetching top scores (limit=%s)', limit);

  // --- Primary (single query join) ---
  // If you know the FK name, prefer explicit relationship syntax:
  //   profiles:profiles!scores_user_id_fkey(username,avatar_url)
  // Replace "scores_user_id_fkey" below with your actual FK if known.
  let primaryError = null;
  try {
    const { data, error } = await supabase
      .from('scores')
      .select(`
        score,
        profiles:profiles!scores_user_id_fkey (
          username,
          avatar_url
        )
      `)
      .order('score', { ascending: false })
      .limit(limit);

    if (!error && Array.isArray(data)) {
      const rows = data.map((r) => ({
        score: r.score,
        username: r.profiles?.username ?? '—',
        avatar_url: r.profiles?.avatar_url ?? null,
      }));
      console.debug('[leaderboardApi] primary join ok: %d rows', rows.length);
      return { rows, error: null };
    }
    primaryError = error || new Error('Unknown primary join error');
    console.warn('[leaderboardApi] primary join failed; falling back', primaryError);
  } catch (e) {
    primaryError = e;
    console.warn('[leaderboardApi] primary join threw; falling back', e);
  }

  // --- Fallback (two calls: scores -> profiles.in) ---
  const { data: scores, error: sErr } = await supabase
    .from('scores')
    .select('score,user_id')
    .order('score', { ascending: false })
    .limit(limit);
  if (sErr) return { rows: [], error: sErr };
  const userIds = [...new Set((scores ?? []).map((s) => s.user_id).filter(Boolean))];
  if (userIds.length === 0) return { rows: (scores ?? []).map(s => ({ score: s.score, username: '—', avatar_url: null })), error: null };

  const { data: profs, error: pErr } = await supabase
    .from('profiles')
    .select('id,username,avatar_url')
    .in('id', userIds);
  if (pErr) return { rows: [], error: pErr };

  const profById = new Map(profs.map(p => [p.id, p]));
  const rows = (scores ?? []).map((s) => {
    const p = profById.get(s.user_id);
    return {
      score: s.score,
      username: p?.username ?? '—',
      avatar_url: p?.avatar_url ?? null,
    };
  });
  console.debug('[leaderboardApi] fallback ok: %d rows', rows.length);
  return { rows, error: null };
}