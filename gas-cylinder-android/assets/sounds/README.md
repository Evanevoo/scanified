# Sound Files for Gas Cylinder App

This directory contains sound files for the gas cylinder scanning app.

## Required Sound Files

To prevent FileNotFoundException errors, the following sound files should be present:

### Default Sounds
- `scan_success.mp3` - Played when a barcode is successfully scanned
- `scan_error.mp3` - Played when a scan fails
- `notification.mp3` - General notification sound
- `action.mp3` - General action sound

### Custom Sounds
- `scan_duplicate.mp3` - Played when duplicate scan is detected
- `batch_start.mp3` - Played when batch scanning starts
- `batch_complete.mp3` - Played when batch scanning completes
- `sync_success.mp3` - Played when sync is successful
- `sync_error.mp3` - Played when sync fails

## Adding Sound Files

1. Add your custom sound files to this directory
2. Ensure they are in MP3 format
3. Keep file sizes reasonable (< 1MB each)
4. Test sounds work on iOS devices

## Fallback Behavior

If sound files are missing, the app will:
1. Log a warning message
2. Fall back to haptic feedback only
3. Continue functioning normally

## Customization

Users can add custom sounds through the Customization screen:
- Go to Settings → Customization → Sounds
- Add new sound files
- Enable/disable specific sounds
- Organize by categories (scan, notification, action, error)
