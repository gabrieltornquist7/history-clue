# Quick Reference: Avatar Frames & VIP System

## 🎯 What's Done

### Database ✅
- Added `equipped_avatar_frame` column to profiles
- Added `vip_tier` column to profiles  
- Created 11 avatar frames in shop (common to legendary)
- Created 3 VIP tiers in shop (Bronze, Silver, Gold)
- Created 3 VIP-exclusive frames (auto-granted)
- Created `purchase_vip_tier()` SQL function

### Components ✅
- Created `AvatarWithFrame.js` component with animations
- All frame styles defined (14 total frames)
- Animations: pulse, shimmer, legendary glow, founder glow

## 🔧 What Needs Integration

### 1. Shop.js - Add Categories
```javascript
// Add tabs
<button onClick={() => setSelectedCategory('avatar_frame')}>Frames</button>
<button onClick={() => setSelectedCategory('vip_tier')}>VIP</button>

// For VIP purchases, use special function:
await supabase.rpc('purchase_vip_tier', {
  p_user_id: session.user.id,
  p_vip_item_id: item.id
});
```

### 2. ProfileSettingsView.js - Frame Selection
```javascript
// Add Frames tab
// Fetch purchased frames
// Show preview with user's avatar
// Save selection to equipped_avatar_frame
```

### 3. All Avatar Displays - Use New Component
```javascript
// Replace:
import { AvatarImage } from "../lib/avatarHelpers";

// With:
import AvatarWithFrame from './AvatarWithFrame';
<AvatarWithFrame url={url} frameId={frameId} size="w-32 h-32" />
```

### Files to Update:
- ✅ Shop.js - Add frames & VIP tabs
- ✅ ProfileSettingsView.js - Add frame selection UI
- ✅ ProfileView.js - Show equipped frame
- ✅ LeaderboardView.js - Show frames in leaderboard
- ✅ FriendsView.js - Show frames on friends
- ✅ ChallengeView.js - Show frames in challenges
- ✅ LiveBattleView.js - Show frames in battles
- ✅ Coin award logic - Add VIP bonuses (+10%/+20%/+30%)

## 📊 Items Added

### Avatar Frames (11 total)
- **Common** (2): Classic Bronze (500), Simple Silver (750)
- **Rare** (3): Ancient Gold (1000), Explorer (1200), Scholar (1500)
- **Epic** (3): Royal Purple (2000), Master Historian (2500), Timeless (3000)
- **Legendary** (3): Legendary Gold (4000), Eternal (5000), Founder's Crown (6000)

### VIP Tiers (3 total)
- **Bronze VIP** (5,000): +10% coins, bronze frame
- **Silver VIP** (15,000): +20% coins, silver frame, weekly challenges
- **Gold VIP** (50,000): +30% coins, gold frame, custom challenges, early access

### VIP Frames (3 total - auto-granted)
- Bronze VIP Frame
- Silver VIP Frame  
- Gold VIP Frame

## 🎨 Component Usage

```javascript
import AvatarWithFrame from './AvatarWithFrame';

<AvatarWithFrame 
  url={profile.avatar_url}
  frameId={profile.equipped_avatar_frame}  // or null for no frame
  size="w-32 h-32"
  alt="User Avatar"
  className="additional-classes"
/>
```

## 💡 Key Points

1. **VIP purchases** use special function (auto-grants exclusive frame)
2. **Regular frame purchases** use existing `purchase_shop_item` function
3. **Frames are optional** - `frameId={null}` works fine
4. **All animations are CSS** - no performance issues
5. **VIP bonuses** need to be implemented in coin award logic

## 📝 Next Steps for New Chat

1. Open Shop.js and add frame/VIP tabs
2. Add frame preview and purchase UI
3. Add frame selection to ProfileSettings
4. Replace AvatarImage with AvatarWithFrame everywhere
5. Implement VIP coin bonuses in award function
6. Test everything!

See `AVATAR_FRAMES_VIP_IMPLEMENTATION.md` for full details.
