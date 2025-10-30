/**
 * Production-safe logger utility
 * Only logs errors and warnings in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isDebugEnabled = process.env.VITE_DEBUG === 'true';

const logger = {
  log: (...args) => {
    if (isDevelopment || isDebugEnabled) {
      console.log(...args);
    }
  },
  
  info: (...args) => {
    if (isDevelopment || isDebugEnabled) {
      console.info(...args);
    }
  },
  
  warn: (...args) => {
    // Always log warnings
    console.warn(...args);
  },
  
  error: (...args) => {
    // Always log errors
    console.error(...args);
  },
  
  debug: (...args) => {
    if (isDevelopment || isDebugEnabled) {
      console.debug(...args);
    }
  },
  
  // Production-safe method that only logs critical information
  critical: (...args) => {
    console.error('[CRITICAL]', ...args);
  },
  
  // Method to track important events in production
  track: (event, data) => {
    if (isDevelopment || isDebugEnabled) {
      console.log(`[TRACK] ${event}:`, data);
    }
    // In production, this could send to analytics service
  }
};

export default logger;
