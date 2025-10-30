# Scanified - User Guide

## Welcome to Scanified! 🚀

Scanified is a comprehensive asset tracking and inventory management system designed for gas cylinder and industrial equipment businesses. This guide will help you get started and make the most of all features.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Web Application Features](#web-application-features)
4. [Mobile Application Features](#mobile-application-features)
5. [Common Workflows](#common-workflows)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)

---

## Getting Started

### Creating Your Account

1. Visit the Scanified web application
2. Click "Sign Up" or "Register"
3. Enter your email address and create a strong password
4. Verify your email address (check spam folder if needed)
5. Complete your organization setup

### First-Time Organization Setup

After registering, you'll be guided through:
- **Organization Name**: Your company name
- **Industry Type**: Gas cylinders, industrial equipment, etc.
- **Contact Information**: Phone, email, address
- **Subscription Plan**: Choose the plan that fits your needs

### Logging In

1. Go to the Scanified login page
2. Enter your email and password
3. Click "Sign In"
4. You'll be redirected to your dashboard

---

## User Roles & Permissions

Scanified has three main user roles:

### Owner/Admin
- Full access to all features
- User management and role assignment
- Organization settings and billing
- System configuration
- View all reports and analytics

### Manager
- Manage customers and inventory
- Create and manage deliveries
- Access reports and analytics
- Truck reconciliation
- Maintenance workflow management
- Cannot manage users or billing

### User/Driver
- Scan barcodes (mobile app)
- View assigned deliveries
- Update cylinder status
- View customer information
- Cannot create or delete records

---

## Web Application Features

### Dashboard

The dashboard is your command center:
- **Quick Stats**: Total cylinders, active rentals, pending deliveries
- **Recent Activity**: Latest scans, deliveries, and updates
- **Quick Actions**: Shortcuts to common tasks
- **Charts & Graphs**: Visual analytics

### Customer Management

**Adding a Customer**
1. Navigate to "Customers" in the sidebar
2. Click "+ Add Customer"
3. Fill in customer details:
   - Name (required)
   - Email
   - Phone
   - Address
   - Account number
4. Click "Save"

**Viewing Customer Details**
- Click on any customer in the list
- See complete profile, rental history, and invoices
- Track cylinders assigned to the customer

**Editing/Deleting Customers**
- Click the edit icon next to a customer
- Make changes and click "Update"
- Delete option available (with confirmation)

### Bottle/Cylinder Management

**Adding Cylinders**
1. Go to "Cylinders" or "Bottles"
2. Click "+ Add Cylinder"
3. Enter:
   - Barcode number (auto-generated or manual)
   - Serial number
   - Product code
   - Gas type
   - Size
   - Status (available, rented, maintenance, retired)
4. Click "Save"

**Bulk Import**
1. Navigate to "Import/Export"
2. Select "Cylinders"
3. Upload CSV file (template available)
4. Review validation results
5. Confirm import

**Cylinder Tracking**
- View real-time status of all cylinders
- Filter by status, customer, location
- See complete history (fills, rentals, maintenance)

### Delivery Management

**Creating a Delivery**
1. Go to "Deliveries"
2. Click "+ New Delivery"
3. Select customer
4. Choose delivery type (delivery, pickup, exchange)
5. Add cylinders (scan or select from list)
6. Set scheduled date and time
7. Assign driver (optional)
8. Click "Create Delivery"

**Tracking Deliveries**
- View all deliveries (pending, in-transit, completed)
- Real-time status updates from mobile app
- Route optimization for multiple deliveries
- Delivery history and proof of delivery

### Truck Reconciliation

**Creating a Manifest**
1. Navigate to "Truck Reconciliation"
2. Click "+ Create Manifest"
3. Select driver and truck
4. Add expected cylinders (out/in/exchange)
5. Save manifest

**Reconciling a Truck**
1. Open the pending manifest
2. Click "Start Reconciliation"
3. Step through the process:
   - Verify expected counts
   - Enter actual counts
   - Review discrepancies
   - Add notes
4. Complete reconciliation

**Viewing Reports**
- See accuracy rates and statistics
- Identify patterns in discrepancies
- Export reconciliation data

### Maintenance Workflows

**Creating a Maintenance Workflow**
1. Go to "Maintenance" → "Workflows"
2. Click "+ New Workflow"
3. Enter:
   - Workflow name
   - Description
   - Category (preventive, corrective, inspection)
   - Priority
   - Checklist items
   - Required parts
   - Safety requirements
4. Save workflow

**Scheduling Maintenance**
1. Open a workflow
2. Click "Create Schedule"
3. Choose frequency:
   - Daily
   - Weekly (select days)
   - Monthly (select day)
   - Quarterly
   - Yearly
   - Custom interval
4. Set start date and end date (optional)
5. Assign technician
6. Enable auto-task creation
7. Save schedule

**Managing Maintenance Tasks**
- View all scheduled tasks
- Mark tasks as complete
- Add notes and photos
- Track time spent
- Generate maintenance reports

### Customer Self-Service Portal

**For Your Customers**
Customers can log in to:
- View their cylinder inventory
- Track active rentals
- Schedule deliveries
- Submit service requests
- View and pay invoices
- Download invoice history

**Setting Up Customer Access**
1. Go to "Customers"
2. Select a customer
3. Click "Enable Portal Access"
4. Customer receives email with login instructions

### Import/Export

**Importing Data**
1. Navigate to "Import/Export"
2. Select data type (customers, cylinders, invoices)
3. Download CSV template
4. Fill in data following template format
5. Upload completed CSV
6. Review validation and auto-corrections
7. Approve import

**Exporting Data**
1. Go to any list view (customers, cylinders, etc.)
2. Apply filters (optional)
3. Click "Export"
4. Choose format (CSV, Excel)
5. Download file

### Reports & Analytics

**Available Reports**
- Inventory status report
- Rental history report
- Delivery performance report
- Customer activity report
- Financial summary report
- Maintenance log report
- Truck reconciliation report

**Generating Reports**
1. Navigate to "Reports"
2. Select report type
3. Set date range
4. Apply filters
5. Click "Generate"
6. Export as PDF or CSV

---

## Mobile Application Features

### Initial Setup

**Installing the App**
- Download "Scanified" from App Store (iOS) or Play Store (Android)
- Or use Expo Go for development/testing

**Logging In**
1. Open the app
2. Enter your email and password
3. Grant camera permission when prompted

### Scanning Barcodes

**Basic Scan**
1. Tap the scan icon
2. Point camera at barcode
3. Wait for beep/vibration
4. View scan result
5. Confirm status update

**Scan Modes**
- **Delivery**: Mark cylinders as delivered to customer
- **Pickup**: Mark cylinders as picked up from customer
- **Exchange**: Mark as exchanged (old returned, new delivered)
- **Audit**: Count and verify without status change
- **Maintenance**: Mark for maintenance/repair
- **Locate**: Update location only

**Enhanced Scan Screen**
1. Navigate to "Enhanced Scan"
2. Select order/delivery
3. Scan multiple cylinders
4. See real-time progress
5. Complete when finished

### Offline Mode

**How It Works**
- App stores data locally when offline
- Scans are queued automatically
- Sync happens when connection restored
- Indicator shows sync status

**Manual Sync**
- Pull down to refresh on any screen
- Go to Settings → "Sync Now"

### Delivery Management (Mobile)

**Viewing Assignments**
1. Open app
2. See list of assigned deliveries
3. Tap delivery for details

**Completing a Delivery**
1. Open assigned delivery
2. Scan cylinders as delivered
3. Add notes (optional)
4. Capture signature (if enabled)
5. Mark as complete

### Notifications

**Types of Notifications**
- Scan confirmation
- Delivery assignment
- Sync status updates
- System alerts

**Managing Notifications**
- Go to Settings → "Notifications"
- Enable/disable notification types
- Set quiet hours

---

## Common Workflows

### Workflow 1: New Cylinder Delivery

1. **Web App** (Manager):
   - Add customer (if new)
   - Create delivery order
   - Add cylinders to delivery
   - Assign driver

2. **Mobile App** (Driver):
   - View assigned delivery
   - Navigate to customer location
   - Scan cylinders as delivered
   - Capture signature
   - Mark delivery complete

3. **System**:
   - Updates cylinder status to "rented"
   - Updates customer inventory
   - Creates rental record
   - Triggers invoice generation (if configured)

### Workflow 2: Cylinder Exchange

1. **Mobile App** (Driver):
   - Open customer delivery
   - Select "Exchange" mode
   - Scan empty cylinder (marks as picked up)
   - Scan full cylinder (marks as delivered)
   - Complete transaction

2. **System**:
   - Marks empty cylinder as "returned"
   - Marks full cylinder as "rented"
   - Updates customer inventory
   - Records exchange in history

### Workflow 3: End-of-Day Truck Reconciliation

1. **Web App** (Manager):
   - Create daily manifest before driver leaves
   - Enter expected cylinders

2. **Driver**:
   - Performs deliveries and pickups

3. **Web App** (Manager/Driver):
   - Open manifest
   - Enter actual cylinders returned
   - System calculates discrepancies
   - Add notes for any issues
   - Complete reconciliation

4. **System**:
   - Generates reconciliation report
   - Updates accuracy statistics
   - Flags discrepancies for review

### Workflow 4: Scheduled Maintenance

1. **Setup** (Manager):
   - Create maintenance workflow
   - Set up recurring schedule
   - System auto-generates tasks

2. **Execution** (Technician):
   - Receives notification of upcoming task
   - Opens task in app or web
   - Completes checklist items
   - Records time and parts used
   - Marks task complete

3. **System**:
   - Updates maintenance history
   - Schedules next occurrence
   - Generates reports

---

## Troubleshooting

### Login Issues

**Problem**: Can't log in
**Solutions**:
- Verify email and password
- Check if account is active
- Try "Forgot Password"
- Clear browser cache
- Contact organization admin

### Scanning Issues

**Problem**: Barcode won't scan
**Solutions**:
- Clean camera lens
- Ensure good lighting
- Hold phone steady
- Try manual entry
- Check camera permissions

**Problem**: "Cylinder not found"
**Solutions**:
- Verify cylinder is in system
- Check barcode is correct
- Ensure you're in right organization
- Contact manager to add cylinder

### Sync Issues

**Problem**: Data not syncing
**Solutions**:
- Check internet connection
- Force sync (pull down to refresh)
- Restart app
- Check server status
- Contact support if persists

### Performance Issues

**Problem**: App running slowly
**Solutions**:
- Close other apps
- Restart device
- Clear app cache
- Update to latest version
- Check available storage

---

## FAQ

### General Questions

**Q: How many users can I have?**
A: Depends on your subscription plan. Contact sales for enterprise plans.

**Q: Can I use Scanified for multiple locations?**
A: Yes! You can manage multiple warehouses, trucks, and locations.

**Q: Is my data secure?**
A: Yes. All data is encrypted in transit and at rest. We use Supabase for secure backend infrastructure.

**Q: Can I export my data?**
A: Yes. You can export data to CSV or Excel at any time.

### Technical Questions

**Q: What barcode formats are supported?**
A: We support most common formats including Code 128, EAN-13, UPC-A, QR codes, and more.

**Q: Does the mobile app work offline?**
A: Yes! The app queues data locally and syncs when connection is restored.

**Q: Can I customize the app for my business?**
A: Yes. Contact us about custom branding and feature development.

**Q: What happens if I cancel my subscription?**
A: You'll have 30 days to export your data. After that, data is archived for 90 days before deletion.

### Billing Questions

**Q: How does billing work?**
A: Monthly or annual subscriptions based on number of users and features.

**Q: Can I change my plan?**
A: Yes, at any time. Upgrades are immediate, downgrades take effect next billing cycle.

**Q: Do you offer a free trial?**
A: Yes! 14-day free trial with full access to all features.

---

## Getting Help

### Support Channels

- **Email**: support@scanified.com
- **Phone**: 1-800-SCANIFY
- **Live Chat**: Available in app (Mon-Fri, 9am-5pm)
- **Help Center**: docs.scanified.com
- **Community Forum**: community.scanified.com

### Reporting Bugs

If you encounter a bug:
1. Note what you were doing when it occurred
2. Take screenshots if possible
3. Check if it's reproducible
4. Report via support email with details

### Feature Requests

Have an idea? We'd love to hear it!
- Submit via in-app feedback
- Email features@scanified.com
- Vote on existing requests in community forum

---

## Best Practices

### For Managers
- Set up workflows before training staff
- Regularly review reconciliation reports
- Schedule maintenance proactively
- Keep customer data up to date
- Monitor system analytics

### For Drivers
- Always scan cylinders on delivery/pickup
- Add notes for exceptions
- Complete deliveries same day
- Sync app at start and end of day
- Report issues immediately

### For Administrators
- Regularly audit user permissions
- Monitor system usage
- Keep software updated
- Back up critical data
- Train new users properly

---

## Keyboard Shortcuts (Web App)

- `Ctrl/Cmd + K`: Quick search
- `Ctrl/Cmd + N`: New (context-dependent)
- `Ctrl/Cmd + S`: Save
- `Esc`: Close dialog/modal
- `/`: Focus search bar

---

## Updates & Release Notes

Stay informed about new features:
- Check "What's New" in app
- Subscribe to update emails
- Follow us on social media
- Check our blog regularly

---

**Thank you for using Scanified!** 🎉

This guide is regularly updated. For the latest version, visit docs.scanified.com

*Last Updated: October 30, 2025*

