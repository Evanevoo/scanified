# Simple iOS Build Script
Write-Host "🚀 Building iOS App - Version 1.0.4, Build 6" -ForegroundColor Green
Write-Host ""

# Check directory
if (-not (Test-Path "app.json")) {
    Write-Host "❌ Error: Run from gas-cylinder-mobile directory" -ForegroundColor Red
    exit 1
}

Write-Host "📱 Building iOS app..." -ForegroundColor Cyan
Write-Host ""

# Build command
Write-Host "Running: eas build --platform ios --profile production" -ForegroundColor Yellow
eas build --platform ios --profile production

Write-Host ""
Write-Host "✅ Build command completed!" -ForegroundColor Green
Write-Host "📋 Next: Test on physical devices before submitting to Apple" -ForegroundColor Cyan
