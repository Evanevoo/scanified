// Load environment variables from .env (project root, then app folder)
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

module.exports = {
  expo: {
    name: "Scanified",
    slug: "gas-cylinder-mobile",
    version: "1.0.57",
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
      buildNumber: "124",
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
      versionCode: 112
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
      // From root/.env (local) or EAS secrets (builds). Never commit anon keys.
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
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
