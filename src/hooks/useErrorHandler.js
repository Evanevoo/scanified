import logger from '../utils/logger';
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * Custom hook for standardized error handling
 * @returns {Object} Error handling utilities
 */
export const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [isError, setIsError] = useState(false);

  /**
   * Handle errors with consistent logging and user feedback
   * @param {Error|string} error - The error to handle
   * @param {Object} options - Error handling options
   * @param {boolean} options.showToast - Whether to show a toast notification
   * @param {string} options.toastMessage - Custom toast message
   * @param {boolean} options.logToConsole - Whether to log to console
   * @param {Function} options.onError - Custom error callback
   */
  const handleError = useCallback((error, options = {}) => {
    const {
      showToast = true,
      toastMessage = null,
      logToConsole = true,
      onError = null
    } = options;

    // Convert string errors to Error objects
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    
    // Set error state
    setError(errorObj);
    setIsError(true);

    // Log to console if enabled
    if (logToConsole) {
      logger.error('Error handled by useErrorHandler:', errorObj);
    }

    // Show toast notification if enabled
    if (showToast) {
      const message = toastMessage || errorObj.message || 'An unexpected error occurred';
      toast.error(message, {
        duration: 5000,
        position: 'top-right',
      });
    }

    // Call custom error handler if provided
    if (onError && typeof onError === 'function') {
      onError(errorObj);
    }
  }, []);

  /**
   * Clear the current error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setIsError(false);
  }, []);

  /**
   * Execute an async function with error handling
   * @param {Function} asyncFn - The async function to execute
   * @param {Object} options - Error handling options
   * @returns {Promise} The result of the async function
   */
  const executeWithErrorHandling = useCallback(async (asyncFn, options = {}) => {
    try {
      clearError();
      return await asyncFn();
    } catch (error) {
      handleError(error, options);
      throw error; // Re-throw to allow caller to handle if needed
    }
  }, [handleError, clearError]);

  /**
   * Handle Supabase-specific errors
   * @param {Object} supabaseError - Error from Supabase
   * @param {Object} options - Error handling options
   */
  const handleSupabaseError = useCallback((supabaseError, options = {}) => {
    let message = 'Database operation failed';
    
    if (supabaseError?.message) {
      message = supabaseError.message;
    } else if (supabaseError?.error?.message) {
      message = supabaseError.error.message;
    }

    // Handle specific Supabase error codes
    switch (supabaseError?.code) {
      case 'PGRST116':
        message = 'No rows returned from the query';
        break;
      case '23505':
        message = 'This record already exists';
        break;
      case '23503':
        message = 'Cannot delete this record as it is referenced by other records';
        break;
      case '42P01':
        message = 'Table not found';
        break;
      case '42501':
        message = 'Insufficient privileges';
        break;
      default:
        break;
    }

    handleError(new Error(message), options);
  }, [handleError]);

  /**
   * Handle network errors with retry logic
   * @param {Function} operation - The operation to retry
   * @param {Object} options - Retry options
   * @param {number} options.maxRetries - Maximum number of retries
   * @param {number} options.baseDelay - Base delay between retries
   * @returns {Promise} The result of the operation
   */
  const executeWithRetry = useCallback(async (operation, options = {}) => {
    const { maxRetries = 3, baseDelay = 1000 } = options;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const isNetworkError = error.message?.includes('Failed to fetch') || 
                              error.message?.includes('NetworkError') ||
                              error.message?.includes('timeout') ||
                              error.code === 'NETWORK_ERROR';

        if (!isNetworkError || attempt === maxRetries) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        logger.log(`Network error detected, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }, []);

  return {
    error,
    isError,
    handleError,
    clearError,
    executeWithErrorHandling,
    handleSupabaseError,
    executeWithRetry
  };
};

export default useErrorHandler; 