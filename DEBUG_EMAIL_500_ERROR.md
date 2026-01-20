# Debugging Email 500 Error

## ✅ Good News
- Email service IS configured (Gmail)
- All required variables are set: EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM

## 🔍 Next Steps to Debug

### 1. Check Netlify Function Logs

The 500 error means the function is failing. Check the exact error:

1. Go to **Netlify Dashboard** → **Functions** → **send-email**
2. Click **"Logs"** tab
3. Look for the most recent error when you tried to send an invitation
4. Common errors you might see:

**"Invalid login" or "Authentication failed"**
- **Fix:** Gmail needs an App Password, not your regular password
- Generate App Password: https://myaccount.google.com/apppasswords
- Update `EMAIL_PASSWORD` in Netlify with the App Password

**"Connection timeout" or "ECONNECTION"**
- **Fix:** Check your internet/firewall, or try different SMTP port

**"Less secure app access"**
- **Fix:** Enable 2FA and use App Password

### 2. Test Gmail Credentials

The password `Bugsbunny.7` might be your regular Gmail password. Gmail requires an **App Password** for SMTP:

1. **Enable 2-Factor Authentication** (if not already)
2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Generate password
   - Copy the 16-character password (remove spaces)
3. **Update Netlify:**
   - Go to Site Settings → Environment Variables
   - Update `EMAIL_PASSWORD` with the App Password
   - Redeploy

### 3. Verify Supabase SMTP Works

Since you have SMTP configured in Supabase:
- Check if password reset emails work (this uses Supabase SMTP)
- If those work, use the EXACT same password in Netlify

### 4. Test Email Function Directly

You can test the function directly:

```bash
curl -X POST https://www.scanified.com/.netlify/functions/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-test-email@gmail.com",
    "subject": "Test",
    "template": "invite",
    "data": {
      "inviteLink": "https://example.com",
      "organizationName": "Test Org",
      "inviterName": "Test User"
    }
  }'
```

Check the response for detailed error message.

## 🎯 Most Likely Issue

**Gmail App Password Required**

If `Bugsbunny.7` is your regular Gmail password, it won't work. Gmail blocks regular passwords for SMTP.

**Solution:**
1. Generate App Password: https://myaccount.google.com/apppasswords
2. Update `EMAIL_PASSWORD` in Netlify
3. Redeploy
4. Try again

## 📋 Quick Checklist

- [ ] Check Netlify function logs for exact error
- [ ] Verify using Gmail App Password (not regular password)
- [ ] Confirm 2FA is enabled on Gmail account
- [ ] Redeploy after updating EMAIL_PASSWORD
- [ ] Test sending invitation again
