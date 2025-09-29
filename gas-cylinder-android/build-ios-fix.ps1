# iOS Build Script for Apple App Store Fix
# This script builds the iOS app with critical bug fixes

Write-Host "🚀 Building iOS App for Apple App Store Fix" -ForegroundColor Green
Write-Host "Version: 1.0.4, Build: 6" -ForegroundColor Yellow
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "app.json")) {
    Write-Host "❌ Error: Please run this script from the gas-cylinder-mobile directory" -ForegroundColor Red
    exit 1
}

# Check if EAS CLI is installed
try {
    $easVersion = eas --version
    Write-Host "✅ EAS CLI found: $easVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ EAS CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g @expo/eas-cli" -ForegroundColor Yellow
    exit 1
}

# Check if logged in to Expo
try {
    $whoami = eas whoami
    Write-Host "✅ Logged in as: $whoami" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged in to Expo. Please login first:" -ForegroundColor Red
    Write-Host "eas login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📱 Building iOS app..." -ForegroundColor Cyan

# Build for iOS
try {
    Write-Host "Building iOS app with EAS..." -ForegroundColor Yellow
    eas build --platform ios --profile production
    
    Write-Host ""
    Write-Host "✅ Build completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Download the build from EAS" -ForegroundColor White
    Write-Host "2. Test on physical iPhone 13 mini and iPad Air" -ForegroundColor White
    Write-Host "3. Verify no blank screen on launch" -ForegroundColor White
    Write-Host "4. Test all authentication flows" -ForegroundColor White
    Write-Host "5. Create proper iPad screenshots" -ForegroundColor White
    Write-Host "6. Remove third-party platform references from App Store metadata" -ForegroundColor White
    Write-Host "7. Submit for review" -ForegroundColor White
    
} catch {
    Write-Host ""
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Write-Host "Please check the error messages above and fix any issues." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🎯 Remember: Test thoroughly on physical devices before submitting!" -ForegroundColor Green
