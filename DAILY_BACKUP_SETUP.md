# Daily Backup System Setup Guide

This guide explains how to set up automated daily backups for the Gas Cylinder Management App.

## Overview

The daily backup system automatically backs up all critical database tables every day and stores them in Supabase Storage. Backups are retained for 30 days.

## Components

1. **Netlify Function**: `netlify/functions/daily-backup.js` - Executes the backup process
2. **Database Table**: `backup_logs` - Tracks backup operations and status
3. **Storage Bucket**: `backups` - Stores backup files in Supabase Storage

## Setup Instructions

### Step 1: Create the Backup Logs Table

Run the migration file to create the `backup_logs` table:

```sql
-- Run this in Supabase SQL Editor
-- File: supabase/migrations/create_backup_logs_table.sql
```

Or use the Supabase CLI:
```bash
supabase db push
```

### Step 2: Create Supabase Storage Bucket

1. Go to Supabase Dashboard > Storage
2. Click "New bucket"
3. Name: `backups`
4. **Important**: Set to **Private** (not public)
5. Click "Create bucket"

### Step 3: Set Up Netlify Scheduled Function

#### Option A: Using Netlify Dashboard (Recommended)

1. Go to your Netlify site dashboard
2. Navigate to **Functions** > **Scheduled Functions**
3. Click **Add scheduled function**
4. Configure:
   - **Function**: `daily-backup`
   - **Schedule**: `0 2 * * *` (runs daily at 2 AM UTC)
   - **Timezone**: UTC (or your preferred timezone)
5. Click **Save**

#### Option B: Using netlify.toml (Alternative)

Add to your `netlify.toml`:

```toml
[[plugins]]
  package = "@netlify/plugin-scheduled-functions"

[[scheduled_functions]]
  function = "daily-backup"
  schedule = "0 2 * * *"  # Daily at 2 AM UTC
```

### Step 4: Configure Environment Variables

In Netlify Dashboard > Site settings > Environment variables, ensure you have:

- `VITE_SUPABASE_URL` or `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)
- `CRON_SECRET` - A secure random string for authenticating scheduled function calls

To generate a secure CRON_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 5: Test the Backup Function

You can test the backup function manually:

```bash
# Using curl
curl -X POST https://your-site.netlify.app/.netlify/functions/daily-backup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Or trigger from Netlify Dashboard > Functions > daily-backup > Trigger
```

## What Gets Backed Up

The following tables are backed up daily:

- **Core Data**: organizations, profiles, customers, bottles
- **Operations**: rentals, deliveries, invoices, invoice_line_items
- **System**: notifications, audit_logs, support_tickets, support_ticket_messages
- **Configuration**: locations, gas_types, owners, subscription_plans
- **Tracking**: cylinder_fills, bottle_scans, user_invites
- **Management**: ownership_values, roles, permissions, organization_join_codes
- **Support**: customer_support, verification_requests, verified_orders

## Backup Storage Structure

Backups are stored in Supabase Storage with the following structure:

```
backups/
  └── YYYY-MM-DD/
      ├── organizations-2024-01-15T02-00-00-000Z.json
      ├── profiles-2024-01-15T02-00-00-000Z.json
      ├── customers-2024-01-15T02-00-00-000Z.json
      └── ...
```

## Monitoring Backups

### View Backup Logs

Query the `backup_logs` table:

```sql
-- Recent backups
SELECT * FROM backup_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- Failed backups
SELECT * FROM backup_logs 
WHERE status = 'failed' 
ORDER BY created_at DESC;

-- Backup statistics
SELECT 
  backup_type,
  status,
  COUNT(*) as count,
  AVG(records_backed_up) as avg_records,
  AVG(backup_size) as avg_size_bytes
FROM backup_logs
GROUP BY backup_type, status;
```

### Check Backup Status in App

You can create an admin dashboard page to view backup status by querying the `backup_logs` table.

## Backup Retention

- Backups are automatically retained for **30 days**
- Older backups are cleaned up during the daily backup process
- You can adjust retention in `netlify/functions/daily-backup.js`:

```javascript
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); // Change 30 to desired days
```

## Restoring from Backup

To restore data from a backup:

1. Go to Supabase Dashboard > Storage > backups
2. Navigate to the date folder (e.g., `2024-01-15`)
3. Download the JSON file for the table you want to restore
4. Use the Supabase SQL Editor or API to restore the data

Example restore script:
```javascript
const backupData = JSON.parse(fs.readFileSync('backup-file.json', 'utf8'));
const { error } = await supabase
  .from(backupData.table)
  .upsert(backupData.data, { onConflict: 'id' });
```

## Troubleshooting

### Backup Function Not Running

1. Check Netlify function logs: Dashboard > Functions > daily-backup > Logs
2. Verify the scheduled function is enabled in Netlify Dashboard
3. Check that `CRON_SECRET` environment variable is set correctly

### Storage Errors

1. Verify the `backups` bucket exists in Supabase Storage
2. Check that the service role key has storage write permissions
3. Ensure the bucket is not full (check storage quota)

### Database Errors

1. Verify all tables exist in your database
2. Check that the service role key has read permissions on all tables
3. Review error logs in the `backup_logs.errors` column

## Manual Backup

You can also trigger a manual backup by calling the function:

```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/daily-backup \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

## Security Notes

- The `backups` storage bucket should be **private** (not public)
- Only the service role key should have write access
- The `CRON_SECRET` should be kept secure and never committed to git
- Backup files contain sensitive data and should be encrypted at rest (Supabase handles this)

## Next Steps

1. Set up monitoring/alerting for failed backups
2. Consider adding email notifications for backup failures
3. Implement backup verification/validation
4. Set up off-site backup replication (optional)

