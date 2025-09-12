# PowerShell script to build Scanified Android App
Write-Host "🚀 Building Scanified Android App..." -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "app-android.json")) {
    Write-Host "❌ Error: app-android.json not found. Make sure you're in the gas-cylinder-mobile directory." -ForegroundColor Red
    exit 1
}

# Switch to Android configuration
Write-Host "📱 Switching to Android configuration..." -ForegroundColor Yellow
Copy-Item "app-android.json" "app.json" -Force
Copy-Item "eas-android.json" "eas.json" -Force
Copy-Item "package-android.json" "package.json" -Force

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Build for Android
Write-Host "🔨 Building Android app..." -ForegroundColor Yellow
eas build --platform android --profile production --config eas-android.json --clear-cache

Write-Host "✅ Android build completed!" -ForegroundColor Green
Write-Host "🤖 You can now submit to Google Play Store using: npm run submit:android" -ForegroundColor Cyan
