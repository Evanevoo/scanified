@echo off
echo 🚀 Building iOS App for Apple App Store Fix
echo Version: 1.0.4, Build: 6
echo.

REM Check if we're in the right directory
if not exist "app.json" (
    echo ❌ Error: Please run this script from the gas-cylinder-mobile directory
    pause
    exit /b 1
)

echo 📱 Building iOS app...
echo.

REM Build for iOS
echo Building iOS app with EAS...
eas build --platform ios --profile production

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Build completed successfully!
    echo.
    echo 📋 Next Steps:
    echo 1. Download the build from EAS
    echo 2. Test on physical iPhone 13 mini and iPad Air
    echo 3. Verify no blank screen on launch
    echo 4. Test all authentication flows
    echo 5. Create proper iPad screenshots
    echo 6. Remove Android references from App Store metadata
    echo 7. Submit for review
) else (
    echo.
    echo ❌ Build failed!
    echo Please check the error messages above and fix any issues.
)

echo.
echo 🎯 Remember: Test thoroughly on physical devices before submitting!
pause
