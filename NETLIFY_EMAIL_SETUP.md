# Netlify Email Setup - Gmail Configuration

## Add These Environment Variables to Netlify

Go to **Netlify Dashboard → Site Settings → Environment Variables** and add:

```env
EMAIL_USER=Scanified@gmail.com
EMAIL_PASSWORD=Bugsbunny.7
EMAIL_FROM=Scanified@gmail.com
```

## ⚠️ Important: Gmail App Password Required

**For Gmail, you typically need an App Password, not your regular password.**

If `Bugsbunny.7` doesn't work, you'll need to generate a Gmail App Password:

### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Security → 2-Step Verification
3. Enable it if not already enabled

### Step 2: Generate App Password
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Security → 2-Step Verification → App passwords
3. Select "Mail" and your device
4. Click "Generate"
5. Copy the 16-character password (looks like: `abcd efgh ijkl mnop`)

### Step 3: Update Netlify
Replace `EMAIL_PASSWORD` with the generated App Password (remove spaces):
```env
EMAIL_PASSWORD=abcdefghijklmnop
```

## After Adding Variables

1. **Redeploy your site** (Netlify Dashboard → Deploys → Trigger deploy)
2. **Test the configuration:**
   - Visit: `https://www.scanified.com/.netlify/functions/test-email-config`
3. **Send a test invitation** from User Management page

## Troubleshooting

If emails still don't send:

1. **Check Netlify Function Logs:**
   - Netlify Dashboard → Functions → `send-email` → Logs
   - Look for authentication errors

2. **Common Gmail Errors:**
   - "Invalid login" → Need App Password
   - "Less secure app access" → Enable 2FA and use App Password
   - "Authentication failed" → Check password is correct

3. **Verify in Supabase:**
   - Make sure the same password works in Supabase Dashboard
   - If it works there but not in Netlify, try generating a new App Password
