#!/bin/bash

echo "🚀 Building Scanified Android App..."
echo "====================================="

# Check if we're in the right directory
if [ ! -f "app-android.json" ]; then
    echo "❌ Error: app-android.json not found. Make sure you're in the gas-cylinder-mobile directory."
    exit 1
fi

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Build for Android
echo "🔨 Building Android app..."
eas build --platform android --profile production --config eas-android.json --clear-cache

echo "✅ Android build completed!"
echo "🤖 You can now submit to Google Play Store using: npm run submit:android"
