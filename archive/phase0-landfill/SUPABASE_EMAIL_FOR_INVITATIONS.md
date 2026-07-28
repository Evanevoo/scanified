# Using Supabase SMTP for Invitation Emails

## Understanding the Setup

You have **two separate email systems**:

1. **Supabase Auth Emails** (configured in Supabase Dashboard)
   - Used for: Password resets, email confirmations, magic links
   - Configured at: Supabase Dashboard → Authentication → Settings → Email

2. **Netlify Function Emails** (configured in Netlify environment variables)
   - Used for: User invitations, custom emails
   - Configured at: Netlify Dashboard → Site Settings → Environment Variables

## ✅ Solution: Use the Same SMTP Credentials

Since you already have SMTP configured in Supabase, **use the same credentials in Netlify**:

### Step 1: Check Your Supabase SMTP Settings

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `jtfucttzaswmqqhmmhfb`
3. Navigate to **Authentication > Settings > Email**
4. Note down your SMTP settings:
   - SMTP Host
   - SMTP Port
   - SMTP User
   - SMTP Password
   - Sender Email

### Step 2: Add Same Credentials to Netlify

Go to **Netlify Dashboard → Site Settings → Environment Variables** and add:

#### If Supabase uses Gmail:
```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-gmail-app-password  ← Same App Password from Supabase
EMAIL_FROM=your-gmail@gmail.com
```

#### If Supabase uses SMTP2GO:
```env
SMTP2GO_USER=your-smtp2go-username  ← Same username from Supabase
SMTP2GO_PASSWORD=your-smtp2go-password  ← Same password from Supabase
SMTP2GO_FROM=your-verified-email@yourdomain.com  ← Same sender email
```

#### If Supabase uses SendGrid:
```env
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key  ← Same API key from Supabase
EMAIL_FROM=noreply@yourdomain.com  ← Same sender email
```

#### If Supabase uses Resend:
```env
EMAIL_USER=resend
EMAIL_PASSWORD=your-resend-api-key  ← Same API key from Supabase
EMAIL_FROM=your-verified-domain@yourdomain.com  ← Same sender email
```

### Step 3: Redeploy

After adding the environment variables, **redeploy your site** so the changes take effect.

## 🔍 How to Find Your Supabase SMTP Settings

1. **Supabase Dashboard** → Your Project
2. **Authentication** → **Settings** → **Email**
3. Look for the **SMTP Settings** section
4. Copy these values:
   - **SMTP Host** (e.g., `smtp.gmail.com`, `mail.smtp2go.com`)
   - **SMTP Port** (e.g., `587`, `2525`)
   - **SMTP User** (your username)
   - **SMTP Password** (your password - may be hidden)
   - **Sender Email** (the "from" address)

## 📋 Quick Reference

| Supabase SMTP Host | Netlify Variables Needed |
|-------------------|-------------------------|
| `smtp.gmail.com` | `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM` |
| `mail.smtp2go.com` | `SMTP2GO_USER`, `SMTP2GO_PASSWORD`, `SMTP2GO_FROM` |
| `smtp.sendgrid.net` | `EMAIL_USER=apikey`, `EMAIL_PASSWORD`, `EMAIL_FROM` |
| `smtp.resend.com` | `EMAIL_USER=resend`, `EMAIL_PASSWORD`, `EMAIL_FROM` |

## ✅ Verification

After setting up:

1. **Test Configuration:**
   - Visit: `https://www.scanified.com/.netlify/functions/test-email-config`
   - Should show your email service as configured

2. **Send Test Invitation:**
   - Go to User Management or User Invites page
   - Send invitation to your own email
   - Check inbox (and spam folder)

3. **Check Logs:**
   - Netlify Dashboard → Functions → `send-email` → Logs
   - Should show "Email sent successfully"

## 🚨 Important Notes

- **Use the EXACT same credentials** from Supabase
- **For Gmail:** Must use App Password (not regular password)
- **Redeploy required:** Environment variables only take effect after redeploy
- **Case sensitive:** Variable names must match exactly

## Why Two Systems?

- **Supabase Auth Emails:** Built-in system for authentication flows
- **Netlify Function Emails:** Custom emails with full control over content and templates

Both can use the same SMTP provider - you just need to configure it in both places!
