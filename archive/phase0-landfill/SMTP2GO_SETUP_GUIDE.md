# 🚨 SMTP2GO Email Setup Guide

## Important Notice: Gmail No Longer Supported

**Google has disabled external email services from sending emails from Gmail addresses.** This means you can no longer use Gmail for sending invitation emails from your application.

## ✅ Recommended Solution: SMTP2GO

SMTP2GO is a professional email service that works perfectly for applications and provides better deliverability than Gmail.

## 📋 SMTP2GO Setup Steps

### Step 1: Create SMTP2GO Account
1. Go to [SMTP2GO](https://www.smtp2go.com/)
2. Click **"Sign Up"** (they offer a free plan with 1,000 emails/month)
3. Complete registration with your email
4. Verify your email address

### Step 2: Get SMTP Credentials
1. Log into your SMTP2GO dashboard
2. Go to **"Settings"** → **"API Keys & SMTP"**
3. Click **"Add SMTP User"**
4. Fill in the details:
   - **Username**: `scanified` (or your preferred username)
   - **Password**: Create a strong password
   - **Description**: `Scanified App Emails`
5. Click **"Create SMTP User"**
6. **Copy the credentials** - you'll need them for the next step

### Step 3: Test Configuration Locally

Update the test file with your SMTP2GO credentials:

```javascript
// In smtp2go-test.js, update these lines:
process.env.SMTP2GO_USER = 'your_username_here';
process.env.SMTP2GO_PASSWORD = 'your_password_here';
process.env.SMTP2GO_FROM = 'noreply@scanified.com';
```

Then test:
```bash
node smtp2go-test.js
```

You should see:
```
✅ SMTP2GO configuration is working!
🚀 Email invitations should now work.
```

### SMTP2GO Server Configuration

The system is configured to use:
- **SMTP Server**: `mail.smtp2go.com`
- **Primary Port**: `2525` (recommended)
- **Alternative Ports**: `8025`, `587`, `80`, `25` (with TLS)
- **SSL Ports**: `465`, `8465`, `443` (with SSL)

If port 2525 doesn't work, try 587 or 465.

### Step 4: Configure Netlify Environment Variables

1. Go to **Netlify Dashboard** → **Site Settings** → **Environment Variables**
2. Add these variables:
   ```env
   SMTP2GO_USER=your_smtp2go_username
   SMTP2GO_PASSWORD=your_smtp2go_password
   SMTP2GO_FROM=noreply@scanified.com
   ```

### Step 5: Deploy and Test

1. **Deploy your site** (environment variables require a new deployment)
2. **Go to User Management** → **Create Invite**
3. **Fill out invitation form** and submit
4. **Check recipient's email** - invitation should arrive!

## 🔧 Troubleshooting

### "Authentication failed"
- Double-check your SMTP2GO username and password
- Make sure your SMTP2GO account is active and verified
- Verify you have SMTP access enabled

### "Connection failed"
- Check your internet connection
- SMTP2GO server might be temporarily unavailable
- Try alternative ports: 587, 465, or 8025
- Make sure your firewall allows outbound connections on port 2525

### Emails not arriving
- Check spam/junk folder
- Verify the recipient email address
- Check SMTP2GO dashboard for delivery status

## 💰 SMTP2GO Pricing

- **Free Plan**: 1,000 emails/month
- **Pay-as-you-go**: $10 per 10,000 emails
- **Professional**: $29/month for 50,000 emails

## 📞 Support

If you need help with SMTP2GO setup:
- SMTP2GO Support: support@smtp2go.com
- Check their [documentation](https://www.smtp2go.com/docs/)

## ✅ Alternative Options

If SMTP2GO doesn't work for you, consider:

### SendGrid
- Free plan: 100 emails/day
- Professional plans available
- Setup similar to SMTP2GO

### Resend
- Modern email API
- Good for developers
- Free plan available

### Mailgun
- Good deliverability
- Free plan: 5,000 emails/month

---

## 🎯 Next Steps

1. **Sign up for SMTP2GO** at https://www.smtp2go.com/
2. **Get your SMTP credentials**
3. **Test locally** with `node smtp2go-test.js`
4. **Configure Netlify environment variables**
5. **Deploy and test invitation system**

The email invitation system will work perfectly once SMTP2GO is configured! 🚀
