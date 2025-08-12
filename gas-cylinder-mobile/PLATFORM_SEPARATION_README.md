# 🚀 Platform-Specific Builds for Scanified Mobile

This guide explains how to build separate versions of the Scanified mobile app for iOS and Android, ensuring complete platform separation.

## 📱 What We've Created

### iOS Version (No Android References)
- **Config**: `app-ios.json`
- **EAS Build**: `eas-ios.json`
- **Package**: `package-ios.json`
- **Scripts**: `build-ios.sh`, `build-ios.ps1`

### Android Version
- **Config**: `app-android.json`
- **EAS Build**: `eas-android.json`
- **Package**: `package-android.json`
- **Scripts**: `build-android.sh`, `build-android.ps1`

## 🔧 How to Use

### For iOS Development (No Android References)

1. **Switch to iOS configuration**:
   ```bash
   # Copy iOS config to main app.json
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
   ./build-ios.sh          # Linux/Mac
   .\build-ios.ps1         # Windows PowerShell
   
   # Or manually
   eas build --platform ios --profile production --config eas-ios.json
   ```

4. **Submit to App Store**:
   ```bash
   npm run submit:ios
   ```

### For Android Development

1. **Switch to Android configuration**:
   ```bash
   # Copy Android config to main app.json
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

## 🎯 Key Differences

### iOS Version
- ✅ **No Android references** anywhere
- ✅ Apple Sign-In integration
- ✅ iOS-specific permissions and configurations
- ✅ App Store submission ready
- ❌ No Android build tools

### Android Version
- ✅ Android-specific package name
- ✅ Android permissions
- ✅ Google Play Store submission ready
- ❌ No iOS-specific features

## 🚨 Important Notes

1. **Never mix configurations** - Always use the platform-specific files
2. **Update credentials** in the EAS configs before building
3. **Test thoroughly** on each platform before submission
4. **Keep both versions** in sync for features and bug fixes

## 🔄 Switching Between Platforms

When you need to work on the other platform:

```bash
# Save current work
git add .
git commit -m "Current work before platform switch"

# Switch to iOS
cp app-ios.json app.json
cp eas-ios.json eas.json
cp package-ios.json package.json

# Or switch to Android
cp app-android.json app.json
cp eas-android.json eas.json
cp package-android.json package.json

# Install dependencies for new platform
npm install
```

## 📋 Pre-Build Checklist

### iOS
- [ ] Update `appleId` in `eas-ios.json`
- [ ] Update `ascAppId` in `eas-ios.json`
- [ ] Update `appleTeamId` in `eas-ios.json`
- [ ] Ensure iOS assets are ready

### Android
- [ ] Update `serviceAccountKeyPath` in `eas-android.json`
- [ ] Ensure Android assets are ready
- [ ] Check package name in `app-android.json`

## 🆘 Troubleshooting

### Common Issues

1. **Build fails with platform error**: Make sure you're using the correct config files
2. **Dependencies missing**: Run `npm install` after switching configurations
3. **EAS build fails**: Check your EAS credentials and project ID

### Getting Help

- Check EAS documentation: https://docs.expo.dev/build/introduction/
- Verify your Expo account and project settings
- Ensure all required environment variables are set

---

**Remember**: Always use the platform-specific configuration files to maintain clean separation between iOS and Android builds! 🎯
