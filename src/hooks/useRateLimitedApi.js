import { useState, useCallback, useRef } from 'react';
import { useErrorHandler } from './useErrorHandler';

/**
 * Custom hook for rate-limited API calls
 * @param {Object} options - Configuration options
 * @param {number} options.delay - Delay between requests in milliseconds
 * @param {number} options.maxConcurrent - Maximum concurrent requests
 * @param {boolean} options.retryOnFailure - Whether to retry failed requests
 * @param {number} options.maxRetries - Maximum number of retries
 * @returns {Object} Rate-limited API utilities
 */
export const useRateLimitedApi = (options = {}) => {
  const {
    delay = 1000,
    maxConcurrent = 3,
    retryOnFailure = true,
    maxRetries = 3
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [activeRequests, setActiveRequests] = useState(0);
  const requestQueue = useRef([]);
  const lastRequestTime = useRef(0);
  const { handleError, executeWithRetry } = useErrorHandler();

  /**
   * Execute a rate-limited API call
   * @param {Function} apiCall - The API function to execute
   * @param {Object} callOptions - Options for this specific call
   * @returns {Promise} The result of the API call
   */
  const executeApiCall = useCallback(async (apiCall, callOptions = {}) => {
    const {
      skipRateLimit = false,
      customDelay = delay,
      showError = true,
      retry = retryOnFailure
    } = callOptions;

    // Check if we can make the request immediately
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime.current;
    
    if (!skipRateLimit && timeSinceLastRequest < customDelay) {
      const waitTime = customDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Check concurrent request limit
    if (activeRequests >= maxConcurrent) {
      // Add to queue
      return new Promise((resolve, reject) => {
        requestQueue.current.push({
          apiCall,
          callOptions,
          resolve,
          reject,
          timestamp: Date.now()
        });
      });
    }

    // Execute the request
    setActiveRequests(prev => prev + 1);
    lastRequestTime.current = Date.now();

    try {
      let result;
      
      if (retry) {
        result = await executeWithRetry(apiCall, { maxRetries, baseDelay: 500 });
      } else {
        result = await apiCall();
      }

      return result;
    } catch (error) {
      if (showError) {
        handleError(error, {
          showToast: true,
          logToConsole: true
        });
      }
      throw error;
    } finally {
      setActiveRequests(prev => prev - 1);
      
      // Process queue
      if (requestQueue.current.length > 0) {
        const nextRequest = requestQueue.current.shift();
        if (nextRequest) {
          // Execute the next queued request
          executeApiCall(nextRequest.apiCall, nextRequest.callOptions)
            .then(nextRequest.resolve)
            .catch(nextRequest.reject);
        }
      }
    }
  }, [delay, maxConcurrent, retryOnFailure, maxRetries, activeRequests, executeWithRetry, handleError]);

  /**
   * Execute multiple API calls with rate limiting
   * @param {Array} apiCalls - Array of API functions to execute
   * @param {Object} callOptions - Options for all calls
   * @returns {Promise<Array>} Array of results
   */
  const executeBatchApiCalls = useCallback(async (apiCalls, callOptions = {}) => {
    const {
      batchSize = 5,
      batchDelay = delay * 2,
      showProgress = false
    } = callOptions;

    const results = [];
    const totalCalls = apiCalls.length;

    for (let i = 0; i < totalCalls; i += batchSize) {
      const batch = apiCalls.slice(i, i + batchSize);
      
      // Execute batch
      const batchPromises = batch.map(apiCall => 
        executeApiCall(apiCall, { ...callOptions, skipRateLimit: true })
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);

      // Add delay between batches
      if (i + batchSize < totalCalls) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }

    return results;
  }, [executeApiCall, delay]);

  /**
   * Clear the request queue
   */
  const clearQueue = useCallback(() => {
    requestQueue.current = [];
  }, []);

  /**
   * Get queue status
   */
  const getQueueStatus = useCallback(() => ({
    queueLength: requestQueue.current.length,
    activeRequests,
    lastRequestTime: lastRequestTime.current,
    isProcessing: activeRequests > 0 || requestQueue.current.length > 0
  }), [activeRequests]);

  /**
   * Debounced API call
   * @param {Function} apiCall - The API function to execute
   * @param {number} debounceDelay - Debounce delay in milliseconds
   * @param {Object} callOptions - Options for the call
   * @returns {Promise} The result of the API call
   */
  const executeDebouncedApiCall = useCallback((apiCall, debounceDelay = 500, callOptions = {}) => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(async () => {
        try {
          const result = await executeApiCall(apiCall, callOptions);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, debounceDelay);

      // Return a function to cancel the debounced call
      return () => {
        clearTimeout(timeoutId);
        reject(new Error('Debounced call cancelled'));
      };
    });
  }, [executeApiCall]);

  return {
    isLoading,
    activeRequests,
    executeApiCall,
    executeBatchApiCalls,
    executeDebouncedApiCall,
    clearQueue,
    getQueueStatus
  };
};

export default useRateLimitedApi; 