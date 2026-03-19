import { ApiError } from '../../types';

export interface AuthError extends Error {
  code?: string;
  statusCode?: number;
}

/**
 * Create a standardized authentication error
 */
export function createAuthError(
  message: string, 
  code?: string, 
  statusCode?: number
): AuthError {
  const error = new Error(message) as AuthError;
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

/**
 * Parse API error response and create appropriate auth error
 */
export function parseAuthError(error: any): AuthError {
  if (error instanceof Error) {
    return error as AuthError;
  }

  if (typeof error === 'object' && error !== null) {
    const message = error.message || error.error || 'Authentication failed';
    const code = error.code || 'AUTH_ERROR';
    const statusCode = error.statusCode || error.status;
    
    return createAuthError(message, code, statusCode);
  }

  return createAuthError('Unknown authentication error', 'UNKNOWN_ERROR');
}

/**
 * Get user-friendly error message for authentication errors
 */
export function getAuthErrorMessage(error: AuthError): string {
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return 'Invalid email or password. Please try again.';
    case 'USER_NOT_FOUND':
      return 'No account found with this email address.';
    case 'EMAIL_ALREADY_EXISTS':
      return 'An account with this email already exists.';
    case 'WEAK_PASSWORD':
      return 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers.';
    case 'INVALID_EMAIL':
      return 'Please enter a valid email address.';
    case 'TOKEN_EXPIRED':
      return 'Your session has expired. Please log in again.';
    case 'NETWORK_ERROR':
      return 'Network connection failed. Please check your internet connection.';
    case 'SERVER_ERROR':
      return 'Server error occurred. Please try again later.';
    case 'RATE_LIMITED':
      return 'Too many attempts. Please wait a moment before trying again.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Get password strength score (0-4)
 */
export function getPasswordStrength(password: string): number {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[@$!%*?&]/.test(password)) score++;
  
  return Math.min(score, 4);
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return 'Weak';
    case 2:
      return 'Fair';
    case 3:
      return 'Good';
    case 4:
      return 'Strong';
    default:
      return 'Weak';
  }
}

/**
 * Sanitize user input for authentication
 */
export function sanitizeAuthInput(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Format user display name
 */
export function formatUserDisplayName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

/**
 * Check if authentication token is expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() >= expiresAt;
}

/**
 * Calculate time until token expiry in minutes
 */
export function getTokenExpiryMinutes(expiresAt: Date): number {
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60));
}