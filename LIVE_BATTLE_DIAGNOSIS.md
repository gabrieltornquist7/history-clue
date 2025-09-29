# Live Battle Connection Issues - Diagnosis Complete

## 🚨 **IMMEDIATE ACTION REQUIRED**

The live battle system has been set up with diagnostic tools. Follow these steps to identify and fix the connection issues:

---

## **Step 1: Run SQL Tests in Supabase**

Copy and paste this script in your **Supabase SQL Editor**:

```sql
-- RLS Test Script for Battles Table
SELECT 'Testing SELECT on waiting battles...' as test_step;
SELECT id, invite_code, status, player1, player2
FROM battles
WHERE status = 'waiting'
LIMIT 5;

SELECT 'Checking current user ID...' as test_step;
SELECT auth.uid() as your_user_id;

SELECT 'Creating test battle...' as test_step;
INSERT INTO battles (player1, invite_code, status, created_at)
VALUES (auth.uid(), 'TEST99', 'waiting', NOW())
RETURNING *;

SELECT 'Finding test battle by invite code...' as test_step;
SELECT * FROM battles WHERE invite_code = 'TEST99' AND status = 'waiting';

SELECT 'Attempting to join test battle...' as test_step;
UPDATE battles
SET player2 = auth.uid(), status = 'active'
WHERE invite_code = 'TEST99' AND status = 'waiting'
RETURNING *;

SELECT 'Cleaning up test data...' as test_step;
DELETE FROM battles WHERE invite_code = 'TEST99';

SELECT 'Testing current RLS policies...' as test_step;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'battles';
```

**Expected Results:**
- ✅ Should see your user ID
- ✅ Should create test battle successfully
- ✅ Should find test battle by code
- ❌ JOIN might fail (this is the likely issue)

---

## **Step 2: Fix RLS Policies (If Tests Fail)**

If Step 1 shows errors, run this fix script in Supabase SQL Editor:

```sql
-- Drop the complex existing policy
DROP POLICY IF EXISTS "Users can access their battles and open invites" ON battles;

-- Create simple, separate policies
CREATE POLICY "battles_select_simple"
ON battles FOR SELECT
TO authenticated
USING (
    status = 'waiting'
    OR auth.uid() = player1
    OR auth.uid() = player2
);

CREATE POLICY "battles_insert_simple"
ON battles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = player1);

CREATE POLICY "battles_update_simple"
ON battles FOR UPDATE
TO authenticated
USING (
    auth.uid() = player1
    OR auth.uid() = player2
    OR (status = 'waiting' AND player2 IS NULL)
)
WITH CHECK (
    auth.uid() = player1 OR auth.uid() = player2
);

CREATE POLICY "battles_delete_simple"
ON battles FOR DELETE
TO authenticated
USING (auth.uid() = player1);
```

---

## **Step 3: Test Live Battle Debug Mode**

The application is now running in **debug mode**:

1. **Start the application**: `npm run dev`
2. **Navigate to Live Battle** (it will load the debug interface)
3. **Click "Test Database Access"** - This will show all database permissions
4. **Try "Create Battle"** - Should generate a code
5. **Try "Join Battle"** with the generated code - This will test the join flow

**Debug Interface Shows:**
- ✅ Authentication status
- ✅ Database query results
- ✅ Real-time subscription status
- ✅ Detailed error messages
- ✅ Step-by-step logging

---

## **Step 4: Analyze Debug Results**

### **Successful Flow Should Show:**
```
[TIME] Component mounted { propUser: "uuid...", authUser: "uuid...", matching: true }
[TIME] Creating battle...
[TIME] Generated code ABC123
[TIME] Battle created { id: "...", invite_code: "ABC123", status: "waiting" }
[TIME] Subscription status SUBSCRIBED
```

### **Common Failure Patterns:**

#### **🔴 RLS Policy Error:**
```
[TIME] CREATE ERROR { code: "42501", message: "new row violates row-level security policy" }
```
**Fix:** Run the RLS policy fix script from Step 2

#### **🔴 Authentication Error:**
```
[TIME] Component mounted { propUser: undefined, authUser: "uuid...", matching: false }
```
**Fix:** Session prop not passed correctly

#### **🔴 Battle Not Found Error:**
```
[TIME] FIND ERROR { code: "PGRST116", message: "The result contains 0 rows" }
```
**Fix:** RLS policy prevents seeing waiting battles

#### **🔴 Join Permission Error:**
```
[TIME] UPDATE ERROR { code: "42501", message: "new row violates row-level security policy" }
```
**Fix:** RLS policy prevents joining battles

---

## **Step 5: Restore Normal Mode**

After debugging, restore the normal LiveBattleView:

1. **Edit** `app/page.js`
2. **Change line 33** from:
   ```javascript
   const LiveBattleView = lazy(() => import("../components/LiveBattleViewDebug"));
   ```
   To:
   ```javascript
   const LiveBattleView = lazy(() => import("../components/LiveBattleView"));
   ```

---

## **Files Created for Diagnosis:**

| File | Purpose |
|------|---------|
| `LiveBattleViewDebug.js` | Debug interface with detailed logging |
| `rls_test_battles.sql` | SQL tests for RLS policies |
| `rls_fix_simple.sql` | Simplified RLS policy fixes |
| `LIVE_BATTLE_DIAGNOSIS.md` | This instruction file |

---

## **Most Likely Issues & Solutions:**

### **Issue #1: Complex RLS Policy** ⭐ **MOST LIKELY**
- **Problem:** The existing RLS policy has complex `WITH CHECK` logic
- **Solution:** Replace with simple, separate policies
- **Fix:** Run `rls_fix_simple.sql`

### **Issue #2: Missing SELECT Policy for Waiting Battles**
- **Problem:** Players can't see waiting battles to join them
- **Solution:** Add policy allowing `status = 'waiting'` reads
- **Fix:** Included in simple policy fix

### **Issue #3: Session Authentication Issues**
- **Problem:** User session not properly passed to components
- **Solution:** Check session prop in debug interface
- **Fix:** Verify authentication flow

---

## **Testing Protocol:**

1. ✅ **Database Access Test** - Test basic database permissions
2. ✅ **Create Battle Test** - Test battle creation and code generation
3. ✅ **Find Battle Test** - Test finding battles by invite code
4. ✅ **Join Battle Test** - Test updating battle to add player2
5. ✅ **Realtime Test** - Test realtime subscriptions and updates

---

## **Success Criteria:**

- ✅ Debug interface shows no database errors
- ✅ Battle creation generates valid invite codes
- ✅ Players can find waiting battles by code
- ✅ Players can successfully join battles
- ✅ Realtime updates work on both devices
- ✅ No "Cannot read properties of null" errors

Follow these steps in order, and the debug interface will show you exactly where the connection issues are occurring.