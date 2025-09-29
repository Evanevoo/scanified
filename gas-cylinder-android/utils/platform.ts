import { Platform as RNPlatform } from 'react-native';

// iOS-only Platform utility for Scanified mobile app
export const Platform = {
  OS: 'ios' as const,
  isPad: RNPlatform?.isPad || false,
  isTV: false,
  isTVOS: false,
  Version: RNPlatform?.Version || 0,
  constants: RNPlatform?.constants || {},
  select: (obj: any) => obj.ios || obj.default || obj,
};

// Helper functions for iOS platform checks
export const isIOS = () => true;
export const isTablet = () => Platform.isPad;
export const isPhone = () => !Platform.isPad;
