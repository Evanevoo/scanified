import { useState, useCallback, useRef } from 'react';
import { useErrorHandler } from './useErrorHandler';

/**
 * Enhanced rate-limited API hook with improved error handling and retry logic
 * @param {Object} options - Configuration options
 * @param {number} options.delay - Delay between requests in milliseconds
 * @param {number} options.maxConcurrent - Maximum concurrent requests
 * @param {boolean} options.retryOnFailure - Whether to retry failed requests
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {number} options.backoffMultiplier - Backoff multiplier for retries
 * @returns {Object} Rate-limited API utilities
 */
export const useRateLimitedApi = (options = {}) => {
  const {
    delay = 1000,
    maxConcurrent = 3,
    retryOnFailure = true,
    maxRetries = 3,
    backoffMultiplier = 2
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [activeRequests, setActiveRequests] = useState(0);
  const requestQueue = useRef([]);
  const lastRequestTime = useRef(0);
  const { handleError, executeWithRetry } = useErrorHandler();

  /**
   * Execute a rate-limited API call
   * @param {Function} apiCall - The API call function
   * @param {Object} callOptions - Options for this specific call
   * @returns {Promise<any>} API response
   */
  const executeApiCall = useCallback(async (apiCall, callOptions = {}) => {
    const {
      skipRateLimit = false,
      retryOnFailure: callRetryOnFailure = retryOnFailure,
      maxRetries: callMaxRetries = maxRetries
    } = callOptions;

    // Check if we can make the request immediately
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime.current;
    
    if (!skipRateLimit && timeSinceLastRequest < delay) {
      const waitTime = delay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Check concurrent request limit
    if (activeRequests >= maxConcurrent) {
      return new Promise((resolve, reject) => {
        requestQueue.current.push({ apiCall, resolve, reject, callOptions });
      });
    }

    setIsLoading(true);
    setActiveRequests(prev => prev + 1);
    lastRequestTime.current = Date.now();

    try {
      let result;
      
      if (callRetryOnFailure) {
        result = await executeWithRetry(apiCall, {
          maxRetries: callMaxRetries,
          baseDelay: delay,
          backoffMultiplier
        });
      } else {
        result = await apiCall();
      }

      return result;
    } catch (error) {
      handleError(error, {
        showToast: true,
        toastMessage: 'API request failed. Please try again.',
        logToConsole: true
      });
      throw error;
    } finally {
      setActiveRequests(prev => prev - 1);
      setIsLoading(false);
      
      // Process queued requests
      if (requestQueue.current.length > 0) {
        const nextRequest = requestQueue.current.shift();
        if (nextRequest) {
          executeApiCall(nextRequest.apiCall, nextRequest.callOptions)
            .then(nextRequest.resolve)
            .catch(nextRequest.reject);
        }
      }
    }
  }, [delay, maxConcurrent, retryOnFailure, maxRetries, backoffMultiplier, activeRequests, executeWithRetry, handleError]);

  /**
   * Execute multiple API calls with rate limiting
   * @param {Array<Function>} apiCalls - Array of API call functions
   * @param {Object} options - Options for batch execution
   * @returns {Promise<Array>} Array of results
   */
  const executeBatch = useCallback(async (apiCalls, options = {}) => {
    const {
      parallel = false,
      batchSize = maxConcurrent,
      delayBetweenBatches = delay
    } = options;

    if (parallel) {
      // Execute all calls in parallel with rate limiting
      const promises = apiCalls.map((apiCall, index) => {
        return new Promise(resolve => {
          setTimeout(() => {
            executeApiCall(apiCall, options)
              .then(resolve)
              .catch(resolve); // Resolve with error to maintain array structure
          }, index * delay);
        });
      });
      
      return Promise.all(promises);
    } else {
      // Execute calls sequentially in batches
      const results = [];
      
      for (let i = 0; i < apiCalls.length; i += batchSize) {
        const batch = apiCalls.slice(i, i + batchSize);
        const batchPromises = batch.map(apiCall => executeApiCall(apiCall, options));
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Add delay between batches
        if (i + batchSize < apiCalls.length) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }
      
      return results;
    }
  }, [executeApiCall, maxConcurrent, delay]);

  /**
   * Clear the request queue
   */
  const clearQueue = useCallback(() => {
    requestQueue.current = [];
  }, []);

  /**
   * Get current queue status
   * @returns {Object} Queue status
   */
  const getQueueStatus = useCallback(() => {
    return {
      queueLength: requestQueue.current.length,
      activeRequests,
      isLoading,
      lastRequestTime: lastRequestTime.current
    };
  }, [activeRequests, isLoading]);

  return {
    executeApiCall,
    executeBatch,
    clearQueue,
    getQueueStatus,
    isLoading,
    activeRequests
  };
}; 