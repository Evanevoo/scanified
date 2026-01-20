# Update Netlify EMAIL_PASSWORD

## Your Gmail App Password
```
pkll sbau yshi ojoo
```

## Steps to Update in Netlify

1. **Go to Netlify Dashboard**
   - Visit: https://app.netlify.com
   - Select your site

2. **Navigate to Environment Variables**
   - Site Settings → Environment Variables

3. **Update EMAIL_PASSWORD**
   - Find `EMAIL_PASSWORD` in the list
   - Click to edit
   - Replace with: `pkllsbauyshiojoo` (remove all spaces)
   - Click "Save"

4. **Verify Other Variables**
   Make sure these are also set:
   - `EMAIL_USER=Scanified@gmail.com`
   - `EMAIL_FROM=Scanified@gmail.com`
   - `EMAIL_PASSWORD=pkllsbauyshiojoo` ← Updated with App Password

5. **Redeploy**
   - Go to **Deploys** tab
   - Click **"Trigger deploy"** → **"Deploy site"**
   - Wait 2-5 minutes

## ✅ After Redeploy

1. **Test Configuration:**
   - Visit: `https://www.scanified.com/.netlify/functions/test-email-config`
   - Should show Gmail configured

2. **Send Test Invitation:**
   - Go to User Management page
   - Send invitation to your email
   - Should work now! 🎉

## 🔍 If Still Not Working

Check Netlify function logs:
- Functions → `send-email` → Logs
- Look for any authentication errors

The App Password should fix the 500 error!
