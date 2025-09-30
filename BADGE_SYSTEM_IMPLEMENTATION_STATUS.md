# Badge System Implementation Status

## ✅ COMPLETED COMPONENTS

### 1. Core Utilities (`lib/badgeUtils.js`)
- ✅ `getBadgeEmoji()` - Maps all 32 badge IDs to emojis
- ✅ `getRarityColor()` - Returns color for each rarity level
- ✅ `getRarityGradient()` - Returns gradient for badge displays
- ✅ `getBadgeCategories()` - Returns filter categories
- ✅ `getRarityFilters()` - Returns rarity filters
- ✅ `formatTimeAgo()` - Formats earned dates
- ✅ `getRarityLabel()` - Returns uppercase rarity label

### 2. Notification System
- ✅ `contexts/BadgeNotificationContext.js` - Global notification state management
- ✅ `components/BadgeEarnedNotification.js` - Animated notification component with:
  - Manual dismiss only (no auto-dismiss)
  - "View Badge" button linking to gallery
  - Badge emoji at 3x size
  - Rarity display with gradient
  - Coin/XP rewards display
  - Title unlock notification
- ✅ `components/BadgeNotificationContainer.js` - Manages notification queue

### 3. Badge Gallery (`components/BadgeGallery.js`)
- ✅ Displays all 32 badges in grid layout
- ✅ Shows earned badges in color, locked in grayscale
- ✅ Category filters (All, Daily, Endless, Battle, Social, Mastery)
- ✅ Rarity filters (All, Legendary, Epic, Rare, Common)
- ✅ Progress bars for partial completion
- ✅ Badge detail modal with:
  - Requirements
  - Progress tracking
  - Rewards preview
  - Earned date
- ✅ Earned counter (X / 32 badges earned)

### 4. Profile Settings (`components/ProfileSettingsView.js`)
- ✅ Tabbed interface (Titles | Badges)
- ✅ Titles Tab - Existing title selection (unchanged)
- ✅ Badges Tab - Badge selection with:
  - List of all earned badges
  - Checkbox selection
  - 5-badge maximum enforcement
  - Display counter (X/5 selected)
  - Real-time toggle updates
  - Link to Badge Gallery if no badges earned

### 5. App Integration (`app/page.js`)
- ✅ Wrapped app with `BadgeNotificationProvider`
- ✅ Added `BadgeNotificationContainer` for global notifications
- ✅ Added `badges` view case for Badge Gallery route
- ✅ Lazy loaded BadgeGallery component

---

## ⏳ REMAINING TASKS

### Priority 1: Profile Display Updates
Update `components/ProfileView.js` to show:

1. **Displayed Badges Section** (below profile info)
   ```javascript
   // Fetch displayed badges
   const { data: displayedBadges } = await supabase
     .from('user_badges')
     .select(`
       *,
       badge:badge_definitions(id, name, rarity)
     `)
     .eq('user_id', profileUserId)
     .eq('is_displayed', true)
     .limit(5);
   ```

   Display as horizontal row with:
   - Badge emoji
   - Name on hover
   - Rarity border/glow
   - Click to see badge detail

2. **Recently Earned Section** (last 3 badges)
   ```javascript
   // Fetch recent badges
   const { data: recentBadges } = await supabase
     .from('user_badges')
     .select(`
       *,
       badge:badge_definitions(id, name, rarity)
     `)
     .eq('user_id', profileUserId)
     .order('earned_at', { ascending: false })
     .limit(3);
   ```

   Display with:
   - Badge emoji + name
   - "Earned X days ago" using `formatTimeAgo()`

3. **Link to Badge Gallery**
   Add button: "View All Badges →" → `setView('badges')`

---

### Priority 2: Badge Checking Integration

#### A. GameView.js - Endless Mode
After level completion:
```javascript
import { useBadgeNotifications } from '../contexts/BadgeNotificationContext';

const { queueBadgeNotification } = useBadgeNotifications();

// After updating endless_mode_level
const levelBadges = [
  'endless_level_10',
  'endless_level_25',
  'endless_level_50',
  'endless_level_100'
];

for (const badgeId of levelBadges) {
  const { data, error } = await supabase.rpc('check_and_award_badge', {
    p_user_id: session.user.id,
    p_badge_id: badgeId
  });

  if (data?.awarded) {
    queueBadgeNotification(data);
  }
}

// Also check first perfect and perfect streak
if (isPerfectScore) {
  await supabase.rpc('check_and_award_badge', {
    p_user_id: session.user.id,
    p_badge_id: 'endless_first_perfect'
  });
}
```

#### B. DailyChallengeView.js - Daily Completion
After completing all 5 puzzles:
```javascript
// Check daily completion badges
const dailyBadges = [
  'daily_first',
  'daily_3_days',
  'daily_perfect_day', // if all perfect
  'daily_speedrun' // if <5 min total
];

for (const badgeId of dailyBadges) {
  const { data } = await supabase.rpc('check_and_award_badge', {
    p_user_id: session.user.id,
    p_badge_id: badgeId
  });

  if (data?.awarded) {
    queueBadgeNotification(data);
  }
}

// Update streak progress
await supabase.rpc('update_badge_progress', {
  p_user_id: session.user.id,
  p_badge_id: 'daily_streak_7',
  p_new_value: currentStreak
});
```

#### C. LiveBattleView.js / ChallengeView.js - Battle Wins
After battle victory:
```javascript
// Check battle badges
const battleBadges = [
  'battle_first_win',
  'battle_wins_25',
  'battle_wins_100',
  'battle_wins_500',
  'battle_perfect' // if 5-0 sweep
];

for (const badgeId of battleBadges) {
  const { data } = await supabase.rpc('check_and_award_badge', {
    p_user_id: session.user.id,
    p_badge_id: badgeId
  });

  if (data?.awarded) {
    queueBadgeNotification(data);
  }
}
```

#### D. ChallengeView.js - Social Badges
After friendship accepted:
```javascript
const socialBadges = [
  'social_first_friend',
  'social_5_friends',
  'social_20_friends',
  'social_50_friends'
];

for (const badgeId of socialBadges) {
  const { data } = await supabase.rpc('check_and_award_badge', {
    p_user_id: session.user.id,
    p_badge_id: badgeId
  });

  if (data?.awarded) {
    queueBadgeNotification(data);
  }
}
```

#### E. Mastery Badges - Check After Coins/XP Changes
Wherever coins are awarded:
```javascript
// After awarding coins
const { data } = await supabase.rpc('check_and_award_badge', {
  p_user_id: session.user.id,
  p_badge_id: 'mastery_coins_10k'
});

if (data?.awarded) {
  queueBadgeNotification(data);
}

// Also check 50k and 100k
```

After puzzle completion (any mode):
```javascript
// Track total puzzles solved
const puzzleBadges = [
  'mastery_puzzles_50',
  'mastery_puzzles_500',
  'mastery_puzzles_2000',
  'mastery_puzzles_5000'
];

for (const badgeId of puzzleBadges) {
  const { data } = await supabase.rpc('check_and_award_badge', {
    p_user_id: session.user.id,
    p_badge_id: badgeId
  });

  if (data?.awarded) {
    queueBadgeNotification(data);
  }
}
```

---

### Priority 3: Testing Checklist

#### Database Tests
- [ ] Verify all 32 badges exist in `badge_definitions`
- [ ] Verify 5 titles exist in `title_definitions`
- [ ] Test `check_and_award_badge` RPC function
- [ ] Test `update_badge_progress` RPC function
- [ ] Test `check_all_badges_for_user` RPC function

#### UI Tests
- [ ] Badge Gallery loads all 32 badges
- [ ] Category filters work correctly
- [ ] Rarity filters work correctly
- [ ] Progress bars display correctly
- [ ] Badge detail modal shows all info
- [ ] Notification appears when badge earned
- [ ] Notification stacks properly (multiple badges)
- [ ] "View Badge" button navigates correctly
- [ ] Badge selection in ProfileSettings works
- [ ] 5-badge limit enforced
- [ ] ProfileView shows displayed badges
- [ ] ProfileView shows recently earned badges
- [ ] Rarity colors match specification

#### Integration Tests
- [ ] Endless mode badges unlock at correct levels
- [ ] Daily challenge badges unlock correctly
- [ ] Battle win badges track properly
- [ ] Social badges unlock after friend actions
- [ ] Mastery badges track coins correctly
- [ ] Mastery badges track puzzle count correctly
- [ ] Titles unlock when legendary badges earned
- [ ] Coins/XP awarded correctly with badges
- [ ] Progress tracking works for streak badges

---

## 🎨 DESIGN SPECIFICATIONS (Implemented)

### Rarity Colors
- **Common**: `#CD7F32` (Bronze)
- **Rare**: `#C0C0C0` (Silver)
- **Epic**: `#FFD700` (Gold)
- **Legendary**: `#FF00FF` (Magenta)

### Badge Emoji Mappings
All 32 badges have emoji placeholders mapped in `badgeUtils.js`

### Animations
- Badge earned: Scale + rotate entrance animation
- Badge glow: Continuous pulsing glow based on rarity
- Slide up: Content fade-in animation

---

## 📝 QUICK START GUIDE

### To Show Badge Notification
```javascript
import { useBadgeNotifications } from '../contexts/BadgeNotificationContext';

const { queueBadgeNotification } = useBadgeNotifications();

// After game completion
const { data } = await supabase.rpc('check_and_award_badge', {
  p_user_id: session.user.id,
  p_badge_id: 'badge_id_here'
});

if (data?.awarded) {
  queueBadgeNotification(data);
}
```

### To Navigate to Badge Gallery
```javascript
setView('badges'); // From any component with setView prop
```

### To Navigate to Badge Settings
```javascript
setView('profileSettings'); // Then user clicks "Badges" tab
```

---

## 🔗 FILE STRUCTURE

```
history-clue/
├── lib/
│   └── badgeUtils.js (✅ Complete)
├── contexts/
│   └── BadgeNotificationContext.js (✅ Complete)
├── components/
│   ├── BadgeEarnedNotification.js (✅ Complete)
│   ├── BadgeNotificationContainer.js (✅ Complete)
│   ├── BadgeGallery.js (✅ Complete)
│   ├── ProfileSettingsView.js (✅ Complete - Updated)
│   ├── ProfileView.js (⏳ Needs badge display)
│   ├── GameView.js (⏳ Needs badge checks)
│   ├── DailyChallengeView.js (⏳ Needs badge checks)
│   ├── LiveBattleView.js (⏳ Needs badge checks)
│   └── ChallengeView.js (⏳ Needs badge checks)
└── app/
    └── page.js (✅ Complete - Badge system integrated)
```

---

## 🚀 DEPLOYMENT CHECKLIST

Before going live:
1. [ ] Run `npm run build` and ensure no errors
2. [ ] Run `npm run lint` and fix any issues
3. [ ] Test badge gallery on mobile (360px min width)
4. [ ] Test all badge notification animations
5. [ ] Test badge selection limits (5 max)
6. [ ] Verify all emoji display correctly
7. [ ] Test navigation between views
8. [ ] Run retroactive badge award script for existing users:
   ```javascript
   // One-time script
   const { data: profiles } = await supabase.from('profiles').select('id');

   for (const profile of profiles) {
     await supabase.rpc('check_all_badges_for_user', {
       p_user_id: profile.id
     });
   }
   ```

---

## 📊 PERFORMANCE NOTES

- Badge Gallery uses lazy loading via Next.js dynamic imports
- Badge definitions cached client-side after first load
- User badge queries filtered by user ID for RLS compliance
- Progress tracking uses separate table to avoid badge definition bloat
- Notifications render outside React tree for performance

---

## 🎯 FUTURE ENHANCEMENTS (Optional)

- Add badge search/filter by name
- Add badge sorting options (date, rarity, name)
- Add badge comparison with friends
- Add badge statistics page
- Add badge leaderboards (most badges, rarest badges)
- Add animated badge unlock sequences
- Add sound effects for badge unlocks
- Add badge share to social media
- Replace emoji placeholders with custom SVG icons
- Add badge themes/skins