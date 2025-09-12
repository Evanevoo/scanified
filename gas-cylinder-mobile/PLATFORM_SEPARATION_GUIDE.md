# 🚀 Platform-Specific Builds for Scanified Mobile

This guide explains how to build separate versions of the Scanified mobile app for iOS and Android, ensuring complete platform separation.

## 📱 What We've Created

### iOS Version (AssetTrack Pro)
- **Config**: `app-ios.json`
- **EAS Build**: `eas-ios.json`
- **Package**: `package-ios.json`
- **Scripts**: `build-ios.sh`, `build-ios.ps1`

### Android Version (Scanified)
- **Config**: `app-android.json`
- **EAS Build**: `eas-android.json`
- **Package**: `package-android.json`
- **Scripts**: `build-android.sh`, `build-android.ps1`

## 🔧 How to Use

### For iOS Development (AssetTrack Pro)

1. **Switch to iOS configuration**:
   ```bash
   # Copy iOS config to main files
   cp app-ios.json app.json
   cp eas-ios.json eas.json
   cp package-ios.json package.json
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build for iOS**:
   ```bash
   # Using script (recommended)
   ./build-ios.sh      # Linux/Mac
   .\build-ios.ps1     # Windows PowerShell
   
   # Or manually
   eas build --platform ios --profile production --config eas-ios.json
   ```

4. **Submit to App Store**:
   ```bash
   npm run submit:ios
   ```

### For Android Development (Scanified)

1. **Switch to Android configuration**:
   ```bash
   # Copy Android config to main files
   cp app-android.json app.json
   cp eas-android.json eas.json
   cp package-android.json package.json
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build for Android**:
   ```bash
   # Using script (recommended)
   ./build-android.sh      # Linux/Mac
   .\build-android.ps1     # Windows PowerShell
   
   # Or manually
   eas build --platform android --profile production --config eas-android.json
   ```

4. **Submit to Google Play Store**:
   ```bash
   npm run submit:android
   ```

## 📋 Platform Differences

### iOS Version (AssetTrack Pro)
- ✅ **No Android references** anywhere
- ✅ Apple Sign-In integration
- ✅ iOS-specific permissions and configurations
- ✅ App Store submission ready
- ✅ iPad support enabled
- ❌ No Android build tools

### Android Version (Scanified)
- ✅ Android-specific package name
- ✅ Android permissions
- ✅ Google Play Store submission ready
- ✅ New Architecture enabled
- ❌ No iOS-specific features

## 🔄 Quick Platform Switching

### Switch to iOS
```bash
cp app-ios.json app.json
cp eas-ios.json eas.json
cp package-ios.json package.json
```

### Switch to Android
```bash
cp app-android.json app.json
cp eas-android.json eas.json
cp package-android.json package.json
```

### Install dependencies for new platform
```bash
npm install
```

## ✅ Pre-Build Checklist

### iOS
- [ ] Update `appleId`, `ascAppId`, `appleTeamId` in `eas-ios.json`
- [ ] Ensure iOS assets are ready
- [ ] Check bundle identifier in `app-ios.json`

### Android
- [ ] Update `serviceAccountKeyPath` in `eas-android.json`
- [ ] Ensure Android assets are ready
- [ ] Check package name in `app-android.json`

## 🆘 Troubleshooting

### Common Issues

1. **Build fails with "platform not supported"**
   - Make sure you've copied the correct platform config files
   - Check that `platforms` array in app.json matches your target

2. **Dependencies not found**
   - Run `npm install` after switching platforms
   - Clear cache: `npm cache clean --force`

3. **EAS build fails**
   - Check your EAS project ID in the config files
   - Verify your Apple/Google credentials

### Platform-Specific Issues

**iOS**:
- Apple Sign-In requires proper bundle identifier
- iPad support needs proper asset sizes
- App Store requires proper metadata

**Android**:
- Package name must be unique
- Permissions must be declared
- Google Play requires proper signing

## 🎯 Best Practices

1. **Always use platform-specific configs** - Never mix iOS and Android settings
2. **Test on both platforms** - Ensure features work on both
3. **Keep assets separate** - Use platform-specific icons and splash screens
4. **Version independently** - iOS and Android can have different version numbers
5. **Document differences** - Keep track of platform-specific features

---

**Remember**: Always use the platform-specific configuration files to maintain clean separation between iOS and Android builds! 🎯
