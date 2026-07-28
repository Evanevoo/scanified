# 🚀 Republish Scanified on App Store Connect - Complete Guide

**App Name:** Scanified  
**Bundle ID:** com.evanevoo.scanifiedmobile  
**Current Version:** 1.0.14  
**Current Build:** 28  
**Platform:** iOS

---

## 📋 Pre-Submission Checklist

### ✅ Configuration Verification

- [x] **Version Updated**: 1.0.13 → 1.0.14
- [x] **Build Number Updated**: 27 → 28
- [x] **Bundle Identifier**: com.evanevoo.scanifiedmobile
- [x] **iOS-Only Configuration**: Platforms set to ["ios"]
- [x] **App Icons**: Located in `gas-cylinder-mobile/assets/app-icon.png`
- [x] **Splash Screen**: Located in `gas-cylinder-mobile/assets/splash-icon.png`
- [x] **EAS Project ID**: d71ec042-1fec-4186-ac3b-0ae85a6af345

### ✅ Compliance Checks

- [x] **No Android References**: iOS-only configuration confirmed
- [x] **No Business Registration**: Organization creation removed from mobile app
- [x] **Permissions**: Camera, Face ID, Photo Library properly configured
- [x] **Encryption**: ITSAppUsesNonExemptEncryption set to false

---

## 🔧 Step 1: Build the iOS App

### Option A: Using EAS Build (Recommended)

```bash
# Navigate to mobile app directory
cd gas-cylinder-mobile

# Install dependencies (if needed)
npm install

# Build for production
eas build --platform ios --profile production

# Or use the npm script
npm run build:ios
```

### Option B: Using Expo CLI

```bash
cd gas-cylinder-mobile

# Clear cache first
expo start --clear

# Build iOS app
eas build --platform ios --profile production
```

### Build Process Notes

- **Build Time**: Typically 15-30 minutes
- **Build Location**: EAS servers (cloud build)
- **Output**: You'll receive a download link or it will be automatically uploaded to App Store Connect
- **Status**: Monitor at https://expo.dev/accounts/evanevoo/projects/gas-cylinder-mobile/builds

---

## 📱 Step 2: Access App Store Connect

1. **Go to App Store Connect**
   - URL: https://appstoreconnect.apple.com
   - Sign in with your Apple Developer account

2. **Navigate to Your App**
   - Click "My Apps"
   - Select "Scanified"

3. **Verify App Status**
   - Check current app status
   - Review any pending issues or rejections

---

## 🆕 Step 3: Create New Version

1. **Click "+ Version or Platform"** button
2. **Enter Version Number**: `1.0.14`
3. **Click "Create"**

---

## 📤 Step 4: Upload Build

### If Build Was Automatically Uploaded

1. Go to the "TestFlight" tab
2. Wait for build processing (usually 5-15 minutes)
3. Once processed, go to "App Store" tab
4. Select the new version (1.0.14)
5. Click "Build" section
6. Click "+" to add build
7. Select build 28 (1.0.14)

### If You Need to Upload Manually

1. Download the `.ipa` file from EAS build
2. Use **Transporter** app (macOS) or **Xcode**:
   ```bash
   # Using Transporter (macOS only)
   # Download from Mac App Store
   # Drag and drop .ipa file
   ```

3. Or use command line:
   ```bash
   # Using altool (deprecated but still works)
   xcrun altool --upload-app --type ios --file "path/to/app.ipa" \
     --username "your-apple-id@example.com" \
     --password "app-specific-password"
   ```

---

## 📝 Step 5: Update App Store Listing

### App Information

1. **App Name**: `Scanified`
2. **Subtitle**: `Enterprise Asset Management Platform`
3. **Category**: Business / Productivity

### Description (iOS-Focused)

```
Scanified is a professional enterprise asset management platform designed exclusively for iPhone and iPad. Transform how your organization tracks, manages, and maintains physical assets with enterprise-grade precision.

KEY FEATURES:
• Advanced Barcode Scanning - Optimized for iPhone and iPad cameras
• Real-Time Synchronization - Seamless cloud sync across iOS devices
• Enterprise Security - Apple Sign-In integration with role-based access
• Offline Capabilities - Full functionality without internet connection
• Comprehensive Reporting - iOS-native interface with export capabilities
• Multi-User Collaboration - Team management with iOS-optimized workflows

PERFECT FOR:
• Manufacturing companies managing equipment and tools
• Healthcare facilities tracking medical devices
• Educational institutions managing IT assets
• Government agencies maintaining public assets
• Any organization requiring professional asset management

iOS-SPECIFIC OPTIMIZATIONS:
• Native iOS interface following Human Interface Guidelines
• Optimized for iPhone and iPad with responsive design
• Apple Sign-In authentication for secure access
• iOS sharing extensions for seamless data export
• iPad-specific layouts and touch interactions
• iOS camera framework integration for superior scanning

Transform your asset management with Scanified - the professional iOS solution for modern enterprises.
```

### Promotional Text (170 characters max)

```
Professional asset management designed exclusively for iPhone and iPad. Enterprise-grade barcode scanning, real-time sync, and iOS-optimized workflows.
```

### Keywords (100 characters max)

```
asset management, inventory tracking, barcode scanner, enterprise, iOS, iPhone, iPad, business, productivity
```

### What's New in This Version

```
🎨 Enhanced user interface and experience improvements
🔧 Performance optimizations and bug fixes
📱 Improved iOS-specific features and stability
🔒 Enhanced security and authentication
✨ General improvements and refinements
```

---

## 🖼️ Step 6: Screenshots

### Required Screenshots

1. **iPhone 6.7" Display** (Required)
   - Login screen
   - Dashboard/Home screen
   - Barcode scanning interface
   - Asset details screen
   - Settings screen

2. **iPhone 6.5" Display** (Required)
   - Same screens as above

3. **iPad Pro (12.9-inch)** (If supporting tablet)
   - Optimized layouts for larger screens

### Screenshot Guidelines

- **Format**: PNG or JPEG
- **Resolution**: Use actual device screenshots
- **Content**: Show real app functionality
- **No Placeholders**: Use actual app screens
- **No Text Overlays**: Keep screenshots clean

---

## 🔍 Step 7: App Review Information

### Contact Information

- **First Name**: [Your First Name]
- **Last Name**: [Your Last Name]
- **Phone Number**: [Your Phone]
- **Email**: evankorial77@gmail.com

### Demo Account (If Required)

If Apple requests a demo account:
- **Username**: [Provide test account]
- **Password**: [Provide test password]
- **Notes**: Account has access to sample organization for testing

### Notes for Review

```
Thank you for reviewing Scanified v1.0.14.

This is a resubmission with the following updates:
• Version updated to 1.0.14 (Build 28)
• Performance improvements and bug fixes
• Enhanced iOS-specific optimizations
• Improved user experience

APP FUNCTIONALITY:
Scanified is a multi-tenant enterprise SaaS platform for asset management. The mobile app provides access to services purchased through our web platform. Users can join existing organizations via invite codes or email invitations. New organizations must be created through our web platform at scanified.com.

COMPLIANCE:
• iOS-only configuration - no Android references
• No business registration in mobile app
• No in-app purchases - access-only model
• All subscriptions purchased through web platform

The app is ready for review and complies with all App Store guidelines.
```

---

## ✅ Step 8: Final Checks Before Submission

### Pre-Submission Checklist

- [ ] **Version Number**: 1.0.14 matches in app.json and App Store Connect
- [ ] **Build Number**: 28 is selected and processed
- [ ] **Description**: No Android references, iOS-focused only
- [ ] **Screenshots**: All uploaded and showing iOS interface
- [ ] **Keywords**: No Android-related terms
- [ ] **App Icon**: Updated and visible
- [ ] **Privacy Policy**: URL is valid (if required)
- [ ] **Support URL**: Valid and accessible
- [ ] **Marketing URL**: Valid (if provided)
- [ ] **Age Rating**: Correctly set
- [ ] **Export Compliance**: Encryption info provided
- [ ] **App Review Notes**: Complete and accurate

### Export Compliance

- **Uses Encryption**: Yes
- **Exempt**: Yes (ITSAppUsesNonExemptEncryption: false)
- **Reason**: App uses standard encryption available in iOS

---

## 🚀 Step 9: Submit for Review

1. **Review All Information**
   - Double-check all fields
   - Verify build is correct
   - Confirm screenshots are accurate

2. **Click "Submit for Review"**
   - Located at top right of App Store tab
   - Confirm submission

3. **Wait for Processing**
   - Status will change to "Waiting for Review"
   - Typically takes 24-48 hours
   - You'll receive email notifications

---

## 📊 Step 10: Monitor Submission

### Status Tracking

1. **Check App Store Connect Regularly**
   - Go to "App Store" tab
   - Check "App Review Status"

2. **Email Notifications**
   - Apple will email you at your registered email
   - Check spam folder if needed

3. **Possible Statuses**
   - **Waiting for Review**: In queue
   - **In Review**: Being reviewed
   - **Pending Developer Release**: Approved, waiting for release
   - **Ready for Sale**: Live on App Store
   - **Rejected**: Review feedback provided

---

## 🔄 If Rejected

### Common Rejection Reasons

1. **Guideline 2.3.10**: Android references
   - **Fix**: Remove all Android mentions from metadata

2. **Guideline 3.1.1**: Business registration
   - **Fix**: Ensure no organization creation in mobile app

3. **Guideline 4.3**: Spam/duplicate
   - **Fix**: Emphasize unique features and enterprise focus

4. **Guideline 5.1.1**: Privacy policy
   - **Fix**: Ensure privacy policy URL is valid

### Response Process

1. **Read Rejection Feedback Carefully**
2. **Address Each Issue**
3. **Update App or Metadata**
4. **Resubmit with Explanation**
5. **Use Appeal Process if Needed**

---

## 📞 Support & Resources

### Apple Developer Support

- **Phone**: 1-800-633-2152
- **Email**: developer@apple.com
- **Website**: https://developer.apple.com/support/

### Useful Links

- **App Store Connect**: https://appstoreconnect.apple.com
- **App Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **App Store Connect Help**: https://help.apple.com/app-store-connect/
- **EAS Build Dashboard**: https://expo.dev/accounts/evanevoo/projects/gas-cylinder-mobile/builds

### Your App Details

- **Developer**: Evan Korial
- **Email**: evankorial77@gmail.com
- **Apple Developer Team ID**: FA8UQ322NZ
- **EAS Project ID**: d71ec042-1fec-4186-ac3b-0ae85a6af345
- **Web Platform**: https://scanified.com

---

## 🎯 Quick Command Reference

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

# Check build status
eas build:list --platform ios

# View build logs
eas build:view [BUILD_ID]
```

---

## ✅ Success Checklist

Before considering submission complete:

- [ ] Build completed successfully
- [ ] Build uploaded to App Store Connect
- [ ] Build processed and available
- [ ] Version 1.0.14 created in App Store Connect
- [ ] Build 28 selected for version 1.0.14
- [ ] All metadata updated (description, keywords, etc.)
- [ ] Screenshots uploaded
- [ ] App Review information completed
- [ ] Export compliance information provided
- [ ] All pre-submission checks passed
- [ ] Submitted for review
- [ ] Confirmation email received

---

**Good luck with your submission! 🍎✨**

If you encounter any issues, refer to the troubleshooting section or contact Apple Developer Support.

