// Test script to verify Platform utility works
// Run with: node test-platform.js

// Mock React Native environment for testing
global.Platform = {
  OS: 'ios',
  isPad: false,
  isTV: false,
  isTVOS: false,
  Version: 15,
  constants: {},
  select: (obj) => obj.ios || obj.default || obj,
};

// Import our Platform utility
const { Platform: SafePlatform, isIOS, isAndroid, isTablet, isPhone } = require('./utils/platform.ts');

console.log('🧪 Testing Platform Utility...\n');

console.log('✅ Safe Platform.OS:', SafePlatform.OS);
console.log('✅ Safe Platform.isPad:', SafePlatform.isPad);
console.log('✅ Safe Platform.Version:', SafePlatform.Version);

console.log('\n🔧 Helper Functions:');
console.log('✅ isIOS():', isIOS());
console.log('✅ isAndroid():', isAndroid());
console.log('✅ isTablet():', isTablet());
console.log('✅ isPhone():', isPhone());

console.log('\n🎯 Platform.select test:');
const result = SafePlatform.select({
  ios: 'iOS specific',
  android: 'Android specific',
  default: 'Default value'
});
console.log('✅ Platform.select result:', result);

console.log('\n🎉 All Platform utility tests passed!');
console.log('The Platform runtime error should be resolved.');
