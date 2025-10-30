# Organization Deletion & User Account Management

## Overview

This system provides comprehensive organization deletion with automatic user account management and a seamless user experience for those affected by deleted organizations.

---

## 🎯 Features

### 1. **Soft Delete with User Account Disabling**
When an organization is deleted:
- ✅ Organization is marked as deleted (not permanently removed)
- ✅ All user accounts in that organization are automatically disabled
- ✅ Users cannot log in to their accounts
- ✅ All data is preserved for potential restoration
- ✅ Deletion reason is recorded for audit trail

### 2. **Automatic User Redirection**
When a user tries to log in:
- ✅ System detects if their organization was deleted
- ✅ System detects if their account was disabled
- ✅ User is automatically signed out
- ✅ Redirected to a helpful error page
- ✅ Given options to create a new organization

### 3. **Create New Organization Flow**
Users from deleted organizations can:
- ✅ Create a brand new organization
- ✅ Start with a fresh 14-day trial
- ✅ Get admin permissions automatically
- ✅ Access full features immediately
- ✅ Cannot recover old data (fresh start)

### 4. **Restoration Process**
When an organization is restored:
- ✅ Organization is marked as active again
- ✅ All user accounts are automatically re-enabled
- ✅ Users can log in immediately
- ✅ All data is accessible again
- ✅ No data loss

---

## 📋 Database Schema Updates

### Organizations Table
```sql
ALTER TABLE organizations 
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
ADD COLUMN deleted_by UUID REFERENCES auth.users(id);
ADD COLUMN deletion_reason TEXT;
```

### Profiles Table (User Accounts)
```sql
ALTER TABLE profiles 
ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
ADD COLUMN disabled_at TIMESTAMPTZ DEFAULT NULL;
ADD COLUMN disabled_reason TEXT;
```

---

## 🔄 User Flow Diagrams

### When Organization is Deleted

```
Owner Portal
    ↓
Delete Organization (with reason)
    ↓
System Actions:
├── Mark organization as deleted
├── Find all users in organization
├── Disable all user accounts
└── Record deletion reason

User State:
├── is_active = false
├── disabled_at = timestamp
└── disabled_reason = "Organization deleted: [reason]"
```

### When User Tries to Login

```
User enters email/password
    ↓
Supabase Authentication ✓
    ↓
Load user profile
    ↓
Check: is_active = false?
    ├── YES → Sign out user
    │         ↓
    │    Show "Account Disabled" message
    │         ↓
    │    Redirect to /organization-deleted
    │         ↓
    │    Offer options:
    │    ├── Create New Organization
    │    └── Back to Login
    │
    └── NO → Check organization
              ↓
         Organization deleted?
              ├── YES → Sign out user
              │         ↓
              │    Redirect to /organization-deleted
              │
              └── NO → Allow login
```

### When Organization is Restored

```
Owner Portal
    ↓
Restore Organization
    ↓
System Actions:
├── Mark organization as active
├── Find all users in organization
├── Re-enable all user accounts
└── Clear deletion data

User State:
├── is_active = true
├── disabled_at = null
└── disabled_reason = null

Result:
└── Users can log in immediately
```

---

## 🛠️ Implementation Details

### 1. Soft Delete Service (`src/services/organizationDeletionService.js`)

#### **softDeleteOrganization()**
```javascript
static async softDeleteOrganization(organizationId, reason, userId) {
  // 1. Get organization info
  // 2. Find all users in organization
  // 3. Disable all user accounts
  // 4. Mark organization as deleted
  // 5. Return success message
}
```

**What it does:**
- Marks organization as deleted
- Disables all associated user accounts
- Records who deleted it and why
- Preserves all data

#### **restoreOrganization()**
```javascript
static async restoreOrganization(organizationId) {
  // 1. Get organization info
  // 2. Find all users in organization
  // 3. Re-enable all user accounts
  // 4. Mark organization as active
  // 5. Return success message
}
```

**What it does:**
- Marks organization as active
- Re-enables all associated user accounts
- Clears deletion metadata
- Makes all data accessible again

### 2. Auth Hook (`src/hooks/useAuth.jsx`)

**Enhanced loadUserData():**
```javascript
// Check 1: Is user account disabled?
if (profileData.is_active === false || profileData.disabled_at) {
  await supabase.auth.signOut();
  window.location.href = `/account-disabled?reason=${reason}`;
  return;
}

// Check 2: Is organization deleted?
if (orgCheck && orgCheck.deleted_at) {
  await supabase.auth.signOut();
  window.location.href = `/organization-deleted?email=${email}&reason=${reason}`;
  return;
}
```

**What it does:**
- Checks account status on every login
- Prevents access to disabled accounts
- Prevents access to deleted organizations
- Provides helpful error messages
- Signs user out automatically

### 3. Organization Deleted Page (`src/pages/OrganizationDeleted.jsx`)

**Features:**
- Shows deletion reason
- Displays user's email
- Offers two options:
  1. Create a new organization
  2. Back to login
- Handles organization creation
- Assigns admin role automatically
- Starts 14-day trial

**Create Organization Flow:**
```javascript
// 1. Get current user
// 2. Generate unique slug
// 3. Create organization
// 4. Create admin role
// 5. Update user profile
// 6. Enable user account
// 7. Redirect to /home
```

---

## 📝 Usage Guide

### For Owners: Deleting an Organization

1. Go to **Owner Portal** → **Customer Management**
2. Click the **Delete** button (trash icon)
3. Enter a reason for deletion (e.g., "Customer requested cancellation")
4. Click **Delete Organization**
5. ✅ Organization and all user accounts are now disabled

**What happens:**
- Organization is marked as deleted
- All users (e.g., john@company.com, jane@company.com) are disabled
- Users cannot log in
- All data is preserved
- You can restore it anytime

### For Users: After Organization is Deleted

1. User tries to log in with their email/password
2. System detects organization was deleted
3. User sees: **"Organization No Longer Available"** page
4. User can choose:
   - **Option A:** Create a new organization
     - Enter organization name
     - Get 14-day trial
     - Start fresh with admin access
   - **Option B:** Go back to login
     - Contact owner for more information

### For Owners: Restoring an Organization

1. Go to **Owner Portal** → **Customer Management**
2. Click **"Show Deleted"** button
3. Find the organization
4. Click the **Restore** button (circular arrow)
5. Review the deletion reason
6. Click **Restore Organization**
7. ✅ Organization and all user accounts are now active

**What happens:**
- Organization is marked as active
- All user accounts are re-enabled
- Users can log in immediately
- All data is accessible again

---

## 🔒 Security & Data Protection

### What is Preserved:
- ✅ Organization data
- ✅ User accounts and profiles
- ✅ Customers
- ✅ Bottles/Assets
- ✅ Rentals
- ✅ Invoices
- ✅ All relationships and references

### What is Cleared:
- ❌ User login access (temporary)
- ❌ Organization active status (temporary)
- ❌ Nothing is permanently deleted

### Audit Trail:
- Who deleted the organization
- When it was deleted
- Why it was deleted
- When accounts were disabled
- Full restoration history

---

## 🚀 Setup Instructions

### 1. Run Database Migration

In Supabase SQL Editor, run:
```sql
-- File: add-soft-delete-to-organizations.sql
-- This adds:
-- - deleted_at, deleted_by, deletion_reason to organizations
-- - is_active, disabled_at, disabled_reason to profiles
```

### 2. Test the Flow

**Test Deletion:**
1. Create a test organization
2. Add a test user
3. Delete the organization
4. Try to log in as the test user
5. Verify redirection to "Organization Deleted" page

**Test Restoration:**
1. Restore the test organization
2. Try to log in as the test user
3. Verify successful login

**Test New Organization Creation:**
1. From "Organization Deleted" page
2. Click "Create New Organization"
3. Enter organization name
4. Verify new organization is created
5. Verify user has admin access

---

## ⚠️ Important Notes

### For Users:
- 📧 **Your email still exists** in the system
- 🔒 **You cannot access your old data** if you create a new organization
- 🆕 **New organization = fresh start** (14-day trial)
- 📞 **Contact the owner** if you think this was a mistake

### For Owners:
- 💾 **All data is preserved** even after deletion
- ♻️ **You can restore anytime** if deletion was accidental
- 📝 **Always provide a reason** for better audit trail
- 👥 **All users will be notified** via error message when they try to log in

### Data Recovery:
- ✅ **Restoration is instant** for both org and users
- ✅ **No data is lost** during soft delete
- ✅ **Users can log in immediately** after restoration
- ❌ **Cannot merge old and new** organizations

---

## 🎯 Best Practices

1. **Always provide a deletion reason**
   - Helps with audit trail
   - Useful if restoration is needed
   - Better user communication

2. **Review before deleting**
   - Check user count
   - Check data volume
   - Confirm with customer if needed

3. **Monitor deleted organizations**
   - Periodically review deleted list
   - Permanently delete only if necessary
   - Keep for compliance/audit purposes

4. **Communicate with users**
   - Inform users before deleting
   - Provide export of their data if needed
   - Offer migration assistance if available

---

## 📊 Statistics & Monitoring

The Owner Portal Dashboard shows:
- **Total Organizations** - Active only
- **Active Subscriptions** - Currently paying
- **Trial Accounts** - In trial period
- **Expired Accounts** - Trial expired
- **Deleted Organizations** - Soft deleted (NEW!)

---

## 🔧 Troubleshooting

### "Cannot log in after organization was restored"
**Solution:** 
- Check if organization is truly restored (deleted_at should be NULL)
- Check if user account is re-enabled (is_active should be TRUE)
- Try clearing browser cache and cookies
- Sign out completely and try again

### "Organization Deleted page shows wrong reason"
**Solution:**
- The reason is stored in the organization record
- Only owner can see/edit the reason
- Contact owner to update the deletion reason

### "Want to recover data after creating new organization"
**Solution:**
- Data cannot be merged automatically
- Contact owner to restore original organization
- Export data from new organization if needed
- Owner can provide data export from old organization

---

## 📞 Support

For issues or questions:
1. Check console logs for detailed error messages
2. Verify database migration was run successfully
3. Confirm user account has is_active column
4. Check organization has deleted_at column
5. Contact support with:
   - User email
   - Organization name
   - Error message
   - Expected behavior

---

## 🎉 Summary

This system provides:
- ✅ Safe organization deletion
- ✅ Automatic user account management
- ✅ Helpful error messages
- ✅ Easy restoration process
- ✅ Option for users to start fresh
- ✅ Complete audit trail
- ✅ No permanent data loss
- ✅ Seamless user experience

**Users from deleted organizations cannot log in and will be prompted to create a new organization or contact support!** 🛡️

