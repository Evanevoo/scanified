// Load environment variables from .env file (if it exists)
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const iosAppConfig = require('./app-ios.json').expo;
const isIosBuild = process.env.EAS_BUILD_PLATFORM === 'ios';

module.exports = {
  expo: {
    name: isIosBuild ? iosAppConfig.name : "Scanified Android",
    slug: isIosBuild ? iosAppConfig.slug : "gas-cylinder-android",
    version: isIosBuild ? iosAppConfig.version : "1.0.47",
    orientation: "portrait",
    icon: "./assets/app-icon.png",
    userInterfaceStyle: "automatic",
    platforms: ["android", "ios"],
    description: "Professional asset tracking and inventory management solution for Android. Scan barcodes, track assets, manage inventory, and maintain compliance with comprehensive reporting tools.",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#40B5AD"
    },
    assetBundlePatterns: ["**/*"],
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      package: "com.evanevoo.scanifiedandroid",
      versionCode: 103,
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO"
      ]
    },
    // iOS config from app-ios.json (buildNumber, bundleId, etc.)
    ios: {
      ...iosAppConfig.ios,
      infoPlist: {
        ...iosAppConfig.ios?.infoPlist,
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: iosAppConfig.ios?.infoPlist?.NSCameraUsageDescription || "Allow AssetTrack Pro to access your camera to scan asset barcodes and manage your organization's inventory with enterprise-grade precision.",
      },
    },
    plugins: [
      [
        "expo-camera",
        {
          cameraPermission: "Scanified uses your camera to scan asset barcodes for inventory management and tracking purposes."
        }
      ],
      "expo-font",
      "./plugins/withLargeScreenSupport.js",
      [
        "expo-build-properties",
        {
          android: {
            minSdkVersion: 24,
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            buildToolsVersion: "35.0.0"
          }
        }
      ],
      "expo-apple-authentication",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#ffffff"
        }
      ]
    ],
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://jtfucttzaswmqqhmmhfb.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30.6-CAPYefAektlh3dLRVFZbPKYSnhIAzp3knohc3NDEg",
      eas: {
        projectId: process.env.EAS_BUILD_PLATFORM === 'ios' ? "d71ec042-1fec-4186-ac3b-0ae85a6af345" : "aeaa8128-e08f-4323-a677-5f1e3b5add03"
      }
    },
    owner: "evanevoo"
  }
};
