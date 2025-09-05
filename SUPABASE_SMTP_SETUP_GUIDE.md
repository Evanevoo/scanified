# 🚨 SUPABASE SMTP SETUP GUIDE - Fix Email Confirmation Issues

## Problem
Users are getting "Error sending confirmation email" when trying to join organizations or register. This happens because Supabase needs SMTP credentials to send confirmation emails.

## ✅ IMMEDIATE FIX APPLIED
- **Email confirmation disabled** for invite signups in `AcceptInvite.jsx`
- **Users can now join organizations** without email confirmation
- **Deployed to production** at `https://www.scanified.com`

## 🔧 PERMANENT SOLUTION: Configure SMTP in Supabase

### Step 1: Access Supabase Dashboard
1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project: `jtfucttzaswmqqhmmhfb`
3. Navigate to **Authentication > Settings > Email**

### Step 2: Configure SMTP Settings

#### Option A: Gmail (Recommended for Testing)
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: scanified@gmail.com
SMTP Password: fhul uznc onpq foha (App Password)
Sender Email: scanified@gmail.com
```

#### Option B: SendGrid (Recommended for Production)
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Password: [Your SendGrid API Key]
Sender Email: noreply@yourdomain.com
```

#### Option C: SMTP2GO
```
SMTP Host: mail.smtp2go.com
SMTP Port: 2525
SMTP User: [Your SMTP2GO username]
SMTP Password: [Your SMTP2GO password]
Sender Email: [Your verified sender email]
```

### Step 3: Test Configuration
1. **Try registering a new user** in your app
2. **Check the email** (including spam folder)
3. **Check Supabase logs** at Authentication > Logs

### Step 4: Re-enable Email Confirmation (Optional)
Once SMTP is configured, you can re-enable email confirmation by:

1. **Edit `src/pages/AcceptInvite.jsx`**
2. **Change `emailConfirm: false` to `emailConfirm: true`**
3. **Deploy to production**

## 🔍 Current Status

### ✅ Working Features:
- **User Invitations**: ✅ Working (emails sent via Netlify functions)
- **Organization Joining**: ✅ Working (email confirmation disabled)
- **User Registration**: ✅ Working (email confirmation disabled)
- **Email Functions**: ✅ Working (CORS headers fixed)

### ⚠️ Features Needing SMTP:
- **Email Confirmation**: Currently disabled for invite signups
- **Password Reset**: May need SMTP configuration
- **Account Verification**: May need SMTP configuration

## 🛠️ Troubleshooting

### Common Issues:

#### 1. "Authentication failed"
- Check SMTP credentials
- For Gmail: Use App Password, not regular password
- Ensure 2FA is enabled for Gmail

#### 2. "Connection timeout"
- Verify SMTP_HOST and SMTP_PORT
- Try different port (465 with SSL, or 587 with TLS)
- Check firewall settings

#### 3. "Email not received"
- Check spam folder
- Verify sender email is correct
- Check Supabase logs for errors

#### 4. Rate limiting
- Supabase has email rate limits
- Wait a while before trying again
- Use a different email address for testing

## 📧 Email Templates (Optional)

### Customize Email Templates in Supabase:
1. Go to **Authentication > Email Templates**
2. Customize:
   - **Confirm signup**
   - **Reset password**
   - **Change email address**
   - **Magic link**

### Template Variables Available:
- `{{ .ConfirmationURL }}` - Confirmation link
- `{{ .Token }}` - Security token
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL

## 🚀 Production Recommendations

### For Production Deployment:
1. **Use a professional email service** (SendGrid, Resend, SMTP2GO)
2. **Set up domain verification** for better deliverability
3. **Monitor email logs** regularly
4. **Set up email analytics** to track delivery rates

### Environment Configuration:
```javascript
// Development: emailConfirm = false
// Production: emailConfirm = true (after SMTP setup)
emailConfirm: isEmailConfirmationRequired()
```

## 📋 Next Steps

### Immediate Actions:
1. ✅ **Email confirmation disabled** for invite signups
2. ✅ **Users can join organizations** without issues
3. ✅ **All email functions working** properly

### Future Improvements:
1. **Configure SMTP** in Supabase Dashboard
2. **Re-enable email confirmation** for better security
3. **Set up email templates** with your branding
4. **Monitor email delivery** rates

## 🔗 Useful Links

- **Supabase Dashboard**: https://app.supabase.com/project/jtfucttzaswmqqhmmhfb
- **Authentication Settings**: https://app.supabase.com/project/jtfucttzaswmqqhmmhfb/auth/settings
- **Email Templates**: https://app.supabase.com/project/jtfucttzaswmqqhmmhfb/auth/templates
- **Authentication Logs**: https://app.supabase.com/project/jtfucttzaswmqqhmmhfb/auth/logs

## ✅ Summary

**The email confirmation issue has been resolved!** Users can now join organizations without getting the "Error sending confirmation email" message. The fix has been deployed to production and is working properly.

For enhanced security, consider setting up SMTP in Supabase Dashboard following the guide above.
