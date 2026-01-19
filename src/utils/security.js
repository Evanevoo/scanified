// Security utilities for CSRF protection and rate limiting

// Rate limiting implementation
class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Clean up every minute
  }

  // Check if request is allowed based on IP and endpoint
  isAllowed(identifier, endpoint, maxRequests = 10, windowMs = 60000) {
    const key = `${identifier}-${endpoint}`;
    const now = Date.now();
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const requests = this.requests.get(key);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);
    this.requests.set(key, validRequests);
    
    // Check if under limit
    if (validRequests.length >= maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    return true;
  }

  // Clean up old entries
  cleanup() {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < 300000); // 5 minutes
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }

  // Get client identifier (IP or user ID)
  getClientIdentifier() {
    // In a real implementation, this would get the actual IP
    // For now, we'll use a combination of factors
    return `${window.location.hostname}-${Date.now().toString(36)}`;
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

// CSRF token management
class CSRFProtection {
  constructor() {
    this.tokenKey = 'csrf_token';
    this.tokenExpiry = 3600000; // 1 hour
  }

  // Generate CSRF token
  generateToken() {
    const token = crypto.getRandomValues(new Uint8Array(32))
      .reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
    
    const tokenData = {
      token,
      timestamp: Date.now(),
      expires: Date.now() + this.tokenExpiry
    };
    
    sessionStorage.setItem(this.tokenKey, JSON.stringify(tokenData));
    return token;
  }

  // Get current token
  getToken() {
    try {
      const tokenData = JSON.parse(sessionStorage.getItem(this.tokenKey) || '{}');
      
      if (!tokenData.token || !tokenData.expires || Date.now() > tokenData.expires) {
        return this.generateToken();
      }
      
      return tokenData.token;
    } catch {
      return this.generateToken();
    }
  }

  // Validate CSRF token
  validateToken(token) {
    try {
      const tokenData = JSON.parse(sessionStorage.getItem(this.tokenKey) || '{}');
      
      if (!tokenData.token || !tokenData.expires || Date.now() > tokenData.expires) {
        return false;
      }
      
      return tokenData.token === token;
    } catch {
      return false;
    }
  }

  // Clear token
  clearToken() {
    sessionStorage.removeItem(this.tokenKey);
  }
}

// Global CSRF protection instance
const csrfProtection = new CSRFProtection();

// Secure API request wrapper
export const secureRequest = async (url, options = {}) => {
  const clientId = rateLimiter.getClientIdentifier();
  const endpoint = new URL(url).pathname;
  
  // Check rate limit
  if (!rateLimiter.isAllowed(clientId, endpoint)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  
  // Add CSRF token to headers
  const csrfToken = csrfProtection.getToken();
  const headers = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
    ...options.headers
  };
  
  // Add security headers
  headers['X-Requested-With'] = 'XMLHttpRequest';
  headers['X-Content-Type-Options'] = 'nosniff';
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin'
  });
};

// Input validation utilities
export const validateInput = {
  // Sanitize HTML input
  sanitizeHtml: (input) => {
    if (typeof input !== 'string') return '';
    
    // Remove potentially dangerous HTML tags and attributes
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '');
  },

  // Validate email format
  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate password strength with complexity requirements
  validatePassword: (password) => {
    const errors = [];
    
    if (!password) {
      return { valid: false, message: 'Password is required', errors: ['Password is required'] };
    }
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }
    
    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    // Check for number
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (errors.length > 0) {
      return { 
        valid: false, 
        message: errors[0], // Return first error as main message
        errors 
      };
    }
    
    return { valid: true, message: 'Password meets security requirements', errors: [] };
  },

  // Get password strength score (0-4)
  getPasswordStrength: (password) => {
    if (!password) return { score: 0, label: 'None', color: '#9CA3AF' };
    
    let score = 0;
    
    // Length checks
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Complexity checks
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++; // Special characters bonus
    
    // Cap at 4
    score = Math.min(score, 4);
    
    const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['#EF4444', '#F59E0B', '#EAB308', '#22C55E', '#16A34A'];
    
    return {
      score,
      label: labels[score],
      color: colors[score]
    };
  },

  // Validate organization name
  validateOrganizationName: (name) => {
    if (!name || name.trim().length < 2) {
      return { valid: false, message: 'Organization name must be at least 2 characters' };
    }
    
    if (name.length > 100) {
      return { valid: false, message: 'Organization name must be less than 100 characters' };
    }
    
    // Check for potentially dangerous characters
    const dangerousChars = /[<>'"&]/;
    if (dangerousChars.test(name)) {
      return { valid: false, message: 'Organization name contains invalid characters' };
    }
    
    return { valid: true, message: 'Organization name is valid' };
  }
};

// Content Security Policy helper
export const getCSPDirectives = () => {
  const isDevelopment = import.meta.env.DEV;
  
  const directives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for React development
      "'unsafe-eval'", // Required for React development
      'https://js.stripe.com',
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com'
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Material-UI
      'https://fonts.googleapis.com'
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com'
    ],
    'img-src': [
      "'self'",
      'data:',
      'https:',
      'blob:'
    ],
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'https://*.supabase.in',
      'wss://*.supabase.co',
      'wss://*.supabase.in'
    ],
    'frame-src': [
      'https://js.stripe.com'
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"]
  };
  
  if (isDevelopment) {
    // Allow more permissive policies in development
    directives['script-src'].push('http://localhost:*', 'ws://localhost:*');
    directives['connect-src'].push('http://localhost:*', 'ws://localhost:*');
  }
  
  return directives;
};

// Export utilities
export { rateLimiter, csrfProtection };
export default {
  secureRequest,
  validateInput,
  getCSPDirectives,
  rateLimiter,
  csrfProtection
};
