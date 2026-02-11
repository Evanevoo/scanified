# Android Design Backup

A backup of the Android app UI **before** the design improvements (Ionicons, theme consistency, MobileCard layout, 48px touch targets) was saved so you can revert if needed.

## How to revert to the old design

From the repo root:

```bash
# Restore only the gas-cylinder-android folder to the state at backup
git checkout backup/android-pre-design-improvements -- gas-cylinder-android/
```

Then commit the reverted files if you want to keep that state.

## What was changed (current design)

- **HomeScreen**: Replaced emoji icons with Ionicons (notifications, settings, search, camera, quick action icons). Header and scan button use 48×48px touch targets. Quick actions use `MobileCard` with Ionicons.
- **CustomerDetailsScreen**: Uses `useTheme()` throughout. Content grouped in `MobileCard` sections (header, contact, address, cylinders). Ionicons for contact/address/cylinder list. Cylinder rows are tappable and navigate to CylinderDetails. Empty and error states use theme colors and icons.
- **SettingsScreen**: Profile and all sections wrapped in `MobileCard`. Duplicate "Notifications" row removed. Chevrons use `Ionicons` (`chevron-forward`). Destructive actions and Sign Out use `colors.error`. Status dot uses `colors.success` / `colors.error`.

## Backup branch

- **Branch name**: `backup/android-pre-design-improvements`
- **Created**: Before applying the design changes on the current branch (e.g. `main`).
