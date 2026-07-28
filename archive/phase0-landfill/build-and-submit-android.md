# Android Build and Submit to Google Play Console

## Prerequisites
1. Make sure you're logged into EAS: `eas login`
2. Make sure you have the service account key file: `android-service-account.json` in the `gas-cylinder-android` directory
3. Make sure you have Google Play Console access

## Steps

### 1. Navigate to Android project
```bash
cd gas-cylinder-android
```

### 2. Build Android production app
```bash
eas build --platform android --profile production
```

This will:
- Build an App Bundle (AAB) for Google Play
- Use the configured service account for submission
- Build the app for Play Store submission

### 3. Wait for build to complete
The build will take 15-30 minutes. You'll get a notification when it's done.

### 4. Submit to Google Play Console
Once the build is complete, submit it:
```bash
eas submit --platform android --profile production
```

This will automatically:
- Upload to Google Play Console
- Submit to the production track
- Use the service account key at `./android-service-account.json`

Or you can submit manually from Google Play Console:
1. Go to https://play.google.com/console
2. Navigate to your app
3. Create a new release or update existing
4. Upload the AAB file
5. Submit for review

## Current App Info
- **Name**: Scanified Android
- **Package**: com.evanevoo.scanifiedandroid
- **Version**: 1.0.14
- **Version Code**: 31 (will auto-increment)
- **Track**: Production

## Notes
- The build creates an App Bundle (AAB) format required by Google Play
- Service account key must be at: `gas-cylinder-android/android-service-account.json`
- Make sure all environment variables are set in EAS dashboard
