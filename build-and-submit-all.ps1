# Build and Submit iOS and Android Apps
# PowerShell script to build and submit both apps

Write-Host "🚀 Starting build and submission process..." -ForegroundColor Green

# iOS Build and Submit
Write-Host ""
Write-Host "📱 Building iOS app..." -ForegroundColor Cyan
Set-Location gas-cylinder-mobile
eas build --platform ios --profile production

Write-Host ""
Write-Host "⏳ Waiting for iOS build to complete..." -ForegroundColor Yellow
Write-Host "   Check EAS dashboard or wait for notification" -ForegroundColor Gray
Read-Host "Press Enter once iOS build is complete to submit"

Write-Host ""
Write-Host "📤 Submitting iOS to App Store Connect..." -ForegroundColor Cyan
eas submit --platform ios --profile production

# Android Build and Submit
Write-Host ""
Write-Host "🤖 Building Android app..." -ForegroundColor Cyan
Set-Location ..\gas-cylinder-android
eas build --platform android --profile production

Write-Host ""
Write-Host "⏳ Waiting for Android build to complete..." -ForegroundColor Yellow
Write-Host "   Check EAS dashboard or wait for notification" -ForegroundColor Gray
Read-Host "Press Enter once Android build is complete to submit"

Write-Host ""
Write-Host "📤 Submitting Android to Google Play Console..." -ForegroundColor Cyan
eas submit --platform android --profile production

Write-Host ""
Write-Host "✅ Build and submission process complete!" -ForegroundColor Green
Write-Host "   Check App Store Connect and Google Play Console for status" -ForegroundColor Gray
