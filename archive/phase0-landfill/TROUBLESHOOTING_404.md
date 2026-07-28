# 🔧 Troubleshooting 404 Error - Backup Function

## Issue: 404 Not Found when testing backup function

If you're getting a 404 error, the function hasn't been deployed yet or there's a deployment issue.

---

## ✅ Solutions

### Solution 1: Deploy the Function (Most Common)

**The function needs to be deployed to Netlify first!**

1. **Commit and push your code:**
   ```bash
   git add netlify/functions/daily-tenant-backup.js
   git commit -m "Add daily tenant backup function"
   git push
   ```

2. **Or trigger a manual deploy:**
   - Go to Netlify Dashboard
   - Click **"Trigger deploy"** > **"Deploy site"**
   - Wait for deployment to complete

3. **Verify function is deployed:**
   - Netlify Dashboard > **Functions**
   - You should see `daily-tenant-backup` in the list

### Solution 2: Check Function Path

Make sure you're using the correct URL format:

**Correct:**
```
https://scanified.netlify.app/.netlify/functions/daily-tenant-backup
```

**Incorrect:**
```
https://scanified.netlify.app/netlify/functions/daily-tenant-backup
https://scanified.netlify.app/functions/daily-tenant-backup
```

### Solution 3: Test with GET First

Try accessing the function with a GET request first (no secret needed for GET):

```
https://scanified.netlify.app/.netlify/functions/daily-tenant-backup
```

This should return a JSON response with function information.

### Solution 4: Check Netlify Build Logs

1. Go to Netlify Dashboard > **Deploys**
2. Click on the latest deploy
3. Check **"Functions"** tab
4. Look for `daily-tenant-backup` in the list
5. If it's missing, check build logs for errors

### Solution 5: Verify Function File Location

The function file must be at:
```
netlify/functions/daily-tenant-backup.js
```

And must export a handler:
```javascript
exports.handler = async (event, context) => {
  // function code
}
```

---

## 🧪 Testing Steps

### Step 1: Test Function Exists (GET)
```bash
curl https://scanified.netlify.app/.netlify/functions/daily-tenant-backup
```

**Expected:** JSON response with function info  
**If 404:** Function not deployed yet

### Step 2: Test with Secret (GET)
```bash
curl "https://scanified.netlify.app/.netlify/functions/daily-tenant-backup?secret=YOUR_SECRET"
```

**Expected:** JSON response  
**If 401:** Secret doesn't match (this is good - function exists!)

### Step 3: Test Backup (POST)
```bash
curl -X POST "https://scanified.netlify.app/.netlify/functions/daily-tenant-backup?secret=YOUR_SECRET"
```

**Expected:** JSON with backup results  
**If 404:** Function not deployed

---

## 📋 Deployment Checklist

- [ ] Function file exists at `netlify/functions/daily-tenant-backup.js`
- [ ] Function exports `exports.handler`
- [ ] Code committed to git
- [ ] Code pushed to repository
- [ ] Netlify auto-deployed (or manual deploy triggered)
- [ ] Function appears in Netlify Dashboard > Functions
- [ ] Test GET request works
- [ ] Test POST request works

---

## 🔍 Common Issues

### Issue: Function not in Netlify Functions list

**Cause:** Function not deployed or build failed

**Fix:**
1. Check Netlify build logs
2. Verify `netlify.toml` has correct functions directory
3. Trigger new deploy

### Issue: 404 even after deployment

**Cause:** Function name mismatch or path issue

**Fix:**
1. Verify function name matches URL exactly
2. Check Netlify Functions list for exact name
3. Use the exact name from Netlify Dashboard

### Issue: Function exists but returns 404

**Cause:** Caching or deployment delay

**Fix:**
1. Wait 1-2 minutes after deployment
2. Try hard refresh (Ctrl+F5)
3. Clear browser cache
4. Try from different browser/incognito

---

## 🚀 Quick Fix: Force Redeploy

1. Go to Netlify Dashboard
2. **Deploys** > **Trigger deploy** > **Deploy site**
3. Wait for build to complete
4. Check Functions tab
5. Test the URL again

---

## 📞 Still Not Working?

1. **Check Netlify Function Logs:**
   - Netlify Dashboard > Functions > daily-tenant-backup > Logs
   - Look for any errors

2. **Verify Environment Variables:**
   - Make sure `SUPABASE_SERVICE_ROLE_KEY` is set
   - Make sure `VITE_SUPABASE_URL` is set

3. **Test Locally (if using Netlify CLI):**
   ```bash
   netlify dev
   ```
   Then test: `http://localhost:8888/.netlify/functions/daily-tenant-backup`

---

**Most likely cause:** Function needs to be deployed. Commit, push, and wait for Netlify to deploy!

