/**
 * Centralized error messages for the authentication system
 * Following brand voice: friendly, supportive, actionable
 */

export const ErrorMessages = {
  // Validation Errors - Field-specific
  validation: {
    firstName: {
      required: 'Please enter your first name',
      tooShort: 'First name must be at least 2 characters',
    },
    lastName: {
      required: 'Please enter your last name',
      tooShort: 'Last name must be at least 2 characters',
    },
    email: {
      required: 'Please enter your email address',
      invalid: 'Please enter a valid email address',
      alreadyExists: 'This email is already registered. Try logging in instead.',
    },
    username: {
      required: 'Please choose a username',
      tooShort: 'Username must be at least 3 characters',
      invalidCharacters: 'Username can only contain letters, numbers, underscores, and dashes',
      alreadyTaken: 'This username is taken. Please try another one.',
    },
    password: {
      required: 'Please enter a password',
      tooShort: 'Password must be at least 8 characters',
      missingUppercase: 'Password needs at least one uppercase letter',
      missingLowercase: 'Password needs at least one lowercase letter',
      missingNumber: 'Password needs at least one number',
      missingSpecial: 'Password needs at least one special character (!@#$%^&*)',
    },
    confirmPassword: {
      required: 'Please confirm your password',
      mismatch: 'Passwords don\'t match. Please try again.',
    },
    terms: {
      required: 'Please agree to the Terms of Service and Privacy Policy to continue',
    },
    credentials: {
      required: 'Please enter your email or username',
      passwordRequired: 'Please enter your password',
    },
  },

  // Authentication Errors
  auth: {
    invalidCredentials: 'Email or password is incorrect. Please try again.',
    accountNotFound: 'No account found with this email or username.',
    ssoAccountNotFound: 'No account found. Would you like to create one?',
    accountLinkingFailed: 'Incorrect password. Please try again or reset your password.',
    tokenExpired: 'Your session has expired. Please log in again.',
    tokenInvalid: 'Authentication failed. Please log in again.',
  },

  // Network Errors
  network: {
    noConnection: 'No internet connection. Please check your network and try again.',
    timeout: 'Request timed out. Please check your connection and try again.',
    serverUnavailable: 'Service temporarily unavailable. Please try again in a few moments.',
    unknownError: 'Something went wrong. Please try again.',
  },

  // Rate Limiting
  rateLimit: {
    login: 'Too many login attempts. Please wait 15 minutes and try again.',
    registration: 'Too many registration attempts. Please wait 15 minutes and try again.',
    passwordReset: 'Too many password reset requests. Please wait 15 minutes and try again.',
  },

  // SSO Errors
  sso: {
    appleFailed: 'Sign in with Apple failed. Please try again.',
    googleFailed: 'Sign in with Google failed. Please try again.',
    userCancelled: 'Sign in was cancelled.',
    permissionDenied: 'Permission denied. Please allow access to continue.',
    invalidCredentials: 'Invalid credentials from provider. Please try again.',
  },

  // Password Reset Errors
  passwordReset: {
    tokenExpired: 'This password reset link has expired. Please request a new one.',
    tokenInvalid: 'This password reset link is invalid. Please request a new one.',
    emailNotFound: 'If an account exists with this email, you\'ll receive a password reset link shortly.',
    updateFailed: 'Failed to update password. Please try again.',
  },

  // Account Linking Errors
  accountLinking: {
    alreadyLinked: 'This provider is already linked to your account.',
    linkingFailed: 'Failed to link account. Please try again.',
    incorrectPassword: 'Incorrect password. Please try again.',
  },

  // Generic Errors
  generic: {
    somethingWentWrong: 'Something went wrong. Please try again.',
    tryAgainLater: 'Please try again in a few moments.',
  },
};

export const SuccessMessages = {
  // Registration
  registration: {
    success: 'Welcome to Muster! 🎉',
    ssoSuccess: 'Account created successfully!',
  },

  // Login
  login: {
    success: 'Welcome back!',
    ssoSuccess: 'Signed in successfully!',
  },

  // Password Reset
  passwordReset: {
    emailSent: 'Password reset email sent! Check your inbox for instructions.',
    success: 'Password reset successful! You can now log in with your new password.',
  },

  // Account Linking
  accountLinking: {
    success: 'Account linked successfully! You can now sign in with multiple methods.',
  },

  // Logout
  logout: {
    success: 'Signed out successfully.',
  },
};

export const HelpText = {
  // Password Requirements
  passwordRequirements: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',

  // Email Format
  emailFormat: 'Use your email address (e.g., name@example.com)',

  // Username Format
  usernameFormat: 'Choose a unique username (letters, numbers, underscores, and dashes only)',

  // Remember Me
  rememberMe: 'Stay signed in for 30 days',

  // Account Linking
  accountLinking: 'Link your Apple or Google account to sign in faster next time',

  // Password Reset
  passwordResetInfo: 'Enter your email and we\'ll send you a link to reset your password',
  passwordResetExpiry: 'Reset links expire after 1 hour for security',

  // Security
  secureConnection: 'Your data is encrypted and secure',
  passwordSecurity: 'We never store your password in plain text',
};
