/**
 * CORS utility for Netlify functions
 * Provides secure CORS headers instead of wildcard '*'
 */

// Allowed origins for CORS - production and development domains
const ALLOWED_ORIGINS = [
  'https://www.scanified.com',
  'https://scanified.com',
  'https://app.scanified.com',
  // Development origins
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:8888',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8888'
];

/**
 * Get the appropriate CORS origin based on the request
 * @param {Object} event - Netlify function event object
 * @returns {string} - The CORS origin to use
 */
function getCorsOrigin(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  
  // In development, allow localhost origins
  const isDev = process.env.NODE_ENV === 'development' || process.env.CONTEXT === 'dev';
  if (isDev && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    return origin;
  }
  
  // Check if origin is in allowed list
  if (ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  
  // Default to main domain for security
  return 'https://www.scanified.com';
}

/**
 * Generate CORS headers for a response
 * @param {Object} event - Netlify function event object
 * @returns {Object} - CORS headers object
 */
function getCorsHeaders(event) {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(event),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
    'Content-Type': 'application/json'
  };
}

/**
 * Handle OPTIONS preflight request
 * @param {Object} event - Netlify function event object
 * @returns {Object} - Response object for OPTIONS request
 */
function handlePreflight(event) {
  return {
    statusCode: 200,
    headers: getCorsHeaders(event),
    body: ''
  };
}

/**
 * Create a JSON response with CORS headers
 * @param {Object} event - Netlify function event object
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body
 * @returns {Object} - Response object
 */
function createResponse(event, statusCode, body) {
  return {
    statusCode,
    headers: getCorsHeaders(event),
    body: JSON.stringify(body)
  };
}

/**
 * Create an error response (hides sensitive details in production)
 * @param {Object} event - Netlify function event object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - User-friendly error message
 * @param {Error} error - Original error object (optional, only logged in dev)
 * @returns {Object} - Response object
 */
function createErrorResponse(event, statusCode, message, error = null) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.CONTEXT === 'production';
  
  // Log error details for debugging (server-side only)
  if (error) {
    console.error(`[Error] ${message}:`, error.message);
    if (!isProduction) {
      console.error('Stack:', error.stack);
    }
  }
  
  const body = {
    error: message,
    success: false
  };
  
  // Only include detailed error in development
  if (!isProduction && error) {
    body.details = error.message;
  }
  
  return createResponse(event, statusCode, body);
}

module.exports = {
  ALLOWED_ORIGINS,
  getCorsOrigin,
  getCorsHeaders,
  handlePreflight,
  createResponse,
  createErrorResponse
};
