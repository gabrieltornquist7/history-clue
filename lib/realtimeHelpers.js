// lib/realtimeHelpers.js - Simple realtime helpers
import { supabase } from './supabaseClient';

let activeChannels = new Map();

export function subscribeToBattle(battleId, onMessage) {
  // Cleanup existing subscription if any
  if (activeChannels.has(battleId)) {
    console.log('[Realtime] Cleaning up existing channel for:', battleId);
    activeChannels.get(battleId).unsubscribe();
  }

  console.log('[Realtime] Creating new channel for battle:', battleId);

  const channel = supabase
    .channel(`battle:${battleId}`, {
      config: {
        // Mobile-friendly settings for better connectivity
        heartbeat_interval: 15000, // 15 seconds (more lenient for mobile)
        reconnect_interval: 1000,  // 1 second (faster reconnection)
        timeout: 10000,            // 10 seconds
        presence: {
          key: `player_${Date.now()}`
        }
      }
    })
    .on('broadcast', { event: '*' }, (payload) => {
      console.log('[Realtime] Event received:', {
        event: payload.event,
        from: payload.payload?.playerId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
      });
      onMessage(payload);
    })
    .on('presence', { event: 'sync' }, () => {
      console.log('[Realtime] Presence synced for battle:', battleId);
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('[Realtime] Player joined:', key, newPresences);
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('[Realtime] Player left:', key, leftPresences);
    })
    .subscribe((status, err) => {
      console.log('[Realtime] Channel status change:', {
        status,
        error: err,
        battleId,
        timestamp: new Date().toISOString(),
        isMobile: navigator.userAgent.includes('Mobile')
      });

      if (status === 'CHANNEL_ERROR') {
        console.error('[Realtime] Channel error, attempting reconnection in 2s...');
        setTimeout(() => {
          console.log('[Realtime] Attempting to reconnect...');
          // Attempt to resubscribe
          subscribeToBattle(battleId, onMessage);
        }, 2000);
      }
    });

  activeChannels.set(battleId, channel);

  // Add visibility change handler for mobile
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      console.log('[Realtime] App became visible, checking connection...');
      // Ping the channel to ensure it's still active
      setTimeout(() => {
        if (channel.state === 'closed') {
          console.log('[Realtime] Channel was closed, resubscribing...');
          subscribeToBattle(battleId, onMessage);
        }
      }, 1000);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    console.log('[Realtime] Unsubscribing from battle:', battleId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    channel.unsubscribe();
    activeChannels.delete(battleId);
  };
}

export async function broadcastBattleEvent(battleId, event, data) {
  const channel = activeChannels.get(battleId);
  if (!channel) {
    console.error('[Realtime] No active channel for battle:', battleId);
    return;
  }

  console.log('[Realtime] Broadcasting:', event, data);

  await channel.send({
    type: 'broadcast',
    event: event,
    payload: data
  });
}

export function cleanupBattleSubscriptions() {
  activeChannels.forEach(channel => channel.unsubscribe());
  activeChannels.clear();
}