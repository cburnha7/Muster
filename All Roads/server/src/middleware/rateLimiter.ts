import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter Middleware
 * 
 * Protects authentication endpoints from brute force attacks by limiting
 * the number of requests per IP address within a time window.
 * 
 * Configuration:
 * - Login: 5 requests per 15 minutes
 * - Registration: 3 requests per 15 minutes
 * - Password Reset: 3 requests per 15 minutes
 * 
 * Returns 429 status code when rate limit is exceeded.
 * Uses memory store for development (consider Redis for production).
 */

/**
 * Rate limiter for login endpoint
 * Limits: 5 requests per IP address per 15 minutes
 * 
 * Validates: Requirements 15.1, 15.4
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window per IP
  message: 'Too many login attempts. Please try again in 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many login attempts. Please try again in 15 minutes',
      retryAfter: Math.ceil(req.rateLimit.resetTime! / 1000), // Time in seconds
    });
  },
});

/**
 * Rate limiter for registration endpoint
 * Limits: 3 requests per IP address per 15 minutes
 * 
 * Validates: Requirements 15.2, 15.6
 */
export const registrationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per window per IP
  message: 'Too many registration attempts. Please try again in 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many registration attempts. Please try again in 15 minutes',
      retryAfter: Math.ceil(req.rateLimit.resetTime! / 1000),
    });
  },
});

/**
 * Rate limiter for password reset endpoint
 * Limits: 3 requests per IP address per 15 minutes
 * 
 * Validates: Requirements 15.3, 15.8
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per window per IP
  message: 'Too many password reset requests. Please try again in 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many password reset requests. Please try again in 15 minutes',
      retryAfter: Math.ceil(req.rateLimit.resetTime! / 1000),
    });
  },
});
