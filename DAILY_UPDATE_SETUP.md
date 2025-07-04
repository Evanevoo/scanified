# Daily "Days At Location" Update Setup

This guide explains how to set up automatic daily updates for the "Days At Location" field in your gas cylinder management system.

## What This Does

- **Automatically runs every day at 1:00 AM UTC** (regardless of whether anyone is using the website)
- **Increments the `days_at_location` field** for all bottles by 1
- **Prevents duplicate updates** on the same day using the `last_location_update` timestamp
- **Works even if no one opens the website** - it's a server-side scheduled job

## Setup Steps

### 1. Environment Variables

You need to add these environment variables in your **Netlify Dashboard**:

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add these variables:

```
VITE_SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

**Important:** You need the **Service Role Key** (not the anon key) because this function needs to update all bottles across all organizations.

### 2. Get Your Supabase Service Role Key

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **service_role** key (not the anon key)
4. Add it as `SUPABASE_SERVICE_ROLE_KEY` in Netlify

### 3. Deploy to Netlify

The scheduled function will be automatically deployed when you push to your main branch.

### 4. Verify It's Working

You can check if the function is working by:

1. **Check Netlify Function Logs:**
   - Go to your Netlify dashboard
   - Navigate to **Functions** tab
   - Look for `update-days-at-location` function
   - Check the logs after 1:00 AM UTC

2. **Check Your Database:**
   - Look at the `days_at_location` values in your bottles table
   - They should increment by 1 each day
   - Check the `last_location_update` field to see when it was last updated

## How It Works

1. **Daily at 1:00 AM UTC**, Netlify automatically triggers the `update-days-at-location` function
2. The function connects to your Supabase database using the service role key
3. It fetches all bottles that have a `days_at_location` value
4. For each bottle, it checks if it was already updated today
5. If not updated today, it increments `days_at_location` by 1 and sets `last_location_update` to today's date
6. The function logs the results for monitoring

## Troubleshooting

### Function Not Running
- Check that the environment variables are set correctly in Netlify
- Verify the Supabase service role key has the necessary permissions
- Check Netlify function logs for errors

### Bottles Not Updating
- Make sure bottles have a `days_at_location` value (not null)
- Check if the `last_location_update` column exists in your database
- The function has fallback logic if the column doesn't exist

### Wrong Time Zone
- The function runs at 1:00 AM UTC
- If you need a different time, modify the cron expression in `netlify.toml`:
  - `0 1 * * *` = 1:00 AM UTC daily
  - `0 6 * * *` = 6:00 AM UTC daily
  - `0 12 * * *` = 12:00 PM UTC daily

## Manual Testing

You can test the function manually by:

1. **Using Netlify CLI:**
   ```bash
   netlify functions:invoke update-days-at-location
   ```

2. **Check the logs:**
   ```bash
   netlify functions:logs
   ```

## Security

- The function only accepts scheduled events from AWS (Netlify's scheduler)
- It uses the Supabase service role key for database access
- No user authentication is required since it's a background job

## Cost

- Netlify scheduled functions are included in the free tier
- Each function execution typically costs less than $0.01
- Daily execution = ~$0.30/month 