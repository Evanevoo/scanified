# 🔍 Email Invitation Troubleshooting Guide

## Quick Diagnostic

1. **Test Email Configuration:**
   - Visit: `https://www.scanified.com/.netlify/functions/test-email-config`
   - This will show you which email service is configured and what's missing

2. **Check Browser Console:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Try sending an invitation
   - Look for error messages - they now include specific instructions

3. **Check Netlify Function Logs:**
   - Go to Netlify Dashboard → Functions → `send-email`
   - Click "Logs" tab
   - Try sending an invitation
   - Look for error messages

## Common Issues & Solutions

### ❌ "Email service not configured"

**Problem:** No email credentials found in Netlify environment variables.

**Solution:**
1. Go to **Netlify Dashboard** → **Site Settings** → **Environment Variables**
2. Add one of these sets:

**Option 1: SMTP2GO (Recommended)**
```
SMTP2GO_USER=your_username
SMTP2GO_PASSWORD=your_password
SMTP2GO_FROM=noreply@yourdomain.com
```

**Option 2: Gmail**
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password  ← MUST be App Password, not regular password!
EMAIL_FROM=noreply@yourdomain.com
```

**Option 3: Outlook**
```
OUTLOOK_USER=your-email@outlook.com
OUTLOOK_PASSWORD=your-password
OUTLOOK_FROM=noreply@yourdomain.com
```

3. **Redeploy** your site after adding variables

### ❌ "SMTP connection failed" or "Authentication failed"

**Problem:** Email credentials are incorrect or expired.

**Solutions:**

**For Gmail:**
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and generate password
   - **Use this generated password** (not your regular Gmail password)
3. Update `EMAIL_PASSWORD` in Netlify with the App Password
4. Redeploy

**For SMTP2GO:**
1. Log into [SMTP2GO Dashboard](https://www.smtp2go.com/)
2. Go to Settings → API Keys & SMTP
3. Verify your username and password
4. Update Netlify environment variables if needed
5. Redeploy

**For Outlook:**
1. Verify your password is correct
2. Check if your account requires app-specific passwords
3. Update Netlify environment variables
4. Redeploy

### ❌ "Email sent successfully" but no email received

**Possible causes:**
1. **Check spam folder** - Emails might be filtered
2. **Email address typo** - Verify the recipient email is correct
3. **Email provider blocking** - Some providers block automated emails
4. **Rate limiting** - Too many emails sent too quickly

**Solutions:**
- Check spam/junk folder
- Verify email address is correct
- Try sending to a different email address
- Wait a few minutes and try again
- Check Netlify function logs for delivery status

### ❌ "CORS error" or "Network error"

**Problem:** Browser blocking the request or function not accessible.

**Solutions:**
1. Make sure you're on the correct domain (www.scanified.com)
2. Check browser console for CORS errors
3. Verify the function is deployed: `https://www.scanified.com/.netlify/functions/send-email`
4. Try in incognito/private browsing mode

## Step-by-Step Setup (First Time)

### Using SMTP2GO (Recommended)

1. **Sign up at [SMTP2GO](https://www.smtp2go.com/)** (free tier available)
2. **Create SMTP User:**
   - Go to Settings → API Keys & SMTP
   - Click "Add SMTP User"
   - Create username and password
   - Note these down
3. **Add to Netlify:**
   - Netlify Dashboard → Site Settings → Environment Variables
   - Add:
     - `SMTP2GO_USER` = your SMTP username
     - `SMTP2GO_PASSWORD` = your SMTP password
     - `SMTP2GO_FROM` = your verified sender email (e.g., noreply@yourdomain.com)
4. **Redeploy** your site
5. **Test** by sending an invitation

### Using Gmail

1. **Enable 2FA** on your Gmail account
2. **Generate App Password:**
   - [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and generate
3. **Add to Netlify:**
   - `EMAIL_USER` = your Gmail address
   - `EMAIL_PASSWORD` = the generated App Password (16 characters)
   - `EMAIL_FROM` = your Gmail address or noreply@yourdomain.com
4. **Redeploy** your site
5. **Test** by sending an invitation

## Testing

1. **Check Configuration:**
   ```
   https://www.scanified.com/.netlify/functions/test-email-config
   ```

2. **Send Test Invitation:**
   - Go to User Management or User Invites page
   - Send invitation to your own email
   - Check inbox (and spam folder)

3. **Check Logs:**
   - Netlify Dashboard → Functions → `send-email` → Logs
   - Look for success/error messages

## Still Not Working?

1. **Check Netlify Function Logs** - Most detailed error info is here
2. **Verify Environment Variables** - Make sure they're set for the correct site/branch
3. **Check Email Service Status** - SMTP2GO/Gmail might be having issues
4. **Try Different Email Provider** - Switch from Gmail to SMTP2GO or vice versa
5. **Contact Support** - Share the error message from function logs

## Manual Workaround

If email setup is taking time, you can manually send invite links:

1. Send invitation from User Management page
2. Even if email fails, the invite is created
3. Copy the invite link from "Pending Invites" section
4. Send it manually via your own email client
5. User clicks link to accept invitation

The invitation system works even without email - you just need to share links manually.
