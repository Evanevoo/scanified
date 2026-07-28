# 🚨 URGENT: Email Invitation Setup Guide

## ⚠️ CRITICAL UPDATE: Gmail No Longer Supported

**Google has disabled external email services from sending emails from Gmail addresses.** Gmail authentication will fail with the error: "Authentication unsuccessful".

## Problem
Users are not receiving email invitations because the email service is not properly configured.

## ✅ IMMEDIATE SOLUTION

### Step 1: Configure Netlify Environment Variables

Go to your **Netlify Dashboard** → **Site Settings** → **Environment Variables** and add these variables:

#### ✅ Option 1: SMTP2GO (HIGHLY RECOMMENDED)
```env
SMTP2GO_USER=your_smtp2go_username
SMTP2GO_PASSWORD=your_smtp2go_password
SMTP2GO_FROM=noreply@yourdomain.com
```

#### ❌ Option 2: Gmail (DEPRECATED - No Longer Works)
```env
# Gmail no longer works due to Google's policy changes
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
EMAIL_FROM=noreply@yourdomain.com
```

#### ✅ Option 3: SendGrid (Alternative)
```env
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

### Step 2: Get SMTP2GO Credentials (Skip if using Gmail)

1. **Sign up at [SMTP2GO](https://www.smtp2go.com/)**
2. **Create SMTP User**:
   - Go to Settings → API Keys & SMTP
   - Click "Add SMTP User"
   - Create username and password
   - Use these as `SMTP2GO_USER` and `SMTP2GO_PASSWORD`

### ⚠️ Gmail Setup (DEPRECATED - Will Not Work)

**Gmail no longer works due to Google's policy changes.** Please use SMTP2GO instead.

If you must try Gmail (it will fail):
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and generate password
   - **Use this generated password** as `EMAIL_PASSWORD`

### Step 3: Update Netlify Function Configuration (If Using SendGrid)

If you're using SendGrid instead of Gmail, update the transporter configuration in `netlify/functions/send-email.js`:

```javascript
// For SendGrid
transporter = nodemailer.createTransporter({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
```

### Step 4: Deploy and Test

1. **Add environment variables** to Netlify
2. **Deploy your site** (environment variables require a new deployment)
3. **Test invitation sending** from User Management or User Invites page
4. **Check recipient's email** (including spam folder)
5. **Check Netlify Function logs** for detailed error messages

## 🔧 DEBUGGING STEPS

### Check Function Logs
1. Go to **Netlify Dashboard** → **Functions**
2. Click on `send-email` function
3. Check the **Logs** tab for errors

### Common Error Messages and Solutions

#### "Email service not configured"
- **Cause**: Email service environment variables not set
- **Solution**: Add one of the following sets of variables in Netlify Dashboard:
  - SMTP2GO: `SMTP2GO_USER`, `SMTP2GO_PASSWORD`, `SMTP2GO_FROM`
  - Gmail: `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`
  - SendGrid: `EMAIL_USER` (as "apikey"), `EMAIL_PASSWORD` (API key), `EMAIL_FROM`

#### "Email authentication failed (EAUTH)"
- **Cause**: Wrong email credentials
- **Solution**: Double-check your email and password/app password

#### "Invalid email username or password (535)"
- **Cause**: Gmail requires app password when 2FA is enabled
- **Solution**: Generate and use Gmail app password instead of regular password

#### "Email server not found (ENOTFOUND)"
- **Cause**: Wrong SMTP server configuration
- **Solution**: Verify the email service settings

### Test the Email Function Directly

You can test the email function using curl or a tool like Postman:

```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "template": "invite",
    "data": {
      "inviteLink": "https://your-site.com/accept-invite?token=test",
      "organizationName": "Test Org",
      "inviter": "Test User"
    }
  }'
```

### Quick Email Configuration Test

Create a test file to verify your email configuration:

```javascript
// test-email-config.js
import nodemailer from 'nodemailer';

async function testEmailConfig() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP2GO_USER ? 'mail.smtp2go.com' : 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP2GO_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP2GO_PASSWORD || process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    await transporter.verify();
    console.log('✅ Email configuration is working!');
  } catch (error) {
    console.error('❌ Email configuration error:', error.message);
  }
}

testEmailConfig();
```

Run it with: `node test-email-config.js`

## 📧 Alternative Email Services

### SendGrid Setup
1. Sign up at [SendGrid](https://sendgrid.com/)
2. Create an API key
3. Use these environment variables:
   ```env
   EMAIL_USER=apikey
   EMAIL_PASSWORD=your-sendgrid-api-key
   EMAIL_FROM=noreply@yourdomain.com
   ```

### Resend Setup
1. Sign up at [Resend](https://resend.com/)
2. Get your API key
3. Update the transporter in `send-email.js`:
   ```javascript
   transporter = nodemailer.createTransporter({
     host: 'smtp.resend.com',
     port: 587,
     secure: false,
     auth: {
       user: 'resend',
       pass: process.env.EMAIL_PASSWORD // Your Resend API key
     }
   });
   ```

## ✅ What Was Fixed

1. **Added email sending to UserInvites.jsx** - Now sends emails when invites are created
2. **Added error handling** - Better error messages when email sending fails
3. **Enhanced Netlify function** - More detailed logging and error reporting
4. **Environment variable validation** - Function checks if email credentials are configured
5. **Graceful error handling** - Invites are still created even if email fails
6. **Fixed environment variable names** - Updated template to match function expectations
7. **Added configuration test script** - Quick verification of email setup

## 🎯 Next Steps

1. **Sign up for SMTP2GO** at https://www.smtp2go.com/ (free plan available)
2. **Get your SMTP credentials** from their dashboard
3. **Run the test script**: `node smtp2go-test.js` to verify configuration
4. **Configure Netlify environment variables** with your SMTP2GO credentials
5. **Deploy the site** and test invitation sending
6. **Monitor function logs** for any issues in Netlify Dashboard

### 📚 Additional Resources

- **Complete SMTP2GO Setup Guide**: See `SMTP2GO_SETUP_GUIDE.md`
- **Alternative Email Services**: SendGrid, Resend, Mailgun
- **SMTP2GO Documentation**: https://www.smtp2go.com/docs/

The invitation system will now work properly once the email service is configured!