# Password Reset Link Fix

## Problem
Password reset links are showing "Site not found" error from Netlify.

## Root Cause
Supabase generates password reset links using the **Site URL** configured in the Supabase Dashboard, not the `redirectTo` parameter. If the Site URL is set incorrectly, the links will be broken.

## Solution

### Step 1: Configure Supabase Site URL

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Set **Site URL** to: `https://www.scanified.com`
5. Add to **Redirect URLs**:
   - `https://www.scanified.com/reset-password`
   - `https://www.scanified.com/**` (wildcard for all paths)
6. **Save** the changes

### Step 2: Verify Netlify Redirects

The `netlify.toml` file already has a catch-all redirect:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

This should handle all paths including `/reset-password`.

### Step 3: Test the Fix

1. Request a new password reset (old links may be expired)
2. Check the email - the link should start with `https://www.scanified.com/...`
3. Click the link - it should redirect to the reset password page

## Important Notes

- The `redirectTo` parameter in code only tells Supabase where to redirect AFTER authentication
- The actual link domain comes from the **Site URL** in Supabase Dashboard
- If you see links pointing to `scanified1.netlify.app` or other subdomains, the Site URL is wrong
- Hash fragments (`#access_token=...`) are handled client-side and should work with the current setup

## Code Changes Made

1. Updated all `resetPasswordForEmail` calls to use production URL
2. Enhanced `ResetPassword` component to handle hash fragments
3. Added `onAuthStateChange` listener for `PASSWORD_RECOVERY` event

## If Issue Persists

1. Check Supabase Dashboard → Authentication → URL Configuration
2. Verify Site URL is exactly: `https://www.scanified.com` (no trailing slash)
3. Ensure redirect URLs include `/reset-password`
4. Request a NEW password reset after making changes
5. Check browser console for any JavaScript errors

