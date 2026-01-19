# 🔄 Daily Backup Setup for Netlify Free Plan

Since Netlify's free plan doesn't support scheduled functions, we'll use **external cron services** to trigger the backup function daily.

## ✅ Solution: External Cron Service

Use a free external cron service to call your backup function daily.

---

## Option 1: cron-job.org (Recommended - Free)

### Step 1: Sign Up
1. Go to [https://cron-job.org](https://cron-job.org)
2. Create a free account
3. Verify your email

### Step 2: Create Cron Job
1. Click **"Create cronjob"**
2. Configure:
   - **Title**: `Daily Tenant Backup`
   - **Address (URL)**: 
     ```
     https://scanified.netlify.app/.netlify/functions/daily-tenant-backup?secret=YOUR_SECRET_HERE
     ```
   - **Schedule**: 
     - **Execution**: `Daily`
     - **Time**: `02:00` (2 AM)
     - **Timezone**: `UTC`
   - **Request Method**: `POST`
   - **Request Body**: Leave empty
   - **Request Headers**: Leave empty (secret is in URL)
3. Click **"Create cronjob"**

### Step 3: Set Up Secret
1. In Netlify Dashboard > Environment Variables
2. Add: `CRON_SECRET` = `your-random-secret-string`
3. Generate a secure secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. Use this secret in your cron-job.org URL

---

## Option 2: EasyCron (Free Tier Available)

### Step 1: Sign Up
1. Go to [https://www.easycron.com](https://www.easycron.com)
2. Create a free account (limited to 1 job on free plan)

### Step 2: Create Cron Job
1. Click **"Add Cron Job"**
2. Configure:
   - **Cron Job Title**: `Daily Tenant Backup`
   - **URL**: 
     ```
     https://scanified.netlify.app/.netlify/functions/daily-tenant-backup?secret=YOUR_SECRET_HERE
     ```
   - **Schedule**: `0 2 * * *` (daily at 2 AM UTC)
   - **HTTP Method**: `POST`
   - **HTTP Auth**: None
3. Click **"Save"**

---

## Option 3: GitHub Actions (If Using GitHub)

If your code is on GitHub, you can use GitHub Actions (free for public repos).

### Step 1: Create Workflow File

Create `.github/workflows/daily-backup.yml`:

```yaml
name: Daily Tenant Backup

on:
  schedule:
    # Runs daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Allows manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Backup
        run: |
          curl -X POST \
            "https://scanified.netlify.app/.netlify/functions/daily-tenant-backup?secret=${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

### Step 2: Add Secret to GitHub
1. Go to your repository > **Settings** > **Secrets and variables** > **Actions**
2. Click **"New repository secret"**
3. Name: `CRON_SECRET`
4. Value: Your secret (same as Netlify)
5. Click **"Add secret"**

---

## Option 4: Supabase Edge Functions + pg_cron

If you prefer to keep everything in Supabase:

### Step 1: Create Edge Function

Create `supabase/functions/daily-backup/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  // Call Netlify function
  const response = await fetch(
    'https://scanified.netlify.app/.netlify/functions/daily-tenant-backup?secret=YOUR_SECRET',
    { method: 'POST' }
  )
  
  return new Response(JSON.stringify(await response.json()), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### Step 2: Set Up pg_cron

Run in Supabase SQL Editor:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily backup
SELECT cron.schedule(
  'daily-tenant-backup',
  '0 2 * * *', -- Daily at 2 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://scanified.netlify.app/.netlify/functions/daily-tenant-backup',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := json_build_object('secret', 'YOUR_SECRET')::text
  ) AS request_id;
  $$
);
```

**Note:** pg_cron requires Supabase Pro plan or self-hosted.

---

## 🔐 Security Setup

### Generate Secret

```bash
# Generate a secure random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Set in Netlify

1. Go to **Netlify Dashboard** > **Site settings** > **Environment variables**
2. Add: `CRON_SECRET` = `your-generated-secret`
3. Redeploy your site

### Use in Cron Service

Add the secret to your cron job URL:
```
https://scanified.netlify.app/.netlify/functions/daily-tenant-backup?secret=YOUR_SECRET
```

---

## ✅ Testing

### Test Manually

1. **Via Browser:**
   ```
   https://scanified.netlify.app/.netlify/functions/daily-tenant-backup?secret=YOUR_SECRET
   ```

2. **Via curl:**
   ```bash
   curl -X POST "https://scanified.netlify.app/.netlify/functions/daily-tenant-backup?secret=YOUR_SECRET"
   ```

3. **Via UI:**
   - Go to `/tenant-backup-restore` page
   - Click **"Create Manual Backup"**

### Verify Backup

1. Check Netlify function logs
2. Check Supabase Storage > `backups` bucket
3. Check `backup_logs` table in Supabase

---

## 📋 Quick Setup Checklist

- [ ] Create `backups` storage bucket in Supabase (Private)
- [ ] Generate `CRON_SECRET` and add to Netlify environment variables
- [ ] Choose external cron service (cron-job.org recommended)
- [ ] Create cron job pointing to your function URL
- [ ] Test backup manually
- [ ] Verify backup appears in storage
- [ ] Monitor first scheduled run

---

## 🆓 Free Services Comparison

| Service | Free Tier | Limits | Best For |
|---------|-----------|--------|----------|
| **cron-job.org** | ✅ Yes | 2 jobs | Simple setup |
| **EasyCron** | ✅ Yes | 1 job | Basic needs |
| **GitHub Actions** | ✅ Yes | 2000 min/month | GitHub users |
| **Supabase pg_cron** | ❌ No | Pro plan | Supabase users |

---

## 🔧 Troubleshooting

### Backup Not Running

1. **Check cron service logs** - Verify job is executing
2. **Check Netlify function logs** - Look for errors
3. **Verify secret** - Make sure secret matches
4. **Test manually** - Use curl or browser to test

### 401 Unauthorized

- Verify `CRON_SECRET` is set in Netlify
- Check secret in cron job URL matches
- Try without secret first (if not set) for testing

### Function Timeout

- Netlify free plan has 10s timeout
- For large backups, consider:
  - Backing up fewer tables per run
  - Using Supabase Edge Functions instead
  - Upgrading to paid plan

---

## 📚 Additional Resources

- [cron-job.org Documentation](https://cron-job.org/en/help/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)

---

**Recommended:** Use **cron-job.org** for the simplest free solution.

**Last Updated:** January 2025

