# 🚀 Quick Backup Setup for scanified.netlify.app

## Your Backup Function URL

```
https://scanified.netlify.app/.netlify/functions/daily-tenant-backup
```

---

## ⚡ 5-Minute Setup with cron-job.org

### Step 1: Generate Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the generated secret.

### Step 2: Add Secret to Netlify
1. Go to [Netlify Dashboard](https://app.netlify.com) > Your Site > **Site settings** > **Environment variables**
2. Click **"Add variable"**
3. Key: `CRON_SECRET`
4. Value: Paste your generated secret
5. Click **"Save"**

### Step 3: Set Up cron-job.org
1. Go to [cron-job.org](https://cron-job.org) and sign up (free)
2. Click **"Create cronjob"**
3. Fill in:
   - **Title**: `Scanified Daily Backup`
   - **Address (URL)**: 
     ```
     https://scanified.netlify.app/.netlify/functions/daily-tenant-backup?secret=YOUR_SECRET_HERE
     ```
     (Replace `YOUR_SECRET_HERE` with the secret from Step 1)
   - **Schedule**: 
     - Execution: `Daily`
     - Time: `02:00`
     - Timezone: `UTC`
   - **Request Method**: `POST`
4. Click **"Create cronjob"**

### Step 4: Test It
1. Click **"Run now"** in cron-job.org to test
2. Check Netlify function logs to verify it worked
3. Check Supabase Storage > `backups` bucket for backup files

---

## ✅ Done!

Your backups will now run automatically every day at 2 AM UTC.

---

## 🔍 Verify Backups

1. **Check Netlify Logs:**
   - Netlify Dashboard > Functions > daily-tenant-backup > Logs

2. **Check Supabase Storage:**
   - Supabase Dashboard > Storage > `backups` bucket
   - Look for: `tenant-backups/{org_id}/{date}/`

3. **Check Backup History:**
   - Go to `/tenant-backup-restore` page in your app
   - View "Available Backups" and "Backup History"

---

## 🆘 Troubleshooting

**Backup not running?**
- Check cron-job.org logs
- Verify secret matches in both places
- Test manually: `curl -X POST "https://scanified.netlify.app/.netlify/functions/daily-tenant-backup?secret=YOUR_SECRET"`

**401 Unauthorized?**
- Make sure `CRON_SECRET` is set in Netlify
- Verify secret in URL matches Netlify secret

**Function timeout?**
- Netlify free plan has 10s timeout
- For large backups, consider upgrading or optimizing

---

**Need help?** See `FREE_PLAN_BACKUP_SETUP.md` for detailed instructions.

