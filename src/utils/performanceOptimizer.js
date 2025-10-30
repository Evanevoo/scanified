import logger from '../utils/logger';
/**
 * Performance Optimization Utilities
 * Provides various performance optimization techniques
 */

import { useMemo, useCallback, useRef, useEffect } from 'react';

/**
 * Debounce hook for performance optimization
 */
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Throttle hook for performance optimization
 */
export const useThrottle = (callback, delay) => {
  const lastRun = useRef(Date.now());

  return useCallback((...args) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]);
};

/**
 * Memoized callback hook
 */
export const useMemoizedCallback = (callback, deps) => {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args) => {
    return callbackRef.current(...args);
  }, deps);
};

/**
 * Intersection Observer hook for lazy loading
 */
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [hasIntersected, options]);

  return [elementRef, isIntersecting, hasIntersected];
};

/**
 * Performance monitoring hook
 */
export const usePerformanceMonitor = (label) => {
  const startTime = useRef(null);

  const start = useCallback(() => {
    startTime.current = performance.now();
    logger.log(`🚀 Starting: ${label}`);
  }, [label]);

  const end = useCallback(() => {
    if (startTime.current) {
      const duration = performance.now() - startTime.current;
      logger.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
      startTime.current = null;
    }
  }, [label]);

  const measure = useCallback((fn) => {
    return async (...args) => {
      start();
      try {
        const result = await fn(...args);
        end();
        return result;
      } catch (error) {
        end();
        throw error;
      }
    };
  }, [start, end]);

  return { start, end, measure };
};

/**
 * Memory optimization utilities
 */
export const memoryOptimizer = {
  // Clean up large objects
  cleanup: (obj) => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        if (obj[key] && typeof obj[key] === 'object') {
          obj[key] = null;
        }
      });
    }
  },

  // Deep clone with memory optimization
  deepClone: (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => memoryOptimizer.deepClone(item));
    if (typeof obj === 'object') {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = memoryOptimizer.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  },

  // Check if object is empty
  isEmpty: (obj) => {
    if (obj == null) return true;
    if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  }
};

/**
 * Bundle size optimization utilities
 */
export const bundleOptimizer = {
  // Lazy load components
  lazyLoad: (importFunction) => {
    return React.lazy(importFunction);
  },

  // Code splitting utilities
  splitCode: (chunkName) => {
    return (component) => {
      return React.lazy(() => 
        import(/* webpackChunkName: "[request]" */ component)
      );
    };
  },

  // Dynamic imports
  dynamicImport: async (modulePath) => {
    try {
      const module = await import(modulePath);
      return module.default || module;
    } catch (error) {
      logger.error(`Failed to load module: ${modulePath}`, error);
      return null;
    }
  }
};

/**
 * Network optimization utilities
 */
export const networkOptimizer = {
  // Request deduplication
  requestCache: new Map(),
  
  deduplicateRequest: (key, requestFn) => {
    if (networkOptimizer.requestCache.has(key)) {
      return networkOptimizer.requestCache.get(key);
    }
    
    const promise = requestFn();
    networkOptimizer.requestCache.set(key, promise);
    
    promise.finally(() => {
      networkOptimizer.requestCache.delete(key);
    });
    
    return promise;
  },

  // Request batching
  batchRequests: (requests, batchSize = 5) => {
    const batches = [];
    for (let i = 0; i < requests.length; i += batchSize) {
      batches.push(requests.slice(i, i + batchSize));
    }
    
    return batches.map(batch => Promise.all(batch));
  },

  // Request prioritization
  prioritizeRequest: (request, priority = 'normal') => {
    const priorities = {
      high: 1,
      normal: 2,
      low: 3
    };
    
    return {
      ...request,
      priority: priorities[priority] || 2
    };
  }
};

/**
 * Rendering optimization utilities
 */
export const renderingOptimizer = {
  // Memoization helpers
  memoize: (fn, keyFn) => {
    const cache = new Map();
    
    return (...args) => {
      const key = keyFn ? keyFn(...args) : JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const result = fn(...args);
      cache.set(key, result);
      
      return result;
    };
  },

  // Should update check
  shouldUpdate: (prevProps, nextProps, keys) => {
    return keys.some(key => prevProps[key] !== nextProps[key]);
  },

  // Pure component helper
  pureComponent: (Component) => {
    return React.memo(Component, (prevProps, nextProps) => {
      return JSON.stringify(prevProps) === JSON.stringify(nextProps);
    });
  }
};

/**
 * Database query optimization
 */
export const queryOptimizer = {
  // Query batching
  batchQueries: (queries, batchSize = 10) => {
    const batches = [];
    for (let i = 0; i < queries.length; i += batchSize) {
      batches.push(queries.slice(i, i + batchSize));
    }
    
    return batches.map(batch => Promise.all(batch));
  },

  // Query caching
  queryCache: new Map(),
  
  cacheQuery: (key, queryFn, ttl = 5 * 60 * 1000) => {
    const cached = queryOptimizer.queryCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return Promise.resolve(cached.data);
    }
    
    return queryFn().then(data => {
      queryOptimizer.queryCache.set(key, {
        data,
        timestamp: Date.now()
      });
      return data;
    });
  },

  // Query deduplication
  deduplicateQuery: (key, queryFn) => {
    if (queryOptimizer.queryCache.has(key)) {
      const cached = queryOptimizer.queryCache.get(key);
      if (cached.promise) {
        return cached.promise;
      }
    }
    
    const promise = queryFn();
    queryOptimizer.queryCache.set(key, { promise });
    
    promise.finally(() => {
      const cached = queryOptimizer.queryCache.get(key);
      if (cached) {
        cached.promise = null;
        cached.timestamp = Date.now();
      }
    });
    
    return promise;
  }
};

export default {
  useDebounce,
  useThrottle,
  useMemoizedCallback,
  useIntersectionObserver,
  usePerformanceMonitor,
  memoryOptimizer,
  bundleOptimizer,
  networkOptimizer,
  renderingOptimizer,
  queryOptimizer
};
