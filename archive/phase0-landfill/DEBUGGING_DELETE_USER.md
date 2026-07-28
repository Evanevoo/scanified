# Debugging Delete User Issue

## Issue
The delete button doesn't delete users.

## Checklist to Debug

### 1. Are you running Netlify Dev?
The delete-user function is a Netlify Function and requires `netlify dev` to be running.

**Check:**
- Are you running `netlify dev`? (Not just `npm run dev`)
- Are you accessing the app at `http://localhost:8888`? (Not port 5175)

**If not:**
```bash
# Stop current dev server (Ctrl+C)
netlify dev
# Access app at http://localhost:8888
```

### 2. Check Browser Console
Open browser DevTools (F12) and look for:
- Network tab: Look for POST request to `/.netlify/functions/delete-user`
- Console tab: Look for error messages when clicking delete

**Expected logs when clicking delete:**
```
Running on Vite dev server. Netlify functions require "netlify dev"...
Deleting user: {userId: "...", organizationId: "..."}
User deleted successfully: {id: "...", email: "..."}
```

### 3. Check Netlify Dev Terminal
If running `netlify dev`, check the terminal for:
```
Deleting user: {userId: "...", organizationId: "..."}
Found user to delete: user@example.com
Successfully deleted user from auth
Successfully deleted profile: [...]
```

### 4. Check Network Request
In browser DevTools → Network tab:
1. Click delete button
2. Look for request to `delete-user`
3. Check:
   - Status code (should be 200)
   - Response body
   - Request payload

### 5. Common Issues

#### Issue: 404 Not Found
**Cause:** Netlify Functions not running
**Fix:** Run `netlify dev` and access at port 8888

#### Issue: 403 Forbidden or RLS Error
**Cause:** Service role key not configured
**Fix:** 
1. Check `netlify.toml` or environment variables
2. Set `SUPABASE_SERVICE_ROLE_KEY` in Netlify

#### Issue: User deleted but UI not updating
**Cause:** `fetchUsers()` not called or erroring
**Fix:** Check console for errors in `fetchUsers()`

### 6. Environment Variables

Ensure these are set (in Netlify environment or `.env`):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 7. Manual Test

Try calling the function directly:
```javascript
// In browser console:
const response = await fetch('/.netlify/functions/delete-user', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'USER_ID_HERE',
    organizationId: 'ORG_ID_HERE'
  })
});
console.log('Status:', response.status);
console.log('Response:', await response.json());
```

## Next Steps

1. **Refresh the page** (for Users showing 4/5 instead of 4/Unlimited)
2. **Open browser console** (F12)
3. **Click delete button**
4. **Copy any error messages** and share them

The improved delete function now logs every step, so we can see exactly where it's failing.

