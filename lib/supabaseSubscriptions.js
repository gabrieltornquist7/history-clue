import { supabase } from './supabaseClient.js';

// Global channels - only one per table
let battleRoundsChannel = null;
let battlesChannel = null;
let battleBroadcastChannel = null;

// Subscribers for each channel with filtering
const battleRoundsSubscribers = new Map(); // Map<battleId, Set<callback>>
const battlesSubscribers = new Set();
const battleBroadcastSubscribers = new Map(); // Map<battleId, Set<callback>>

/**
 * Subscribe to battle_rounds table changes for a specific battle
 * Multiple components can subscribe, but only one DB connection is used
 */
export function subscribeBattleRounds(battleId, onUpdate) {
  console.log('Subscribing to battle_rounds channel for battle:', battleId);

  // Initialize subscribers set for this battle if needed
  if (!battleRoundsSubscribers.has(battleId)) {
    battleRoundsSubscribers.set(battleId, new Set());
  }

  // Add subscriber to battle-specific set
  battleRoundsSubscribers.get(battleId).add(onUpdate);

  // Create global channel if it doesn't exist
  if (!battleRoundsChannel) {
    console.log('Creating global battle_rounds channel');
    battleRoundsChannel = supabase
      .channel('battle_rounds_global')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'battle_rounds'
      }, (payload) => {
        console.log('Battle rounds change received:', payload);
        const eventBattleId = payload.new?.battle_id || payload.old?.battle_id;

        if (eventBattleId && battleRoundsSubscribers.has(eventBattleId)) {
          // Notify only subscribers for this specific battle
          const subscribers = battleRoundsSubscribers.get(eventBattleId);
          subscribers.forEach(subscriber => {
            try {
              subscriber(payload);
            } catch (error) {
              console.error('Error in battle_rounds subscriber:', error);
            }
          });
        }
      })
      .subscribe((status) => {
        console.log('Battle rounds subscription status:', status);
      });
  }

  // Return unsubscribe function
  return () => {
    console.log('Unsubscribing from battle_rounds channel for battle:', battleId);

    if (battleRoundsSubscribers.has(battleId)) {
      battleRoundsSubscribers.get(battleId).delete(onUpdate);

      // Remove battle key if no more subscribers
      if (battleRoundsSubscribers.get(battleId).size === 0) {
        battleRoundsSubscribers.delete(battleId);
      }
    }

    // If no more subscribers at all, cleanup the channel
    if (battleRoundsSubscribers.size === 0 && battleRoundsChannel) {
      console.log('Cleaning up battle_rounds channel - no more subscribers');
      supabase.removeChannel(battleRoundsChannel);
      battleRoundsChannel = null;
    }
  };
}

/**
 * Subscribe to battles table changes
 * Multiple components can subscribe, but only one DB connection is used
 */
export function subscribeBattles(onUpdate) {
  console.log('Subscribing to battles channel');

  // Add subscriber to set
  battlesSubscribers.add(onUpdate);

  // Create global channel if it doesn't exist
  if (!battlesChannel) {
    console.log('Creating new battles channel');
    battlesChannel = supabase
      .channel('battles_global')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'battles'
      }, (payload) => {
        console.log('Battles change received:', payload);
        // Notify all subscribers
        battlesSubscribers.forEach(subscriber => {
          try {
            subscriber(payload);
          } catch (error) {
            console.error('Error in battles subscriber:', error);
          }
        });
      })
      .subscribe((status) => {
        console.log('Battles subscription status:', status);
      });
  }

  // Return unsubscribe function
  return () => {
    console.log('Unsubscribing from battles channel');
    battlesSubscribers.delete(onUpdate);

    // If no more subscribers, cleanup the channel
    if (battlesSubscribers.size === 0 && battlesChannel) {
      console.log('Cleaning up battles channel - no more subscribers');
      supabase.removeChannel(battlesChannel);
      battlesChannel = null;
    }
  };
}

/**
 * Subscribe to battle broadcast events (guesses, timer updates, etc.)
 */
export function subscribeBattleBroadcast(battleId, onEvent) {
  console.log('Subscribing to battle broadcast for battle:', battleId);

  // Initialize subscribers set for this battle if needed
  if (!battleBroadcastSubscribers.has(battleId)) {
    battleBroadcastSubscribers.set(battleId, new Set());
  }

  // Add subscriber to battle-specific set
  battleBroadcastSubscribers.get(battleId).add(onEvent);

  // Create global broadcast channel if it doesn't exist
  if (!battleBroadcastChannel) {
    console.log('Creating global battle broadcast channel');
    battleBroadcastChannel = supabase
      .channel('battle_broadcast_global')
      .on('broadcast', { event: '*' }, (payload) => {
        console.log('Battle broadcast received:', payload);
        const eventBattleId = payload.payload?.battleId;

        if (eventBattleId && battleBroadcastSubscribers.has(eventBattleId)) {
          // Notify only subscribers for this specific battle
          const subscribers = battleBroadcastSubscribers.get(eventBattleId);
          subscribers.forEach(subscriber => {
            try {
              subscriber(payload);
            } catch (error) {
              console.error('Error in battle broadcast subscriber:', error);
            }
          });
        }
      })
      .subscribe((status) => {
        console.log('Battle broadcast subscription status:', status);
      });
  }

  // Return unsubscribe function
  return () => {
    console.log('Unsubscribing from battle broadcast for battle:', battleId);

    if (battleBroadcastSubscribers.has(battleId)) {
      battleBroadcastSubscribers.get(battleId).delete(onEvent);

      // Remove battle key if no more subscribers
      if (battleBroadcastSubscribers.get(battleId).size === 0) {
        battleBroadcastSubscribers.delete(battleId);
      }
    }

    // If no more subscribers at all, cleanup the channel
    if (battleBroadcastSubscribers.size === 0 && battleBroadcastChannel) {
      console.log('Cleaning up battle broadcast channel - no more subscribers');
      supabase.removeChannel(battleBroadcastChannel);
      battleBroadcastChannel = null;
    }
  };
}

/**
 * Send battle broadcast event
 */
export function sendBattleBroadcast(battleId, event, data) {
  console.log('Sending battle broadcast:', { battleId, event, data });

  if (!battleBroadcastChannel) {
    console.error('Battle broadcast channel not initialized');
    return;
  }

  return battleBroadcastChannel.send({
    type: 'broadcast',
    event,
    payload: {
      battleId,
      event,
      data,
      timestamp: Date.now()
    }
  });
}

/**
 * Get current subscriber counts (for debugging)
 */
export function getSubscriberCounts() {
  return {
    battleRounds: Array.from(battleRoundsSubscribers.entries()).reduce((total, [battleId, subscribers]) => total + subscribers.size, 0),
    battles: battlesSubscribers.size,
    battleBroadcast: Array.from(battleBroadcastSubscribers.entries()).reduce((total, [battleId, subscribers]) => total + subscribers.size, 0),
    channels: {
      battleRoundsActive: !!battleRoundsChannel,
      battlesActive: !!battlesChannel,
      battleBroadcastActive: !!battleBroadcastChannel
    },
    battleIds: {
      battleRounds: Array.from(battleRoundsSubscribers.keys()),
      battleBroadcast: Array.from(battleBroadcastSubscribers.keys())
    }
  };
}

/**
 * Cleanup all channels (useful for app shutdown)
 */
export function cleanupAllChannels() {
  console.log('Cleaning up all subscription channels');

  if (battleRoundsChannel) {
    supabase.removeChannel(battleRoundsChannel);
    battleRoundsChannel = null;
  }

  if (battlesChannel) {
    supabase.removeChannel(battlesChannel);
    battlesChannel = null;
  }

  if (battleBroadcastChannel) {
    supabase.removeChannel(battleBroadcastChannel);
    battleBroadcastChannel = null;
  }

  battleRoundsSubscribers.clear();
  battlesSubscribers.clear();
  battleBroadcastSubscribers.clear();
}