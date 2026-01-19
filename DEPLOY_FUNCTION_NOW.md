# 🚀 Deploy Backup Function - Quick Guide

## The 404 Error Means: Function Not Deployed Yet

You need to deploy the function to Netlify first!

---

## ⚡ Quick Deploy (Choose One)

### Option 1: Git Push (If Using Git)

```bash
# 1. Add the function file
git add netlify/functions/daily-tenant-backup.js

# 2. Commit
git commit -m "Add daily tenant backup function"

# 3. Push to trigger Netlify deploy
git push
```

**Then wait 2-3 minutes for Netlify to deploy.**

### Option 2: Manual Deploy via Netlify Dashboard

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site: **scanified**
3. Click **"Deploys"** tab
4. Click **"Trigger deploy"** dropdown
5. Select **"Deploy site"**
6. Wait for deployment to complete (2-3 minutes)

### Option 3: Netlify CLI (If Installed)

```bash
# Install Netlify CLI if needed
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

---

## ✅ Verify Function is Deployed

1. Go to Netlify Dashboard > **Functions**
2. Look for `daily-tenant-backup` in the list
3. If you see it, it's deployed! ✅

---

## 🧪 Test After Deployment

### Test 1: GET Request (No Secret Needed)
Open in browser:
```
https://scanified.netlify.app/.netlify/functions/daily-tenant-backup
```

**Expected:** JSON response with function info  
**If still 404:** Wait 1-2 more minutes, then try again

### Test 2: POST Request (With Secret)
```bash
curl -X POST "https://scanified.netlify.app/.netlify/functions/daily-tenant-backup?secret=42b0c076f4b3fafa288ba84859609c8a0a12ea0d43fcd5b6576a2ccd4f23181a"
```

**Expected:** JSON with backup results  
**If 401:** Good! Function exists, just need to set secret in Netlify

---

## 🔍 Check Deployment Status

1. **Netlify Dashboard** > **Deploys**
2. Look for latest deploy
3. Click on it to see details
4. Check **"Functions"** tab
5. Should see `daily-tenant-backup` listed

---

## ⚠️ Common Issues

### "Function not found in deploy"

**Fix:** Make sure file is at:
```
netlify/functions/daily-tenant-backup.js
```

### "Build succeeded but function missing"

**Fix:** 
1. Check `netlify.toml` has:
   ```toml
   [functions]
     directory = "netlify/functions"
   ```
2. Redeploy

### "Still 404 after deployment"

**Fix:**
1. Wait 1-2 minutes (deployment propagation)
2. Hard refresh browser (Ctrl+F5)
3. Try from incognito window
4. Check exact function name in Netlify Dashboard

---

## 📋 Quick Checklist

- [ ] Function file exists: `netlify/functions/daily-tenant-backup.js`
- [ ] Code committed (if using git)
- [ ] Netlify deploy triggered
- [ ] Deployment completed successfully
- [ ] Function appears in Netlify Functions list
- [ ] GET request works (returns JSON)
- [ ] POST request works (with secret)

---

**Most Important:** The function must be deployed to Netlify before it will work. Commit and push, or trigger a manual deploy!

