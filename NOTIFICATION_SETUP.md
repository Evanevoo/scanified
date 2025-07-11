# Notification System Setup Guide

This guide explains how to set up the notification system for support tickets and other events in your gas cylinder management app.

## Overview

The notification system provides real-time notifications for:
- **New Support Tickets**: Owners get notified when organizations submit new tickets
- **Ticket Replies**: Users get notified when there's a reply to their ticket
- **Status Changes**: Users get notified when ticket status changes

## Database Setup

### 1. Create Support Tables

First, run the SQL from `create-support-tables.html` to create the support ticket tables.

### 2. Create Notifications Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (
        user_id = auth.uid() OR 
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (
        user_id = auth.uid() OR 
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (
        user_id = auth.uid() OR 
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- Allow system to create notifications for users
CREATE POLICY "Allow system to create notifications" ON notifications
    FOR INSERT WITH CHECK (true);
```

## How It Works

### 1. Notification Bell

The notification bell appears in the top navigation bar and shows:
- **Badge count**: Number of unread notifications
- **Dropdown menu**: List of recent notifications
- **Click to navigate**: Click notifications to go to relevant pages

### 2. Support Ticket Notifications

#### When Organizations Submit Tickets:
1. Organization user submits a ticket via `/support`
2. System creates notification for all owners
3. Owners see notification in their bell
4. Clicking notification takes them to `/owner-portal/support`

#### When Owners Reply to Tickets:
1. Owner replies to ticket via `/owner-portal/support`
2. System creates notification for ticket creator
3. User sees notification in their bell
4. Clicking notification takes them to `/support`

### 3. Notification Types

- **New Ticket**: `type: 'support_ticket', action: 'new_ticket'`
- **Ticket Reply**: `type: 'support_ticket', action: 'ticket_reply'`
- **Status Change**: `type: 'support_ticket', action: 'status_change'`

## Components

### NotificationService (`src/services/notificationService.js`)
Handles all notification operations:
- `createNotification()` - Create new notification
- `getNotifications()` - Get user's notifications
- `markAsRead()` - Mark notification as read
- `getUnreadCount()` - Get unread count
- `notifyOwnerOfNewTicket()` - Notify owners of new ticket
- `notifyUserOfTicketReply()` - Notify user of reply

### NotificationCenter (`src/components/NotificationCenter.jsx`)
The notification bell component that:
- Shows unread count badge
- Displays notification dropdown
- Handles notification clicks
- Provides mark as read functionality

## Testing the System

### 1. Test as Organization User:
1. Log in as an organization user
2. Go to `/support`
3. Submit a new ticket
4. Check that owners get notified

### 2. Test as Owner:
1. Log in as an owner
2. Check notification bell for new ticket notification
3. Go to `/owner-portal/support`
4. Reply to the ticket
5. Check that organization user gets notified

### 3. Test Notifications:
1. Click notification bell to see dropdown
2. Click on notifications to navigate
3. Mark notifications as read
4. Delete notifications

## Troubleshooting

### Notifications Not Appearing
1. Check that both tables exist (`support_tickets`, `notifications`)
2. Verify RLS policies are correct
3. Check browser console for errors
4. Ensure user has proper permissions

### Notification Bell Not Showing
1. Check that user is logged in
2. Verify NotificationCenter component is imported in Navbar
3. Check for JavaScript errors

### Real-time Updates Not Working
1. Check Supabase real-time subscriptions
2. Verify database triggers are set up
3. Check network connectivity

## Customization

### Adding New Notification Types
1. Add new case in `getNotificationIcon()` function
2. Update notification creation logic
3. Add navigation handling in `handleNotificationClick()`

### Styling
- Modify `NotificationCenter.jsx` for visual changes
- Update notification colors and icons
- Customize dropdown appearance

### Auto-cleanup
The system includes an optional cleanup function that deletes notifications older than 30 days. You can schedule this to run periodically.

## Security

- Notifications are protected by Row Level Security (RLS)
- Users can only see their own notifications
- System can create notifications for any user
- Notifications are automatically cleaned up after 30 days

## Performance

- Notifications are paginated (10 per page by default)
- Indexes are created for fast queries
- Real-time updates use efficient subscriptions
- Old notifications are automatically cleaned up 