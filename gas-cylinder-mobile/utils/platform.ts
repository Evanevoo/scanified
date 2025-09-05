import { Platform as RNPlatform } from 'react-native';

// Safe Platform utility that handles cases where Platform might not be available
export const Platform = {
  OS: RNPlatform?.OS || 'ios',
  isPad: RNPlatform?.isPad || false,
  isTV: RNPlatform?.isTV || false,
  isTVOS: RNPlatform?.isTVOS || false,
  Version: RNPlatform?.Version || 0,
  constants: RNPlatform?.constants || {},
  select: RNPlatform?.select || ((obj: any) => obj.ios || obj.default || obj),
};

// Helper functions for common platform checks
export const isIOS = () => Platform.OS === 'ios';
export const isAndroid = () => Platform.OS === 'android';
export const isTablet = () => Platform.isPad;
export const isPhone = () => !Platform.isPad;
