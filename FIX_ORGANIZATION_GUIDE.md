# Fix Organization and Scans Issue - Complete Guide

## Problem Summary

Your scans are under a **deleted organization** (`f98daa10-2884-49b9-a6a6-9725e27e7696`), and order 66666 has 15 scans without order numbers. This prevents bottles from appearing on verified orders.

## Solution Overview

1. **Update user profiles** to point to the active organization
2. **Migrate scans** from deleted organization to active organization  
3. **Update order numbers** on the 15 scans
4. **Recreate bottle_scans** from the updated scans

---

## Step 1: Run SQL Fix (Database Migration)

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Open the file `fix-organization-scans.sql` (created in this directory)
5. **First, run Steps 1 and 2** to review the current state:
   ```sql
   -- Run the SELECT queries to see affected users and scans
   ```
6. **Review the output** to confirm which users and scans will be affected
7. **Uncomment and run Steps 3 and 4** to execute the migration:
   ```sql
   -- Uncomment the UPDATE statements
   UPDATE profiles
   SET organization_id = 'e215231c-326f-4382-93ce-95406ca2e54d'
   WHERE organization_id = 'f98daa10-2884-49b9-a6a6-9725e27e7696';
   
   UPDATE scans
   SET organization_id = 'e215231c-326f-4382-93ce-95406ca2e54d'
   WHERE organization_id = 'f98daa10-2884-49b9-a6a6-9725e27e7696';
   
   UPDATE bottle_scans
   SET organization_id = 'e215231c-326f-4382-93ce-95406ca2e54d'
   WHERE organization_id = 'f98daa10-2884-49b9-a6a6-9725e27e7696';
   ```
8. **Run Step 5** to verify the migration was successful

### Option B: Using the Diagnostic Tool

If you prefer not to run SQL directly, you can use the web interface:

1. Open `check-and-fix-bottle-scans.html` in your browser
2. Make sure you're logged into your web app in the same browser
3. Click **"📱 Check Mobile App User"** to see which organization your user is assigned to
4. If it shows the deleted organization, you'll need to update it manually via SQL (use Option A)

---

## Step 2: Update Order Numbers (Using Diagnostic Tool)

After migrating scans to the active organization:

1. Open `check-and-fix-bottle-scans.html` in your browser
2. Enter Organization ID: `e215231c-326f-4382-93ce-95406ca2e54d` (active org)
3. Click **"Auto-Detect Organization ID"** to confirm
4. Click **"Search All Recent Scans"**
5. You should see the 15 scans that were previously without order numbers
6. Enter Order Number: `66666`
7. Click **"✏️ Update Order Numbers"**
8. The tool will:
   - Update all 15 scans to have order number 66666
   - Automatically recreate bottle_scans entries
   - Show a success message

---

## Step 3: Verify the Fix

### Check Order Detail Page

1. Navigate to: `http://localhost:5174/import-approval/644/detail?customer=N%2FA&order=66666`
2. You should now see all 15 bottles displayed
3. Verify the bottles match what you scanned

### Check Verified Orders Page

1. Navigate to: `http://localhost:5174/verified-orders`
2. Find order 66666
3. Verify it shows the correct number of bottles

---

## Step 4: Prevent Future Issues

The following fixes have already been implemented in the mobile app code:

✅ **Deleted organizations are blocked** - Users cannot load deleted organizations  
✅ **Scanning is blocked** - Users with deleted organizations see an error  
✅ **Save is blocked** - Scans cannot be saved to deleted organizations  

**Action Required:**
- Have all users **log out and log back in** to the mobile app
- This will apply the new validation checks
- Users with deleted organizations will see: *"Your organization has been deleted. Please contact your administrator."*

---

## Troubleshooting

### Issue: User profile still points to deleted organization

**Solution:** Run the SQL update in Step 1, Option A (Steps 3)

### Issue: Scans still under deleted organization after migration

**Solution:** Run the SQL update for scans table in Step 1, Option A (Steps 4)

### Issue: Diagnostic tool doesn't find scans

**Solution:** 
1. Make sure you're using the active organization ID: `e215231c-326f-4382-93ce-95406ca2e54d`
2. Click "List All Organizations" to verify organization status
3. Run the SQL migration first (Step 1)

### Issue: Order detail page still shows 0 bottles

**Solution:**
1. Check that order numbers were updated (Step 2)
2. Use diagnostic tool to manually recreate bottle_scans
3. Clear browser cache and refresh

---

## Summary of Changes

### Database Changes (SQL Script)
- ✅ Update user profiles → active organization
- ✅ Migrate scans → active organization
- ✅ Migrate bottle_scans → active organization

### Code Changes (Already Applied)
- ✅ `useAuth.ts` - Block deleted organizations from loading
- ✅ `EnhancedScanScreen.tsx` - Block scanning for deleted organizations
- ✅ Both check `deleted_at` field before allowing operations

### Manual Steps (Diagnostic Tool)
- ✅ Update order numbers on scans
- ✅ Recreate bottle_scans entries
- ✅ Verify data on web app

---

## Questions?

If you encounter any issues:
1. Check the browser console for errors
2. Check mobile app logs for errors
3. Verify organization IDs are correct
4. Ensure SQL updates were successful
5. Ask for help with specific error messages

---

## Quick Reference

**Active Organization ID:** `e215231c-326f-4382-93ce-95406ca2e54d`  
**Deleted Organization ID:** `f98daa10-2884-49b9-a6a6-9725e27e7696`  
**Order Number:** `66666`  
**Number of Scans:** 15  

**Files:**
- SQL Script: `fix-organization-scans.sql`
- Diagnostic Tool: `check-and-fix-bottle-scans.html`
- This Guide: `FIX_ORGANIZATION_GUIDE.md`

