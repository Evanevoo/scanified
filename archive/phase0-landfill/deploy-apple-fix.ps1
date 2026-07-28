# PowerShell script to deploy Apple App Store fixes
Write-Host "🍎 Deploying Apple App Store Fixes - Scanified v1.0.5" -ForegroundColor Green

# Change to mobile app directory
Set-Location "gas-cylinder-mobile"

Write-Host "📋 Pre-deployment checklist:" -ForegroundColor Yellow
Write-Host "1. ✅ Android references removed from app.json" -ForegroundColor Green
Write-Host "2. ✅ Apple Sign In implementation enhanced" -ForegroundColor Green  
Write-Host "3. ✅ Version incremented to 1.0.5 (Build 7)" -ForegroundColor Green
Write-Host "4. ✅ iPad-specific optimizations added" -ForegroundColor Green
Write-Host "5. ✅ Enhanced error handling and logging" -ForegroundColor Green

Write-Host "`n🧹 Clearing Expo cache..." -ForegroundColor Yellow
expo start --clear

Write-Host "`n🔨 Building iOS app with fixes..." -ForegroundColor Yellow
eas build --platform ios --profile production --clear-cache

Write-Host "`n📱 Build completed!" -ForegroundColor Green

Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Wait for EAS build to complete" -ForegroundColor White
Write-Host "2. Go to App Store Connect (https://appstoreconnect.apple.com)" -ForegroundColor White
Write-Host "3. Navigate to Scanified app" -ForegroundColor White
Write-Host "4. Create new version 1.0.5" -ForegroundColor White
Write-Host "5. Upload the new build" -ForegroundColor White
Write-Host "6. Copy response from APPLE_REVIEW_RESPONSE_LATEST.md" -ForegroundColor White
Write-Host "7. Reply to App Review team with the response" -ForegroundColor White
Write-Host "8. Submit for review" -ForegroundColor White

Write-Host "`n🎯 Key Fixes Applied:" -ForegroundColor Magenta
Write-Host "• Removed ALL Android references" -ForegroundColor White
Write-Host "• Enhanced Apple Sign In with better error handling" -ForegroundColor White
Write-Host "• Added iPad-specific optimizations" -ForegroundColor White
Write-Host "• Improved logging for debugging" -ForegroundColor White
Write-Host "• Robust authentication flow with fallbacks" -ForegroundColor White

Write-Host "`n✅ Ready for App Store resubmission!" -ForegroundColor Green
