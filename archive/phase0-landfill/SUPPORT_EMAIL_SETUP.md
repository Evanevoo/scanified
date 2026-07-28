# Support Ticket Email Notifications Setup

## Overview
When customers submit support tickets via `/support`, you'll now receive email notifications at your owner portal email account.

## Required Setup

### 1. Configure Owner Email Address

Add this environment variable to your **Netlify Dashboard** → **Site Settings** → **Environment Variables**:

```env
REACT_APP_OWNER_EMAIL=your-email@yourdomain.com
```

**Replace `your-email@yourdomain.com` with your actual email address where you want to receive support ticket notifications.**

### 2. Email Service Configuration

Make sure you have one of these email services configured in Netlify:

#### Option A: SMTP2GO (Recommended)
```env
SMTP2GO_USER=your_smtp2go_username
SMTP2GO_PASSWORD=your_smtp2go_password
SMTP2GO_FROM=noreply@yourdomain.com
```

#### Option B: Gmail
```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
EMAIL_FROM=noreply@yourdomain.com
```

#### Option C: SendGrid
```env
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

## How It Works

### When a Customer Submits a Ticket:
1. **Customer fills out support form** at `/support`
2. **Ticket is saved** to the database
3. **Email notification is sent** to your owner email address
4. **Email contains**:
   - Ticket subject and description
   - Customer information (name, email, organization)
   - Priority level and category
   - Direct link to view/respond to the ticket

### When a Customer Replies to a Ticket:
1. **Customer replies** to an existing ticket
2. **Reply is saved** to the database
3. **Email notification is sent** to your owner email address
4. **Email contains**:
   - Original ticket information
   - Customer's reply message
   - Direct link to view the full conversation

## Email Templates

The system sends professional HTML emails with:
- **Clear subject lines** (e.g., "🔔 New Support Ticket: [Subject]")
- **Organized information** in tables and sections
- **Priority indicators** with color coding
- **Direct action buttons** to view tickets
- **Professional branding** from Scanified

## Testing

1. **Deploy your site** after adding environment variables
2. **Go to** `/support` page
3. **Submit a test ticket** with any subject and description
4. **Check your email** - you should receive a notification
5. **Reply to the ticket** and check for reply notifications

## Troubleshooting

### No Emails Received
1. **Check environment variables** are set correctly in Netlify
2. **Check spam folder** - emails might be filtered
3. **Check Netlify function logs** for email service errors
4. **Verify email service credentials** are correct

### Email Service Errors
1. **Go to Netlify Dashboard** → **Functions** → **send-email**
2. **Check the Logs tab** for error messages
3. **Common issues**:
   - Invalid email credentials
   - Email service not configured
   - SMTP connection issues

### Missing Owner Email
- If `REACT_APP_OWNER_EMAIL` is not set, emails will be sent to `support@scanified.com` by default
- Make sure to set your actual email address for proper delivery

## Security Notes

- **Email addresses are not logged** in the application
- **Email service credentials** are stored securely in Netlify environment variables
- **Customer information** is only sent to the configured owner email
- **No sensitive data** is exposed in email templates

## Support

If you need help setting up email notifications:
1. Check the email service setup guides in your project
2. Verify all environment variables are correctly configured
3. Test with a simple support ticket submission
4. Check Netlify function logs for any errors
