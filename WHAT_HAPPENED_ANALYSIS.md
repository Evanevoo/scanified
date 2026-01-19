# What Happened - Bottle Status Issue Analysis

## Timeline of Events

1. **Initial Problem**: Bottles assigned to customers were showing as "available" instead of "rented"
2. **First Fix**: Created `fix-bottle-status.sql` to update assigned bottles from "available" to "rented", but **skipping customer-owned bottles**
3. **User Ran Optional Query**: The optional UPDATE query at the bottom of `fix-bottle-status.sql` (lines 44-47) was executed, which updated **ALL** assigned bottles to "rented" **regardless of ownership**
4. **Result**: 5,716 bottles were correctly updated to "rented", but **387 customer-owned bottles** were incorrectly updated to "rented" as well

## What Messed It Up

The optional UPDATE query in `fix-bottle-status.sql`:
```sql
UPDATE bottles
SET status = 'rented'
WHERE assigned_customer IS NOT NULL
  AND status = 'available';
```

This query **ignores the ownership check** and updates all assigned bottles, including customer-owned ones that should remain "available".

## Current Status

- **Database**: 6,103 bottles have status "rented" (should be 5,716)
  - 5,716 correctly rented
  - 387 incorrectly rented (customer-owned bottles)
- **Code**: Updated `Rentals.jsx` to exclude customer-owned bottles from rented count in statistics (this fixes the display)
- **Database Fix Needed**: Run `fix-customer-owned-bottles.sql` to correct the 387 bottles back to "available"

## Solution

### Option 1: Fix Database (Recommended)
Run `fix-customer-owned-bottles.sql` to set customer-owned bottles back to "available" status.

### Option 2: Keep Current Code Logic
The code changes already exclude customer-owned bottles from the rented count, so statistics will show correctly (5,716 rented), but the database will still have incorrect statuses for those 387 bottles.

## Check Last Backup

Run `check-last-backup.sql` to see when the last backup was created. If you have a backup from before running the optional UPDATE query, you can restore the bottles table from that backup.

## Prevention

In the future, be careful with "OPTIONAL" queries that bypass business logic checks. The main UPDATE query correctly excludes customer-owned bottles, but the optional one doesn't.
