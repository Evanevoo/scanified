/**
 * Production-safe logger utility for React Native
 * Only logs errors and warnings in production
 */

const isDevelopment = __DEV__;

interface LogData {
  [key: string]: any;
}

class Logger {
  log(...args: any[]) {
    if (isDevelopment) {
      console.log(...args);
    }
  }
  
  info(...args: any[]) {
    if (isDevelopment) {
      console.info(...args);
    }
  }
  
  warn(...args: any[]) {
    // Always log warnings
    console.warn(...args);
  }
  
  error(...args: any[]) {
    // Always log errors
    console.error(...args);
  }
  
  debug(...args: any[]) {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
  
  // Production-safe method that only logs critical information
  critical(...args: any[]) {
    console.error('[CRITICAL]', ...args);
  }
  
  // Method to track important events in production
  track(event: string, data?: LogData) {
    if (isDevelopment) {
      console.log(`[TRACK] ${event}:`, data);
    }
    // In production, this could send to analytics service
  }
}

export default new Logger();
