// lib/realtimeHelpers.js - Simple realtime helpers
import { supabase } from './supabaseClient';

let activeChannels = new Map();

export function subscribeToBattle(battleId, onMessage) {
  // Cleanup existing subscription if any
  if (activeChannels.has(battleId)) {
    activeChannels.get(battleId).unsubscribe();
  }

  const channel = supabase
    .channel(`battle:${battleId}`, {
      config: {
        // Mobile-friendly settings
        heartbeat_interval: 10000, // 10 seconds
        reconnect_interval: 2000,  // 2 seconds
        timeout: 8000              // 8 seconds
      }
    })
    .on('broadcast', { event: '*' }, (payload) => {
      console.log('[Realtime] Received:', payload);
      onMessage(payload);
    })
    .subscribe((status) => {
      console.log('[Realtime] Channel status:', status);
    });

  activeChannels.set(battleId, channel);

  return () => {
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