# 🔧 Bottle Scans Fix Guide

## The Problem

When you scanned a bottle and submitted an order, then uploaded the invoice and approved it, the bottles were not showing up attached to the order in the verification page. 

### Root Cause

The issue was in the approval workflow in `src/pages/ImportApprovals.jsx`:

1. **Scanning Phase**: When bottles were scanned, the data was saved to TWO tables:
   - `bottle_scans` table (primary record)
   - `scans` table (backup/recovery)

2. **Approval Phase**: When the order was approved, the system:
   - Assigned bottles to customers (updated `bottles` table)
   - **DELETED all `bottle_scans` entries** to prevent duplicate orders from showing up

3. **Viewing Phase**: When viewing a verified order in the detail page:
   - Looked for bottles in `bottle_scans` table → **Empty** (deleted in step 2)
   - Also looked in `scans` table → **Should have data**

The deletion was intentional to prevent "orphaned" bottle_scans from showing up as new scanned-only orders in Import Approvals. However, this caused verified orders to not display any bottles.

## The Solution

### Changes Made

1. **Modified `src/pages/ImportApprovals.jsx`**:
   - Removed all logic that DELETES `bottle_scans` after approval
   - Updated comments to clarify that `bottle_scans` are kept for history/verification
   - The system now relies on the `scans` table status column to filter out approved orders

2. **Updated Mobile Apps** (`gas-cylinder-android` and `gas-cylinder-mobile`):
   - Updated comments to clarify that saving to `scans` table is critical for verified order display
   - Ensured `order_number` is properly saved (using `orderNumber || scanSessionId`)

3. **Created Diagnostic Tool** (`check-and-fix-bottle-scans.html`):
   - A standalone HTML tool to check if scans exist for an order
   - Can recreate missing `bottle_scans` from the `scans` table

## For Your Current Order

Since your order was already approved and the `bottle_scans` were deleted, you have two options:

### Option 1: Use the Diagnostic Tool (Recommended)

1. Open `check-and-fix-bottle-scans.html` in a web browser
2. Enter your Supabase credentials:
   - Supabase URL
   - Supabase Anon Key
   - Organization ID
   - Order Number
3. Click "Check Order" to see if scans exist
4. If scans are found in the `scans` table, click "Recreate Bottle Scans"

This will recreate the `bottle_scans` entries from the `scans` table, and the bottles will appear on the order detail page.

### Option 2: Unverify and Re-verify the Order

The `VerifiedOrders.jsx` page has logic to recreate `bottle_scans` when unverifying an order:

1. Go to **Verified Orders** page
2. Find your order
3. Click the "Unverify" button
4. Go to **Import Approvals** page
5. Find the order and approve it again

The unverify process will recreate the `bottle_scans` from the `scans` table.

## Verifying the Fix

After recreating the bottle_scans:

1. Go to **Verified Orders** page
2. Click "View Details" on your order
3. You should now see the bottles listed with their barcodes

The detail page (`ImportApprovalDetail.jsx`) checks BOTH `bottle_scans` and `scans` tables, so as long as the data exists in either table, it should display the bottles.

## For Future Orders

Going forward, all newly scanned and approved orders will keep their `bottle_scans` records. The bottles will be visible on verified orders without any manual intervention.

## Technical Details

### Database Tables Involved

1. **`bottle_scans`** (Primary bottle tracking):
   - `bottle_barcode`: The scanned barcode
   - `order_number`: The order number
   - `mode`: SHIP/RETURN
   - `product_code`: Product code for matching
   - `customer_name`: Customer name
   - `customer_id`: Customer ID
   - ❌ No `status` column (this is why they were deleted before)

2. **`scans`** (Backup/recovery):
   - `barcode_number`: The scanned barcode
   - `order_number`: The order number
   - `mode`: SHIP/RETURN
   - `product_code`: Product code for matching
   - `customer_name`: Customer name
   - `customer_id`: Customer ID
   - ✅ Has `status` column (`pending`, `approved`, `verified`)

3. **`bottles`** (Master bottle inventory):
   - `barcode_number`: Unique bottle identifier
   - `assigned_customer`: Customer the bottle is assigned to
   - `customer_name`: Customer name
   - `status`: Current status (RENTED, available, etc.)

### Flow Diagram

```
Mobile Scan → Save to bottle_scans + scans tables
                           ↓
               Submit Order (via mobile)
                           ↓
         Upload Invoice (via web portal)
                           ↓
        Approve Order (via Import Approvals)
                           ↓
          Assign Bottles to Customer
          (Update bottles table)
                           ↓
          Update scans.status = 'approved'
                           ↓
        ✅ Keep bottle_scans (NEW BEHAVIOR)
        ❌ Delete bottle_scans (OLD BEHAVIOR)
                           ↓
         View Verified Order Detail Page
                           ↓
      Fetch from bottle_scans + scans tables
                           ↓
              Display Bottles ✅
```

## Troubleshooting

### "No scans found for this order"

This means the scans weren't saved to the database during scanning. Check:

1. **Order Number Match**: Make sure the order number in the mobile app matches the one in the invoice
2. **Network Connection**: Ensure the mobile device had network connectivity during scanning
3. **Supabase Logs**: Check the mobile app logs for any errors during scanning

### "Scans found but bottles not showing"

This could be a normalized order number mismatch. The system normalizes order numbers by removing leading zeros. For example:

- Order "00123" is normalized to "123"
- Order "00123" should match with "123" in the database

If this is the issue, manually recreate the bottle_scans using the diagnostic tool.

### "Bottle scans exist but bottles still not visible"

Check the order detail page (`ImportApprovalDetail.jsx`). It might be:

1. A caching issue - try refreshing the page
2. The bottles don't exist in the `bottles` table
3. The `bottle_barcode` in `bottle_scans` doesn't match `barcode_number` in `bottles`

## Questions?

If you continue to have issues:

1. Check browser console logs for errors
2. Check Supabase logs for database errors
3. Verify the data exists in the tables using the diagnostic tool
4. Contact support with the order number and error details

