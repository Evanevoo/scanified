# Worklets Version Mismatch Fix

## Problem
The iOS development build was compiled with `react-native-worklets` version 0.5.1, but the JavaScript code now uses version 0.6.1, causing a version mismatch error.

## Solution
Rebuild the iOS development build using EAS Build to compile the native code with the updated Worklets version.

## Steps to Fix

### Option 1: Rebuild Development Build (Recommended)
```bash
cd gas-cylinder-mobile
npm run build:ios-dev
```

This will create a new development build with the correct Worklets version (0.6.1) compiled into the native code.

### Option 2: Rebuild on macOS (if you have access)
```bash
cd gas-cylinder-mobile
npx expo prebuild --clean --platform ios
npx expo run:ios
```

## What Was Changed
- Updated `react-native-worklets` from `^0.5.1` to `^0.6.1` in `package.json`
- Dependencies have been reinstalled
- Native Android code has been rebuilt (Android should work now)

## Note
The JavaScript code is already updated to 0.6.1. You just need to rebuild the native iOS binary to match.

