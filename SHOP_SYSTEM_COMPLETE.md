# Shop System Implementation

## ✅ What's Been Added

### 1. **Database Tables**
- `shop_items` - Stores all purchasable items (titles, future items)
- `user_purchases` - Tracks what each user has purchased
- `profiles.equipped_title` - New column to store user's active title

### 2. **Database Functions**
- `purchase_shop_item()` - Handles complete purchase flow with coin deduction
- `equip_title()` - Equips a purchased title to user's profile
- `unequip_title()` - Removes equipped title

### 3. **Initial Shop Items (10 Titles)**
| Title | Price | Rarity | Description |
|-------|-------|--------|-------------|
| The Explorer | 100 | Common | For those who venture into the unknown |
| History Buff | 250 | Common | A student of the ages |
| Time Traveler | 500 | Rare | Across centuries and continents |
| The Archaeologist | 750 | Rare | Unearthing hidden truths |
| Master Detective | 1,000 | Rare | Piecing together the past |
| Master Cartographer | 1,500 | Epic | Mapping the world through time |
| Renaissance Mind | 2,000 | Epic | A scholar of many disciplines |
| Ancient Scholar | 2,500 | Epic | Keeper of forgotten knowledge |
| The Oracle | 3,500 | Legendary | Seer of past and present |
| Legendary Historian | 5,000 | Legendary | Master of all eras |

### 4. **UI Components**
- **Shop.js** - Complete shop interface with:
  - Coin balance display
  - Rarity-based item cards (Common, Rare, Epic, Legendary)
  - Purchase confirmation modal
  - Equip/unequip functionality
  - Success/error notifications
  
- **Main Menu** - Added gold "🪙 Shop" button

### 5. **Features**
- ✅ View all available shop items
- ✅ Purchase items with coins
- ✅ Equip/unequip titles
- ✅ Auto-equip first title purchased
- ✅ Visual feedback (notifications)
- ✅ Rarity-based styling with glowing effects
- ✅ Purchase confirmation modal
- ✅ Responsive design matching your game's aesthetic

## 🎨 Design Details

### Rarity Colors:
- **Common**: Gray (#9ca3af)
- **Rare**: Blue (#3b82f6)
- **Epic**: Purple (#a855f7)  
- **Legendary**: Gold (#eab308)

Each rarity has unique border colors and glow effects!

## 🔮 Future Expansion Ideas

The shop system is designed to be easily expandable. You can add:

1. **Map Themes** - Different visual styles for the map
2. **Pin Styles** - Custom pin designs (diamonds, stars, etc.)
3. **Profile Cosmetics** - Borders, backgrounds, avatars
4. **Power-ups** - Consumable items like:
   - Free clue unlock
   - Score multiplier (2x for one game)
   - Extra time for guesses
5. **Badges** - Purchasable achievement icons
6. **Emotes** - For live battles

## 📊 How to Add New Items

To add more items, use Supabase SQL editor:

```sql
INSERT INTO shop_items (id, name, description, category, price, rarity, sort_order) VALUES
  ('title_new_item', 'New Title Name', 'Cool description', 'title', 1500, 'epic', 11);
```

## 🎮 How It Works

1. **User earns coins** by playing games (endless, daily, challenges)
2. **User visits shop** and browses items
3. **User purchases item** → coins deducted, item added to inventory
4. **User equips title** → appears on their profile (ready for future display)
5. **Title displays** wherever you choose to show it (profile, leaderboard, etc.)

## 🔧 Next Steps (Optional Enhancements)

1. **Display equipped titles** on:
   - Profile pages
   - Leaderboards
   - Challenge screens
   - Live battle lobbies

2. **Add more categories**:
   - Uncomment category tabs in Shop.js
   - Add items with new categories to database

3. **Limited-time offers**:
   - Add `available_until` column to shop_items
   - Show "Limited Time!" badge

4. **Daily deals**:
   - Random item at 50% off each day

5. **Gift system**:
   - Allow users to gift shop items to friends

## 🎉 Your Shop is Live!

Users can now:
- Browse beautiful, rarity-tiered titles
- Purchase with their hard-earned coins
- Equip their favorite titles
- Work toward legendary status!

The shop matches your game's dark + gold aesthetic perfectly! 🌟
