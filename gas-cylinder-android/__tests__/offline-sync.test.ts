import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple test to verify AsyncStorage works
describe('Offline Storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('should save and retrieve offline scans', async () => {
    const testScan = {
      barcode: 'TEST123',
      customer_id: 'customer1',
      order_number: 'ORDER001',
      scan_type: 'SHIP',
      location: 'Test Warehouse',
      user_id: 'test-user',
      timestamp: new Date().toISOString(),
    };

    // Save scan
    const existingData = await AsyncStorage.getItem('offline_scans');
    const scans = existingData ? JSON.parse(existingData) : [];
    scans.push(testScan);
    await AsyncStorage.setItem('offline_scans', JSON.stringify(scans));

    // Retrieve scan
    const retrievedData = await AsyncStorage.getItem('offline_scans');
    const retrievedScans = JSON.parse(retrievedData || '[]');

    expect(retrievedScans).toHaveLength(1);
    expect(retrievedScans[0].barcode).toBe('TEST123');
    expect(retrievedScans[0].customer_id).toBe('customer1');
  });

  it('should handle multiple scans', async () => {
    const scans = [
      {
        barcode: 'TEST1',
        customer_id: 'customer1',
        order_number: 'ORDER001',
        scan_type: 'SHIP',
        location: 'Warehouse A',
        user_id: 'user1',
        timestamp: new Date().toISOString(),
      },
      {
        barcode: 'TEST2',
        customer_id: 'customer2',
        order_number: 'ORDER002',
        scan_type: 'RETURN',
        location: 'Warehouse B',
        user_id: 'user1',
        timestamp: new Date().toISOString(),
      },
    ];

    await AsyncStorage.setItem('offline_scans', JSON.stringify(scans));

    const retrievedData = await AsyncStorage.getItem('offline_scans');
    const retrievedScans = JSON.parse(retrievedData || '[]');

    expect(retrievedScans).toHaveLength(2);
    expect(retrievedScans[0].barcode).toBe('TEST1');
    expect(retrievedScans[1].barcode).toBe('TEST2');
  });

  it('should clear offline data', async () => {
    const testScan = {
      barcode: 'TEST123',
      customer_id: 'customer1',
      order_number: 'ORDER001',
      scan_type: 'SHIP',
      location: 'Test Warehouse',
      user_id: 'test-user',
      timestamp: new Date().toISOString(),
    };

    await AsyncStorage.setItem('offline_scans', JSON.stringify([testScan]));
    await AsyncStorage.removeItem('offline_scans');

    const retrievedData = await AsyncStorage.getItem('offline_scans');
    expect(retrievedData).toBeNull();
  });

  it('should track sync time', async () => {
    const syncTime = new Date().toISOString();
    await AsyncStorage.setItem('last_sync_time', syncTime);

    const retrievedTime = await AsyncStorage.getItem('last_sync_time');
    expect(retrievedTime).toBe(syncTime);
  });

  it('should handle empty offline storage', async () => {
    const retrievedData = await AsyncStorage.getItem('offline_scans');
    const scans = retrievedData ? JSON.parse(retrievedData) : [];
    
    expect(scans).toHaveLength(0);
  });
}); 