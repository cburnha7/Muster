/**
 * Authentication and Registration Type Definitions
 * 
 * This file contains all TypeScript interfaces and types for the authentication system.
 * Requirements: 1.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1
 */

/**
 * User interface representing an authenticated user
 */
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  ssoProviders?: string[]; // Array of linked SSO providers ('apple', 'google')
  ssoProviderIds?: Record<string, string>; // Map of provider name to provider user ID
  createdAt: string;
  updatedAt: string;
}

/**
 * Manual registration data
 */
export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
}

/**
 * SSO registration data
 */
export interface SSORegisterData {
  provider: 'apple' | 'google';
  providerToken: string;
  providerUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
}

/**
 * Login credentials for manual authentication
 */
export interface LoginCredentials {
  emailOrUsername: string;
  password: string;
  rememberMe: boolean;
}

/**
 * SSO login data
 */
export interface SSOLoginData {
  provider: 'apple' | 'google';
  providerToken: string;
  providerUserId: string;
}

/**
 * Account linking data
 */
export interface AccountLinkData {
  email: string;
  password: string;
  provider: 'apple' | 'google';
  providerToken: string;
  providerUserId: string;
}

/**
 * Authentication response from API
 */
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/**
 * Token refresh response
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * SSO user data returned from SSO providers
 */
export interface SSOUserData {
  provider: 'apple' | 'google';
  providerId: string;
  providerToken: string;
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Validation errors object
 */
export interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
  emailOrUsername?: string;
  agreedToTerms?: string;
  general?: string;
}

/**
 * Registration form data
 */
export interface RegistrationFormData {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
}

/**
 * Login form data
 */
export interface LoginFormData {
  emailOrUsername: string;
  password: string;
}

/**
 * Password reset form data
 */
export interface PasswordResetFormData {
  newPassword: string;
  confirmPassword: string;
}

/**
 * Forgot password form data
 */
export interface ForgotPasswordFormData {
  email: string;
}
