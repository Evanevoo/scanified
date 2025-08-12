#!/bin/bash

echo "🚀 Building Scanified iOS App..."
echo "=================================="

# Check if we're in the right directory
if [ ! -f "app-ios.json" ]; then
    echo "❌ Error: app-ios.json not found. Make sure you're in the gas-cylinder-mobile directory."
    exit 1
fi

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Build for iOS
echo "🔨 Building iOS app..."
eas build --platform ios --profile production --config eas-ios.json --clear-cache

echo "✅ iOS build completed!"
echo "📱 You can now submit to App Store using: npm run submit:ios"
