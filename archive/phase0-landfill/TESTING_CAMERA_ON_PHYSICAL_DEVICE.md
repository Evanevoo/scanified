# Testing Camera on Physical Device

The camera requires a native build and **will not work in Expo Go or simulators**. You need to build a development build and install it on a physical device.

## Quick Start

### For Android:

1. **Build a development APK:**
   ```bash
   cd gas-cylinder-android
   eas build --profile development --platform android
   ```

2. **Download and install the APK:**
   - After the build completes, download the APK from the EAS build page
   - Transfer it to your Android device
   - Enable "Install from Unknown Sources" in Android settings
   - Install the APK

3. **Test the camera:**
   - Open the app
   - Navigate to Edit Cylinder
   - Tap the camera button next to the barcode field
   - Grant camera permissions when prompted
   - Test scanning a barcode

### For iOS:

1. **Build for a physical device:**
   ```bash
   cd gas-cylinder-mobile
   eas build --profile preview --platform ios
   ```
   (Note: Use `preview` profile for physical device, `development` is set for simulator)

2. **Install on your device:**
   - After build completes, you'll get a link to install via TestFlight or direct install
   - Open the link on your iOS device
   - Install the app

3. **Test the camera:**
   - Open the app
   - Navigate to Edit Cylinder
   - Tap the camera button next to the barcode field
   - Grant camera permissions when prompted
   - Test scanning a barcode

## Alternative: Local Development Build (Faster iteration)

If you want faster iteration during development:

### Android (requires Android Studio):

```bash
cd gas-cylinder-android
npx expo prebuild
npx expo run:android
```

### iOS (requires Mac + Xcode):

```bash
cd gas-cylinder-mobile
npx expo prebuild
npx expo run:ios --device
```

## Testing Checklist

- [ ] Camera opens when tapping the scan button
- [ ] Camera permissions are requested correctly
- [ ] Barcode scanning works (try different barcode types)
- [ ] Scanned barcode appears in the input field
- [ ] Flashlight toggle works (if available)
- [ ] Scanner closes after successful scan
- [ ] Manual typing still works alongside scanning

## Troubleshooting

### Camera doesn't open:
- Check that camera permissions are granted in device settings
- Verify you're using a development/preview build (not Expo Go)
- Check device logs for errors

### Build fails:
- Make sure you're logged into EAS: `eas login`
- Check that your EAS project is configured: `eas project:info`
- Verify all dependencies are installed: `npm install`

### Camera works but barcode doesn't scan:
- Ensure good lighting
- Hold the barcode steady within the scan frame
- Try different barcode types (Code 128, Code 39, etc.)
- Check console logs for scanning errors

## Notes

- **Expo Go does NOT support native camera modules** - you must use a development build
- **Simulators don't have real cameras** - you must test on a physical device
- Development builds take ~10-15 minutes on EAS
- Local builds are faster but require Android Studio (Android) or Xcode (iOS)
