import logger from '../utils/logger';
import { useState, useEffect, useRef, useCallback } from 'react';

// Global cache store
const globalCache = new Map();
const cacheTimestamps = new Map();
const subscriptions = new Map();

// Cache expiration time (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

// Cache invalidation patterns
const INVALIDATION_PATTERNS = {
  'bottles': ['bottles', 'bottle_', 'rentals', 'deliveries'],
  'customers': ['customers', 'customer_', 'rentals', 'deliveries'],
  'locations': ['locations', 'location_'],
  'deliveries': ['deliveries', 'delivery_'],
  'rentals': ['rentals', 'rental_']
};

export const useDataCache = (key, fetchFn, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  // Create cache key from dependencies
  const cacheKey = `${key}_${JSON.stringify(dependencies)}`;

  // Check if data is cached and not expired
  const getCachedData = useCallback(() => {
    const cached = globalCache.get(cacheKey);
    const timestamp = cacheTimestamps.get(cacheKey);
    
    if (cached && timestamp && Date.now() - timestamp < CACHE_EXPIRY) {
      return cached;
    }
    
    return null;
  }, [cacheKey]);

  // Fetch data with caching
  const fetchData = useCallback(async (force = false) => {
    if (!mountedRef.current) return;

    // Check cache first unless forced
    if (!force) {
      const cached = getCachedData();
      if (cached) {
        setData(cached);
        return cached;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      
      if (mountedRef.current) {
        // Cache the result
        globalCache.set(cacheKey, result);
        cacheTimestamps.set(cacheKey, Date.now());
        
        setData(result);
        
        // Notify subscribers
        const subs = subscriptions.get(cacheKey) || new Set();
        subs.forEach(callback => callback(result));
        
        return result;
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        logger.error(`Cache fetch error for ${key}:`, err);
      }
      throw err;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [cacheKey, fetchFn, getCachedData, key]);

  // Subscribe to cache updates
  useEffect(() => {
    const callback = (newData) => {
      if (mountedRef.current) {
        setData(newData);
      }
    };

    if (!subscriptions.has(cacheKey)) {
      subscriptions.set(cacheKey, new Set());
    }
    subscriptions.get(cacheKey).add(callback);

    return () => {
      subscriptions.get(cacheKey)?.delete(callback);
    };
  }, [cacheKey]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { 
    data, 
    loading, 
    error, 
    refetch: () => fetchData(true),
    refresh: () => fetchData(true)
  };
};

// Cache invalidation utility
export const invalidateCache = (pattern) => {
  const keysToInvalidate = [];
  
  // Find keys that match the pattern
  for (const [key] of globalCache) {
    if (INVALIDATION_PATTERNS[pattern]?.some(p => key.includes(p))) {
      keysToInvalidate.push(key);
    }
  }
  
  // Remove from cache
  keysToInvalidate.forEach(key => {
    globalCache.delete(key);
    cacheTimestamps.delete(key);
  });
  
  logger.log(`Invalidated ${keysToInvalidate.length} cache entries for pattern: ${pattern}`);
};

// Manual cache control
export const clearCache = () => {
  globalCache.clear();
  cacheTimestamps.clear();
  subscriptions.clear();
};

export const getCacheSize = () => globalCache.size;

export const getCacheKeys = () => Array.from(globalCache.keys());

// Preload data utility
export const preloadData = async (key, fetchFn, dependencies = []) => {
  const cacheKey = `${key}_${JSON.stringify(dependencies)}`;
  
  // Check if already cached
  const cached = globalCache.get(cacheKey);
  const timestamp = cacheTimestamps.get(cacheKey);
  
  if (cached && timestamp && Date.now() - timestamp < CACHE_EXPIRY) {
    return cached;
  }
  
  // Fetch and cache
  try {
    const result = await fetchFn();
    globalCache.set(cacheKey, result);
    cacheTimestamps.set(cacheKey, Date.now());
    return result;
  } catch (error) {
    logger.error(`Preload error for ${key}:`, error);
    throw error;
  }
};

// Batch data fetching
export const useBatchData = (requests) => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBatch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const results = await Promise.all(
        requests.map(async ({ key, fetchFn, dependencies = [] }) => {
          const cacheKey = `${key}_${JSON.stringify(dependencies)}`;
          
          // Check cache first
          const cached = globalCache.get(cacheKey);
          const timestamp = cacheTimestamps.get(cacheKey);
          
          if (cached && timestamp && Date.now() - timestamp < CACHE_EXPIRY) {
            return { key, data: cached };
          }
          
          // Fetch fresh data
          const result = await fetchFn();
          
          // Cache the result
          globalCache.set(cacheKey, result);
          cacheTimestamps.set(cacheKey, Date.now());
          
          return { key, data: result };
        })
      );
      
      const batchData = {};
      results.forEach(({ key, data }) => {
        batchData[key] = data;
      });
      
      setData(batchData);
    } catch (err) {
      setError(err);
      logger.error('Batch fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [requests]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  return { data, loading, error, refetch: fetchBatch };
};

// Real-time cache updates
export const updateCache = (key, updater, dependencies = []) => {
  const cacheKey = `${key}_${JSON.stringify(dependencies)}`;
  const cached = globalCache.get(cacheKey);
  
  if (cached) {
    const updated = typeof updater === 'function' ? updater(cached) : updater;
    globalCache.set(cacheKey, updated);
    cacheTimestamps.set(cacheKey, Date.now());
    
    // Notify subscribers
    const subs = subscriptions.get(cacheKey) || new Set();
    subs.forEach(callback => callback(updated));
  }
};

export default useDataCache; 