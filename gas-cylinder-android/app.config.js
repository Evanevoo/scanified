// Load environment variables from .env file (if it exists)
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

module.exports = {
  expo: {
    name: "Scanified Android",
    slug: "gas-cylinder-android",
    version: "1.0.58",
    orientation: "portrait",
    icon: "./assets/app-icon.png",
    userInterfaceStyle: "automatic",
    platforms: ["android"],
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
      versionCode: 131,
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO"
      ]
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
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#ffffff"
        }
      ]
    ],
    extra: {
      // From root/.env (local) or EAS secrets (builds). Never commit anon keys.
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
      eas: {
        projectId: "aeaa8128-e08f-4323-a677-5f1e3b5add03"
      }
    },
    owner: "evanevoo"
  }
};
