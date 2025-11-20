# 🚀 Quick Start: Republish to App Store Connect

## Current App Details
- **App Name**: Scanified
- **Version**: 1.0.14
- **Build Number**: 28
- **Bundle ID**: com.evanevoo.scanifiedmobile

---

## ⚡ Quick Commands

### Option 1: Use the Automated Script (Recommended)

**Windows (PowerShell):**
```powershell
cd gas-cylinder-mobile
.\republish-to-app-store.ps1
```

**Mac/Linux:**
```bash
cd gas-cylinder-mobile
./republish-to-app-store.sh
```

### Option 2: Manual Commands

```bash
# Navigate to app directory
cd gas-cylinder-mobile

# Install dependencies
npm install

# Build for production
npm run build:ios
# OR
eas build --platform ios --profile production

# Submit to App Store (after build completes)
npm run submit:ios
# OR
eas submit --platform ios
```

---

## 📋 Quick Checklist

### Before Building
- [x] Version updated to 1.0.14
- [x] Build number updated to 28
- [ ] EAS CLI installed (`npm install -g eas-cli`)
- [ ] Logged in to EAS (`eas login`)
- [ ] Dependencies installed (`npm install`)

### After Building
- [ ] Build completed successfully
- [ ] Build uploaded to App Store Connect
- [ ] Build processed (wait 5-15 minutes)

### In App Store Connect
- [ ] Create new version 1.0.14
- [ ] Select build 28
- [ ] Update app description (iOS-focused, no Android references)
- [ ] Upload screenshots
- [ ] Complete App Review information
- [ ] Submit for review

---

## 🔗 Important Links

- **App Store Connect**: https://appstoreconnect.apple.com
- **EAS Build Dashboard**: https://expo.dev/accounts/evanevoo/projects/gas-cylinder-mobile/builds
- **Full Guide**: See `REPUBLISH_APP_STORE_CONNECT_GUIDE.md`

---

## ⚠️ Important Notes

1. **EAS Configuration**: Update `eas-ios.json` with your actual Apple ID, ASC App ID, and Team ID if needed
2. **Build Time**: Production builds typically take 15-30 minutes
3. **Processing Time**: After upload, builds take 5-15 minutes to process in App Store Connect
4. **Review Time**: App review typically takes 24-48 hours

---

## 🆘 Need Help?

See the complete guide: `REPUBLISH_APP_STORE_CONNECT_GUIDE.md`

