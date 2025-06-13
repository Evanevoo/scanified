# Days at Location - Automatic Daily Updates

This document explains the automatic daily update system for the "Days at Location" field in the gas cylinder management system.

## Overview

The system **automatically** increments the `days_at_location` field for all bottles daily until they are scanned as returned. This happens completely in the background without any manual intervention required.

## How It Works

1. **Automatic Daily Increment**: Every day at midnight, the system automatically increments `days_at_location` by 1 for all bottles
2. **Reset on Return**: When a bottle is scanned as returned, `days_at_location` is reset to 0
3. **Initialize on Assignment**: When a bottle is first assigned to a location, `days_at_location` is set to 1
4. **Background Service**: Runs automatically when the app starts and handles all updates

## Automatic Background Service

The system includes a background service that:

- **Starts automatically** when the app loads
- **Checks every hour** if an update is needed
- **Runs updates** when a new day is detected
- **Prevents duplicate updates** (only updates once per day)
- **Persists state** across browser sessions using localStorage
- **Handles page visibility** changes (updates when user returns to tab)

## Database Schema Requirements

Make sure your `bottles` table has these columns:

```sql
ALTER TABLE bottles ADD COLUMN IF NOT EXISTS days_at_location INTEGER DEFAULT 0;
ALTER TABLE bottles ADD COLUMN IF NOT EXISTS last_location_update DATE;
```

## Files and Components

### Core Files:
- `src/utils/daysAtLocationUpdater.js` - Core update logic
- `src/utils/backgroundService.js` - Automatic background service
- `src/App.jsx` - Imports background service (auto-starts)

### Integration:
- The background service is automatically imported and started when the app loads
- No manual setup or configuration required
- Works across all user sessions

## How the Automatic System Works

### 1. App Startup
When the app loads, the background service automatically:
- Loads the last update date from localStorage
- Starts monitoring for new days
- Runs initial check for updates

### 2. Daily Monitoring
The service continuously monitors:
- **Hourly checks**: Every hour to see if a new day has started
- **Page visibility**: When user returns to the tab
- **Window focus**: When app regains focus

### 3. Update Process
When a new day is detected:
- Fetches all bottles with `days_at_location` set
- Increments the counter by 1
- Updates `last_location_update` to today's date
- Stores the update date in localStorage
- Prevents duplicate updates for the same day

### 4. Reset Process
When bottles are returned:
- `days_at_location` is reset to 0
- `last_location_update` is updated
- Counter starts fresh for next assignment

## Visual Indicators

The BottleImport page shows:
- ✅ **"Auto-updates running"** indicator in the header
- Real-time display of current `days_at_location` values
- Automatic refresh of data when updates occur

## Monitoring and Logging

The system provides comprehensive logging:
- Console logs for all update activities
- Success/failure status for each update
- Number of bottles updated
- Error messages if updates fail

### Console Logs to Watch For:
```
Starting background service for daily updates...
New day detected, running daily update...
Automatic update completed: X bottles updated
Already updated today, skipping...
```

## Troubleshooting

### Common Issues:

1. **No bottles updated**: 
   - Check if bottles have `days_at_location` field set
   - Verify database permissions

2. **Updates not running**:
   - Check browser console for error messages
   - Verify background service is loaded in App.jsx

3. **Duplicate updates**:
   - System prevents this automatically
   - Check `last_location_update` field in database

### Debug Mode:

Open browser console to see:
- Background service status
- Update attempts and results
- Error messages
- Last update dates

## Advanced Configuration

### For Production Deployment:

The automatic system works for most use cases, but you can also set up server-side cron jobs for additional reliability:

1. **Vercel**: Add cron jobs in `vercel.json`
2. **Netlify**: Use Netlify Functions with cron triggers
3. **External Services**: Use cron-job.org or similar services

### Manual Override (Development Only):

For testing purposes, you can manually trigger updates in the browser console:

```javascript
// Check service status
backgroundService.getStatus()

// Manually trigger update (for testing)
import('./utils/daysAtLocationUpdater.js').then(module => {
  module.manualUpdateDaysAtLocation();
});
```

## Security and Performance

- **Efficient**: Only updates bottles that need updating
- **Safe**: Prevents duplicate updates
- **Lightweight**: Minimal impact on app performance
- **Persistent**: Works across browser sessions
- **Reliable**: Multiple trigger mechanisms ensure updates run

## Next Steps

1. ✅ **Automatic system is already running** - no setup required
2. Monitor console logs to ensure updates are working
3. Check bottle data to verify `days_at_location` is incrementing
4. Consider adding notifications for bottles at locations for extended periods
5. Set up server-side cron jobs for additional reliability (optional) 