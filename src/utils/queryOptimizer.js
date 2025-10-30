import { useState, useEffect, useCallback } from 'react';

/**
 * Database Query Optimization Utilities
 * Provides optimized query patterns and caching strategies
 */

/**
 * Optimized Supabase query builder with pagination
 */
export const createOptimizedQuery = (supabase, table, options = {}) => {
  const {
    select = '*',
    filters = {},
    orderBy = { column: 'created_at', ascending: false },
    pagination = { page: 0, pageSize: 25 },
    include = [],
    cache = true
  } = options;

  let query = supabase.from(table).select(select);

  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else if (typeof value === 'string' && value.includes('%')) {
        query = query.ilike(key, value);
      } else {
        query = query.eq(key, value);
      }
    }
  });

  // Apply ordering
  if (orderBy) {
    query = query.order(orderBy.column, { ascending: orderBy.ascending });
  }

  // Apply pagination
  if (pagination) {
    const { page, pageSize } = pagination;
    const offset = page * pageSize;
    query = query.range(offset, offset + pageSize - 1);
  }

  // Apply includes (joins)
  if (include.length > 0) {
    const selectWithIncludes = `${select}, ${include.join(', ')}`;
    query = query.select(selectWithIncludes);
  }

  return query;
};

/**
 * Batch query executor for multiple related queries
 */
export const executeBatchQueries = async (queries) => {
  try {
    const results = await Promise.all(queries);
    
    // Check for errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      throw new Error(`Batch query failed: ${errors.map(e => e.error.message).join(', ')}`);
    }

    return results.map(result => result.data);
  } catch (error) {
    console.error('Batch query execution failed:', error);
    throw error;
  }
};

/**
 * Query result cache manager
 */
class QueryCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) { // 5 minutes default TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  generateKey(table, options) {
    return `${table}:${JSON.stringify(options)}`;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(key, data) {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }

  invalidate(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const queryCache = new QueryCache();

/**
 * Cached query executor
 */
export const executeCachedQuery = async (supabase, table, options = {}) => {
  const { cache = true, ...queryOptions } = options;
  
  if (!cache) {
    const query = createOptimizedQuery(supabase, table, queryOptions);
    const result = await query;
    if (result.error) throw result.error;
    return result.data;
  }

  const cacheKey = queryCache.generateKey(table, queryOptions);
  const cachedResult = queryCache.get(cacheKey);

  if (cachedResult) {
    return cachedResult;
  }

  const query = createOptimizedQuery(supabase, table, queryOptions);
  const result = await query;
  
  if (result.error) throw result.error;
  
  queryCache.set(cacheKey, result.data);
  return result.data;
};

/**
 * Optimized data fetching hook
 */
export const useOptimizedQuery = (supabase, table, options = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get count for pagination
      if (options.pagination) {
        const countQuery = supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        // Apply same filters to count query
        Object.entries(options.filters || {}).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            if (Array.isArray(value)) {
              countQuery.in(key, value);
            } else if (typeof value === 'string' && value.includes('%')) {
              countQuery.ilike(key, value);
            } else {
              countQuery.eq(key, value);
            }
          }
        });

        const { count } = await countQuery;
        setTotalCount(count || 0);
      }

      // Fetch data
      const result = await executeCachedQuery(supabase, table, options);
      setData(result);
    } catch (err) {
      setError(err.message);
      console.error(`Error fetching ${table}:`, err);
    } finally {
      setLoading(false);
    }
  }, [supabase, table, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    // Invalidate cache and refetch
    queryCache.invalidate(table);
    fetchData();
  }, [fetchData, table]);

  return {
    data,
    loading,
    error,
    totalCount,
    refetch
  };
};

/**
 * Search optimization utilities
 */
export const createSearchQuery = (supabase, table, searchTerm, searchFields = []) => {
  if (!searchTerm || searchFields.length === 0) {
    return supabase.from(table).select('*');
  }

  // Use full-text search if available, otherwise use ilike
  const searchConditions = searchFields.map(field => 
    `${field}.ilike.%${searchTerm}%`
  ).join(',');

  return supabase
    .from(table)
    .select('*')
    .or(searchConditions);
};

/**
 * Performance monitoring
 */
export const performanceMonitor = {
  startTime: null,
  
  start(label) {
    this.startTime = performance.now();
    console.log(`🚀 Starting: ${label}`);
  },
  
  end(label) {
    if (this.startTime) {
      const duration = performance.now() - this.startTime;
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
      this.startTime = null;
    }
  },
  
  measure(asyncFunction, label) {
    return async (...args) => {
      this.start(label);
      try {
        const result = await asyncFunction(...args);
        this.end(label);
        return result;
      } catch (error) {
        this.end(`${label} (error)`);
        throw error;
      }
    };
  }
};

export default {
  createOptimizedQuery,
  executeBatchQueries,
  executeCachedQuery,
  useOptimizedQuery,
  createSearchQuery,
  performanceMonitor,
  queryCache
};
