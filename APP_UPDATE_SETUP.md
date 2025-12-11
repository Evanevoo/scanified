# 📱 App Update Notification System

This guide explains how to set up and use the app update notification system for the mobile apps.

## Overview

The update notification system automatically checks for new app versions and notifies users when updates are available. It supports both iOS and Android platforms.

## Setup Instructions

### 1. Run Database Migration

First, create the `app_versions` table in your Supabase database:

```sql
-- Run this in your Supabase SQL Editor
-- File: supabase/migrations/20250123_create_app_versions_table.sql
```

This will create:
- `app_versions` table to store version information
- Public read access (anyone can check for updates)
- Admin-only write access (only owners can update versions)

### 2. App Store URLs

The migration already includes the correct App Store URLs:
- **iOS**: [https://apps.apple.com/app/scanified/id6749334978](https://apps.apple.com/app/scanified/id6749334978)
- **Android**: https://play.google.com/store/apps/details?id=com.evanevoo.scanifiedandroid

If you need to update these URLs, use:

```sql
-- Update iOS App Store URL
UPDATE app_versions 
SET app_store_url = 'https://apps.apple.com/app/scanified/id6749334978'
WHERE platform = 'ios';

-- Update Android Play Store URL
UPDATE app_versions 
SET play_store_url = 'https://play.google.com/store/apps/details?id=com.evanevoo.scanifiedandroid'
WHERE platform = 'android';
```

### 3. How It Works

1. **Automatic Check**: The app automatically checks for updates when it starts and every 24 hours
2. **Version Comparison**: Compares the current app version with the latest version in the database
3. **Update Notification**: Shows a modal when an update is available
4. **App Store Redirect**: Opens the appropriate app store when user taps "Update"

## Adding a New Version

When you publish a new version, update the database:

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project
2. Navigate to Table Editor → `app_versions`
3. Click "Insert row"
4. Fill in:
   - `platform`: `ios` or `android`
   - `version`: e.g., `1.0.15`
   - `build_number`: e.g., `72` (iOS) or `32` (Android)
   - `is_required`: `true` for critical updates, `false` for optional
   - `release_notes`: What's new in this version
   - `app_store_url`: iOS App Store URL (iOS only)
   - `play_store_url`: Google Play Store URL (Android only)
   - `is_active`: `true`

### Option 2: Using SQL

```sql
-- Add new iOS version
INSERT INTO app_versions (platform, version, build_number, is_required, release_notes, app_store_url)
VALUES (
  'ios',
  '1.0.15',
  '72',
  false,
  'Bug fixes and performance improvements',
  'https://apps.apple.com/app/scanified/id6749334978'
);

-- Add new Android version
INSERT INTO app_versions (platform, version, build_number, is_required, release_notes, play_store_url)
VALUES (
  'android',
  '1.0.15',
  '32',
  false,
  'Bug fixes and performance improvements',
  'https://play.google.com/store/apps/details?id=com.evanevoo.scanifiedandroid'
);
```

### Option 3: Deactivate Old Versions

When adding a new version, you can deactivate old versions:

```sql
-- Deactivate all old versions for a platform
UPDATE app_versions 
SET is_active = false 
WHERE platform = 'ios' AND version != '1.0.15';
```

## Features

### Required vs Optional Updates

- **Required Updates** (`is_required = true`):
  - User cannot dismiss the modal
  - Must update to continue using the app
  - Use for critical security fixes or breaking changes

- **Optional Updates** (`is_required = false`):
  - User can dismiss and update later
  - Use for new features or minor improvements

### Release Notes

Include release notes to inform users about what's new:

```sql
UPDATE app_versions 
SET release_notes = '✨ New features:
• Enhanced barcode scanning
• Improved offline sync
• Bug fixes and performance improvements'
WHERE platform = 'ios' AND version = '1.0.15';
```

## Testing

### Test Update Notification

1. Insert a test version with a higher version number:
```sql
INSERT INTO app_versions (platform, version, build_number, is_required, release_notes)
VALUES ('ios', '99.0.0', '999', false, 'Test update notification');
```

2. Restart the app - you should see the update modal

3. Clean up test version:
```sql
DELETE FROM app_versions WHERE version = '99.0.0';
```

## Current Versions

- **iOS**: 1.2 (Published on App Store - [View on App Store](https://apps.apple.com/app/scanified/id6749334978))
- **Android**: 1.0.14 (Build 31)

> **Note**: The App Store shows version 1.2 as the current published version. The app.json files may show different version numbers for development builds. Always update the database with the version that's actually published on the App Store.

## Troubleshooting

### Update modal not showing

1. Check that `app_versions` table exists and has data
2. Verify the version in database is higher than app version
3. Check app logs for errors
4. Ensure `is_active = true` for the version record

### Wrong app store URL

1. Update the URL in the `app_versions` table
2. The app will use the URL from the database

### Version comparison not working

The version comparison uses simple string comparison. For versions like `1.0.14` vs `1.0.15`, it works correctly. For more complex versioning, consider using a semver library.

## Files Modified

- `gas-cylinder-android/hooks/useAppUpdate.ts` - Update check hook
- `gas-cylinder-android/components/UpdateModal.tsx` - Update notification modal
- `gas-cylinder-android/App.tsx` - Integrated update check
- `gas-cylinder-mobile/hooks/useAppUpdate.ts` - Update check hook (iOS)
- `gas-cylinder-mobile/components/UpdateModal.tsx` - Update notification modal (iOS)
- `gas-cylinder-mobile/App.tsx` - Integrated update check (iOS)
- `supabase/migrations/20250123_create_app_versions_table.sql` - Database migration

## Notes

- The update check runs automatically on app start and every 24 hours
- Users with required updates cannot dismiss the modal
- Optional updates can be dismissed and will show again on next app start
- The system respects the app's current version from `app.json`

