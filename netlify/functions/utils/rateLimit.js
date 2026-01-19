/**
 * Rate Limiting utility for Netlify functions
 * Provides basic rate limiting using in-memory storage
 * Note: For production, consider using a persistent store like Redis
 */

// In-memory rate limit storage (resets on function cold start)
// For production, use Redis or another persistent store
const rateLimitStore = new Map();

// Rate limit configurations by endpoint type
const RATE_LIMITS = {
  // Authentication - stricter limits
  auth: { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute
  login: { maxRequests: 5, windowMs: 60000 },
  passwordReset: { maxRequests: 3, windowMs: 300000 }, // 3 per 5 minutes
  
  // Email sending - moderate limits
  email: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
  invite: { maxRequests: 10, windowMs: 60000 },
  
  // Payment/Subscription - stricter limits
  payment: { maxRequests: 10, windowMs: 60000 },
  subscription: { maxRequests: 5, windowMs: 60000 },
  
  // General operations
  read: { maxRequests: 100, windowMs: 60000 }, // 100 per minute
  write: { maxRequests: 30, windowMs: 60000 }, // 30 per minute
  delete: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
  
  // Default fallback
  default: { maxRequests: 50, windowMs: 60000 }
};

/**
 * Get client identifier from event
 * @param {Object} event - Netlify function event
 * @returns {string} - Client identifier
 */
function getClientIdentifier(event) {
  // Try to get real IP from various headers
  const ip = 
    event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.headers?.['x-real-ip'] ||
    event.headers?.['client-ip'] ||
    'unknown';
  
  return ip;
}

/**
 * Check if request is allowed under rate limit
 * @param {string} identifier - Client identifier
 * @param {string} endpoint - Endpoint name
 * @param {string} limitType - Type of rate limit to apply
 * @returns {Object} - { allowed: boolean, retryAfter?: number, remaining?: number }
 */
function checkRateLimit(identifier, endpoint, limitType = 'default') {
  const key = `${identifier}:${endpoint}`;
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.default;
  const now = Date.now();
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  
  // If no entry or window expired, create new entry
  if (!entry || (now - entry.windowStart) >= config.windowMs) {
    entry = {
      count: 1,
      windowStart: now
    };
    rateLimitStore.set(key, entry);
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1
    };
  }
  
  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.windowStart + config.windowMs - now) / 1000);
    
    return {
      allowed: false,
      retryAfter,
      remaining: 0
    };
  }
  
  // Increment count and allow
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count
  };
}

/**
 * Apply rate limiting to a Netlify function
 * @param {Object} event - Netlify function event
 * @param {string} endpoint - Endpoint name for rate limiting
 * @param {string} limitType - Type of rate limit to apply
 * @returns {Object|null} - Rate limit response if exceeded, null if allowed
 */
function applyRateLimit(event, endpoint, limitType = 'default') {
  const identifier = getClientIdentifier(event);
  const result = checkRateLimit(identifier, endpoint, limitType);
  
  if (!result.allowed) {
    console.warn(`Rate limit exceeded for ${identifier} on ${endpoint}`);
    
    return {
      statusCode: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter),
        'X-RateLimit-Remaining': '0'
      },
      body: JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter
      })
    };
  }
  
  return null; // Request allowed
}

/**
 * Clean up old entries from rate limit store
 * Call periodically to prevent memory leaks
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if ((now - entry.windowStart) > maxAge) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);

module.exports = {
  RATE_LIMITS,
  getClientIdentifier,
  checkRateLimit,
  applyRateLimit,
  cleanupRateLimitStore
};
