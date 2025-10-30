# Complete Setup Guide for New Organization & Invitation System

## Overview

This guide will help you set up the completely rebuilt organization creation and user invitation system with email verification.

## Key Changes

### 1. **Organization Creation (with Email Verification)**
   - Users must verify their email before the organization is created
   - Verification link expires in 24 hours
   - Prevents spam and ensures valid email addresses
   - Located at: `/create-organization`

### 2. **User Invitations (Simple & Clean)**
   - Admins can send invitation links to new users
   - Invites expire in 7 days
   - Users can accept and create their account in one step
   - Located at: `/user-invites`

### 3. **Organization Deletion (Permanently Deletes Users)**
   - When an organization is deleted (soft delete), all user accounts are **permanently deleted**
   - Organization data is retained for recovery
   - If restored, users must use **new email addresses** to rejoin
   - Located in: Owner Portal > Customer Management

## Database Setup

### Step 1: Run the SQL Setup Script

Execute this SQL script in your Supabase SQL Editor:

```sql
-- Located in: setup-proper-invitation-system.sql
```

This will create:
- `organization_verifications` table
- `organization_invites` table (recreated properly)
- Database functions:
  - `request_organization_verification()`
  - `create_verified_organization()`
  - `create_user_invite()`
- Proper RLS policies for all tables

**Note:** This script will drop and recreate the `organization_invites` table. Any existing pending invites will be lost.

## Frontend Setup

All frontend components have been created:

1. **CreateOrganization.jsx** - New organization signup with email verification
2. **VerifyOrganization.jsx** - Handles email verification and account creation
3. **UserInvites.jsx** - Send and manage user invitations
4. **AcceptInvite.jsx** - Accept invitation and create account

Routes added to `App.jsx`:
- `/create-organization` - Create new organization
- `/verify-organization` - Verify email and complete setup
- `/accept-invite` - Accept invitation
- `/user-invites` - Manage invitations (protected route)

## Email Templates

Two new email templates have been created:

1. **verify-organization** - Sent when a user creates an organization
   - Contains verification link
   - Expires in 24 hours
   - Professional gradient design

2. **invite** - Sent when an admin invites a user
   - Contains invitation link
   - Expires in 7 days
   - Clear call-to-action

Templates are located in: `netlify/functions/email-templates.js`

## User Flow

### Creating an Organization

1. User visits `/create-organization`
2. Fills in:
   - Organization Name
   - Their Name
   - Email Address
   - Password
3. Clicks "Continue"
4. System:
   - Creates verification record in database
   - Sends verification email
   - Shows "Check Your Email" page
5. User clicks link in email
6. System:
   - Creates user account in `auth.users`
   - Creates organization
   - Creates admin role
   - Creates user profile with admin role
   - Signs user in
7. Redirects to dashboard

### Inviting a User

1. Admin visits `/user-invites`
2. Clicks "Send Invite"
3. Fills in:
   - Email Address
   - Role
4. Clicks "Send Invite"
5. System:
   - Creates invite record
   - Sends invitation email
6. Invited user clicks link in email
7. System shows "Join Organization" page
8. User fills in:
   - Their Name
   - Password (email is pre-filled)
9. Clicks "Create Account & Join"
10. System:
    - Creates user account
    - Creates/updates profile with organization
    - Marks invite as accepted
11. Redirects to dashboard

### Deleting an Organization

1. Owner visits Owner Portal > Customer Management
2. Finds organization to delete
3. Clicks delete icon
4. Enters deletion reason
5. Confirms deletion
6. System:
   - **Permanently deletes all user profiles** for that organization
   - Deletes all pending invites
   - Marks organization as deleted (soft delete)
   - All other data (bottles, customers, etc.) is retained

### Restoring an Organization

1. Owner visits Owner Portal > Customer Management
2. Toggles "Show Deleted" to see deleted organizations
3. Finds organization to restore
4. Clicks restore icon
5. Confirms restoration
6. System:
   - Marks organization as active
   - **Users are NOT restored** (they were permanently deleted)
   - Organization owner must invite users again with **new email addresses**

## Testing Checklist

### Organization Creation
- [ ] Visit `/create-organization`
- [ ] Fill in all fields
- [ ] Check that verification email is sent
- [ ] Click verification link in email
- [ ] Verify account is created and signed in
- [ ] Check organization is created with correct name
- [ ] Check user has admin role

### User Invitations
- [ ] Sign in as admin
- [ ] Visit `/user-invites`
- [ ] Send an invite
- [ ] Check that invitation email is sent
- [ ] Click invitation link in email
- [ ] Create account with invited email
- [ ] Check user is added to organization with correct role
- [ ] Check invite is marked as accepted

### Organization Deletion & Restoration
- [ ] Delete an organization
- [ ] Check all user profiles are deleted
- [ ] Try to sign in with old email - should fail
- [ ] Restore the organization
- [ ] Check organization is active
- [ ] Try to sign in with old email - should still fail
- [ ] Send new invite with different email
- [ ] Accept invite and verify user can join

## Email Configuration

Make sure you have email service configured in Netlify environment variables:

**SMTP2GO (recommended):**
```
SMTP2GO_USER=your_smtp2go_username
SMTP2GO_PASSWORD=your_smtp2go_password
SMTP2GO_FROM=noreply@yourdomain.com
```

**Or Gmail:**
```
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=your_gmail@gmail.com
```

## Troubleshooting

### Email Not Sending
- Check Netlify environment variables
- Check Netlify function logs
- Verify SMTP credentials are correct
- If email fails, the app will still work - users can copy invite links manually

### Verification Link Expired
- Links expire after 24 hours
- User must start the registration process again

### "User already registered" Error
- This means an account with that email already exists
- User should use "Sign In" instead
- If the account was deleted, user can create a new account with the **same** email

### "Organization slug already exists" Error
- The system should auto-generate unique slugs
- If this happens, check the `fix-organizations-slug-constraint.sql` was run
- This script makes the slug constraint only apply to active organizations

## Files Changed/Created

### New Files:
- `src/pages/CreateOrganization.jsx`
- `src/pages/VerifyOrganization.jsx`
- `src/pages/UserInvites.jsx`
- `src/pages/AcceptInvite.jsx`
- `setup-proper-invitation-system.sql`
- `netlify/functions/email-templates.js`
- `SETUP_NEW_SYSTEM.md` (this file)

### Modified Files:
- `src/App.jsx` - Added new routes
- `src/pages/LandingPage.jsx` - Updated links to `/create-organization`
- `src/pages/OAuthOrganizationLink.jsx` - Updated create organization button
- `src/services/organizationDeletionService.js` - Permanently delete users
- `netlify/functions/send-email.js` - Use new email templates

### Deleted Files:
- `src/pages/OrganizationDeleted.jsx` - Replaced by `CreateOrganization.jsx`
- Old `src/pages/UserInvites.jsx` - Completely rebuilt

## Next Steps

1. **Run the SQL setup script** in Supabase
2. **Test the complete flow** (organization creation, invites, deletion)
3. **Configure email service** if not already done
4. **Update any documentation** for your users
5. **Deploy to production** when ready

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Check Netlify function logs for email issues
3. Check Supabase logs for database errors
4. Review the RLS policies if permission errors occur

