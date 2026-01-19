# 🔄 Tenant Backup & Restore System Setup Guide

## Overview

This system provides **daily automated backups** and **restore capabilities** for each tenant (organization) in your multi-tenant application. Each tenant's data is backed up separately, allowing for granular restore operations.

## Features

✅ **Daily Automated Backups** - Runs automatically at 2 AM UTC  
✅ **Per-Tenant Backups** - Each organization's data backed up separately  
✅ **Manual Backup Trigger** - Create backups on-demand  
✅ **Restore Functionality** - Restore tenant data from any backup date  
✅ **Dry Run Validation** - Test restores before executing  
✅ **Backup History** - Track all backup and restore operations  
✅ **30-Day Retention** - Backups automatically cleaned up after 30 days  

---

## Setup Instructions

### Step 1: Create Supabase Storage Bucket

1. Go to **Supabase Dashboard** > **Storage**
2. Click **"New bucket"**
3. Name: `backups`
4. **Important**: Set to **Private** (not public)
5. Click **"Create bucket"**

### Step 2: Set Up Daily Backup Trigger

**⚠️ Note:** Netlify free plan doesn't support scheduled functions. Use one of these alternatives:

#### Option A: External Cron Service (Recommended for Free Plan)
See `FREE_PLAN_BACKUP_SETUP.md` for detailed instructions using:
- cron-job.org (free, recommended)
- EasyCron (free tier)
- GitHub Actions (if using GitHub)
- Or other free cron services

#### Option B: Netlify Scheduled Functions (Paid Plans Only)
If you have a paid Netlify plan:
1. Go to **Netlify Dashboard** > **Functions** > **Scheduled Functions**
2. Click **"Add scheduled function"**
3. Configure:
   - **Function**: `daily-tenant-backup`
   - **Schedule**: `0 2 * * *` (runs daily at 2 AM UTC)
   - **Timezone**: UTC
4. Click **"Save"**

### Step 3: Configure Environment Variables

In **Netlify Dashboard** > **Site settings** > **Environment variables**, ensure you have:

- `VITE_SUPABASE_URL` or `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)
- `CRON_SECRET` - A secure random string for authenticating backup function calls (optional but recommended)

**Generate CRON_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Note:** If using external cron service, add the secret to your cron job URL as a query parameter.

### Step 4: Add Route to Your App

Add the backup/restore page to your routing:

```javascript
// In src/App.jsx or your router file
import TenantBackupRestore from './pages/TenantBackupRestore';

// Add route (admin/owner only):
<Route 
  path="/tenant-backup-restore" 
  element={
    <RoleProtectedRoute allowedRoles={['admin', 'owner']}>
      <TenantBackupRestore />
    </RoleProtectedRoute>
  } 
/>
```

---

## What Gets Backed Up

### Tenant-Specific Tables (filtered by organization_id):
- `organizations` - Organization settings
- `profiles` - User accounts
- `customers` - Customer records
- `bottles` - Asset inventory
- `rentals` - Rental agreements
- `rental_invoices` - Invoice records
- `invoice_line_items` - Invoice line items
- `deliveries` - Delivery records
- `notifications` - User notifications
- `audit_logs` - System audit logs
- `support_tickets` - Support tickets
- `support_ticket_messages` - Support messages
- `locations` - Location data
- `gas_types` - Gas type configurations
- `cylinder_fills` - Fill records
- `bottle_scans` - Scan records
- `user_invites` - User invitations
- `ownership_values` - Ownership data
- `organization_join_codes` - Join codes
- `customer_support` - Customer support records
- `verification_requests` - Verification requests
- `verified_orders` - Verified orders
- `sales_orders` - Sales orders
- `sales_order_items` - Sales order items

---

## Backup Storage Structure

Backups are stored in Supabase Storage with the following structure:

```
backups/
  └── tenant-backups/
      └── {organization_id}/
          └── YYYY-MM-DD/
              ├── summary-{timestamp}.json
              ├── organizations-{timestamp}.json
              ├── profiles-{timestamp}.json
              ├── customers-{timestamp}.json
              ├── bottles-{timestamp}.json
              └── ... (one file per table)
```

---

## Using the Backup & Restore System

### Creating a Manual Backup

1. Navigate to **Tenant Backup & Restore** page (admin/owner only)
2. Click **"Create Manual Backup"**
3. Wait for backup to complete
4. Backup will appear in **Available Backups** list

### Restoring Tenant Data

⚠️ **WARNING**: Restoring will replace all current data with backup data. This cannot be undone!

1. Navigate to **Tenant Backup & Restore** page
2. Find the backup date you want to restore from
3. Click **"Restore"** button next to the backup date
4. **IMPORTANT**: Enable **"Dry Run"** first to validate the backup
5. Click **"Validate Backup"** to test
6. Review the results
7. If validation succeeds, disable **"Dry Run"** and click **"Restore Data"**
8. Wait for restore to complete
9. System will reload automatically

### Dry Run (Recommended)

Always run a dry run first:
- Validates backup integrity
- Shows what would be restored
- Does not modify any data
- Safe to run multiple times

---

## API Endpoints

### Daily Tenant Backup

**Endpoint:** `/.netlify/functions/daily-tenant-backup`

**Method:** POST

**Headers:**
```
Authorization: Bearer {CRON_SECRET}
```

**Response:**
```json
{
  "success": true,
  "message": "Daily tenant backup completed successfully",
  "summary": {
    "total_tenants": 5,
    "successful_tenants": 5,
    "failed_tenants": 0,
    "total_records": 12345,
    "total_size": "12.34 MB"
  }
}
```

### Restore Tenant Data

**Endpoint:** `/.netlify/functions/restore-tenant-data`

**Method:** POST

**Headers:**
```
Authorization: Bearer {CRON_SECRET}
Content-Type: application/json
```

**Body:**
```json
{
  "organization_id": "uuid-here",
  "backup_date": "2025-01-15",
  "dry_run": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Dry run completed. Would restore 12345 records.",
  "summary": {
    "organization_id": "uuid-here",
    "organization_name": "Company Name",
    "backup_date": "2025-01-15",
    "total_tables": 20,
    "total_records_restored": 12345,
    "errors": 0
  },
  "tables": {
    "customers": {
      "success": true,
      "record_count": 500,
      "restored": 500
    }
  }
}
```

---

## Setting Up Daily Backups (Free Plan)

**Since Netlify free plan doesn't support scheduled functions**, you need to use an external service.

### Quick Setup with cron-job.org (Recommended)

1. **Sign up** at [cron-job.org](https://cron-job.org) (free)
2. **Create cronjob:**
   - URL: `https://scanified.netlify.app/.netlify/functions/daily-tenant-backup?secret=YOUR_SECRET`
   - Schedule: Daily at 2:00 AM UTC
   - Method: POST
3. **Done!** Backups will run daily

See `FREE_PLAN_BACKUP_SETUP.md` for detailed instructions and other options.

---

## Monitoring Backups

### View Backup Logs

Query the `backup_logs` table:

```sql
-- Recent tenant backups
SELECT * FROM backup_logs 
WHERE backup_type = 'daily_tenant'
ORDER BY created_at DESC 
LIMIT 10;

-- Failed backups
SELECT * FROM backup_logs 
WHERE status = 'failed' 
ORDER BY created_at DESC;

-- Restore operations
SELECT * FROM backup_logs 
WHERE backup_type = 'restore'
ORDER BY created_at DESC;
```

### Check Backup Status in UI

1. Navigate to **Tenant Backup & Restore** page
2. View **Available Backups** table
3. View **Backup History** table

---

## Troubleshooting

### Backup Fails

**Issue:** Backup function returns error

**Solutions:**
1. Check Netlify function logs
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
3. Ensure `backups` storage bucket exists and is accessible
4. Check that `backup_logs` table exists

### Restore Fails

**Issue:** Restore operation fails

**Solutions:**
1. Always run dry run first
2. Verify backup date exists
3. Check that organization_id is correct
4. Review error messages in response
5. Check function logs for details

### No Backups Available

**Issue:** Available backups list is empty

**Solutions:**
1. Verify scheduled function is running
2. Check function logs for errors
3. Manually trigger a backup
4. Verify storage bucket permissions

---

## Security Considerations

✅ **Service Role Key**: Only used in serverless functions (never exposed to client)  
✅ **Private Storage**: Backups stored in private bucket  
✅ **RLS Protection**: All queries respect Row Level Security  
✅ **Authorization**: Restore requires admin/owner role  
✅ **Dry Run**: Validation before actual restore  

---

## Best Practices

1. **Test Regularly**: Run dry runs periodically to validate backups
2. **Monitor Logs**: Check backup logs weekly for failures
3. **Document Restores**: Keep notes on when/why restores were performed
4. **Multiple Backups**: Keep backups from multiple dates
5. **Test Restores**: Periodically test restore process in staging environment

---

## Backup Retention

- **Retention Period**: 30 days
- **Cleanup**: Automatic (handled by backup function)
- **Manual Cleanup**: Can be triggered via function if needed

---

## Support

For issues or questions:
1. Check function logs in Netlify Dashboard
2. Review backup_logs table in Supabase
3. Test with dry run first
4. Contact support if issues persist

---

**Last Updated:** January 2025

