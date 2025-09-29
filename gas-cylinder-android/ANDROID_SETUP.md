# Android Setup Guide for Scanified

This is the **Android version** of the Scanified mobile app, completely separated from the iOS version.

## Key Differences from iOS Version

### Platform Configuration
- **Platform**: Android only (`"platforms": ["android"]`)
- **Package Name**: `com.evanevoo.scanifiedandroid`
- **Build System**: EAS Build for Android

### Android-Specific Features
- **Adaptive Icons**: Android adaptive icon support
- **Android Permissions**: Camera and audio permissions
- **Google Play Store**: Ready for Google Play Store submission

## Development Setup

### Prerequisites
- Node.js 16+
- Android Studio (for Android development)
- Java Development Kit (JDK)
- Android SDK

### Installation
```bash
cd gas-cylinder-android
npm install
```

### Development Commands
```bash
# Start development server for Android
npm start

# Run on Android device/emulator
npm run android

# Build for Android
npm run build:android

# Submit to Google Play Store
npm run submit:android
```

## Build Configuration

### EAS Build Profiles
- **Development**: `npm run build:android-dev`
- **Preview**: `npm run build:android-preview`
- **Production**: `npm run build:android`

### Google Play Store Submission
1. Build production APK/AAB
2. Upload to Google Play Console
3. Configure store listing
4. Submit for review

## App Configuration

### Android-Specific Settings
- **Package**: `com.evanevoo.scanifiedandroid`
- **Version Code**: 25
- **Adaptive Icon**: Configured for Android
- **Permissions**: Camera and audio permissions

### Features
- Barcode scanning for asset management
- Offline synchronization
- Real-time data sync
- Android-optimized UI/UX

## Deployment

This Android app is completely separate from the iOS version and can be developed, built, and deployed independently.

## Important Notes

- **Separate Codebase**: This is a separate app from the iOS version
- **Google Play Store**: Submit to Google Play Store only
- **Android-Only**: No iOS references or dependencies
- **Independent Development**: Can be developed without affecting iOS app
