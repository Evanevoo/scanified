# PowerShell script to build Scanified iOS App
Write-Host "🚀 Building Scanified iOS App..." -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "app-ios.json")) {
    Write-Host "❌ Error: app-ios.json not found. Make sure you're in the gas-cylinder-mobile directory." -ForegroundColor Red
    exit 1
}

# Install dependencies if needed
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Build for iOS
Write-Host "🔨 Building iOS app..." -ForegroundColor Yellow
eas build --platform ios --profile production --config eas-ios.json --clear-cache

Write-Host "✅ iOS build completed!" -ForegroundColor Green
Write-Host "📱 You can now submit to App Store using: npm run submit:ios" -ForegroundColor Cyan
