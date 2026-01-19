# iOS Build and Submit to App Store Connect

## Prerequisites
1. Make sure you're logged into EAS: `eas login`
2. Make sure you have Apple Developer account access configured

## Steps

### 1. Navigate to iOS project
```bash
cd gas-cylinder-mobile
```

### 2. Build iOS production app
```bash
eas build --platform ios --profile production
```

This will:
- Increment build number automatically (currently at 86)
- Use remote iOS credentials
- Build the app for App Store submission

### 3. Wait for build to complete
The build will take 15-30 minutes. You'll get a notification when it's done.

### 4. Submit to App Store Connect
Once the build is complete, submit it:
```bash
eas submit --platform ios --profile production
```

Or you can submit manually from App Store Connect:
1. Go to https://appstoreconnect.apple.com
2. Navigate to your app (App ID: 6749334978)
3. Create a new version or update existing
4. Select the build from the list
5. Submit for review

## Current App Info
- **Name**: Scanified
- **Bundle ID**: com.evanevoo.scanifiedmobile
- **Version**: 1.0.16
- **Build Number**: 86 (will auto-increment)
- **App Store Connect App ID**: 6749334978

## Notes
- The build uses auto-increment for build numbers
- Remote credentials are configured
- Make sure all environment variables are set in EAS dashboard
