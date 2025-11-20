# PowerShell Script to Republish Scanified to App Store Connect
# Version: 1.0.14 (Build 34)

Write-Host "🚀 Scanified App Store Republishing Script" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "app.json")) {
    Write-Host "❌ Error: app.json not found. Please run this script from the gas-cylinder-mobile directory." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Current Configuration:" -ForegroundColor Green
Write-Host "   App Name: Scanified" -ForegroundColor White
Write-Host "   Version: 1.0.14" -ForegroundColor White
Write-Host "   Build Number: 34" -ForegroundColor White
Write-Host "   Bundle ID: com.evanevoo.scanifiedmobile" -ForegroundColor White
Write-Host ""

# Check if EAS CLI is installed
Write-Host "🔍 Checking EAS CLI installation..." -ForegroundColor Yellow
$easInstalled = Get-Command eas -ErrorAction SilentlyContinue
if (-not $easInstalled) {
    Write-Host "❌ EAS CLI not found. Installing..." -ForegroundColor Red
    npm install -g eas-cli
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install EAS CLI. Please install manually: npm install -g eas-cli" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ EAS CLI is installed" -ForegroundColor Green
Write-Host ""

# Check if logged in to EAS
Write-Host "🔍 Checking EAS authentication..." -ForegroundColor Yellow
$easWhoami = eas whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Not logged in to EAS. Please log in:" -ForegroundColor Yellow
    Write-Host "   eas login" -ForegroundColor White
    Write-Host ""
    $login = Read-Host "Do you want to log in now? (y/n)"
    if ($login -eq "y" -or $login -eq "Y") {
        eas login
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Login failed. Please try again manually." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Please log in to EAS before continuing." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Logged in to EAS as: $($easWhoami)" -ForegroundColor Green
}
Write-Host ""

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Ask user what they want to do
Write-Host "What would you like to do?" -ForegroundColor Cyan
Write-Host "1. Build iOS app for production" -ForegroundColor White
Write-Host "2. Submit existing build to App Store Connect" -ForegroundColor White
Write-Host "3. Build and submit (full process)" -ForegroundColor White
Write-Host "4. Check build status" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🏗️  Building iOS app for production..." -ForegroundColor Yellow
        Write-Host "   This may take 15-30 minutes..." -ForegroundColor White
        Write-Host ""
        eas build --platform ios --profile production
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Build completed successfully!" -ForegroundColor Green
            Write-Host "   Check your build status at: https://expo.dev/accounts/evanevoo/projects/gas-cylinder-mobile/builds" -ForegroundColor White
        } else {
            Write-Host ""
            Write-Host "❌ Build failed. Please check the error messages above." -ForegroundColor Red
        }
    }
    "2" {
        Write-Host ""
        Write-Host "📤 Submitting to App Store Connect..." -ForegroundColor Yellow
        Write-Host ""
        eas submit --platform ios
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Submission completed successfully!" -ForegroundColor Green
            Write-Host "   Check App Store Connect: https://appstoreconnect.apple.com" -ForegroundColor White
        } else {
            Write-Host ""
            Write-Host "❌ Submission failed. Please check the error messages above." -ForegroundColor Red
        }
    }
    "3" {
        Write-Host ""
        Write-Host "🏗️  Building iOS app for production..." -ForegroundColor Yellow
        Write-Host "   This may take 15-30 minutes..." -ForegroundColor White
        Write-Host ""
        eas build --platform ios --profile production
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Build completed successfully!" -ForegroundColor Green
            Write-Host ""
            $submit = Read-Host "Do you want to submit to App Store Connect now? (y/n)"
            if ($submit -eq "y" -or $submit -eq "Y") {
                Write-Host ""
                Write-Host "📤 Submitting to App Store Connect..." -ForegroundColor Yellow
                Write-Host ""
                eas submit --platform ios
                if ($LASTEXITCODE -eq 0) {
                    Write-Host ""
                    Write-Host "✅ Submission completed successfully!" -ForegroundColor Green
                    Write-Host "   Check App Store Connect: https://appstoreconnect.apple.com" -ForegroundColor White
                } else {
                    Write-Host ""
                    Write-Host "❌ Submission failed. Please check the error messages above." -ForegroundColor Red
                }
            }
        } else {
            Write-Host ""
            Write-Host "❌ Build failed. Please check the error messages above." -ForegroundColor Red
        }
    }
    "4" {
        Write-Host ""
        Write-Host "📊 Checking build status..." -ForegroundColor Yellow
        Write-Host ""
        eas build:list --platform ios --limit 5
        Write-Host ""
        Write-Host "View all builds at: https://expo.dev/accounts/evanevoo/projects/gas-cylinder-mobile/builds" -ForegroundColor White
    }
    default {
        Write-Host "❌ Invalid choice. Please run the script again and select 1-4." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📚 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Wait for build to complete (if building)" -ForegroundColor White
Write-Host "   2. Go to App Store Connect: https://appstoreconnect.apple.com" -ForegroundColor White
Write-Host "   3. Create new version 1.0.14" -ForegroundColor White
Write-Host "   4. Select build 34 for the new version" -ForegroundColor White
Write-Host "   5. Update app metadata and screenshots" -ForegroundColor White
Write-Host "   6. Submit for review" -ForegroundColor White
Write-Host ""
Write-Host "📖 For detailed instructions, see: REPUBLISH_APP_STORE_CONNECT_GUIDE.md" -ForegroundColor Cyan
Write-Host ""

