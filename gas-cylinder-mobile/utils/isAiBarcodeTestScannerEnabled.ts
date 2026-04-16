import Constants from 'expo-constants';

/** iOS-only AI test uses OpenAI (paid). Hidden unless EXPO_PUBLIC_ENABLE_AI_BARCODE_TEST=true at build time. */
export function isAiBarcodeTestScannerEnabled(): boolean {
  const raw = Constants.expoConfig?.extra?.EXPO_PUBLIC_ENABLE_AI_BARCODE_TEST as boolean | string | undefined;
  return raw === true || raw === 'true';
}
