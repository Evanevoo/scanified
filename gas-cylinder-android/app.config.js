// Load environment variables from .env file (if it exists)
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

module.exports = {
  expo: {
    name: "Scanified Android",
    slug: "gas-cylinder-android",
    version: "1.0.14",
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
      versionCode: 31,
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
      "expo-font"
    ],
    extra: {
      // Read from environment variables for local development, or use template variables for EAS builds
      // Falls back to hardcoded values if env vars not set (for local dev only)
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://jtfucttzaswmqqhmmhfb.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30.6-CAPYefAektlh3dLRVFZbPKYSnhIAzp3knohc3NDEg",
      eas: {
        projectId: "aeaa8128-e08f-4323-a677-5f1e3b5add03"
      }
    },
    owner: "evanevoo"
  }
};
