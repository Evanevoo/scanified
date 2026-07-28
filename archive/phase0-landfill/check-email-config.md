# Email Configuration Check

## Current Issue
Netlify has Gmail environment variables set, but you want to use SMTP2GO.

## Solution: Add SMTP2GO Environment Variables to Netlify

### Step 1: Go to Netlify Dashboard
1. Visit: https://app.netlify.com/sites/scanified1/configuration/env
2. Or: Netlify Dashboard → Your Site → Site Settings → Environment Variables

### Step 2: Add SMTP2GO Variables
Add these three environment variables:

```
SMTP2GO_USER=your_smtp2go_username
SMTP2GO_PASSWORD=your_smtp2go_password
SMTP2GO_FROM=your-verified-email@yourdomain.com
```

### Step 3: Get Your SMTP2GO Credentials
1. Log in to your SMTP2GO account: https://www.smtp2go.com/
2. Go to **Settings** → **SMTP Users**
3. Find or create an SMTP user
4. Copy the **Username** and **Password**
5. Use a verified sender email address for `SMTP2GO_FROM`

### Step 4: Optional - Remove Gmail Variables
If you're no longer using Gmail, you can remove:
- `EMAIL_USER`
- `EMAIL_PASSWORD`
- `EMAIL_FROM`

(Or keep them as a fallback - the function will use SMTP2GO first if available)

### Step 5: Redeploy
After adding the variables, you need to trigger a new deployment:
- Either push a commit to your connected Git repo
- Or run: `netlify deploy --prod`

### Step 6: Test
1. Try inviting a user from the Settings page
2. Check the browser console for logs
3. Check Netlify function logs: https://app.netlify.com/sites/scanified1/functions/send-email

## Priority Order
The email function checks in this order:
1. **SMTP2GO** (if SMTP2GO_USER, SMTP2GO_PASSWORD, SMTP2GO_FROM are set)
2. **Gmail** (if EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM are set)
3. **Outlook** (if OUTLOOK_USER, OUTLOOK_PASSWORD, OUTLOOK_FROM are set)

So if you add SMTP2GO variables, they will be used automatically!

