/**
 * Rate Limiter Usage Example
 * 
 * This file demonstrates how to apply rate limiters to authentication routes.
 * Copy this pattern when implementing authentication endpoints.
 */

import express, { Request, Response } from 'express';
import { 
  loginRateLimiter, 
  registrationRateLimiter, 
  passwordResetRateLimiter 
} from './rateLimiter';

const router = express.Router();

/**
 * Example: Login endpoint with rate limiting
 * 
 * Applies loginRateLimiter middleware before the route handler.
 * Limits: 5 requests per IP per 15 minutes
 */
router.post('/api/auth/login', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    // Your login logic here
    const { emailOrUsername, password } = req.body;
    
    // Authenticate user...
    
    res.status(200).json({
      message: 'Login successful',
      // ... user data and tokens
    });
  } catch (error) {
    res.status(401).json({
      error: 'Invalid credentials',
    });
  }
});

/**
 * Example: Registration endpoint with rate limiting
 * 
 * Applies registrationRateLimiter middleware before the route handler.
 * Limits: 3 requests per IP per 15 minutes
 */
router.post('/api/auth/register', registrationRateLimiter, async (req: Request, res: Response) => {
  try {
    // Your registration logic here
    const { firstName, lastName, email, username, password } = req.body;
    
    // Create user...
    
    res.status(201).json({
      message: 'Registration successful',
      // ... user data and tokens
    });
  } catch (error) {
    res.status(400).json({
      error: 'Registration failed',
    });
  }
});

/**
 * Example: SSO registration endpoint with rate limiting
 * 
 * SSO registration uses the same rate limiter as manual registration.
 * Limits: 3 requests per IP per 15 minutes
 */
router.post('/api/auth/register/sso', registrationRateLimiter, async (req: Request, res: Response) => {
  try {
    // Your SSO registration logic here
    const { provider, providerToken, providerUserId, email, firstName, lastName, username } = req.body;
    
    // Create SSO user...
    
    res.status(201).json({
      message: 'SSO registration successful',
      // ... user data and tokens
    });
  } catch (error) {
    res.status(400).json({
      error: 'SSO registration failed',
    });
  }
});

/**
 * Example: SSO login endpoint with rate limiting
 * 
 * SSO login uses the same rate limiter as manual login.
 * Limits: 5 requests per IP per 15 minutes
 */
router.post('/api/auth/login/sso', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    // Your SSO login logic here
    const { provider, providerToken, providerUserId } = req.body;
    
    // Authenticate SSO user...
    
    res.status(200).json({
      message: 'SSO login successful',
      // ... user data and tokens
    });
  } catch (error) {
    res.status(401).json({
      error: 'SSO login failed',
    });
  }
});

/**
 * Example: Password reset request endpoint with rate limiting
 * 
 * Applies passwordResetRateLimiter middleware before the route handler.
 * Limits: 3 requests per IP per 15 minutes
 */
router.post('/api/auth/forgot-password', passwordResetRateLimiter, async (req: Request, res: Response) => {
  try {
    // Your password reset request logic here
    const { email } = req.body;
    
    // Send password reset email...
    
    // Always return success to prevent email enumeration
    res.status(200).json({
      message: 'Password reset email sent. Please check your inbox',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to send password reset email',
    });
  }
});

/**
 * Example: Password reset completion endpoint with rate limiting
 * 
 * Also uses passwordResetRateLimiter to prevent abuse.
 * Limits: 3 requests per IP per 15 minutes
 */
router.post('/api/auth/reset-password', passwordResetRateLimiter, async (req: Request, res: Response) => {
  try {
    // Your password reset completion logic here
    const { token, newPassword } = req.body;
    
    // Verify token and update password...
    
    res.status(200).json({
      message: 'Password reset successful. Please log in with your new password',
    });
  } catch (error) {
    res.status(401).json({
      error: 'Password reset link is invalid or expired. Please request a new one',
    });
  }
});

/**
 * Example: Account linking endpoint with rate limiting
 * 
 * Uses loginRateLimiter since it requires password verification.
 * Limits: 5 requests per IP per 15 minutes
 */
router.post('/api/auth/link-account', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    // Your account linking logic here
    const { email, password, provider, providerToken, providerUserId } = req.body;
    
    // Verify password and link SSO provider...
    
    res.status(200).json({
      message: 'Account linked successfully',
      // ... user data and tokens
    });
  } catch (error) {
    res.status(401).json({
      error: 'Failed to link account',
    });
  }
});

/**
 * Example: Handling rate limit errors on the frontend
 * 
 * When a 429 response is received, the frontend should:
 * 1. Display the error message from the response
 * 2. Show the retry time (retryAfter field)
 * 3. Disable the submit button until the time expires
 * 4. Optionally show a countdown timer
 */

// Example frontend error handling:
/*
try {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrUsername, password }),
  });
  
  if (response.status === 429) {
    const data = await response.json();
    // Display error: data.error
    // Show retry time: data.retryAfter seconds
    setError(data.error);
    setRetryAfter(data.retryAfter);
  } else if (response.ok) {
    // Login successful
  } else {
    // Other error
  }
} catch (error) {
  // Network error
}
*/

export default router;
