# Fix Gmail Authentication Error

## Error Message
```
Invalid login: 535-5.7.8 Username and Password not accepted
```

## ✅ Step-by-Step Fix

### Step 1: Verify App Password Format

Your App Password should be **exactly 16 characters with NO spaces**:
```
pkllsbauyshiojoo
```

**Common mistakes:**
- ❌ `pkll sbau yshi ojoo` (with spaces)
- ❌ `pkllsbauyshiojoo ` (trailing space)
- ❌ ` pkllsbauyshiojoo` (leading space)
- ✅ `pkllsbauyshiojoo` (correct - no spaces)

### Step 2: Update Netlify Environment Variables

1. **Go to Netlify Dashboard**
   - https://app.netlify.com
   - Select your site

2. **Site Settings → Environment Variables**

3. **Check/Update EMAIL_PASSWORD:**
   - Click on `EMAIL_PASSWORD` to edit
   - Make sure it's exactly: `pkllsbauyshiojoo`
   - **No spaces, no quotes, no extra characters**
   - Click "Save"

4. **Verify EMAIL_USER:**
   - Should be: `Scanified@gmail.com`
   - **Case sensitive** - make sure it matches exactly

5. **Verify EMAIL_FROM:**
   - Should be: `Scanified@gmail.com`

### Step 3: Clear Cache and Redeploy

**Important:** Environment variables only take effect after redeploy!

1. **Netlify Dashboard → Deploys**
2. Click **"Trigger deploy"** → **"Clear cache and deploy site"**
3. Wait for deployment to complete (~2-5 minutes)

### Step 4: Verify App Password is Correct

If it still doesn't work, generate a NEW App Password:

1. Go to: https://myaccount.google.com/apppasswords
2. **Delete the old one** (if you want)
3. **Generate new App Password**
   - Select "Mail"
   - Select your device
   - Copy the new 16-character password
4. **Update Netlify** with the new password
5. **Redeploy**

### Step 5: Test Again

1. Visit: `https://www.scanified.com/.netlify/functions/test-email-config`
2. Should show Gmail configured
3. Try sending invitation again

## 🔍 Troubleshooting

### If Still Getting "Invalid login":

1. **Double-check password in Netlify:**
   - Go to Environment Variables
   - Click on EMAIL_PASSWORD
   - Make sure it's exactly 16 characters, no spaces
   - Copy/paste it to verify

2. **Verify 2FA is enabled:**
   - https://myaccount.google.com/security
   - 2-Step Verification should be ON

3. **Check if App Password works in Supabase:**
   - If Supabase SMTP uses the same password and works, copy it EXACTLY
   - Make sure Netlify has the exact same value

4. **Try generating a fresh App Password:**
   - Sometimes App Passwords can be corrupted
   - Generate a new one and update Netlify

5. **Check Netlify function logs:**
   - Functions → `send-email` → Logs
   - Look for the exact error message
   - May show more details about what's wrong

## ⚠️ Common Issues

- **Password has spaces:** Remove all spaces
- **Password has quotes:** Remove quotes (Netlify adds them automatically)
- **Wrong email:** Make sure EMAIL_USER matches the Gmail account
- **2FA not enabled:** Must enable 2FA before generating App Password
- **Not redeployed:** Environment variables only work after redeploy

## ✅ Success Indicators

When it works, you'll see:
- ✅ "Invite sent to [email]. The user will receive an email..."
- ✅ Email arrives in inbox (check spam folder too)
- ✅ No error messages
