# Worklets Version Mismatch Fix

## Problem
Mismatch between JavaScript part (0.6.1) and native part (0.5.1) of worklets.

## Solution Applied
Downgraded `react-native-worklets` from `^0.6.1` to `^0.5.1` to match the native build version.

## Steps to Apply Fix

### 1. Clear Metro Bundler Cache
```bash
cd gas-cylinder-android
npx expo start --clear
```
Stop the Metro bundler (Ctrl+C) after it starts.

### 2. Clear Node Modules and Reinstall (Optional but Recommended)
```bash
cd gas-cylinder-android
rm -rf node_modules
npm install
```

Or on Windows PowerShell:
```powershell
cd gas-cylinder-android
Remove-Item -Recurse -Force node_modules
npm install
```

### 3. Clean Android Build
```bash
cd gas-cylinder-android/android
./gradlew clean
cd ..
```

Or on Windows:
```powershell
cd gas-cylinder-android/android
.\gradlew.bat clean
cd ..
```

### 4. Rebuild and Run
```bash
cd gas-cylinder-android
npx expo run:android
```

Or if using EAS Build:
```bash
cd gas-cylinder-android
npm run build:android-dev
```

## What Changed
- **package.json**: Updated `react-native-worklets` from `^0.6.1` to `^0.5.1`
- **babel.config.js**: Already correctly configured with only `react-native-reanimated/plugin` (no worklets plugin needed)

## Why This Works
The native Android code was compiled with worklets version 0.5.1, but the JavaScript package was at 0.6.1. By downgrading the JavaScript version to match the native version, both parts are now synchronized.

## Alternative Solution
If you prefer to upgrade the native code instead, you would need to:
1. Keep `react-native-worklets` at `^0.6.1`
2. Rebuild the native Android code completely:
   ```bash
   cd gas-cylinder-android
   npx expo prebuild --clean --platform android
   npx expo run:android
   ```

The downgrade approach is simpler and faster if you don't need features from 0.6.1.

