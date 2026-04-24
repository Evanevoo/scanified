// Load environment variables from .env (project root, then app folder)
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

module.exports = {
  expo: {
    name: "Scanified",
    slug: "gas-cylinder-mobile",
    version: "1.0.51",
    orientation: "portrait",
    icon: "./assets/app-icon.png",
    userInterfaceStyle: "automatic",
    platforms: ["ios", "android"],
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#000000"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.evanevoo.scanifiedmobile",
      buildNumber: "110",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: "Scanified uses your camera to scan asset barcodes for inventory management and tracking purposes.",
        NSPhotoLibraryUsageDescription: "Scanified may access your photo library to save scanned asset images for documentation purposes.",
        NSFaceIDUsageDescription: "Scanified uses Face ID for secure and convenient login authentication.",
        NSBiometricUsageDescription: "Scanified uses biometric authentication for secure and convenient login.",
        LSApplicationCategoryType: "public.app-category.business",
        CFBundleURLTypes: [
          {
            CFBundleURLName: "apple-signin",
            CFBundleURLSchemes: ["scanifiedmobile-auth"]
          }
        ]
      },
      usesAppleSignIn: true,
      associatedDomains: [
        "applinks:jtfucttzaswmqqhmmhfb.supabase.co",
        "webcredentials:jtfucttzaswmqqhmmhfb.supabase.co"
      ]
    },
    android: {
      package: "com.evanevoo.scanifiedmobile",
      versionCode: 110
    },
    plugins: [
      [
        "expo-build-properties",
        {
          ios: {
            deploymentTarget: "17.0"
          }
        }
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Scanified uses your camera to scan asset barcodes for inventory management and tracking purposes."
        }
      ],
      "expo-apple-authentication",
      "expo-notifications"
    ],
    extra: {
      // Read from environment variables for local development, or use template variables for EAS builds
      // Falls back to hardcoded values if env vars not set (for local dev only)
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://jtfucttzaswmqqhmmhfb.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30.6-CAPYefAektlh3dLRVFZbPKYSnhIAzp3knohc3NDEg",
      /**
       * Netlify `decode-barcode-ai` endpoint. Defaults to production Scanified site; override with
       * EXPO_PUBLIC_AI_BARCODE_FUNCTION_URL for staging or local Netlify (then rebuild).
       */
      EXPO_PUBLIC_AI_BARCODE_FUNCTION_URL: (
        process.env.EXPO_PUBLIC_AI_BARCODE_FUNCTION_URL ||
        (process.env.EXPO_PUBLIC_NETLIFY_FUNCTIONS_BASE_URL
          ? `${String(process.env.EXPO_PUBLIC_NETLIFY_FUNCTIONS_BASE_URL).replace(/\/$/, '')}/.netlify/functions/decode-barcode-ai`
          : 'https://www.scanified.com/.netlify/functions/decode-barcode-ai')
      ),
      /** Optional shared secret; must match Netlify AI_SCANNER_SECRET when that env is set. */
      EXPO_PUBLIC_AI_SCANNER_SECRET: process.env.EXPO_PUBLIC_AI_SCANNER_SECRET || "",
      /**
       * iOS “AI test scanner” calls OpenAI via Netlify (usage is billed to your OpenAI account).
       * Default false so the app does not steer users toward a paid API.
       */
      EXPO_PUBLIC_ENABLE_AI_BARCODE_TEST: process.env.EXPO_PUBLIC_ENABLE_AI_BARCODE_TEST === 'true',
      eas: {
        projectId: "d71ec042-1fec-4186-ac3b-0ae85a6af345"
      }
    },
    owner: "evanevoo"
  }
};
