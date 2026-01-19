import logger from '../utils/logger';

/**
 * Rate Limiter Service for Mobile Apps
 * Prevents excessive API calls and protects against abuse
 */

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Default rate limit configurations by endpoint type
const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  // Authentication endpoints - stricter limits
  auth: { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute
  login: { maxRequests: 5, windowMs: 60000 }, // 5 attempts per minute
  passwordReset: { maxRequests: 3, windowMs: 300000 }, // 3 requests per 5 minutes
  
  // Read operations - more lenient
  read: { maxRequests: 100, windowMs: 60000 }, // 100 per minute
  search: { maxRequests: 30, windowMs: 60000 }, // 30 per minute
  
  // Write operations - moderate limits
  write: { maxRequests: 30, windowMs: 60000 }, // 30 per minute
  scan: { maxRequests: 60, windowMs: 60000 }, // 60 scans per minute
  
  // Default fallback
  default: { maxRequests: 50, windowMs: 60000 }, // 50 per minute
};

class RateLimitService {
  private requests: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up old entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Check if a request is allowed based on rate limiting
   * @param identifier - Unique identifier (e.g., user ID, device ID)
   * @param endpoint - The endpoint or action being rate limited
   * @param limitType - Type of limit to apply (default, auth, read, write, etc.)
   * @returns Object with allowed status and retry information
   */
  checkLimit(
    identifier: string,
    endpoint: string,
    limitType: keyof typeof DEFAULT_LIMITS = 'default'
  ): { allowed: boolean; retryAfter?: number; remaining?: number } {
    const key = `${identifier}-${endpoint}`;
    const config = DEFAULT_LIMITS[limitType] || DEFAULT_LIMITS.default;
    const now = Date.now();

    const entry = this.requests.get(key);

    // No previous requests - allow
    if (!entry) {
      this.requests.set(key, {
        count: 1,
        firstRequest: now,
        lastRequest: now,
      });
      return { 
        allowed: true, 
        remaining: config.maxRequests - 1 
      };
    }

    // Check if window has expired
    if (now - entry.firstRequest >= config.windowMs) {
      // Reset the window
      this.requests.set(key, {
        count: 1,
        firstRequest: now,
        lastRequest: now,
      });
      return { 
        allowed: true, 
        remaining: config.maxRequests - 1 
      };
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.ceil((entry.firstRequest + config.windowMs - now) / 1000);
      logger.warn(`Rate limit exceeded for ${endpoint}. Retry after ${retryAfter}s`);
      return { 
        allowed: false, 
        retryAfter,
        remaining: 0 
      };
    }

    // Update count and allow
    entry.count++;
    entry.lastRequest = now;
    this.requests.set(key, entry);

    return { 
      allowed: true, 
      remaining: config.maxRequests - entry.count 
    };
  }

  /**
   * Wrapper function to rate limit async operations
   * @param identifier - Unique identifier
   * @param endpoint - The endpoint or action
   * @param operation - The async operation to execute
   * @param limitType - Type of limit to apply
   * @returns Promise with the operation result or rate limit error
   */
  async withRateLimit<T>(
    identifier: string,
    endpoint: string,
    operation: () => Promise<T>,
    limitType: keyof typeof DEFAULT_LIMITS = 'default'
  ): Promise<{ success: boolean; data?: T; error?: string; retryAfter?: number }> {
    const check = this.checkLimit(identifier, endpoint, limitType);

    if (!check.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Please try again in ${check.retryAfter} seconds.`,
        retryAfter: check.retryAfter,
      };
    }

    try {
      const data = await operation();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  }

  /**
   * Get current rate limit status for an endpoint
   */
  getStatus(
    identifier: string,
    endpoint: string,
    limitType: keyof typeof DEFAULT_LIMITS = 'default'
  ): { remaining: number; resetIn: number } {
    const key = `${identifier}-${endpoint}`;
    const config = DEFAULT_LIMITS[limitType] || DEFAULT_LIMITS.default;
    const entry = this.requests.get(key);

    if (!entry) {
      return { remaining: config.maxRequests, resetIn: 0 };
    }

    const now = Date.now();
    const resetIn = Math.max(0, Math.ceil((entry.firstRequest + config.windowMs - now) / 1000));
    const remaining = Math.max(0, config.maxRequests - entry.count);

    return { remaining, resetIn };
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(identifier: string, endpoint: string): void {
    const key = `${identifier}-${endpoint}`;
    this.requests.delete(key);
    logger.log(`Rate limit reset for ${endpoint}`);
  }

  /**
   * Reset all rate limits for an identifier
   */
  resetAll(identifier: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.requests.keys()) {
      if (key.startsWith(`${identifier}-`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.requests.delete(key));
    logger.log(`All rate limits reset for identifier: ${identifier}`);
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [key, entry] of this.requests.entries()) {
      if (now - entry.lastRequest > maxAge) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Destroy the service and clean up
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.requests.clear();
  }
}

// Export singleton instance
export const rateLimitService = new RateLimitService();

// Export class for testing
export { RateLimitService };

// Export default limits for reference
export { DEFAULT_LIMITS };
