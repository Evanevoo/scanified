import logger from './logger';

/**
 * Global Error Handler for unhandled errors and promise rejections
 * This should be initialized early in the app lifecycle
 */

let isInitialized = false;
let errorCallbacks = [];

/**
 * Initialize the global error handler
 * @param {Object} options - Configuration options
 */
export const initGlobalErrorHandler = (options = {}) => {
  if (isInitialized) {
    logger.warn('Global error handler already initialized');
    return;
  }

  const {
    enableLogging = true,
    enableReporting = true,
    onError = null,
  } = options;

  if (onError && typeof onError === 'function') {
    errorCallbacks.push(onError);
  }

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    if (enableLogging) {
      logger.error('Unhandled Promise Rejection:', {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        type: 'unhandledrejection'
      });
    }

    // Don't show user-facing errors for certain common cases
    const silentErrors = [
      'ResizeObserver loop',
      'Script error',
      'Non-Error promise rejection',
      'Network request failed',
      'Failed to fetch'
    ];

    const errorMessage = error?.message || String(error);
    const shouldSilence = silentErrors.some(msg => errorMessage.includes(msg));

    if (!shouldSilence && enableReporting) {
      notifyErrorCallbacks({
        type: 'unhandledrejection',
        message: error?.message || 'An unexpected error occurred',
        error
      });
    }

    // Prevent the error from being logged to console twice
    event.preventDefault();
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    const { message, filename, lineno, colno, error } = event;

    if (enableLogging) {
      logger.error('Global Error:', {
        message,
        filename,
        lineno,
        colno,
        stack: error?.stack,
        type: 'error'
      });
    }

    // Don't show errors from external scripts
    if (filename && !filename.includes(window.location.origin)) {
      return;
    }

    // Don't report certain non-critical errors
    const ignoredErrors = [
      'ResizeObserver loop',
      'Loading chunk',
      'ChunkLoadError',
      'Network Error'
    ];

    const shouldIgnore = ignoredErrors.some(msg => message?.includes(msg));

    if (!shouldIgnore && enableReporting) {
      notifyErrorCallbacks({
        type: 'error',
        message: message || 'An unexpected error occurred',
        error,
        location: { filename, lineno, colno }
      });
    }
  });

  isInitialized = true;
  logger.log('Global error handler initialized');
};

/**
 * Add an error callback
 * @param {Function} callback - Callback function to handle errors
 */
export const addErrorCallback = (callback) => {
  if (typeof callback === 'function') {
    errorCallbacks.push(callback);
  }
};

/**
 * Remove an error callback
 * @param {Function} callback - Callback function to remove
 */
export const removeErrorCallback = (callback) => {
  errorCallbacks = errorCallbacks.filter(cb => cb !== callback);
};

/**
 * Notify all error callbacks
 * @param {Object} errorInfo - Error information
 */
const notifyErrorCallbacks = (errorInfo) => {
  errorCallbacks.forEach(callback => {
    try {
      callback(errorInfo);
    } catch (e) {
      logger.error('Error in error callback:', e);
    }
  });
};

/**
 * Wrap an async function with error boundary protection
 * @param {Function} fn - The async function to wrap
 * @param {string} context - Context for error logging
 * @returns {Function} - Wrapped function
 */
export const withErrorBoundary = (fn, context = 'Unknown') => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logger.error(`Error in ${context}:`, error);
      throw error;
    }
  };
};

/**
 * Safe JSON parse with error handling
 * @param {string} jsonString - JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} - Parsed JSON or default value
 */
export const safeJsonParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    logger.warn('JSON parse error:', error.message);
    return defaultValue;
  }
};

/**
 * Safe async operation with timeout
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operationName - Name of the operation for logging
 * @returns {Promise} - Result or timeout error
 */
export const withTimeout = (promise, timeoutMs = 30000, operationName = 'Operation') => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};

export default {
  initGlobalErrorHandler,
  addErrorCallback,
  removeErrorCallback,
  withErrorBoundary,
  safeJsonParse,
  withTimeout
};
