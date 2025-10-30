import {
  createOptimizedQuery,
  executeCachedQuery,
  clearCache,
} from '../../utils/queryOptimizer';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          range: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
    })),
  })),
};

jest.mock('../../supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('Query Optimizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCache();
  });

  describe('createOptimizedQuery', () => {
    it('should create basic query with table and columns', () => {
      const query = createOptimizedQuery('bottles', ['id', 'name', 'status']);
      
      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
      expect(typeof query.paginate).toBe('function');
      expect(typeof query.filter).toBe('function');
      expect(typeof query.order).toBe('function');
    });

    it('should execute query with basic parameters', async () => {
      const mockData = [{ id: 1, name: 'Bottle 1', status: 'active' }];
      mockSupabase.from().select().eq().order().range().single.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const query = createOptimizedQuery('bottles', ['id', 'name', 'status']);
      const result = await query.execute();

      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
    });

    it('should handle pagination', async () => {
      const mockData = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Bottle ${i + 1}`,
        status: 'active',
      }));
      
      mockSupabase.from().select().eq().order().range().single.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const query = createOptimizedQuery('bottles', ['id', 'name', 'status']);
      const result = await query.paginate(1, 10).execute();

      expect(result.data).toEqual(mockData);
      expect(mockSupabase.from().select().eq().order().range).toHaveBeenCalledWith(0, 9);
    });

    it('should handle filtering', async () => {
      const mockData = [{ id: 1, name: 'Bottle 1', status: 'active' }];
      mockSupabase.from().select().eq().order().range().single.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const query = createOptimizedQuery('bottles', ['id', 'name', 'status']);
      const result = await query.filter('status', 'active').execute();

      expect(result.data).toEqual(mockData);
      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('status', 'active');
    });

    it('should handle ordering', async () => {
      const mockData = [{ id: 1, name: 'Bottle 1', status: 'active' }];
      mockSupabase.from().select().eq().order().range().single.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const query = createOptimizedQuery('bottles', ['id', 'name', 'status']);
      const result = await query.order('name', 'asc').execute();

      expect(result.data).toEqual(mockData);
      expect(mockSupabase.from().select().eq().order).toHaveBeenCalledWith('name', 'asc');
    });

    it('should handle errors', async () => {
      const mockError = new Error('Database error');
      mockSupabase.from().select().eq().order().range().single.mockRejectedValue(mockError);

      const query = createOptimizedQuery('bottles', ['id', 'name', 'status']);
      const result = await query.execute();

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });
  });

  describe('executeCachedQuery', () => {
    it('should cache query results', async () => {
      const mockData = [{ id: 1, name: 'Bottle 1', status: 'active' }];
      mockSupabase.from().select().eq().order().range().single.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const queryKey = 'bottles:active:1:10';
      
      // First call
      const result1 = await executeCachedQuery(queryKey, () => 
        createOptimizedQuery('bottles', ['id', 'name', 'status']).execute()
      );

      // Second call should use cache
      const result2 = await executeCachedQuery(queryKey, () => 
        createOptimizedQuery('bottles', ['id', 'name', 'status']).execute()
      );

      expect(result1.data).toEqual(mockData);
      expect(result2.data).toEqual(mockData);
      expect(mockSupabase.from).toHaveBeenCalledTimes(1); // Only called once due to caching
    });

    it('should handle cache expiration', async () => {
      const mockData = [{ id: 1, name: 'Bottle 1', status: 'active' }];
      mockSupabase.from().select().eq().order().range().single.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const queryKey = 'bottles:active:1:10';
      
      // First call
      await executeCachedQuery(queryKey, () => 
        createOptimizedQuery('bottles', ['id', 'name', 'status']).execute(),
        100 // 100ms cache duration
      );

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Second call should not use cache
      await executeCachedQuery(queryKey, () => 
        createOptimizedQuery('bottles', ['id', 'name', 'status']).execute(),
        100
      );

      expect(mockSupabase.from).toHaveBeenCalledTimes(2); // Called twice due to cache expiration
    });

    it('should handle cache errors', async () => {
      const mockError = new Error('Cache error');
      mockSupabase.from().select().eq().order().range().single.mockRejectedValue(mockError);

      const queryKey = 'bottles:error:1:10';
      
      const result = await executeCachedQuery(queryKey, () => 
        createOptimizedQuery('bottles', ['id', 'name', 'status']).execute()
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear all cached queries', async () => {
      const mockData = [{ id: 1, name: 'Bottle 1', status: 'active' }];
      mockSupabase.from().select().eq().order().range().single.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const queryKey = 'bottles:active:1:10';
      
      // Cache a query
      await executeCachedQuery(queryKey, () => 
        createOptimizedQuery('bottles', ['id', 'name', 'status']).execute()
      );

      // Clear cache
      clearCache();

      // Query again should not use cache
      await executeCachedQuery(queryKey, () => 
        createOptimizedQuery('bottles', ['id', 'name', 'status']).execute()
      );

      expect(mockSupabase.from).toHaveBeenCalledTimes(2); // Called twice due to cache clear
    });
  });
});
