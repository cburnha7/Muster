import { Router } from 'express';
import AuthController from '../controllers/AuthController';
import {
  loginRateLimiter,
  registrationRateLimiter,
  passwordResetRateLimiter,
} from '../middleware/rateLimiter';

/**
 * Authentication Routes
 * 
 * Defines all authentication-related API endpoints with appropriate
 * rate limiting middleware for security.
 * 
 * Requirements: 22.1, 22.7, 23.1, 23.6, 24.1, 25.1, 25.6, 26.1, 26.5
 */

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user with email and password
 * 
 * Rate Limited: 3 requests per 15 minutes per IP
 * Requirements: 22.1, 22.7
 */
router.post('/register', registrationRateLimiter, (req, res) => {
  AuthController.register(req, res);
});

/**
 * POST /api/auth/register/sso
 * Register a new user with SSO (Apple or Google)
 * 
 * Rate Limited: 3 requests per 15 minutes per IP
 * Requirements: 22.7
 */
router.post('/register/sso', registrationRateLimiter, (req, res) => {
  AuthController.registerWithSSO(req, res);
});

/**
 * POST /api/auth/login
 * Login with email/username and password
 * 
 * Rate Limited: 5 requests per 15 minutes per IP
 * Requirements: 23.1, 23.6
 */
router.post('/login', loginRateLimiter, (req, res) => {
  AuthController.login(req, res);
});

/**
 * POST /api/auth/login/sso
 * Login with SSO (Apple or Google)
 * 
 * Rate Limited: 5 requests per 15 minutes per IP
 * Requirements: 23.6
 */
router.post('/login/sso', loginRateLimiter, (req, res) => {
  AuthController.loginWithSSO(req, res);
});

/**
 * POST /api/auth/link-account
 * Link an SSO account to an existing user account
 * 
 * No rate limiting (requires password verification)
 * Requirements: 24.1
 */
router.post('/link-account', (req, res) => {
  AuthController.linkAccount(req, res);
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 * 
 * No rate limiting (requires valid refresh token)
 * Requirements: 25.1, 25.6
 */
router.post('/refresh', (req, res) => {
  AuthController.refreshToken(req, res);
});

/**
 * POST /api/auth/logout
 * Logout user by invalidating refresh token
 * 
 * No rate limiting
 * Requirements: 25.6
 */
router.post('/logout', (req, res) => {
  AuthController.logout(req, res);
});

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 * 
 * Rate Limited: 3 requests per 15 minutes per IP
 * Requirements: 26.1, 26.5
 */
router.post('/forgot-password', passwordResetRateLimiter, (req, res) => {
  AuthController.forgotPassword(req, res);
});

/**
 * POST /api/auth/reset-password
 * Reset password using reset token
 * 
 * No rate limiting (requires valid reset token)
 * Requirements: 26.5
 */
router.post('/reset-password', (req, res) => {
  AuthController.resetPassword(req, res);
});

export default router;
