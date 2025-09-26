// lib/shared.js - Shared utility functions

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

/**
 * Validate invite code format
 * @param {string} code - The invite code to validate
 * @returns {boolean} - True if valid format
 */
export function isValidInviteCode(code) {
  if (!code || typeof code !== 'string') return false;
  // 6 alphanumeric characters
  return INVITE_CODE_REGEX.test(code);
}

/**
 * Safely play audio with error handling
 * @param {string} elementId - The audio element ID
 */
export async function safePlayAudio(elementId) {
  try {
    const audio = document.getElementById(elementId);
    if (audio && typeof audio.play === 'function') {
      await audio.play().catch(() => {}); // Ignore autoplay errors
    }
  } catch (e) {
    console.debug('Audio play failed (non-critical):', e);
  }
}