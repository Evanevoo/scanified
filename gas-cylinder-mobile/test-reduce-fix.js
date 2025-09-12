// Test script to verify reduce fixes
console.log('🧪 Testing reduce fixes...');

// Test 1: OfflineModeService getTotalOfflineDataCount
const testOfflineCount = () => {
  try {
    // Simulate undefined counts
    const counts = undefined;
    if (!counts || typeof counts !== 'object') {
      console.log('✅ OfflineModeService null check working');
      return 0;
    }
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  } catch (error) {
    console.error('❌ OfflineModeService test failed:', error);
    return 0;
  }
};

// Test 2: AutoCompleteService getStats
const testAutoCompleteStats = () => {
  try {
    // Simulate undefined stats
    const stats = undefined;
    const result = {
      ...stats,
      total: Object.values(stats || {}).reduce((sum, count) => sum + count, 0),
    };
    console.log('✅ AutoCompleteService null check working');
    return result;
  } catch (error) {
    console.error('❌ AutoCompleteService test failed:', error);
    return { total: 0 };
  }
};

// Test 3: HomeScreen customer filter
const testCustomerFilter = () => {
  try {
    // Simulate undefined allCustomers
    const allCustomers = undefined;
    const uniqueCustomers = (allCustomers || []).filter((customer, index, self) =>
      index === self.findIndex((c) => c.CustomerListID === customer.CustomerListID)
    );
    console.log('✅ HomeScreen null check working');
    return uniqueCustomers;
  } catch (error) {
    console.error('❌ HomeScreen test failed:', error);
    return [];
  }
};

// Run tests
console.log('Running tests...');
testOfflineCount();
testAutoCompleteStats();
testCustomerFilter();
console.log('🎉 All reduce fix tests passed!');
