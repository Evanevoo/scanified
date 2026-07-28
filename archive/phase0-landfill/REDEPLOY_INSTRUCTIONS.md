# How to Redeploy on Netlify

## Option 1: Trigger Deploy from Netlify Dashboard (Easiest)

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Go to **Deploys** tab
4. Click **"Trigger deploy"** button (top right)
5. Select **"Deploy site"**
6. Wait for deployment to complete (~2-5 minutes)

## Option 2: Push to Git (Automatic)

If your site is connected to Git, just push any commit:

```bash
git add .
git commit -m "Redeploy to apply email environment variables"
git push
```

Netlify will automatically deploy.

## Option 3: Clear Cache and Redeploy

1. Netlify Dashboard → **Deploys**
2. Click **"Trigger deploy"** → **"Clear cache and deploy site"**
3. This ensures environment variables are fresh

## ✅ Verify Deployment

After deployment completes:

1. **Test email config:**
   - Visit: `https://www.scanified.com/.netlify/functions/test-email-config`
   - Should show email service as configured

2. **Check environment variables are active:**
   - Netlify Dashboard → Site Settings → Environment Variables
   - Variables should be listed (values are hidden for security)

3. **Try sending an invitation:**
   - Go to User Management page
   - Send test invitation
   - Should work now!

## ⚠️ Important Notes

- **Environment variables only take effect after redeploy**
- **Deployment takes 2-5 minutes**
- **Check deployment logs** if issues persist
- **Function logs** will show if email service is working
