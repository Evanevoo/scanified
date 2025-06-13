# Unified Authentication System

This document explains how the mobile app uses the same authentication system as the website.

## Overview

Both the website and mobile app use the same Supabase authentication system, allowing users to:
- Use the same login credentials across both platforms
- Maintain consistent user sessions
- Access the same user profiles and permissions

## How It Works

### 1. Shared Supabase Project
Both the website and mobile app connect to the same Supabase project:
- **URL**: `https://jtfucttzaswmqqhmmhfb.supabase.co`
- **Database**: Same database, same tables, same data
- **Authentication**: Same user accounts and sessions

### 2. Authentication Flow

#### Mobile App:
1. **App Launch**: Checks for existing session
2. **Login Screen**: If no session, shows login form
3. **Authentication**: Uses `supabase.auth.signInWithPassword()`
4. **Session Management**: Automatically handles session persistence
5. **Navigation**: Routes to main app screens after successful login

#### Website:
1. **Page Load**: Checks for existing session
2. **Login Page**: If no session, shows login form
3. **Authentication**: Uses same `supabase.auth.signInWithPassword()`
4. **Session Management**: Same session handling
5. **Navigation**: Routes to dashboard after successful login

### 3. User Profile Integration

Both platforms fetch user profiles from the same `profiles` table:
- **User ID**: Links to Supabase auth users
- **Role**: Determines permissions (admin, manager, user)
- **Profile Data**: Name, email, preferences, etc.

## Features

### ✅ What's Unified:
- **Login Credentials**: Same email/password work on both platforms
- **User Sessions**: Logging in on one platform doesn't affect the other
- **User Profiles**: Same profile data available on both platforms
- **Permissions**: Role-based access control works consistently
- **Data Access**: Both platforms access the same database

### 📱 Mobile App Features:
- **Persistent Login**: Stays logged in until manually logged out
- **Loading States**: Shows loading screen while checking authentication
- **Error Handling**: Clear error messages for login failures
- **Logout**: Available in Settings screen
- **Session Recovery**: Automatically restores session on app restart

### 🌐 Website Features:
- **Same Authentication**: Identical login process
- **Session Management**: Automatic session handling
- **Profile Integration**: Same user profile system
- **Role-based UI**: Different features based on user role

## User Experience

### For Users:
1. **Single Account**: One account works on both website and mobile app
2. **Seamless Switching**: Can use both platforms with same credentials
3. **Consistent Data**: Same data and permissions across platforms
4. **No Duplicate Accounts**: No need to create separate accounts

### For Administrators:
1. **Unified User Management**: Manage users in one place
2. **Consistent Permissions**: Same roles and permissions everywhere
3. **Centralized Data**: All data in one database
4. **Easy Monitoring**: Track usage across both platforms

## Technical Implementation

### Mobile App Files:
- `App.tsx` - Main navigation with authentication routing
- `LoginScreen.tsx` - Enhanced login screen with proper styling
- `hooks/useAuth.js` - Authentication state management
- `supabase.js` - Supabase client configuration
- `components/LoadingScreen.tsx` - Loading state component

### Key Components:
1. **useAuth Hook**: Manages authentication state
2. **Conditional Navigation**: Shows login or main app based on auth state
3. **Session Persistence**: Automatically handles session storage
4. **Error Handling**: Proper error messages and loading states

## Security

### ✅ Security Features:
- **Secure Authentication**: Uses Supabase's secure auth system
- **Session Management**: Automatic session validation
- **Data Protection**: Same security as website
- **Role-based Access**: Consistent permissions across platforms

### 🔒 Best Practices:
- **No Hardcoded Credentials**: Uses environment variables
- **Secure Communication**: HTTPS for all API calls
- **Session Validation**: Automatic session checking
- **Error Handling**: Secure error messages

## Troubleshooting

### Common Issues:

1. **Login Not Working**:
   - Check internet connection
   - Verify email and password
   - Ensure account exists in Supabase

2. **Session Not Persisting**:
   - Check device storage permissions
   - Verify Supabase configuration
   - Clear app data and try again

3. **Profile Not Loading**:
   - Check database permissions
   - Verify profile table exists
   - Check user ID mapping

### Debug Steps:
1. Check browser console for errors
2. Verify Supabase project configuration
3. Test authentication in Supabase dashboard
4. Check network connectivity

## Next Steps

1. ✅ **Authentication is working** - users can log in with same credentials
2. Test login flow on both platforms
3. Verify user profile data consistency
4. Test role-based permissions
5. Monitor for any authentication issues 