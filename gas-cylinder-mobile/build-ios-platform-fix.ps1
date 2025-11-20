# iOS Build Script for Platform Runtime Fix
# This script builds the iOS app with Platform runtime compatibility fixes

Write-Host "🚀 Building iOS App with Platform Runtime Fix" -ForegroundColor Green
Write-Host "Version: 1.0.4, Build: 7" -ForegroundColor Yellow
Write-Host "Fixing: Platform runtime not ready error" -ForegroundColor Cyan
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
Write-Host "🔧 Applying Platform runtime fixes..." -ForegroundColor Cyan

# Backup original app.json
if (Test-Path "app.json.backup") {
    Write-Host "✅ Backup already exists" -ForegroundColor Green
} else {
    Copy-Item "app.json" "app.json.backup"
    Write-Host "✅ Original app.json backed up" -ForegroundColor Green
}

# Use the fixed configuration
Copy-Item "app-ios-fixed.json" "app.json"
Write-Host "✅ Applied Platform runtime fix configuration" -ForegroundColor Green

Write-Host ""
Write-Host "📱 Building iOS app with fixes..." -ForegroundColor Cyan

# Build for iOS
try {
    Write-Host "Building iOS app with EAS (Platform runtime fix)..." -ForegroundColor Yellow
    eas build --platform ios --profile production
    
    Write-Host ""
    Write-Host "✅ Build completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Platform Runtime Fix Applied:" -ForegroundColor Cyan
    Write-Host "• Disabled newArchEnabled (temporarily)" -ForegroundColor White
    Write-Host "• Added safe Platform utility" -ForegroundColor White
    Write-Host "• Updated all Platform imports" -ForegroundColor White
    Write-Host "• Incremented build number to 7" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Download the build from EAS" -ForegroundColor White
    Write-Host "2. Test on physical iPhone 13 mini and iPad Air" -ForegroundColor White
    Write-Host "3. Verify Platform runtime error is resolved" -ForegroundColor White
    Write-Host "4. Test all authentication flows" -ForegroundColor White
    Write-Host "5. Submit for review if all tests pass" -ForegroundColor White
    
} catch {
    Write-Host ""
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Write-Host "Please check the error messages above and fix any issues." -ForegroundColor Yellow
} finally {
    # Restore original app.json
    if (Test-Path "app.json.backup") {
        Copy-Item "app.json.backup" "app.json"
        Write-Host "✅ Original app.json restored" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "🎯 Remember: Test thoroughly on physical devices before submitting!" -ForegroundColor Green
