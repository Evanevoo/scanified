#!/bin/bash

echo "🚀 Building Scanified iOS App..."
echo "====================================="

# Check if we're in the right directory
if [ ! -f "app-ios.json" ]; then
    echo "❌ Error: app-ios.json not found. Make sure you're in the gas-cylinder-mobile directory."
    exit 1
fi

# Switch to iOS configuration
echo "📱 Switching to iOS configuration..."
cp app-ios.json app.json
cp eas-ios.json eas.json
cp package-ios.json package.json

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build for iOS
echo "🔨 Building iOS app..."
eas build --platform ios --profile production --clear-cache

echo "✅ iOS build completed!"
echo "🍎 You can now submit to App Store using: npm run submit:ios"