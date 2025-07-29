# 🚨 URGENT: Fix Email Invitations - Users Not Receiving Emails

## Problem
Users are not receiving email invitations because SMTP is not configured in Netlify.

## ✅ IMMEDIATE SOLUTION

### Step 1: Configure Netlify Environment Variables

Go to your **Netlify Dashboard** → **Site Settings** → **Environment Variables** and add:

```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
EMAIL_FROM=noreply@yourdomain.com
```

### Step 2: Get Gmail App Password (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and generate password
   - **Use this generated password** as `EMAIL_PASSWORD`

### Step 3: Alternative Email Providers

#### Option A: SendGrid (Production Recommended)
```env
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

#### Option B: Resend (Modern Choice)
```env
EMAIL_USER=resend
EMAIL_PASSWORD=your-resend-api-key
EMAIL_FROM=noreply@yourdomain.com
```

#### Option C: SMTP2GO
```env
EMAIL_USER=your-smtp2go-username
EMAIL_PASSWORD=your-smtp2go-password
EMAIL_FROM=noreply@yourdomain.com
```

### Step 4: Update Netlify Function (if needed)

The function at `netlify/functions/send-email.js` should work with Gmail by default. For other providers, you may need to update the transporter configuration.

### Step 5: Test the Fix

1. **Deploy your site** after adding environment variables
2. **Try sending an invitation** from `/user-invites` or `/user-management`
3. **Check the invitation recipient's email** (including spam folder)
4. **Check Netlify Function logs** for any errors

## 🔧 DEBUGGING STEPS

### Check Function Logs
1. Go to **Netlify Dashboard** → **Functions**
2. Click on `send-email` function
3. Check the **Logs** tab for errors

### Common Error Messages and Solutions

#### "Authentication failed"
- **Solution**: Double-check EMAIL_USER and EMAIL_PASSWORD
- **For Gmail**: Make sure you're using the app password, not your regular password

#### "ECONNECTION" or "Timeout"
- **Solution**: Try different SMTP providers (SendGrid, Resend)
- **Check**: Make sure EMAIL_USER and EMAIL_PASSWORD are correct

#### "535 Authentication failed"
- **Solution**: Gmail requires "Less secure app access" OR app passwords
- **Recommended**: Use app passwords with 2FA enabled

### Test Email Sending Manually

Create a test file to verify SMTP works:

```javascript
// test-email.js (run locally)
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'your-gmail@gmail.com',
    pass: 'your-app-password'
  }
});

const mailOptions = {
  from: 'your-gmail@gmail.com',
  to: 'test-recipient@gmail.com',
  subject: 'Test Email',
  html: '<h1>Test email from your app!</h1>'
};

transporter.sendMail(mailOptions)
  .then(() => console.log('✅ Email sent successfully!'))
  .catch(err => console.error('❌ Email failed:', err));
```

## 🚀 QUICK FIX CHECKLIST

- [ ] Add EMAIL_USER to Netlify environment variables
- [ ] Add EMAIL_PASSWORD to Netlify environment variables  
- [ ] Add EMAIL_FROM to Netlify environment variables
- [ ] Deploy site to apply environment changes
- [ ] Test invitation sending
- [ ] Check recipient email (including spam)
- [ ] Verify function logs show success

## 📞 ALTERNATIVE: Manual Invitation Links

If SMTP setup is complex, you can temporarily copy invitation links manually:

1. **Create invitation** in `/user-invites`
2. **Copy the invitation link** from the table
3. **Send the link manually** via your preferred method
4. **User clicks link** to accept invitation

## ⚡ FASTEST SOLUTION

**Use Gmail with App Password:**

1. **Enable 2FA** on Gmail
2. **Generate app password** 
3. **Add to Netlify**:
   - `EMAIL_USER=yourgmail@gmail.com`
   - `EMAIL_PASSWORD=generated-app-password`
   - `EMAIL_FROM=noreply@yourcompany.com`
4. **Deploy and test**

This should resolve email invitations immediately! 