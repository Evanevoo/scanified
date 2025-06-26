// Test script for daily update system
// Run this in the browser console to test the daily update functionality

import { updateDaysAtLocation } from './src/utils/daysAtLocationUpdater.js';

console.log('Testing daily update system...');

// Test the update function
const testDailyUpdate = async () => {
  try {
    console.log('Starting test update...');
    const result = await updateDaysAtLocation();
    
    if (result.success) {
      console.log('✅ Daily update test successful!');
      console.log(`Updated ${result.updated} bottles out of ${result.total} total`);
      console.log('Mode:', result.mode || 'standard');
    } else {
      console.error('❌ Daily update test failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Test error:', error);
    return { success: false, error: error.message };
  }
};

// Run the test
testDailyUpdate(); 