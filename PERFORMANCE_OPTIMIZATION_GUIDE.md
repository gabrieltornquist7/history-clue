# Supabase Performance Optimization Implementation Guide

## Overview
This guide implements the performance optimizations to reduce database load from 73% realtime subscriptions and 203k profile queries to near-zero redundant calls.

## ✅ Completed Optimizations

### 1. Global Realtime Subscriptions (`lib/supabaseSubscriptions.js`)
**Problem**: Each component creates its own realtime subscription → 73% of DB load
**Solution**: Single global channel per table with subscriber management

```js
// Before (multiple subscriptions)
const channel1 = supabase.channel('battle_rounds_1').subscribe();
const channel2 = supabase.channel('battle_rounds_2').subscribe();
const channel3 = supabase.channel('battle_rounds_3').subscribe();

// After (single global subscription)
import { subscribeBattleRounds } from '../lib/supabaseSubscriptions';

const unsubscribe = subscribeBattleRounds((payload) => {
  // Handle battle_rounds updates
  if (payload.new.battle_id === myBattleId) {
    handleRoundUpdate(payload.new);
  }
});

// Cleanup
useEffect(() => {
  return () => unsubscribe();
}, []);
```

### 2. Profile Caching (`lib/useProfileCache.js`)
**Problem**: 203k+ profile queries hitting the database
**Solution**: In-memory cache with React Context

```js
// Before (every component fetches profiles)
const { data: profile } = await supabase
  .from('profiles')
  .select('id, username, is_founder')
  .eq('id', userId)
  .single();

// After (cached profiles)
import { useProfile, useProfiles } from '../lib/useProfileCache';

// Single profile
const { profile, loading } = useProfile(userId);

// Multiple profiles (batch request)
const { profiles, loading } = useProfiles([userId1, userId2, userId3]);

// Manual fetching
const { fetchProfile, fetchProfiles } = useProfileCache();
const profile = await fetchProfile(userId); // Cache hit = instant
const profiles = await fetchProfiles([userId1, userId2]); // Batch fetch
```

### 3. Database Indexes (`performance_optimization_indexes.sql`)
**Problem**: Slow queries on battle/battle_rounds tables
**Solution**: Strategic indexes for common query patterns

```sql
-- Run in Supabase SQL Editor
CREATE INDEX IF NOT EXISTS idx_battle_rounds_battle_id ON battle_rounds (battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_rounds_battle_status ON battle_rounds (battle_id, status);
CREATE INDEX IF NOT EXISTS idx_battles_players ON battles (player1, player2);
CREATE INDEX IF NOT EXISTS idx_battles_invite_code ON battles (invite_code) WHERE invite_code IS NOT NULL;
```

### 4. Provider Setup (`components/Providers.js` + `app/layout.js`)
**Implementation**: ProfileCache available app-wide

```js
// app/layout.js
import { Providers } from '../components/Providers';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

## 📋 Implementation Checklist

### ✅ Phase 1: Infrastructure (Completed)
- [x] Create `lib/supabaseSubscriptions.js`
- [x] Create `lib/useProfileCache.js`
- [x] Create `components/Providers.js`
- [x] Update `app/layout.js`
- [x] Create SQL optimization indexes
- [x] Begin component refactoring

### ⏳ Phase 2: Component Refactoring (Partial)
- [x] Update LiveBattleView imports
- [x] Replace profile fetching with cache
- [ ] Replace individual subscriptions with global ones
- [ ] Update LiveLobbyView
- [ ] Update ChallengeView
- [ ] Update other components with profile/realtime usage

### 📊 Expected Performance Impact

| Metric | Before | After | Improvement |
|--------|---------|-------|-------------|
| Realtime Subscriptions | 73% of DB load | 1-2 global channels | ~70% reduction |
| Profile Queries | 203k+ queries | Cached after first load | ~99% reduction |
| Query Response Time | 50-200ms | <10ms (cache hit) | 80-95% faster |
| Database Connections | N × components | 1-2 global | Massive reduction |

## 🔧 Usage Examples

### Global Subscriptions
```js
// components/LiveBattleView.js
import { subscribeBattleRounds } from '../lib/supabaseSubscriptions';

useEffect(() => {
  const unsubscribe = subscribeBattleRounds((payload) => {
    console.log('Global battle_rounds update:', payload);

    // Filter for relevant updates
    if (payload.new?.battle_id === battleId) {
      handleRoundUpdate(payload.new);
    }
  });

  return unsubscribe; // Cleanup
}, [battleId]);
```

### Profile Cache
```js
// components/PlayerCard.js
import { useProfile } from '../lib/useProfileCache';

function PlayerCard({ playerId }) {
  const { profile, loading, error } = useProfile(playerId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading profile</div>;

  return (
    <div>
      <h3>{profile.username}</h3>
      {profile.is_founder && <span>👑 Founder</span>}
    </div>
  );
}
```

### Batch Profile Loading
```js
// components/BattleList.js
import { useProfiles } from '../lib/useProfileCache';

function BattleList({ battles }) {
  // Extract all player IDs
  const playerIds = battles.flatMap(b => [b.player1, b.player2]).filter(Boolean);

  // Single batch request
  const { profiles, loading } = useProfiles(playerIds);

  // Create lookup map
  const profileMap = profiles.reduce((map, profile) => {
    map[profile.id] = profile;
    return map;
  }, {});

  return (
    <div>
      {battles.map(battle => (
        <div key={battle.id}>
          {profileMap[battle.player1]?.username} vs {profileMap[battle.player2]?.username}
        </div>
      ))}
    </div>
  );
}
```

## 🚀 Migration Steps

1. **Run SQL indexes** in Supabase dashboard
2. **Update imports** in components that use profiles/realtime
3. **Replace profile queries** with cache hooks
4. **Replace subscriptions** with global ones
5. **Test thoroughly** to ensure functionality preserved

## 📈 Monitoring

```js
// Debug cache performance
const { getCacheStats } = useProfileCache();
console.log('Cache stats:', getCacheStats());

// Debug subscription counts
import { getSubscriberCounts } from '../lib/supabaseSubscriptions';
console.log('Subscription stats:', getSubscriberCounts());
```

## 🎯 Next Steps

To complete the optimization:

1. **Replace remaining individual subscriptions** with global ones in all components
2. **Update components** that still use direct profile queries
3. **Add monitoring** to track actual performance improvements
4. **Consider JWT customization** to include username in auth token (eliminates profile queries entirely)

The foundation is complete and ready for full implementation! 🚀