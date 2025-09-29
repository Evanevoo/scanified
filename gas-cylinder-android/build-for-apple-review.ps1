# Build Script for Apple App Store Review Submission
# Version: 1.0.1 (Fixed for Apple Review)
# Date: September 2025

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Apple App Store Build Script" -ForegroundColor Cyan
Write-Host "Version 1.0.1 - Review Fixes" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: Not in the gas-cylinder-mobile directory!" -ForegroundColor Red
    Write-Host "Please run this script from the gas-cylinder-mobile folder." -ForegroundColor Yellow
    exit 1
}

# Step 1: Install dependencies
Write-Host "Step 1: Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install dependencies!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Clear cache
Write-Host "Step 2: Clearing cache..." -ForegroundColor Yellow
npx expo prebuild --clear
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to clear cache!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Cache cleared successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Prebuild for iOS
Write-Host "Step 3: Prebuilding for iOS..." -ForegroundColor Yellow
npx expo prebuild --platform ios
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to prebuild for iOS!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ iOS prebuild completed successfully" -ForegroundColor Green
Write-Host ""

# Step 4: Build for production
Write-Host "Step 4: Building for production..." -ForegroundColor Yellow
Write-Host "This will create a production build for App Store submission" -ForegroundColor Cyan
Write-Host ""

# Ask for confirmation
$confirmation = Read-Host "Do you want to proceed with production build? (y/n)"
if ($confirmation -ne 'y') {
    Write-Host "Build cancelled by user" -ForegroundColor Yellow
    exit 0
}

# Run EAS build
eas build --platform ios --profile production --non-interactive
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: EAS build failed!" -ForegroundColor Red
    Write-Host "Please check the error messages above and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "✓ Build completed successfully!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Wait for the build to complete on EAS servers" -ForegroundColor White
Write-Host "2. Download the build from the EAS dashboard" -ForegroundColor White
Write-Host "3. Submit to App Store Connect using:" -ForegroundColor White
Write-Host "   eas submit --platform ios" -ForegroundColor Yellow
Write-Host ""
Write-Host "Testing recommendations:" -ForegroundColor Cyan
Write-Host "- Test Apple Sign-In on iPad Air (5th gen) with iPadOS 26.0" -ForegroundColor White
Write-Host "- Test Apple Sign-In on iPhone 13 mini with iOS 26.0" -ForegroundColor White
Write-Host "- Verify camera permission flow shows 'Continue' button" -ForegroundColor White
Write-Host "- Test Settings redirect for denied permissions" -ForegroundColor White
Write-Host ""
Write-Host "For more details, see APPLE_REVIEW_FIXES_2025.md" -ForegroundColor Yellow
