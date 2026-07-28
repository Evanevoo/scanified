# Organization Invite System Setup

## Overview
This update adds a secure invite system for organizations and prevents duplicate email registrations.

## Database Setup Required

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `apply_email_uniqueness.sql`
4. Run the script

### Option 2: Using Supabase CLI
```bash
# Link your project first
npx supabase link --project-ref YOUR_PROJECT_REF

# Then push the migration
npx supabase db push
```

## What's New

### 1. Email Uniqueness
- **Problem Solved**: Users can no longer register with the same email address multiple times
- **Implementation**: Added unique constraint on the `email` column in the `profiles` table
- **Registration Flow**: Now checks for existing emails before creating new accounts

### 2. Organization Invite System
- **Secure Invites**: Organization owners can invite users via email
- **Token-based**: Each invite has a unique, secure token that expires in 7 days
- **Role Assignment**: Invites can specify user roles (user, manager, admin)
- **Automatic Association**: Users are automatically linked to the organization when they accept

### 3. New Pages Added

#### User Invites Page (`/user-invites`)
- **Access**: Organization owners only
- **Features**:
  - Send invites to new users
  - View all pending, accepted, and expired invites
  - Copy invite links to clipboard
  - Delete invites
  - Track invite status and expiration

#### Accept Invite Page (`/accept-invite?token=...`)
- **Access**: Anyone with a valid invite link
- **Features**:
  - Verify invite validity
  - Create new account or link existing account
  - Automatic organization association
  - Role assignment

### 4. Navigation Updates
- Added "User Invites" menu item in the sidebar for organization users
- Only visible to organization owners

## How It Works

### For Organization Owners:
1. Go to `/user-invites` in your app
2. Click "Invite User"
3. Enter email and select role
4. Send invite
5. Share the generated invite link with the user

### For Invited Users:
1. Click the invite link (e.g., `https://yourapp.com/accept-invite?token=abc123`)
2. Verify invite details
3. Create account or sign in
4. Automatically join the organization

## Security Features
- **Token Expiration**: Invites expire after 7 days
- **One-time Use**: Each invite can only be accepted once
- **Role-based Access**: Only organization owners can send invites
- **Email Validation**: Invites are tied to specific email addresses
- **RLS Policies**: Database-level security for invite management

## Database Tables Added
- `organization_invites`: Stores invite information
- `profiles_email_key`: Unique constraint on email addresses

## Database Functions Added
- `create_organization_invite()`: Creates new invites
- `accept_organization_invite()`: Accepts invites
- `generate_invite_token()`: Generates secure tokens

## Error Handling
- Clear error messages for duplicate emails
- Validation for invite expiration
- Proper handling of invalid tokens
- User-friendly feedback throughout the process

## Testing the System
1. **Test Email Uniqueness**:
   - Try to register with an existing email
   - Should see clear error message

2. **Test Invite System**:
   - Create an invite as an organization owner
   - Use the invite link to join as a new user
   - Verify the user is properly associated with the organization

## Troubleshooting
- If you get database errors, make sure to run the SQL script first
- Check that your Supabase RLS policies are properly configured
- Verify that the `profiles` table has the correct structure
- Ensure your organization owners have the correct role permissions 