#!/bin/bash

# Build and Submit iOS and Android Apps
# Run this script to build and submit both apps

echo "🚀 Starting build and submission process..."

# iOS Build and Submit
echo ""
echo "📱 Building iOS app..."
cd gas-cylinder-mobile
eas build --platform ios --profile production

echo ""
echo "⏳ Waiting for iOS build to complete..."
echo "   Check EAS dashboard or wait for notification"

read -p "Press Enter once iOS build is complete to submit..."

echo ""
echo "📤 Submitting iOS to App Store Connect..."
eas submit --platform ios --profile production

# Android Build and Submit
echo ""
echo "🤖 Building Android app..."
cd ../gas-cylinder-android
eas build --platform android --profile production

echo ""
echo "⏳ Waiting for Android build to complete..."
echo "   Check EAS dashboard or wait for notification"

read -p "Press Enter once Android build is complete to submit..."

echo ""
echo "📤 Submitting Android to Google Play Console..."
eas submit --platform android --profile production

echo ""
echo "✅ Build and submission process complete!"
echo "   Check App Store Connect and Google Play Console for status"
