# Yearly Invoice Notification System

## Overview

The Yearly Invoice Notification System automatically reminds organizations to send invoices for yearly rental customers starting January 1st of each year. This system helps ensure timely billing and revenue collection for annual rental agreements.

## System Components

### 1. Database Tables

#### `notifications` table
- Stores all notifications for organizations
- Includes priority levels, action URLs, expiration dates
- Supports real-time updates via Supabase subscriptions

#### `yearly_invoice_tracking` table
- Tracks yearly rental invoice generation status
- Prevents duplicate notifications
- Stores customer totals and due dates

### 2. Backend Services

#### `NotificationService` (`src/services/notificationService.js`)
- Handles all notification CRUD operations
- Provides real-time subscription functionality
- Includes utility functions for formatting and display

#### Database Functions
- `generate_yearly_rental_notifications()` - PostgreSQL function that:
  - Finds all organizations with yearly rental customers
  - Creates tracking records for each customer
  - Generates notifications for organizations
  - Prevents duplicate notifications

### 3. Frontend Components

#### `NotificationCenter` (`src/components/NotificationCenter.jsx`)
- Bell icon with unread count badge
- Dropdown menu showing recent notifications
- Click handling for navigation to relevant pages
- Real-time updates via Supabase subscriptions

#### Rentals Page Integration (`src/pages/Rentals.jsx`)
- "Generate Yearly Invoice Notifications" button
- Creates individual notifications for each yearly customer
- Summary notification with total revenue and customer count

### 4. Automated Scheduling

#### Netlify Function (`netlify/functions/yearly-invoice-notifications.js`)
- Runs automatically to generate notifications
- Only executes in January (month 1)
- Calls PostgreSQL function to generate notifications
- Provides test endpoint for manual testing

## Setup Instructions

### 1. Database Migration

Run the migration to create the notification tables:

```sql
-- Apply the migration
supabase migration up
```

Or manually run the SQL from:
`supabase/migrations/20250101000002_create_notifications_system.sql`

### 2. Enable Real-time

Make sure Supabase real-time is enabled for the `notifications` table in your Supabase dashboard.

### 3. Add NotificationCenter to Navigation

The `NotificationCenter` component should be added to your main navigation bar. Example:

```jsx
// In src/components/Navbar.jsx or MainLayout.jsx
import NotificationCenter from './NotificationCenter';

// Add to your navigation
<NotificationCenter />
```

### 4. Set Up Automated Scheduling

#### Option A: Netlify Scheduled Functions (Recommended)

Add to your `netlify.toml`:

```toml
[build]
  functions = "netlify/functions"

# Schedule yearly invoice notifications for January 1st at 9:00 AM
[[plugins]]
  package = "@netlify/plugin-scheduled-functions"
  
  [plugins.inputs]
    [plugins.inputs.yearly-invoice-notifications]
      schedule = "0 9 1 1 *"  # January 1st at 9:00 AM
```

#### Option B: GitHub Actions

Create `.github/workflows/yearly-notifications.yml`:

```yaml
name: Generate Yearly Invoice Notifications

on:
  schedule:
    - cron: '0 9 1 1 *'  # January 1st at 9:00 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  generate-notifications:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Netlify Function
        run: |
          curl -X POST "https://your-site.netlify.app/.netlify/functions/yearly-invoice-notifications"
```

#### Option C: External Cron Service

Use services like:
- Cron-job.org
- EasyCron
- AWS EventBridge
- Google Cloud Scheduler

Set them to call:
`POST https://your-site.netlify.app/.netlify/functions/yearly-invoice-notifications`

### 5. Testing the System

#### Manual Testing

1. **Test Notification Creation**:
   - Go to `/rentals`
   - Click "Generate Yearly Invoice Notifications"
   - Check notification bell for new notifications

2. **Test Automated Function**:
   ```bash
   # Test the Netlify function
   curl "https://your-site.netlify.app/.netlify/functions/yearly-invoice-notifications?test=true"
   ```

3. **Test Database Function**:
   ```sql
   -- In Supabase SQL editor
   SELECT generate_yearly_rental_notifications();
   
   -- Check notifications created
   SELECT * FROM notifications WHERE type = 'yearly_invoice' ORDER BY created_at DESC;
   ```

## Notification Flow

### January 1st Automatic Process

1. **Scheduler triggers** Netlify function at 9:00 AM
2. **Function checks** if it's January (month 1)
3. **PostgreSQL function executes**:
   - Finds organizations with yearly rentals
   - Creates `yearly_invoice_tracking` records
   - Generates notifications for each organization
4. **Organizations receive** high-priority notifications
5. **Users click** notification bell to see alerts
6. **Action buttons** navigate to rental management page

### Manual Process (Any Time)

1. **User visits** `/rentals` page
2. **Clicks** "Generate Yearly Invoice Notifications" button
3. **System creates** individual notifications for each yearly customer
4. **Summary notification** shows total customers and revenue
5. **Notifications appear** in notification center immediately

## Notification Types

### Individual Customer Notifications
- **Title**: "Yearly Rental Invoice Due - [Customer Name]"
- **Message**: Invoice details with bottle count and total amount
- **Priority**: High
- **Action**: Navigate to customer-specific view

### Summary Notifications  
- **Title**: "Yearly Rental Invoices Ready - [Year]"
- **Message**: Total customers and revenue summary
- **Priority**: High
- **Action**: Navigate to yearly rentals tab

## Customization Options

### Notification Timing
- Change schedule in `netlify.toml` or cron service
- Modify due date in PostgreSQL function (currently Jan 31st)
- Adjust expiration date for notifications

### Notification Content
- Edit titles and messages in `generate_yearly_rental_notifications()` function
- Modify priority levels and action URLs
- Add custom data fields for specific organization needs

### UI Customization
- Modify `NotificationCenter` component styling
- Add custom icons for different notification types
- Change colors and priority indicators

## Monitoring and Maintenance

### Check System Health

```sql
-- Count notifications by type and date
SELECT 
  type, 
  DATE(created_at) as date,
  COUNT(*) as count 
FROM notifications 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY type, DATE(created_at)
ORDER BY date DESC;

-- Check yearly invoice tracking
SELECT 
  invoice_year,
  COUNT(*) as customers,
  SUM(total_amount) as total_revenue,
  COUNT(CASE WHEN notification_sent THEN 1 END) as notifications_sent
FROM yearly_invoice_tracking 
GROUP BY invoice_year
ORDER BY invoice_year DESC;
```

### Clear Old Notifications

```sql
-- Delete notifications older than 90 days
DELETE FROM notifications 
WHERE created_at < NOW() - INTERVAL '90 days'
AND is_read = true;
```

### Reset for Testing

```sql
-- Clear this year's notifications for testing
DELETE FROM notifications 
WHERE type = 'yearly_invoice' 
AND data->>'year' = '2025';

DELETE FROM yearly_invoice_tracking 
WHERE invoice_year = 2025;
```

## Troubleshooting

### Common Issues

1. **No notifications appearing**:
   - Check if migration was applied
   - Verify organization has yearly rental customers
   - Check real-time subscriptions are enabled

2. **Function not running automatically**:
   - Verify cron schedule is correct
   - Check Netlify function logs
   - Test function manually with `?test=true`

3. **Duplicate notifications**:
   - System prevents duplicates via database constraints
   - Check `yearly_invoice_tracking` table for conflicts

4. **Missing customer data**:
   - Verify customers have `customer_type` field
   - Check rental records have correct `rental_type`
   - Ensure organization IDs match

### Debug Mode

Enable debug logging by setting environment variable:
```
REACT_APP_DEBUG_NOTIFICATIONS=true
```

This will show detailed console logs for notification operations.

## Future Enhancements

- Email notifications in addition to in-app notifications
- SMS notifications for urgent reminders
- Custom notification templates per organization
- Integration with accounting systems (QuickBooks, Xero)
- Automated invoice generation and sending
- Payment reminder notifications
- Dashboard analytics for notification engagement

---

**Note**: This system is designed to run autonomously after setup. The January 1st notifications will be generated automatically each year, but organizations can also manually generate notifications any time using the "Generate Yearly Invoice Notifications" button in the rentals page.