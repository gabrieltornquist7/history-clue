// /lib/shared.js
// Pure, cycle-safe helpers/constants shared by live views.

export const INVITE_CODE_REGEX = /^[A-Z0-9]{6}$/i;

export function normalizeInvite(code) {
  return (code || '').trim().toUpperCase();
}

export function buildInviteUrl(origin, code) {
  const c = normalizeInvite(code);
  const url = new URL(origin);
  url.searchParams.set('invite', c);
  return url.toString();
}

export function isValidInviteCode(code) {
  const normalized = normalizeInvite(code);
  return INVITE_CODE_REGEX.test(normalized);
}

// Audio helper for join sounds
export async function safePlayAudio(audioId) {
  try {
    const audio = document.getElementById(audioId);
    if (audio) {
      await audio.play();
    }
  } catch (error) {
    console.warn('Audio playback failed:', error);
  }
}