# Soft Delete System for Organizations

## Overview

The soft delete system allows you to "delete" organizations without permanently removing them from the database. This provides a safety net in case an organization is deleted by accident, allowing you to restore it later with all its data intact.

## Features

### ✅ **Soft Delete**
- Organizations are marked as deleted but remain in the database
- All related data (users, customers, bottles, etc.) is preserved
- Deletion reason is recorded for audit trail
- Deleted by user is tracked
- Deletion timestamp is recorded

### ♻️ **Restore**
- Deleted organizations can be restored at any time
- All data is immediately accessible again
- Original deletion reason is shown during restore

### 🔒 **Data Protection**
- No data is permanently lost
- Foreign key relationships remain intact
- Easy recovery in case of accidents

## Setup Instructions

### 1. Run Database Migration

First, run the SQL migration to add soft delete columns to the organizations table:

```sql
-- Run this in your Supabase SQL editor
-- File: add-soft-delete-to-organizations.sql
```

This adds:
- `deleted_at` - Timestamp when organization was deleted (NULL = active)
- `deleted_by` - User ID who performed the deletion
- `deletion_reason` - Reason provided for deletion

### 2. Implementation Details

The soft delete system consists of:

#### **Backend Service** (`src/services/organizationDeletionService.js`)
- `softDeleteOrganization()` - Mark organization as deleted
- `restoreOrganization()` - Restore a deleted organization
- `permanentlyDeleteOrganization()` - Permanently delete (use with caution!)
- `getDeletionPreview()` - Preview what data belongs to an organization

#### **Frontend UI** (`src/pages/OwnerPortal/OwnerCustomers.jsx`)
- Toggle to show/hide deleted organizations
- Visual indicators for deleted organizations (red background, opacity)
- Restore button for deleted organizations
- Delete confirmation dialog with reason field
- Restore confirmation dialog showing original deletion reason

#### **Auth Hook** (`src/hooks/useAuth.jsx`)
- Automatically filters out deleted organizations
- Users cannot access deleted organizations
- Organization reload checks for soft-deleted status

## User Guide

### How to Delete an Organization

1. Go to **Owner Portal** → **Customer Management**
2. Find the organization you want to delete
3. Click the **Delete** (trash icon) button
4. Enter a reason for deletion (optional but recommended)
5. Click **Delete Organization**
6. The organization will be marked as deleted and hidden from the list

### How to View Deleted Organizations

1. Go to **Owner Portal** → **Customer Management**
2. Click the **Show Deleted** button in the search bar
3. Deleted organizations will appear with:
   - Red background tint
   - "DELETED" chip next to the name
   - Deletion date displayed
   - Reduced opacity

### How to Restore a Deleted Organization

1. Click **Show Deleted** to view deleted organizations
2. Find the organization you want to restore
3. Click the **Restore** (circular arrow) button
4. Review the original deletion reason
5. Click **Restore Organization**
6. The organization will be immediately active again

### Statistics Dashboard

The Customer Management page shows:
- **Total Organizations** - Active organizations only
- **Active Subscriptions** - Organizations with active status
- **Trial Accounts** - Organizations in trial period
- **Expired Accounts** - Organizations with expired subscriptions
- **Deleted Organizations** - Count of soft-deleted organizations

## Technical Details

### Database Schema

```sql
organizations (
  id UUID PRIMARY KEY,
  name TEXT,
  ...
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  deleted_by UUID REFERENCES auth.users(id),
  deletion_reason TEXT
)
```

### Query Filtering

**Active organizations only:**
```javascript
const { data } = await supabase
  .from('organizations')
  .select('*')
  .is('deleted_at', null);
```

**All organizations (including deleted):**
```javascript
const { data } = await supabase
  .from('organizations')
  .select('*');
```

**Deleted organizations only:**
```javascript
const { data } = await supabase
  .from('organizations')
  .select('*')
  .not('deleted_at', 'is', null);
```

### Service Usage

```javascript
import { OrganizationDeletionService } from '../../services/organizationDeletionService';

// Soft delete
const result = await OrganizationDeletionService.softDeleteOrganization(
  organizationId,
  'Customer requested cancellation',
  userId
);

// Restore
const result = await OrganizationDeletionService.restoreOrganization(
  organizationId
);

// Get preview before deletion
const preview = await OrganizationDeletionService.getDeletionPreview(
  organizationId
);
```

## Best Practices

### ✅ **Do:**
- Always provide a reason when deleting
- Review the deletion reason before restoring
- Use the preview feature to understand impact
- Periodically review deleted organizations
- Keep soft-deleted data for audit purposes

### ❌ **Don't:**
- Use permanent delete unless absolutely necessary
- Delete organizations without a reason
- Restore without reviewing the original deletion reason
- Assume deleted data is lost (it's not!)

## Permanent Deletion

⚠️ **WARNING:** Permanent deletion removes all data and cannot be undone!

If you need to permanently delete an organization (e.g., for GDPR compliance):

1. Use the `permanentlyDeleteOrganization()` method from the service
2. This will delete ALL related data in the correct order:
   - Bottle scans
   - Bottles
   - Customers
   - Rentals
   - Invoices
   - Organization invites
   - User profiles
   - The organization itself

```javascript
const result = await OrganizationDeletionService.permanentlyDeleteOrganization(
  organizationId
);
```

## Troubleshooting

### "Organization not found" error
- The organization may already be deleted
- Check if you need to show deleted organizations first

### Cannot access organization after login
- The organization may have been soft-deleted
- Contact the owner to restore the organization

### Foreign key constraint errors
- Use the soft delete feature instead of direct SQL DELETE
- The service handles all relationships correctly

## Migration from Hard Delete

If you previously had a hard delete system:

1. Run the migration script to add columns
2. Update your code to use the new service
3. Test the soft delete/restore flow
4. Deploy to production
5. Monitor for any issues

## Support

For issues or questions:
- Check the console logs for detailed error messages
- Review the deletion preview before proceeding
- Contact support with the organization ID and error details

