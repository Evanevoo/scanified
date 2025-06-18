/**
 * Performance monitoring utilities for the gas cylinder application
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  /**
   * Start timing an operation
   * @param {string} name - Name of the operation
   * @returns {string} Timer ID
   */
  startTimer(name) {
    if (!this.isEnabled) return null;
    
    const timerId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.metrics.set(timerId, {
      name,
      startTime: performance.now(),
      endTime: null,
      duration: null
    });
    
    return timerId;
  }

  /**
   * End timing an operation
   * @param {string} timerId - Timer ID from startTimer
   * @returns {number} Duration in milliseconds
   */
  endTimer(timerId) {
    if (!this.isEnabled || !timerId) return 0;
    
    const metric = this.metrics.get(timerId);
    if (!metric) return 0;
    
    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    
    this.logMetric(metric);
    this.metrics.delete(timerId);
    
    return metric.duration;
  }

  /**
   * Measure async operation performance
   * @param {string} name - Name of the operation
   * @param {Function} operation - Async operation to measure
   * @returns {Promise<any>} Result of the operation
   */
  async measureAsync(name, operation) {
    const timerId = this.startTimer(name);
    try {
      const result = await operation();
      this.endTimer(timerId);
      return result;
    } catch (error) {
      this.endTimer(timerId);
      throw error;
    }
  }

  /**
   * Measure sync operation performance
   * @param {string} name - Name of the operation
   * @param {Function} operation - Sync operation to measure
   * @returns {any} Result of the operation
   */
  measureSync(name, operation) {
    const timerId = this.startTimer(name);
    try {
      const result = operation();
      this.endTimer(timerId);
      return result;
    } catch (error) {
      this.endTimer(timerId);
      throw error;
    }
  }

  /**
   * Log performance metric
   * @param {Object} metric - Performance metric
   */
  logMetric(metric) {
    if (!this.isEnabled) return;
    
    const { name, duration } = metric;
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const color = duration > 1000 ? '🔴' : duration > 500 ? '🟡' : '🟢';
      console.log(`${color} ${name}: ${duration.toFixed(2)}ms`);
    }
    
    // Store for analytics
    this.storeMetric(metric);
    
    // Notify observers
    this.notifyObservers('metric', metric);
  }

  /**
   * Store metric for analytics
   * @param {Object} metric - Performance metric
   */
  storeMetric(metric) {
    const { name } = metric;
    const existing = this.metrics.get(name) || [];
    existing.push(metric);
    
    // Keep only last 100 metrics per operation
    if (existing.length > 100) {
      existing.splice(0, existing.length - 100);
    }
    
    this.metrics.set(name, existing);
  }

  /**
   * Get performance statistics
   * @param {string} name - Operation name (optional)
   * @returns {Object} Performance statistics
   */
  getStats(name = null) {
    if (name) {
      const metrics = this.metrics.get(name) || [];
      return this.calculateStats(metrics);
    }
    
    const allStats = {};
    for (const [operationName, metrics] of this.metrics) {
      allStats[operationName] = this.calculateStats(metrics);
    }
    
    return allStats;
  }

  /**
   * Calculate statistics from metrics
   * @param {Array} metrics - Array of performance metrics
   * @returns {Object} Statistics object
   */
  calculateStats(metrics) {
    if (metrics.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        median: 0
      };
    }
    
    const durations = metrics.map(m => m.duration).filter(d => d !== null);
    const sorted = durations.sort((a, b) => a - b);
    
    return {
      count: durations.length,
      average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      median: sorted[Math.floor(sorted.length / 2)]
    };
  }

  /**
   * Monitor component render performance
   * @param {string} componentName - Name of the component
   * @param {Function} renderFunction - Component render function
   * @returns {any} Rendered component
   */
  monitorRender(componentName, renderFunction) {
    return this.measureSync(`Render: ${componentName}`, renderFunction);
  }

  /**
   * Monitor API call performance
   * @param {string} endpoint - API endpoint
   * @param {Function} apiCall - API call function
   * @returns {Promise<any>} API response
   */
  monitorApiCall(endpoint, apiCall) {
    return this.measureAsync(`API: ${endpoint}`, apiCall);
  }

  /**
   * Monitor bundle size
   */
  monitorBundleSize() {
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        this.logMetric({
          name: 'Bundle Load Time',
          duration: loadTime
        });
      }
    }
  }

  /**
   * Monitor memory usage
   */
  monitorMemoryUsage() {
    if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
      const memory = window.performance.memory;
      this.logMetric({
        name: 'Memory Usage',
        duration: memory.usedJSHeapSize / 1024 / 1024, // Convert to MB
        metadata: {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        }
      });
    }
  }

  /**
   * Add performance observer
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  addObserver(event, callback) {
    if (!this.observers.has(event)) {
      this.observers.set(event, []);
    }
    this.observers.get(event).push(callback);
  }

  /**
   * Remove performance observer
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  removeObserver(event, callback) {
    const observers = this.observers.get(event);
    if (observers) {
      const index = observers.indexOf(callback);
      if (index > -1) {
        observers.splice(index, 1);
      }
    }
  }

  /**
   * Notify observers of an event
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  notifyObservers(event, data) {
    const observers = this.observers.get(event);
    if (observers) {
      observers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Performance observer error:', error);
        }
      });
    }
  }

  /**
   * Enable/disable performance monitoring
   * @param {boolean} enabled - Whether to enable monitoring
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * Clear all stored metrics
   */
  clearMetrics() {
    this.metrics.clear();
  }

  /**
   * Export metrics for analysis
   * @returns {Object} Exported metrics
   */
  exportMetrics() {
    const exported = {};
    for (const [name, metrics] of this.metrics) {
      exported[name] = metrics.map(m => ({
        name: m.name,
        duration: m.duration,
        timestamp: m.startTime
      }));
    }
    return exported;
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Export utility functions
export const measureAsync = (name, operation) => performanceMonitor.measureAsync(name, operation);
export const measureSync = (name, operation) => performanceMonitor.measureSync(name, operation);
export const startTimer = (name) => performanceMonitor.startTimer(name);
export const endTimer = (timerId) => performanceMonitor.endTimer(timerId);
export const monitorRender = (componentName, renderFunction) => performanceMonitor.monitorRender(componentName, renderFunction);
export const monitorApiCall = (endpoint, apiCall) => performanceMonitor.monitorApiCall(endpoint, apiCall);
export const getPerformanceStats = (name) => performanceMonitor.getStats(name);
export const clearPerformanceMetrics = () => performanceMonitor.clearMetrics();
export const exportPerformanceMetrics = () => performanceMonitor.exportMetrics();

export default performanceMonitor; 