# SMTP2GO Setup for Supabase Email Confirmation

## Overview
SMTP2GO is a reliable email delivery service that works great with Supabase. This guide will help you configure it to resolve the "Error sending confirmation email" issue.

## Step 1: Get SMTP2GO Credentials

### 1.1 Access Your SMTP2GO Account
1. Go to [smtp2go.com](https://smtp2go.com)
2. Log into your account
3. Navigate to **Settings > SMTP Credentials**

### 1.2 Note Your Credentials
You'll need these details:
- **SMTP Host**: `mail.smtp2go.com`
- **SMTP Port**: `2525` (or `587` for TLS)
- **Username**: Your SMTP2GO username
- **Password**: Your SMTP2GO password
- **Sender Email**: Your verified sender email

## Step 2: Configure Supabase

### 2.1 Access Supabase Dashboard
1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication > Settings > Email**

### 2.2 Enter SMTP2GO Settings
Fill in the SMTP configuration:

```
SMTP Host: mail.smtp2go.com
SMTP Port: 2525
SMTP User: [Your SMTP2GO username]
SMTP Password: [Your SMTP2GO password]
Sender Email: [Your verified sender email]
```

### 2.3 Save Settings
Click **Save** to apply the configuration.

## Step 3: Test Configuration

### 3.1 Test Registration
1. Try registering a new user in your app
2. Check if confirmation email is received
3. Check spam folder if email doesn't appear

### 3.2 Check SMTP2GO Dashboard
1. Go to your SMTP2GO dashboard
2. Check **Activity > Email Logs**
3. Verify emails are being sent successfully

### 3.3 Check Supabase Logs
1. Go to Supabase Dashboard
2. Navigate to **Authentication > Logs**
3. Look for email-related errors

## Step 4: Troubleshooting

### Common Issues:

#### 1. "Authentication failed"
- **Solution**: Double-check your SMTP2GO username and password
- **Check**: Ensure credentials are copied correctly (no extra spaces)

#### 2. "Connection timeout"
- **Solution**: Try port `587` instead of `2525`
- **Alternative**: Use port `465` with SSL

#### 3. "Email not received"
- **Check**: SMTP2GO Activity logs
- **Check**: Spam folder
- **Verify**: Sender email is verified in SMTP2GO

#### 4. "Rate limiting"
- **SMTP2GO Limits**: Check your plan limits
- **Supabase Limits**: Wait between registration attempts

## Step 5: SMTP2GO Best Practices

### 5.1 Sender Verification
- **Verify your sender email** in SMTP2GO dashboard
- **Use a professional domain** for better deliverability
- **Set up SPF/DKIM** records for custom domains

### 5.2 Monitoring
- **Monitor delivery rates** in SMTP2GO dashboard
- **Check bounce rates** and handle them
- **Set up webhooks** for delivery notifications

### 5.3 Security
- **Use strong passwords** for SMTP2GO account
- **Enable 2FA** on your SMTP2GO account
- **Regularly rotate** SMTP credentials

## Step 6: Production Checklist

Before going live:

- [ ] **SMTP2GO configured** in Supabase
- [ ] **Sender email verified** in SMTP2GO
- [ ] **Test registration** works
- [ ] **Email confirmation** received
- [ ] **Login after confirmation** works
- [ ] **Monitor delivery rates** in SMTP2GO
- [ ] **Set up webhooks** for delivery tracking

## Step 7: Advanced Configuration

### 7.1 Custom Domain Setup
If using a custom domain:

1. **Add domain** to SMTP2GO
2. **Verify domain** ownership
3. **Set up SPF record**: `v=spf1 include:send.smtp2go.com ~all`
4. **Set up DKIM** (provided by SMTP2GO)
5. **Update sender email** to use custom domain

### 7.2 Webhook Setup
For delivery tracking:

1. **Go to SMTP2GO Settings > Webhooks**
2. **Add webhook URL**: `https://your-domain.com/.netlify/functions/email-webhook`
3. **Select events**: `delivered`, `bounced`, `complained`
4. **Test webhook** delivery

## Support Resources

- **SMTP2GO Documentation**: [docs.smtp2go.com](https://docs.smtp2go.com)
- **Supabase Email Settings**: [app.supabase.com](https://app.supabase.com)
- **SMTP2GO Support**: Available in your dashboard

## Testing Commands

You can test your SMTP2GO configuration with these curl commands:

```bash
# Test SMTP connection
curl -v --mail-from "your-email@domain.com" \
  --mail-rcpt "test@example.com" \
  --upload-file email.txt \
  --ssl-reqd \
  smtp://mail.smtp2go.com:587
```

Replace with your actual credentials and test email addresses. 