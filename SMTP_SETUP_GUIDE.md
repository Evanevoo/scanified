# SMTP Setup Guide for Supabase Email Confirmation

## Problem
You're getting "Error sending confirmation email" when users try to register. This happens because Supabase needs SMTP credentials to send confirmation emails.

## Solution: Configure SMTP in Supabase

### Step 1: Access Supabase Dashboard
1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication > Settings > Email**

### Step 2: Choose Your Email Provider

#### Option A: Gmail (Recommended for Testing)

**Setup:**
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and generate password
3. **Configure in Supabase**:
   - SMTP Host: `smtp.gmail.com`
   - SMTP Port: `587`
   - SMTP User: Your Gmail address
   - SMTP Password: The app password you generated
   - Sender Email: Your Gmail address

#### Option B: SendGrid (Recommended for Production)

**Setup:**
1. **Create SendGrid Account** at [sendgrid.com](https://sendgrid.com)
2. **Get API Key** from SendGrid Dashboard
3. **Configure in Supabase**:
   - SMTP Host: `smtp.sendgrid.net`
   - SMTP Port: `587`
   - SMTP User: `apikey`
   - SMTP Password: Your SendGrid API key
   - Sender Email: Your verified sender email

#### Option C: Resend (Modern Alternative)

**Setup:**
1. **Create Resend Account** at [resend.com](https://resend.com)
2. **Get API Key** from Resend Dashboard
3. **Configure in Supabase**:
   - SMTP Host: `smtp.resend.com`
   - SMTP Port: `587`
   - SMTP User: `resend`
   - SMTP Password: Your Resend API key
   - Sender Email: Your verified domain

### Step 3: Test Configuration

After setting up SMTP:
1. **Try registering a new user** in your app
2. **Check the email** (including spam folder)
3. **Check Supabase logs** at Authentication > Logs

### Step 4: Troubleshooting

#### Common Issues:

**1. "Authentication failed"**
- Check your SMTP credentials
- Ensure 2FA is enabled for Gmail
- Use app password, not regular password

**2. "Connection timeout"**
- Verify SMTP_HOST and SMTP_PORT
- Check firewall settings
- Try different port (465 with SSL, or 587 with TLS)

**3. "Email not received"**
- Check spam folder
- Verify sender email is correct
- Check Supabase logs for errors

**4. Rate limiting**
- Supabase has email rate limits
- Wait a while before trying again
- Use a different email address for testing

### Step 5: Development vs Production

#### Development (Current Setup)
- Email confirmation is **disabled** for development
- Users can register and login immediately
- No SMTP configuration required

#### Production
- Email confirmation is **enabled**
- Users must confirm email before login
- SMTP configuration required

### Step 6: Environment Configuration

The app automatically detects the environment:

```javascript
// Development: emailConfirm = false
// Production: emailConfirm = true
emailConfirm: isEmailConfirmationRequired()
```

### Step 7: Verify Setup

1. **Check Supabase Dashboard**:
   - Authentication > Settings > Email
   - Verify SMTP settings are saved

2. **Test Registration**:
   - Try registering a new user
   - Check if confirmation email is received

3. **Check Logs**:
   - Authentication > Logs
   - Look for email-related errors

## Quick Fix for Development

If you want to continue development without setting up SMTP:

1. The app is already configured to disable email confirmation in development
2. Users can register and login immediately
3. No email setup required for development

## Production Deployment

Before deploying to production:

1. **Set up SMTP** using one of the providers above
2. **Test email delivery** thoroughly
3. **Monitor logs** for email errors
4. **Consider using a professional email service** like SendGrid or Resend

## Security Notes

- **Never commit SMTP credentials** to git
- **Use environment variables** for sensitive data
- **Regularly rotate** app passwords
- **Monitor email delivery** rates
- **Set up SPF/DKIM** records for custom domains 