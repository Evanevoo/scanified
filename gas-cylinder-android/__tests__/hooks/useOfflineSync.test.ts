import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { supabase } from '../../supabase';

// Mock the supabase module
jest.mock('../../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock the useErrorHandler hook
jest.mock('../../hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: jest.fn(),
    withErrorHandling: jest.fn(),
  }),
}));

describe('useOfflineSync', () => {
  beforeEach(() => {
    // Clear AsyncStorage before each test
    AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('checkConnectivity', () => {
    it('should return true when online', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        const isOnline = await result.current.checkConnectivity();
        expect(isOnline).toBe(true);
      });

      expect(result.current.syncStatus.isOnline).toBe(true);
    });

    it('should return false when offline', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockRejectedValue(new Error('Network error')),
        }),
      } as any);

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        const isOnline = await result.current.checkConnectivity();
        expect(isOnline).toBe(false);
      });

      expect(result.current.syncStatus.isOnline).toBe(false);
    });
  });

  describe('saveOfflineScan', () => {
    it('should save scan data to AsyncStorage', async () => {
      const { result } = renderHook(() => useOfflineSync());
      const scanData = {
        barcode: 'TEST123',
        customer_id: 'customer1',
        order_number: 'ORDER001',
        scan_type: 'SHIP',
        location: 'Warehouse A',
        user_id: 'user1',
      };

      await act(async () => {
        await result.current.saveOfflineScan(scanData);
      });

      const storedData = await AsyncStorage.getItem('offline_scans');
      const scans = JSON.parse(storedData || '[]');
      
      expect(scans).toHaveLength(1);
      expect(scans[0]).toMatchObject({
        ...scanData,
        timestamp: expect.any(String),
      });
      expect(result.current.syncStatus.pendingScans).toBe(1);
    });

    it('should append to existing scans', async () => {
      const { result } = renderHook(() => useOfflineSync());
      const existingScans = [
        {
          barcode: 'EXISTING1',
          customer_id: 'customer1',
          order_number: 'ORDER001',
          scan_type: 'SHIP',
          location: 'Warehouse A',
          user_id: 'user1',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      await AsyncStorage.setItem('offline_scans', JSON.stringify(existingScans));

      const newScanData = {
        barcode: 'NEW123',
        customer_id: 'customer2',
        order_number: 'ORDER002',
        scan_type: 'RETURN',
        location: 'Warehouse B',
        user_id: 'user1',
      };

      await act(async () => {
        await result.current.saveOfflineScan(newScanData);
      });

      const storedData = await AsyncStorage.getItem('offline_scans');
      const scans = JSON.parse(storedData || '[]');
      
      expect(scans).toHaveLength(2);
      expect(result.current.syncStatus.pendingScans).toBe(2);
    });
  });

  describe('getPendingScans', () => {
    it('should return 0 when no offline scans exist', async () => {
      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        const count = await result.current.syncStatus.pendingScans;
        expect(count).toBe(0);
      });
    });

    it('should return correct count of pending scans', async () => {
      const scans = [
        { barcode: 'TEST1', timestamp: '2024-01-01T00:00:00.000Z' },
        { barcode: 'TEST2', timestamp: '2024-01-01T00:00:00.000Z' },
        { barcode: 'TEST3', timestamp: '2024-01-01T00:00:00.000Z' },
      ];

      await AsyncStorage.setItem('offline_scans', JSON.stringify(scans));

      const { result } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(result.current.syncStatus.pendingScans).toBe(3);
      });
    });
  });

  describe('getLastSyncTime', () => {
    it('should return "Never" when no sync time exists', async () => {
      const { result } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(result.current.syncStatus.lastSyncTime).toBe('Never');
      });
    });

    it('should return stored sync time', async () => {
      const syncTime = '2024-01-01T12:00:00.000Z';
      await AsyncStorage.setItem('last_sync_time', syncTime);

      const { result } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(result.current.syncStatus.lastSyncTime).toBe(syncTime);
      });
    });
  });

  describe('syncOfflineData', () => {
    it('should fail when offline', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockRejectedValue(new Error('Network error')),
        }),
      } as any);

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        const success = await result.current.syncOfflineData();
        expect(success).toBe(false);
      });
    });

    it('should sync successfully when online', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      
      // Mock connectivity check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      // Mock scan insertion
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      const scans = [
        {
          barcode: 'TEST123',
          customer_id: 'customer1',
          order_number: 'ORDER001',
          scan_type: 'SHIP',
          location: 'Warehouse A',
          user_id: 'user1',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      await AsyncStorage.setItem('offline_scans', JSON.stringify(scans));

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        const success = await result.current.syncOfflineData();
        expect(success).toBe(true);
      });

      // Verify scans were removed from storage
      const remainingScans = await AsyncStorage.getItem('offline_scans');
      expect(remainingScans).toBeNull();

      // Verify sync time was updated
      const syncTime = await AsyncStorage.getItem('last_sync_time');
      expect(syncTime).toBeTruthy();
    });

    it('should handle sync errors gracefully', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      
      // Mock connectivity check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      // Mock scan insertion with error
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ 
          error: { message: 'Database error' } 
        }),
      } as any);

      const scans = [
        {
          barcode: 'TEST123',
          customer_id: 'customer1',
          order_number: 'ORDER001',
          scan_type: 'SHIP',
          location: 'Warehouse A',
          user_id: 'user1',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      await AsyncStorage.setItem('offline_scans', JSON.stringify(scans));

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        const success = await result.current.syncOfflineData();
        expect(success).toBe(false);
      });

      // Verify scans remain in storage due to error
      const remainingScans = await AsyncStorage.getItem('offline_scans');
      expect(remainingScans).toBeTruthy();
    });
  });

  describe('updateSyncStatus', () => {
    it('should update all sync status properties', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const scans = [
        { barcode: 'TEST1', timestamp: '2024-01-01T00:00:00.000Z' },
      ];
      await AsyncStorage.setItem('offline_scans', JSON.stringify(scans));
      await AsyncStorage.setItem('last_sync_time', '2024-01-01T12:00:00.000Z');

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.updateSyncStatus();
      });

      expect(result.current.syncStatus.isOnline).toBe(true);
      expect(result.current.syncStatus.pendingScans).toBe(1);
      expect(result.current.syncStatus.lastSyncTime).toBe('2024-01-01T12:00:00.000Z');
      expect(result.current.syncStatus.isSyncing).toBe(false);
    });
  });

  describe('initialization', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.syncStatus).toEqual({
        isOnline: true,
        pendingScans: 0,
        lastSyncTime: 'Never',
        isSyncing: false,
      });
    });

    it('should update status on mount', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const { result } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(result.current.syncStatus.isOnline).toBe(true);
      });
    });
  });
}); 