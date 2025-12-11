# Build and Submit to App Store Connect - Guide

## ✅ Changes Made
- **Build Number**: Incremented from 71 to 72
- **Critical Fix**: Removed automatic bottle assignment on scan (now requires verification)

## 🚀 Quick Start

### Option 1: Use the Automated Script (Recommended)
```powershell
cd gas-cylinder-mobile
.\republish-to-app-store.ps1
```
Then select option 3 (Build and submit)

### Option 2: Manual Commands

#### Step 1: Ensure You're Logged In
```bash
cd gas-cylinder-mobile
eas login
```

#### Step 2: Build iOS App
```bash
npm run build:ios
# OR
eas build --platform ios --profile production
```

**Note**: Build takes 15-30 minutes. You'll get a build URL to track progress.

#### Step 3: Submit to App Store Connect
After build completes:
```bash
npm run submit:ios
# OR
eas submit --platform ios
```

## 📋 Current Configuration
- **App Name**: Scanified
- **Version**: 1.0.14
- **Build Number**: 72 (updated)
- **Bundle ID**: com.evanevoo.scanifiedmobile
- **EAS Project ID**: d71ec042-1fec-4186-ac3b-0ae85a6af345

## 🔍 Check Build Status

### View Builds Online
https://expo.dev/accounts/evanevoo/projects/gas-cylinder-mobile/builds

### Check via CLI
```bash
eas build:list --platform ios --limit 5
```

## 📱 After Submission

1. **Go to App Store Connect**: https://appstoreconnect.apple.com
2. **Create New Version**: 1.0.14 (if not exists)
3. **Select Build**: Choose build 72
4. **Update Release Notes**: 
   - "Fixed critical issue: Bottles are no longer automatically assigned when scanned. All scans now require verification before assignment."
5. **Submit for Review**

## ⚠️ Important Notes

### What Changed in This Build
- **Critical Fix**: Mobile app scans no longer automatically assign bottles to customers
- Scans now only create scan records that require verification on the website
- This prevents data integrity issues and ensures proper workflow

### Build Requirements
- EAS CLI must be installed: `npm install -g eas-cli`
- Must be logged into EAS: `eas login`
- Apple Developer account credentials must be configured in EAS
- Build will auto-increment if `autoIncrement: true` is set (it is)

### Troubleshooting

**Build Fails?**
- Check EAS status: https://status.expo.dev
- Verify credentials: `eas credentials`
- Check build logs in Expo dashboard

**Submission Fails?**
- Ensure build completed successfully
- Verify App Store Connect credentials
- Check that build number is higher than previous submission

## 📞 Support

- EAS Documentation: https://docs.expo.dev/build/introduction/
- Expo Dashboard: https://expo.dev/accounts/evanevoo/projects/gas-cylinder-mobile
- App Store Connect: https://appstoreconnect.apple.com
