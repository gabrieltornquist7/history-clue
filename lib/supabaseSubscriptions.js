import { supabase } from './supabaseClient.js';

// Global channels - only one per table
let battleRoundsChannel = null;
let battlesChannel = null;

// Subscribers for each channel
const battleRoundsSubscribers = new Set();
const battlesSubscribers = new Set();

/**
 * Subscribe to battle_rounds table changes
 * Multiple components can subscribe, but only one DB connection is used
 */
export function subscribeBattleRounds(onUpdate, filter = null) {
  console.log('Subscribing to battle_rounds channel');

  // Add subscriber to set
  battleRoundsSubscribers.add(onUpdate);

  // Create global channel if it doesn't exist
  if (!battleRoundsChannel) {
    console.log('Creating new battle_rounds channel');
    battleRoundsChannel = supabase
      .channel('battle_rounds_global')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'battle_rounds'
      }, (payload) => {
        console.log('Battle rounds change received:', payload);
        // Notify all subscribers
        battleRoundsSubscribers.forEach(subscriber => {
          try {
            subscriber(payload);
          } catch (error) {
            console.error('Error in battle_rounds subscriber:', error);
          }
        });
      })
      .subscribe((status) => {
        console.log('Battle rounds subscription status:', status);
      });
  }

  // Return unsubscribe function
  return () => {
    console.log('Unsubscribing from battle_rounds channel');
    battleRoundsSubscribers.delete(onUpdate);

    // If no more subscribers, cleanup the channel
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
 * Get current subscriber counts (for debugging)
 */
export function getSubscriberCounts() {
  return {
    battleRounds: battleRoundsSubscribers.size,
    battles: battlesSubscribers.size,
    channels: {
      battleRoundsActive: !!battleRoundsChannel,
      battlesActive: !!battlesChannel
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

  battleRoundsSubscribers.clear();
  battlesSubscribers.clear();
}