# 🚨 URGENT: Supabase Email Invitation Setup Guide

## Problem
Users are not receiving email invitations because SMTP is not configured in Supabase.

## ✅ IMMEDIATE SOLUTION

### Step 1: Configure SMTP in Supabase Dashboard

1. **Go to Supabase Dashboard**
   - Visit [app.supabase.com](https://app.supabase.com)
   - Select your project
   - Navigate to **Authentication > Settings > Email**

2. **Configure SMTP Settings**
   - **SMTP Host**: `smtp.gmail.com` (for Gmail)
   - **SMTP Port**: `587`
   - **SMTP User**: Your Gmail address
   - **SMTP Password**: Your Gmail app password (NOT your regular password)
   - **Sender Email**: Your Gmail address

### Step 2: Get Gmail App Password

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and generate password
   - **Use this generated password** as SMTP Password

### Step 3: Alternative Email Providers

#### Option A: SendGrid (Recommended for Production)
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Password: your-sendgrid-api-key
Sender Email: your-verified-sender@yourdomain.com
```

#### Option B: Resend (Modern Alternative)
```
SMTP Host: smtp.resend.com
SMTP Port: 587
SMTP User: resend
SMTP Password: your-resend-api-key
Sender Email: your-verified-domain@yourdomain.com
```

#### Option C: SMTP2GO
```
SMTP Host: mail.smtp2go.com
SMTP Port: 2525
SMTP User: your-smtp2go-username
SMTP Password: your-smtp2go-password
Sender Email: your-verified-sender@yourdomain.com
```

### Step 4: Test Configuration

1. **Try registering a new user** in your app
2. **Check the email** (including spam folder)
3. **Check Supabase logs** at Authentication > Logs

### Step 5: Update Email Templates (Optional)

1. Go to **Authentication > Email Templates**
2. Customize the templates with your branding
3. Make sure to include the `{{ .ConfirmationURL }}` token

## 🔧 DEBUGGING STEPS

### Check Supabase Logs
1. Go to **Supabase Dashboard** → **Authentication** → **Logs**
2. Look for email-related errors
3. Check for authentication failures

### Common Error Messages and Solutions

#### "Authentication failed"
- **Solution**: Double-check SMTP credentials
- **For Gmail**: Make sure you're using the app password, not your regular password

#### "Connection timeout"
- **Solution**: Try different SMTP providers
- **Check**: Make sure SMTP_HOST and SMTP_PORT are correct

#### "Email not received"
- **Check**: Spam folder
- **Verify**: Sender email is correct
- **Check**: Supabase logs for errors

## 🚀 QUICK FIX CHECKLIST

- [ ] Configure SMTP in Supabase Dashboard
- [ ] Use Gmail app password (not regular password)
- [ ] Test email sending with registration
- [ ] Check recipient email (including spam)
- [ ] Verify Supabase logs show success

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
3. **Configure in Supabase**:
   - SMTP Host: `smtp.gmail.com`
   - SMTP Port: `587`
   - SMTP User: `yourgmail@gmail.com`
   - SMTP Password: `generated-app-password`
   - Sender Email: `yourgmail@gmail.com`
4. **Test registration**

## 🎯 What This Fixes

- ✅ Email invitations will be sent automatically
- ✅ Users will receive invitation emails
- ✅ Email confirmation for new registrations
- ✅ Password reset emails
- ✅ All Supabase email functionality

## 📧 Email Templates

Supabase uses these email templates:
- **Confirmation Email**: Sent when users register
- **Invitation Email**: Sent when users are invited (custom)
- **Password Reset**: Sent when users request password reset
- **Magic Link**: Sent when users use magic link authentication

## 🔐 Security Notes

- **Never use regular passwords** for SMTP
- **Always use app passwords** for Gmail
- **Enable 2FA** on your email account
- **Use strong passwords** for all accounts
- **Monitor email logs** regularly

This should resolve email invitations immediately!
