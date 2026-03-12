/**
 * Authentication Type Definitions
 * 
 * This file contains all TypeScript interfaces and types used throughout
 * the authentication system for request/response handling and data transfer.
 */

import { User } from '@prisma/client';

// ============================================================================
// User Creation Data
// ============================================================================

/**
 * Data required to create a new user via manual registration
 */
export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  agreedToTerms: boolean;
}

/**
 * Data required to create a new user via SSO registration
 */
export interface CreateSSOUserData {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  ssoProvider: 'apple' | 'google';
  ssoProviderId: string;
}

// ============================================================================
// Request Body Interfaces
// ============================================================================

/**
 * Request body for manual registration endpoint
 * POST /api/auth/register
 */
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  agreedToTerms: boolean;
}

/**
 * Request body for SSO registration endpoint
 * POST /api/auth/register/sso
 */
export interface SSORegisterRequest {
  provider: 'apple' | 'google';
  providerToken: string;
  providerUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
}

/**
 * Request body for manual login endpoint
 * POST /api/auth/login
 */
export interface LoginRequest {
  emailOrUsername: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Request body for SSO login endpoint
 * POST /api/auth/login/sso
 */
export interface SSOLoginRequest {
  provider: 'apple' | 'google';
  providerToken: string;
  providerUserId: string;
}

/**
 * Request body for account linking endpoint
 * POST /api/auth/link-account
 */
export interface LinkAccountRequest {
  email: string;
  password: string;
  provider: 'apple' | 'google';
  providerToken: string;
  providerUserId: string;
}

/**
 * Request body for token refresh endpoint
 * POST /api/auth/refresh
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Request body for forgot password endpoint
 * POST /api/auth/forgot-password
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Request body for reset password endpoint
 * POST /api/auth/reset-password
 */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// ============================================================================
// JWT Token Payload
// ============================================================================

/**
 * Payload structure for JWT tokens (access and refresh)
 */
export interface TokenPayload {
  userId: string;
  iat: number;  // Issued at timestamp
  exp: number;  // Expiration timestamp
}

// ============================================================================
// Response Interfaces
// ============================================================================

/**
 * Standard authentication response with user data and tokens
 * Used for: registration, login, account linking
 */
export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
}

/**
 * Token refresh response
 * Used for: token refresh endpoint
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * User data returned in authentication responses
 * Excludes sensitive fields like password
 */
export interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  ssoProviders: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Convert Prisma User to UserResponse (exclude sensitive fields)
 */
export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    username: user.username,
    ssoProviders: user.ssoProviders || [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Validation error structure
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * API error response structure
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  validationErrors?: ValidationError[];
}
