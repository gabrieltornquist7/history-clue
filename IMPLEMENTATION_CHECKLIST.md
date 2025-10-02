# Implementation Checklist - Avatar Frames & VIP

## 📋 Quick Checklist for Next Session

### ✅ Backend (COMPLETE)
- [x] Database columns added (equipped_avatar_frame, vip_tier)
- [x] 14 avatar frames created in shop_items
- [x] 3 VIP tiers created in shop_items
- [x] AvatarWithFrame component created
- [x] purchase_vip_tier() function created
- [x] All documentation written

---

## 🔧 Frontend Tasks (TODO)

### 1️⃣ Shop.js (PRIORITY: HIGH)
**File**: `components/Shop.js`

- [ ] Add "Avatar Frames" tab button
- [ ] Add "VIP Tiers" tab button
- [ ] Import `AvatarWithFrame` component
- [ ] Display frame items with preview
- [ ] Display VIP tier items with benefits list
- [ ] Handle VIP purchases with `purchase_vip_tier()` function
- [ ] Handle frame purchases with existing `purchase_shop_item()` function
- [ ] Show "Already VIP" for owned tiers
- [ ] Test purchasing a frame
- [ ] Test purchasing VIP tier

**Code Snippets Needed**:
```javascript
// Add to category buttons
<button onClick={() => setSelectedCategory('avatar_frame')}>
  Avatar Frames
</button>
<button onClick={() => setSelectedCategory('vip_tier')}>
  VIP Tiers
</button>

// For VIP purchases
if (item.category === 'vip_tier') {
  const { data } = await supabase.rpc('purchase_vip_tier', {
    p_user_id: session.user.id,
    p_vip_item_id: item.id
  });
}
```

---

### 2️⃣ ProfileSettingsView.js (PRIORITY: HIGH)
**File**: `components/ProfileSettingsView.js`

- [ ] Add "Frames" tab button
- [ ] Fetch owned frames from user_purchases
- [ ] Display "No Frame" option
- [ ] Display owned frames grid with previews
- [ ] Implement frame selection/equipping
- [ ] Show checkmark on currently equipped frame
- [ ] Update profile state after equipping
- [ ] Test equipping a frame
- [ ] Test unequipping frame

**Code Snippets Needed**:
```javascript
// Fetch owned frames
const { data: ownedFrames } = await supabase
  .from('user_purchases')
  .select('item_id, shop_items!inner(id, name, rarity)')
  .eq('user_id', session.user.id)
  .eq('shop_items.category', 'avatar_frame');

// Equip frame
await supabase
  .from('profiles')
  .update({ equipped_avatar_frame: frameId })
  .eq('id', session.user.id);
```

---

### 3️⃣ ProfileView.js (PRIORITY: MEDIUM)
**File**: `components/ProfileView.js`

- [ ] Remove import of `AvatarImage`
- [ ] Import `AvatarWithFrame` component
- [ ] Update profile query to include `equipped_avatar_frame` and `vip_tier`
- [ ] Replace `AvatarImage` with `AvatarWithFrame`
- [ ] Add VIP badge display if vip_tier !== 'none'
- [ ] Style VIP badge with tier colors
- [ ] Test frame display on profile
- [ ] Test VIP badge display

**Code Snippets Needed**:
```javascript
import AvatarWithFrame from './AvatarWithFrame';

<AvatarWithFrame 
  url={profile?.avatar_url}
  frameId={profile?.equipped_avatar_frame}
  size="w-32 h-32"
/>

{profile?.vip_tier !== 'none' && (
  <span className="vip-badge">
    {profile.vip_tier.toUpperCase()} VIP ✨
  </span>
)}
```

---

### 4️⃣ LeaderboardView.js (PRIORITY: MEDIUM)
**File**: `components/LeaderboardView.js`

- [ ] Import `AvatarWithFrame` component
- [ ] Update leaderboard query to include `equipped_avatar_frame`
- [ ] Replace `AvatarImage` with `AvatarWithFrame`
- [ ] Test frames display in leaderboard

**Code Snippets Needed**:
```javascript
// Update query
.select(`
  id,
  username,
  avatar_url,
  equipped_avatar_frame,
  endless_mode_level,
  equipped_title
`)

<AvatarWithFrame
  url={entry.avatar_url}
  frameId={entry.equipped_avatar_frame}
  size="w-12 h-12"
/>
```

---

### 5️⃣ FriendsView.js (PRIORITY: LOW)
**File**: `components/FriendsView.js`

- [ ] Import `AvatarWithFrame` component
- [ ] Update friends query to include `equipped_avatar_frame`
- [ ] Replace avatar displays with `AvatarWithFrame`
- [ ] Test frames in friends list

---

### 6️⃣ ChallengeView.js (PRIORITY: LOW)
**File**: `components/ChallengeView.js`

- [ ] Import `AvatarWithFrame` component
- [ ] Update challenge queries to include `equipped_avatar_frame`
- [ ] Replace avatar displays with `AvatarWithFrame`
- [ ] Test frames in challenge UI

---

### 7️⃣ LiveBattleView.js (PRIORITY: LOW)
**File**: `components/LiveBattleView.js`

- [ ] Import `AvatarWithFrame` component
- [ ] Update battle queries to include `equipped_avatar_frame`
- [ ] Replace avatar displays with `AvatarWithFrame`
- [ ] Test frames in battle UI

---

### 8️⃣ VIP Coin Bonuses (OPTIONAL)
**File**: Coin award function/migration

- [ ] Find where coins are awarded (check for `award_coins` function)
- [ ] Add VIP tier lookup
- [ ] Calculate bonus multiplier (bronze: +10%, silver: +20%, gold: +30%)
- [ ] Apply multiplier to coin awards
- [ ] Test VIP users get bonus coins

**Code Snippet Needed**:
```sql
-- In award_coins function
SELECT vip_tier INTO v_vip_tier FROM profiles WHERE id = p_user_id;

v_bonus := CASE v_vip_tier
  WHEN 'bronze' THEN 1.10
  WHEN 'silver' THEN 1.20
  WHEN 'gold' THEN 1.30
  ELSE 1.0
END;

v_final_coins := FLOOR(v_base_coins * v_bonus);
```

---

## 🧪 Testing Sequence

### Phase 1: Basic Setup (30 min)
1. [ ] Add categories to Shop.js
2. [ ] Verify frames appear in shop
3. [ ] Verify VIP tiers appear in shop
4. [ ] Purchase a common frame (500 coins)

### Phase 2: Frame System (45 min)
5. [ ] Add Frames tab to ProfileSettings
6. [ ] Verify purchased frame appears
7. [ ] Equip the frame
8. [ ] Verify frame shows on ProfileView
9. [ ] Purchase another frame
10. [ ] Switch between frames

### Phase 3: VIP System (30 min)
11. [ ] Purchase Bronze VIP (need 5,000 coins)
12. [ ] Verify Bronze VIP frame auto-granted
13. [ ] Verify VIP badge appears
14. [ ] Equip Bronze VIP frame
15. [ ] Test VIP coin bonus (if implemented)

### Phase 4: Display Everywhere (45 min)
16. [ ] Update LeaderboardView with frames
17. [ ] Verify frames on leaderboard
18. [ ] Update FriendsView with frames
19. [ ] Update ChallengeView with frames
20. [ ] Update LiveBattleView with frames

### Phase 5: Polish (30 min)
21. [ ] Test all frame rarities display correctly
22. [ ] Test frame animations
23. [ ] Test edge cases (no avatar, no frame, etc.)
24. [ ] Fix any visual bugs
25. [ ] Final testing pass

---

## ⏱️ Time Estimates

| Task | Estimated Time |
|------|---------------|
| Shop integration | 45-60 min |
| ProfileSettings | 30-45 min |
| ProfileView | 20-30 min |
| LeaderboardView | 15-20 min |
| Other views | 30-45 min |
| VIP bonuses | 20-30 min |
| Testing | 30-45 min |
| **TOTAL** | **3-4 hours** |

---

## 🚨 Important Notes

1. **VIP purchases** use different function: `purchase_vip_tier()` NOT `purchase_shop_item()`
2. **VIP frames** are auto-granted, don't show them in shop
3. **Frame IDs** must match exactly (e.g., `frame_legendary_gold`)
4. **Component usage** is simple: just pass `frameId` prop
5. **No frame** = pass `null` or don't pass frameId prop

---

## 📖 Quick Reference

### Component Usage
```javascript
<AvatarWithFrame 
  url={avatarUrl}
  frameId={equippedFrame || null}
  size="w-24 h-24"
/>
```

### Purchase Frame
```javascript
await supabase.rpc('purchase_shop_item', {
  p_user_id: session.user.id,
  p_item_id: 'frame_classic_bronze'
});
```

### Purchase VIP
```javascript
await supabase.rpc('purchase_vip_tier', {
  p_user_id: session.user.id,
  p_vip_item_id: 'vip_bronze'
});
```

### Equip Frame
```javascript
await supabase
  .from('profiles')
  .update({ equipped_avatar_frame: 'frame_classic_bronze' })
  .eq('id', userId);
```

---

## ✅ When You're Done

Check that:
- [ ] Users can buy frames from shop
- [ ] Users can equip frames in settings
- [ ] Frames show on profile, leaderboard, battles, etc.
- [ ] Users can buy VIP tiers
- [ ] VIP frames auto-granted
- [ ] VIP badges display
- [ ] Everything looks polished
- [ ] No console errors

Then you're done! 🎉

---

**See Also:**
- `AVATAR_FRAMES_VIP_STATUS.md` - Detailed implementation guide
- `AVATAR_FRAMES_VIP_IMPLEMENTATION.md` - Full documentation
- `QUICK_REFERENCE_FRAMES_VIP.md` - Quick reference guide
- `components/AvatarWithFrame.js` - The component itself
