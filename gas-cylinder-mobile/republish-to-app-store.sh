#!/bin/bash
# Bash Script to Republish Scanified to App Store Connect
# Version: 1.0.14 (Build 34)

echo "🚀 Scanified App Store Republishing Script"
echo "==========================================="
echo ""

# Check if we're in the correct directory
if [ ! -f "app.json" ]; then
    echo "❌ Error: app.json not found. Please run this script from the gas-cylinder-mobile directory."
    exit 1
fi

echo "✅ Current Configuration:"
echo "   App Name: Scanified"
echo "   Version: 1.0.14"
echo "   Build Number: 34"
echo "   Bundle ID: com.evanevoo.scanifiedmobile"
echo ""

# Check if EAS CLI is installed
echo "🔍 Checking EAS CLI installation..."
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g eas-cli
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install EAS CLI. Please install manually: npm install -g eas-cli"
        exit 1
    fi
fi

echo "✅ EAS CLI is installed"
echo ""

# Check if logged in to EAS
echo "🔍 Checking EAS authentication..."
if ! eas whoami &> /dev/null; then
    echo "⚠️  Not logged in to EAS. Please log in:"
    echo "   eas login"
    echo ""
    read -p "Do you want to log in now? (y/n) " login
    if [ "$login" = "y" ] || [ "$login" = "Y" ]; then
        eas login
        if [ $? -ne 0 ]; then
            echo "❌ Login failed. Please try again manually."
            exit 1
        fi
    else
        echo "❌ Please log in to EAS before continuing."
        exit 1
    fi
else
    echo "✅ Logged in to EAS"
fi
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies."
    exit 1
fi
echo "✅ Dependencies installed"
echo ""

# Ask user what they want to do
echo "What would you like to do?"
echo "1. Build iOS app for production"
echo "2. Submit existing build to App Store Connect"
echo "3. Build and submit (full process)"
echo "4. Check build status"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🏗️  Building iOS app for production..."
        echo "   This may take 15-30 minutes..."
        echo ""
        eas build --platform ios --profile production
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Build completed successfully!"
            echo "   Check your build status at: https://expo.dev/accounts/evanevoo/projects/gas-cylinder-mobile/builds"
        else
            echo ""
            echo "❌ Build failed. Please check the error messages above."
        fi
        ;;
    2)
        echo ""
        echo "📤 Submitting to App Store Connect..."
        echo ""
        eas submit --platform ios
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Submission completed successfully!"
            echo "   Check App Store Connect: https://appstoreconnect.apple.com"
        else
            echo ""
            echo "❌ Submission failed. Please check the error messages above."
        fi
        ;;
    3)
        echo ""
        echo "🏗️  Building iOS app for production..."
        echo "   This may take 15-30 minutes..."
        echo ""
        eas build --platform ios --profile production
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Build completed successfully!"
            echo ""
            read -p "Do you want to submit to App Store Connect now? (y/n) " submit
            if [ "$submit" = "y" ] || [ "$submit" = "Y" ]; then
                echo ""
                echo "📤 Submitting to App Store Connect..."
                echo ""
                eas submit --platform ios
                if [ $? -eq 0 ]; then
                    echo ""
                    echo "✅ Submission completed successfully!"
                    echo "   Check App Store Connect: https://appstoreconnect.apple.com"
                else
                    echo ""
                    echo "❌ Submission failed. Please check the error messages above."
                fi
            fi
        else
            echo ""
            echo "❌ Build failed. Please check the error messages above."
        fi
        ;;
    4)
        echo ""
        echo "📊 Checking build status..."
        echo ""
        eas build:list --platform ios --limit 5
        echo ""
        echo "View all builds at: https://expo.dev/accounts/evanevoo/projects/gas-cylinder-mobile/builds"
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again and select 1-4."
        exit 1
        ;;
esac

echo ""
echo "📚 Next Steps:"
echo "   1. Wait for build to complete (if building)"
echo "   2. Go to App Store Connect: https://appstoreconnect.apple.com"
echo "   3. Create new version 1.0.14"
echo "   4. Select build 34 for the new version"
echo "   5. Update app metadata and screenshots"
echo "   6. Submit for review"
echo ""
echo "📖 For detailed instructions, see: REPUBLISH_APP_STORE_CONNECT_GUIDE.md"
echo ""

