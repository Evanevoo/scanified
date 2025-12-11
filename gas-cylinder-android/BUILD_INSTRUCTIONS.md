# Build Instructions - Version 1.0.14 (Build 31)

## Version Information
- **Version**: 1.0.14
- **Version Code**: 31
- **Build Date**: November 26, 2025

## Recent Changes
- Fixed worklets runtime error (removed conflicting plugin)
- Fixed module resolution (added Android to Metro platforms)
- Grouped scans by order number in History screen
- Updated react-native-worklets to match native version (0.5.1)

## Build Options

### Option 1: EAS Build (Recommended for Production)

#### Development Build (APK)
```bash
cd gas-cylinder-android
npm run build:android-dev
```

#### Preview Build (APK for Testing)
```bash
cd gas-cylinder-android
npm run build:android-preview
```

#### Production Build (AAB for Play Store)
```bash
cd gas-cylinder-android
npm run build:android
```

### Option 2: Local Build

#### Prerequisites
- Android Studio installed
- Android SDK configured
- Java JDK installed

#### Steps
```bash
cd gas-cylinder-android

# 1. Clear Metro cache
npx expo start --clear
# (Stop with Ctrl+C)

# 2. Prebuild native code
npx expo prebuild --clean --platform android

# 3. Build APK
npx expo run:android --variant release

# Or build AAB for Play Store
cd android
./gradlew bundleRelease
```

### Option 3: Quick Local Development Build
```bash
cd gas-cylinder-android
npx expo run:android
```

## After Building

### For EAS Build
- Download the build from: https://expo.dev/accounts/evanevoo/projects/gas-cylinder-android/builds
- Install on device: `adb install <path-to-apk>`

### For Local Build
- APK location: `android/app/build/outputs/apk/release/app-release.apk`
- AAB location: `android/app/build/outputs/bundle/release/app-release.aab`

## Submit to Play Store
```bash
cd gas-cylinder-android
npm run submit:android
```

## Notes
- Make sure you're logged into EAS: `eas login`
- For production builds, ensure all environment variables are set
- The build will automatically increment versionCode if `autoIncrement: true` is set in eas.json (production profile)

