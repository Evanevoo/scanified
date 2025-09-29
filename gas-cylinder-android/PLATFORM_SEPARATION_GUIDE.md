# 🚀 iOS Build Guide for AssetTrack Pro Mobile

This guide explains how to build the AssetTrack Pro iOS mobile app for App Store submission.

## 📱 iOS-Only Application

This app is now iOS-only for App Store compliance. All third-party platform configurations have been removed per Apple's guidelines.

### iOS Configuration (AssetTrack Pro)
- **Config**: `app.json`
- **EAS Build**: `eas.json`
- **Package**: `package.json`
- **Scripts**: `build-ios.sh`, `build-ios.ps1`

## 🔧 How to Use

### For iOS Development (AssetTrack Pro)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build for iOS**:
   ```bash
   # Using script (recommended)
   ./build-ios.sh      # Linux/Mac
   .\build-ios.ps1     # Windows PowerShell
   
   # Or manually
   eas build --platform ios --profile production
   ```

3. **Submit to App Store**:
   ```bash
   npm run submit:ios
   ```

## 📋 iOS Features

### iOS Version (AssetTrack Pro)
- ✅ **No third-party platform references** anywhere
- ✅ Apple Sign-In integration
- ✅ iOS-specific permissions and configurations
- ✅ App Store submission ready
- ✅ iPad support enabled
- ✅ iOS-only bundle identifier
- ✅ Proper iOS metadata and descriptions

## ✅ Pre-Build Checklist

### iOS
- [ ] Update `appleId`, `ascAppId`, `appleTeamId` in `eas.json`
- [ ] Ensure iOS assets are ready
- [ ] Check bundle identifier in `app.json`
- [ ] Verify no third-party platform references remain
- [ ] Test on iOS devices and simulators

## 🆘 Troubleshooting

### Common Issues

1. **Build fails with "platform not supported"**
   - Make sure you've specified iOS platform correctly
   - Check that `platforms` array in app.json contains only "ios"

2. **Dependencies not found**
   - Run `npm install` after any configuration changes
   - Clear cache: `npm cache clean --force`

3. **EAS build fails**
   - Check your EAS project ID in the config files
   - Verify your Apple credentials

### iOS-Specific Issues

**iOS**:
- Apple Sign-In requires proper bundle identifier
- iPad support needs proper asset sizes
- App Store requires proper metadata
- Camera permissions must be properly declared

## 🎯 Best Practices

1. **Use iOS-only configurations** - No third-party platform references anywhere
2. **Test on iOS devices** - Ensure features work on iPhone and iPad
3. **Keep assets iOS-focused** - Use iOS-specific icons and splash screens
4. **Follow App Store guidelines** - Ensure compliance with Apple's requirements
5. **Document iOS features** - Keep track of iOS-specific capabilities

---

**Remember**: This app is iOS-only for App Store compliance! 🍎