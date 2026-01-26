# Scanbot SDK on iOS

The error **"The package 'react-native-scanbot-barcode-scanner-sdk' doesn't seem to be linked"** means Scanbot’s native code is not in your build. It **does not work in Expo Go** and needs a native iOS app (prebuild + build).

## Option A: EAS Build (works from Windows)

EAS runs the iOS build on macOS in the cloud and will run `expo prebuild` and `pod install` for you.

1. **Add your Scanbot license as an EAS Secret**  
   In [expo.dev](https://expo.dev) → your project → **Secrets**, or:

   ```bash
   cd gas-cylinder-mobile
   eas secret:create --name SCANBOT_SDK_LICENSE_KEY --value "YOUR_FULL_LICENSE_KEY" --scope project
   ```

   Use the full key (both lines, with a newline between). If it’s hard to pass in the shell, add it in the **Expo dashboard** under Project → Secrets.

2. **Build for a physical device** (needed for camera/Scanbot):

   ```bash
   cd gas-cylinder-mobile
   eas build --profile production --platform ios
   ```

   For a **simulator** build only:

   ```bash
   eas build --profile development --platform ios
   ```

3. **Install the built app** from the EAS build page on your device/simulator, then open **Settings → TESTING → Scanbot SDK Test**. The native module will be linked.

## Option B: On a Mac (prebuild + run:ios)

If you develop on macOS:

```bash
cd gas-cylinder-mobile
npx expo prebuild --platform ios
npx expo run:ios
```

Ensure `SCANBOT_SDK_LICENSE_KEY` is in `.env` at the project root (or in `gas-cylinder-mobile/.env`). `app.config.js` reads it and puts it in `extra.SCANBOT_SDK_LICENSE_KEY`.

## Checklist

- [ ] **Not using Expo Go** – use an EAS build or `expo run:ios` (development build).
- [ ] **`ios` folder exists** – from `expo prebuild` (on Mac) or from an EAS build (EAS generates it in the cloud).
- [ ] **License key** – in `.env` for local builds, or in **EAS Secrets** for EAS builds.
