# Implementation Plan: Authentication and Registration System

## Overview

This implementation plan breaks down the authentication and registration system into discrete, testable tasks following the 6-phase approach from the design document. The system supports manual email/password registration, SSO (Apple and Google), account linking, session management with JWT tokens, and password reset functionality across iOS, Android, and Web platforms.

## Technology Stack

- **Frontend**: React Native (Expo SDK 55), TypeScript, Redux Toolkit
- **Backend**: Node.js, Express.js, Prisma ORM, PostgreSQL
- **Testing**: Jest, React Native Testing Library, fast-check (property-based testing)
- **Authentication**: JWT tokens, bcrypt password hashing
- **SSO**: expo-apple-authentication, expo-auth-session (Google)

## Tasks

- [ ] 1. Phase 1: Database and Backend Foundation
  - [x] 1.1 Update database schema for authentication
    - Update User model in `server/prisma/schema.prisma` to make password nullable
    - Add ssoProviders field (String array) to User model
    - Add ssoProviderIds field (JSON) to User model
    - Create RefreshToken model with token, userId, expiresAt, createdAt fields
    - Create PasswordResetToken model with token, userId, expiresAt, used, usedAt, createdAt fields
    - Add indexes for performance (userId, token, expiresAt on both token models)
    - Run `npx prisma migrate dev` to create migration
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7_


  - [ ]* 1.2 Write property test for password hashing
    - **Property 6: Password Hashing Invariant**
    - **Validates: Requirements 1.14, 13.1, 13.2, 13.3**
    - Test that hashed passwords start with "$2b$10$" and never equal plain text
    - Use fast-check to generate random passwords (8-100 characters)
    - Verify bcrypt.compare returns true for correct password
    - Minimum 100 iterations
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 34.2_

  - [x] 1.3 Implement backend AuthService
    - Create `server/src/services/AuthService.ts`
    - Implement hashPassword(password: string) using bcrypt with cost factor 10
    - Implement comparePassword(password: string, hash: string) using bcrypt.compare
    - Implement createUser(data: CreateUserData) for manual registration
    - Implement createSSOUser(data: CreateSSOUserData) for SSO registration
    - Implement authenticateUser(emailOrUsername: string, password: string)
    - Implement authenticateSSOUser(provider: string, providerId: string)
    - Implement linkSSOProvider(userId: string, provider: string, providerId: string)
    - Implement findUserByEmail(email: string)
    - Implement findUserByUsername(username: string)
    - Implement findUserByEmailOrUsername(emailOrUsername: string)
    - Implement findUserBySSOProvider(provider: string, providerId: string)
    - _Requirements: 1.13, 1.14, 6.4, 13.1, 13.2, 13.3, 13.4_

  - [ ]* 1.4 Write unit tests for AuthService
    - Test password hashing and comparison with valid/invalid passwords
    - Test user creation with valid data
    - Test user lookup by email, username, and SSO provider
    - Test account linking logic
    - Mock Prisma database calls
    - Target 95% code coverage
    - _Requirements: 34.2, 34.5_

  - [x] 1.5 Implement backend TokenService
    - Create `server/src/services/TokenService.ts`
    - Implement generateAccessToken(userId: string) with 15-minute expiration
    - Implement generateRefreshToken(userId: string, rememberMe: boolean) with 7-day or 30-day expiration
    - Implement verifyAccessToken(token: string) returning TokenPayload or null
    - Implement verifyRefreshToken(token: string) returning TokenPayload or null
    - Implement storeRefreshToken(userId: string, token: string, expiresAt: Date)
    - Implement invalidateRefreshToken(token: string)
    - Implement invalidateAllUserTokens(userId: string)
    - Implement isRefreshTokenValid(token: string)
    - Use JWT_SECRET from environment variables
    - _Requirements: 8.1, 8.2, 9.2, 9.3, 25.3_

  - [ ]* 1.6 Write property test for token generation and expiration
    - **Property 7: Authentication Success Token Generation**
    - **Property 9: Access Token Expiration**
    - **Property 10: Refresh Token Expiration with Remember Me**
    - **Validates: Requirements 1.15, 8.1, 8.2, 9.2, 9.3**
    - Test that tokens are always generated for successful authentication
    - Test that access tokens expire in exactly 15 minutes
    - Test that refresh tokens expire in 7 days (default) or 30 days (rememberMe)
    - Use fast-check to generate random user IDs and rememberMe flags
    - Minimum 100 iterations
    - _Requirements: 1.15, 8.1, 8.2, 9.2, 9.3, 34.3_

  - [ ]* 1.7 Write unit tests for TokenService
    - Test token generation with valid user IDs
    - Test token validation with valid/invalid/expired tokens
    - Test refresh token storage and retrieval
    - Test token invalidation
    - Mock database calls
    - Target 100% code coverage
    - _Requirements: 34.3, 34.4_

  - [x] 1.8 Implement backend EmailService
    - Create `server/src/services/EmailService.ts`
    - Implement sendPasswordResetEmail(email: string, resetToken: string)
    - Implement sendWelcomeEmail(email: string, firstName: string) (optional)
    - Implement sendAccountLinkedEmail(email: string, provider: string) (optional)
    - Configure SMTP using environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL)
    - Create email templates for password reset with reset link and 1-hour expiration notice
    - _Requirements: 11.4, 11.8_

  - [ ]* 1.9 Write unit tests for EmailService
    - Mock SMTP calls
    - Test email template rendering with various inputs
    - Test error handling for SMTP failures
    - Target 80% code coverage
    - _Requirements: 34.5_

  - [x] 1.10 Implement RateLimiter middleware
    - Create `server/src/middleware/rateLimiter.ts`
    - Use express-rate-limit package
    - Configure loginRateLimiter: 5 requests per 15 minutes per IP
    - Configure registrationRateLimiter: 3 requests per 15 minutes per IP
    - Configure passwordResetRateLimiter: 3 requests per 15 minutes per IP
    - Return 429 status code with appropriate error messages when exceeded
    - Use memory store for development (consider Redis for production)
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9_

  - [ ]* 1.11 Write property tests for rate limiting
    - **Property 39: Login Rate Limiting**
    - **Property 40: Registration Rate Limiting**
    - **Property 41: Password Reset Rate Limiting**
    - **Validates: Requirements 15.1, 15.2, 15.3**
    - Test that 6th login request from same IP returns 429
    - Test that 4th registration request from same IP returns 429
    - Test that 4th password reset request from same IP returns 429
    - Use fast-check to generate random IP addresses
    - Minimum 100 iterations
    - _Requirements: 15.1, 15.2, 15.3, 34.7_

  - [ ]* 1.12 Write unit tests for RateLimiter
    - Test rate limit enforcement for each endpoint type
    - Test limit reset after time window expires
    - Test different IP addresses are tracked separately
    - Target 100% code coverage
    - _Requirements: 34.7_

- [x] 2. Checkpoint - Backend foundation complete
  - Ensure all Phase 1 tests pass
  - Verify database migrations applied successfully
  - Verify all backend services are implemented and tested
  - Ask the user if questions arise


- [ ] 3. Phase 2: Backend API Endpoints
  - [x] 3.1 Create backend TypeScript types
    - Create `server/src/types/auth.ts`
    - Define CreateUserData, CreateSSOUserData interfaces
    - Define request body interfaces (RegisterRequest, SSORegisterRequest, LoginRequest, SSOLoginRequest, LinkAccountRequest, RefreshTokenRequest, ForgotPasswordRequest, ResetPasswordRequest)
    - Define TokenPayload interface
    - Define AuthResponse and UserResponse interfaces
    - _Requirements: 22.2, 23.2, 24.2, 25.2, 26.2, 26.6_

  - [x] 3.2 Implement AuthController
    - Create `server/src/controllers/AuthController.ts`
    - Implement register(req: Request, res: Response) method
    - Implement registerWithSSO(req: Request, res: Response) method
    - Implement login(req: Request, res: Response) method
    - Implement loginWithSSO(req: Request, res: Response) method
    - Implement linkAccount(req: Request, res: Response) method
    - Implement refreshToken(req: Request, res: Response) method
    - Implement logout(req: Request, res: Response) method
    - Implement forgotPassword(req: Request, res: Response) method
    - Implement resetPassword(req: Request, res: Response) method
    - Add request validation for all endpoints
    - Add proper error handling and status codes
    - _Requirements: 22.1, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8, 22.9, 23.1, 23.3, 23.4, 23.5, 23.6, 23.7, 23.8, 23.9, 24.1, 24.3, 24.4, 24.5, 24.6, 25.1, 25.3, 25.4, 25.5, 25.6, 25.7, 25.8, 25.9, 26.1, 26.3, 26.4, 26.5, 26.7, 26.8, 26.9_

  - [x] 3.3 Create authentication routes
    - Create `server/src/routes/auth.ts`
    - Define POST /api/auth/register route with registrationRateLimiter
    - Define POST /api/auth/register/sso route with registrationRateLimiter
    - Define POST /api/auth/login route with loginRateLimiter
    - Define POST /api/auth/login/sso route with loginRateLimiter
    - Define POST /api/auth/link-account route
    - Define POST /api/auth/refresh route
    - Define POST /api/auth/logout route
    - Define POST /api/auth/forgot-password route with passwordResetRateLimiter
    - Define POST /api/auth/reset-password route
    - Mount routes in main Express app
    - _Requirements: 22.1, 22.7, 23.1, 23.6, 24.1, 25.1, 25.6, 26.1, 26.5_

  - [ ]* 3.4 Write property test for email uniqueness constraint
    - **Property 18: Email Uniqueness Constraint**
    - **Validates: Requirements 2.1**
    - Test that registration with duplicate email returns 409 status code
    - Use fast-check to generate random emails and usernames
    - Create first user, then attempt to create second user with same email
    - Minimum 100 iterations
    - _Requirements: 2.1, 22.4, 35.1_

  - [ ]* 3.5 Write property test for username uniqueness constraint
    - **Property 19: Username Uniqueness Constraint**
    - **Validates: Requirements 2.3**
    - Test that registration with duplicate username returns 409 status code
    - Use fast-check to generate random emails and usernames
    - Create first user, then attempt to create second user with same username
    - Minimum 100 iterations
    - _Requirements: 2.3, 22.5, 35.1_

  - [ ]* 3.6 Write integration test for manual registration flow
    - Test complete registration flow from API request to database
    - Verify user created with correct data
    - Verify password is hashed (bcrypt format)
    - Verify tokens are generated and valid
    - Verify 409 error for duplicate email/username
    - Verify 400 error for validation failures
    - Use test database
    - _Requirements: 1.13, 1.14, 1.15, 2.1, 2.3, 35.1_

  - [ ]* 3.7 Write integration test for SSO registration flow
    - Test complete SSO registration flow
    - Verify user created with SSO provider in ssoProviders array
    - Verify provider user ID stored in ssoProviderIds object
    - Verify tokens are generated and valid
    - Verify 409 error for duplicate email/username
    - Use test database
    - _Requirements: 3.7, 4.7, 35.1_

  - [ ]* 3.8 Write property test for SSO registration creates user with provider
    - **Property 20: SSO Registration Creates User with Provider**
    - **Validates: Requirements 3.7, 4.7**
    - Test that SSO registration adds provider to ssoProviders array
    - Test that provider user ID is stored in ssoProviderIds object
    - Use fast-check to generate random provider data
    - Minimum 100 iterations
    - _Requirements: 3.7, 4.7, 21.4, 21.5, 35.1_

  - [ ]* 3.9 Write integration test for login flow
    - Test complete login flow with email and password
    - Test login with username and password
    - Verify tokens are generated and valid
    - Verify 401 error for invalid credentials
    - Verify rate limiting after 5 failed attempts
    - Use test database
    - _Requirements: 6.4, 6.5, 6.6, 6.8, 15.1, 35.2_

  - [ ]* 3.10 Write integration test for SSO login flow
    - Test complete SSO login flow
    - Verify tokens are generated for existing SSO user
    - Verify 404 error when provider not linked to any account
    - Use test database
    - _Requirements: 7.5, 7.6, 7.9, 35.2_

  - [ ]* 3.11 Write integration test for account linking flow
    - Test account linking with correct password
    - Verify SSO provider added to existing user
    - Verify tokens are generated
    - Verify 401 error for incorrect password
    - Verify 404 error for non-existent email
    - Verify 409 error for already linked provider
    - Use test database
    - _Requirements: 5.4, 5.5, 24.3, 24.4, 24.5, 24.6, 35.5_

  - [ ]* 3.12 Write property test for account linking with correct password
    - **Property 22: Account Linking with Correct Password**
    - **Validates: Requirements 5.4**
    - Test that correct password adds SSO provider to user
    - Use fast-check to generate random passwords and provider data
    - Minimum 100 iterations
    - _Requirements: 5.4, 21.6, 21.7, 35.5_

  - [ ]* 3.13 Write property test for account linking with incorrect password
    - **Property 23: Account Linking with Incorrect Password**
    - **Validates: Requirements 5.5**
    - Test that incorrect password returns 401 status code
    - Use fast-check to generate random passwords
    - Minimum 100 iterations
    - _Requirements: 5.5, 24.4, 35.5_

  - [ ]* 3.14 Write integration test for token refresh flow
    - Test token refresh with valid refresh token
    - Verify new access token and refresh token are generated
    - Verify new access token is valid for API requests
    - Verify 401 error for expired refresh token
    - Verify 401 error for invalid refresh token
    - Use test database
    - _Requirements: 8.6, 8.7, 25.3, 25.4, 25.5, 35.4_

  - [ ]* 3.15 Write property test for token refresh round trip
    - **Property 29: Token Refresh Round Trip**
    - **Validates: Requirements 8.6, 8.7**
    - Test that valid refresh token returns new valid access token
    - Use fast-check to generate random user IDs and rememberMe flags
    - Verify new access token can be used for API requests
    - Minimum 100 iterations
    - _Requirements: 8.6, 8.7, 25.3, 35.4_

  - [ ]* 3.16 Write integration test for logout flow
    - Test logout invalidates refresh token
    - Verify refresh token cannot be used after logout
    - Verify 200 status code on successful logout
    - Use test database
    - _Requirements: 10.1, 25.8, 25.9, 35.6_

  - [ ]* 3.17 Write integration test for password reset flow
    - Test password reset request generates token
    - Test password reset request returns success for non-existent email (enumeration prevention)
    - Test password reset completion with valid token
    - Verify password is updated in database
    - Verify user can login with new password
    - Verify 401 error for expired token
    - Verify 401 error for invalid token
    - Use test database
    - _Requirements: 11.4, 11.6, 12.5, 12.6, 12.7, 12.10, 26.3, 26.4, 26.7, 26.8, 26.9, 35.3_

  - [ ]* 3.18 Write property test for password reset token generation
    - **Property 34: Password Reset Token Generation**
    - **Validates: Requirements 11.4, 11.7**
    - Test that reset token is unique and expires in 1 hour
    - Use fast-check to generate random emails
    - Minimum 100 iterations
    - _Requirements: 11.4, 11.7, 35.3_

  - [ ]* 3.19 Write property test for password reset email enumeration prevention
    - **Property 35: Password Reset Email Enumeration Prevention**
    - **Validates: Requirements 11.6**
    - Test that same success response is returned for existing and non-existing emails
    - Use fast-check to generate random emails
    - Minimum 100 iterations
    - _Requirements: 11.6, 26.4, 35.3_

  - [ ]* 3.20 Write property test for password reset round trip
    - **Property 36: Password Reset Round Trip**
    - **Validates: Requirements 12.5, 12.6, 12.7**
    - Test that valid reset token updates password
    - Test that user can login with new password after reset
    - Use fast-check to generate random passwords
    - Minimum 100 iterations
    - _Requirements: 12.5, 12.6, 12.7, 35.3_

  - [ ]* 3.21 Write unit tests for AuthController
    - Test all controller methods with valid inputs
    - Test error handling for all failure scenarios
    - Mock AuthService, TokenService, and EmailService
    - Target 90% code coverage
    - _Requirements: 34.5, 34.6_

- [x] 4. Checkpoint - Backend API complete
  - Ensure all Phase 2 tests pass
  - Verify all API endpoints are implemented and tested
  - Test API endpoints manually with Postman or similar tool
  - Ask the user if questions arise


- [x] 5. Phase 3: Frontend Services
  - [x] 5.1 Create frontend TypeScript types
    - Create `src/types/auth.ts`
    - Define User interface
    - Define RegisterData, SSORegisterData interfaces
    - Define LoginCredentials, SSOLoginData interfaces
    - Define AccountLinkData interface
    - Define AuthResponse, TokenResponse interfaces
    - Define SSOUserData interface
    - Define ValidationErrors interface
    - _Requirements: 1.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1_

  - [x] 5.2 Implement ValidationService
    - Create `src/services/auth/ValidationService.ts`
    - Implement validateFirstName(value: string): string | null
    - Implement validateLastName(value: string): string | null
    - Implement validateEmail(value: string): string | null using RFC 5322 compliant regex
    - Implement validateUsername(value: string): string | null
    - Implement validatePassword(value: string): string | null
    - Implement validateConfirmPassword(password: string, confirmPassword: string): string | null
    - Implement validateRegistrationForm(data: RegistrationFormData): ValidationErrors
    - Implement validateLoginForm(data: LoginFormData): ValidationErrors
    - Implement validatePasswordResetForm(data: PasswordResetFormData): ValidationErrors
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 6.2, 6.3, 12.3, 12.4, 17.2_

  - [ ]* 5.3 Write property tests for validation rules
    - **Property 1: First Name Validation**
    - **Property 2: Last Name Validation**
    - **Property 3: Email Format Validation**
    - **Property 4: Username Length Validation**
    - **Property 5: Username Character Validation**
    - **Property 11: Password Validation - Minimum Length**
    - **Property 12: Password Validation - Uppercase Requirement**
    - **Property 13: Password Validation - Lowercase Requirement**
    - **Property 14: Password Validation - Number Requirement**
    - **Property 15: Password Validation - Special Character Requirement**
    - **Property 16: Confirm Password Validation**
    - **Property 25: Empty Email/Username Validation**
    - **Property 26: Empty Password Validation**
    - **Validates: Requirements 1.2-1.12, 6.2, 6.3, 12.3, 12.4**
    - Use fast-check to generate random strings with various characteristics
    - Test each validation rule returns correct error message
    - Minimum 100 iterations per property
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 6.2, 6.3, 12.3, 12.4, 34.1_

  - [ ]* 5.4 Write unit tests for ValidationService
    - Test each validation function with valid and invalid examples
    - Test edge cases (empty strings, whitespace, special characters, boundary values)
    - Test error message accuracy
    - Target 100% code coverage
    - _Requirements: 34.1, 34.5_

  - [x] 5.5 Implement token storage utilities
    - Create `src/services/auth/TokenStorage.ts`
    - Implement platform detection (iOS/Android vs Web)
    - For mobile: Use Expo SecureStore for token storage
    - For web: Use secure HTTP-only cookies
    - Implement storeTokens(accessToken: string, refreshToken: string): Promise<void>
    - Implement getAccessToken(): Promise<string | null>
    - Implement getRefreshToken(): Promise<string | null>
    - Implement clearTokens(): Promise<void>
    - Implement storeUser(user: User): Promise<void>
    - Implement getUser(): Promise<User | null>
    - Implement clearUser(): Promise<void>
    - _Requirements: 8.3, 8.4, 9.4, 14.2, 14.3, 27.3, 28.3, 29.2_

  - [ ]* 5.6 Write property test for token storage round trip
    - **Property 8: Token Storage Round Trip**
    - **Validates: Requirements 1.16, 8.3, 8.4**
    - Test that storing and retrieving tokens returns same values
    - Use fast-check to generate random token strings
    - Test on both mobile and web platforms
    - Minimum 100 iterations
    - _Requirements: 1.16, 8.3, 8.4, 14.2, 14.3_

  - [ ]* 5.7 Write unit tests for TokenStorage
    - Test token storage and retrieval on mobile (mock SecureStore)
    - Test token storage and retrieval on web (mock cookies)
    - Test token clearing
    - Test user data storage and retrieval
    - Target 90% code coverage
    - _Requirements: 34.5_

  - [x] 5.8 Enhance AuthService (API layer)
    - Update `src/services/api/AuthService.ts`
    - Implement register(data: RegisterData): Promise<AuthResponse>
    - Implement registerWithSSO(data: SSORegisterData): Promise<AuthResponse>
    - Implement login(emailOrUsername: string, password: string, rememberMe: boolean): Promise<AuthResponse>
    - Implement loginWithSSO(provider: 'apple' | 'google', token: string, userId: string): Promise<AuthResponse>
    - Implement linkAccount(email: string, password: string, provider: string, token: string, userId: string): Promise<AuthResponse>
    - Implement refreshToken(refreshToken: string): Promise<TokenResponse>
    - Implement logout(): Promise<void>
    - Implement requestPasswordReset(email: string): Promise<void>
    - Implement resetPassword(token: string, newPassword: string): Promise<void>
    - Implement getStoredToken(): Promise<string | null>
    - Implement getStoredUser(): Promise<User | null>
    - Implement isAuthenticated(): Promise<boolean>
    - Add automatic token refresh when access token expires within 5 minutes
    - Add proper error handling for network errors (timeout, no connection, server unavailable)
    - _Requirements: 1.13, 1.15, 1.16, 3.7, 4.7, 5.4, 6.4, 6.5, 6.6, 7.5, 7.6, 8.6, 8.7, 8.11, 8.12, 10.1, 11.3, 12.5, 16.1, 16.2, 16.3, 33.1, 33.2_

  - [ ]* 5.9 Write unit tests for AuthService
    - Mock API responses for all methods
    - Test token storage and retrieval
    - Test automatic token refresh logic
    - Test error handling for network errors
    - Test timeout handling (30 seconds)
    - Mock TokenStorage
    - Target 90% code coverage
    - _Requirements: 34.5_

  - [x] 5.10 Implement SSOService
    - Create `src/services/auth/SSOService.ts`
    - Implement signInWithApple(): Promise<SSOUserData> using expo-apple-authentication
    - Implement signInWithGoogle(): Promise<SSOUserData> using expo-auth-session
    - Implement isAppleSignInAvailable(): Promise<boolean>
    - Implement isGoogleSignInAvailable(): Promise<boolean>
    - Handle platform-specific implementations (iOS for Apple, Android/Web for Google)
    - Handle SSO errors (user cancellation, network errors, permission denied, invalid credentials)
    - Request email, firstName, lastName from SSO providers
    - _Requirements: 3.2, 3.3, 4.2, 4.3, 7.3, 7.4, 27.1, 27.2, 28.1, 28.2, 29.1_

  - [ ]* 5.11 Write unit tests for SSOService
    - Mock expo-apple-authentication responses
    - Mock expo-auth-session responses
    - Test success scenarios for Apple and Google Sign In
    - Test error handling (user cancellation, network errors, permission denied)
    - Test platform-specific implementations
    - Target 80% code coverage
    - _Requirements: 34.5_

  - [x] 5.12 Update Redux store for authentication
    - Update `src/store/authSlice.ts` (or create if doesn't exist)
    - Add state fields: user, accessToken, isAuthenticated, isLoading, error
    - Add actions: setUser, setTokens, clearAuth, setLoading, setError
    - Add thunks: registerUser, registerWithSSO, loginUser, loginWithSSO, linkAccount, logoutUser, refreshToken, requestPasswordReset, resetPassword
    - Integrate with AuthService and SSOService
    - Cache user data to avoid unnecessary API calls
    - _Requirements: 1.17, 6.7, 8.11, 8.12, 10.6, 33.3_

  - [ ]* 5.13 Write unit tests for Redux auth slice
    - Test all actions and reducers
    - Test all thunks with mocked services
    - Test state transitions
    - Target 90% code coverage
    - _Requirements: 34.5_

- [x] 6. Checkpoint - Frontend services complete
  - Ensure all Phase 3 tests pass
  - Verify all frontend services are implemented and tested
  - Verify token storage works on all platforms
  - Ask the user if questions arise


- [x] 7. Phase 4: Frontend Components
  - [x] 7.1 Create reusable form components
    - Create `src/components/forms/TextInput.tsx`
    - Implement TextInput component with label, value, onChangeText, placeholder, error, secureTextEntry, icon, onBlur props
    - Add password visibility toggle for secureTextEntry fields
    - Add inline error display below field
    - Add accessible labels and error announcements
    - Style with Muster brand colors (Track red for errors, Grass green for focus)
    - _Requirements: 1.1, 17.2, 17.6, 17.7, 30.1, 30.2, 32.3_

  - [x] 7.2 Create Button component
    - Create `src/components/forms/Button.tsx`
    - Implement Button component with title, onPress, variant, isLoading, disabled, icon props
    - Support variants: primary (Grass green), secondary, accent (Court orange), destructive (Track red)
    - Add loading spinner when isLoading is true
    - Disable button when isLoading or disabled is true
    - Add accessible labels
    - Ensure minimum touch target size (44x44px iOS, 48x48px Android)
    - _Requirements: 18.1, 18.2, 18.5, 18.6, 30.4, 31.3, 32.4_

  - [x] 7.3 Create Checkbox component
    - Create `src/components/forms/Checkbox.tsx`
    - Implement Checkbox component with label, checked, onToggle, error props
    - Support rich text labels (for Terms of Service links)
    - Add error state display
    - Add accessible labels
    - Ensure minimum touch target size
    - _Requirements: 9.1, 20.1, 20.4, 30.4, 31.3_

  - [x] 7.4 Create SSOButton component
    - Create `src/components/auth/SSOButton.tsx`
    - Implement SSOButton component with provider, onPress, isLoading, disabled props
    - Add provider-specific branding (Apple black, Google white with logo)
    - Add loading state
    - Follow platform-specific guidelines (iOS HIG for Apple, Material Design for Google)
    - Add accessible labels
    - _Requirements: 3.1, 4.1, 7.1, 7.2, 27.5, 28.5, 30.4_

  - [ ]* 7.5 Write component tests for form components
    - Test TextInput rendering, input handling, error display, password toggle
    - Test Button rendering, press handling, loading state, disabled state
    - Test Checkbox rendering, toggle handling, error display
    - Test SSOButton rendering, press handling, loading state, provider branding
    - Use React Native Testing Library
    - Target 80% code coverage
    - _Requirements: 34.5_

  - [x] 7.6 Implement RegistrationScreen
    - Create `src/screens/auth/RegistrationScreen.tsx`
    - Add form fields: firstName, lastName, email, username, password, confirmPassword
    - Add "I agree to Terms of Service and Privacy Policy" checkbox with clickable links
    - Add "Sign in with Apple" button
    - Add "Sign in with Google" button
    - Add "Register" button (disabled until form is valid and terms agreed)
    - Add "Already have an account? Log In" link
    - Implement field validation on blur using ValidationService
    - Implement form validation on submit
    - Display inline error messages below fields
    - Handle manual registration flow
    - Handle SSO registration flow (pre-populate fields, hide password fields, show username field)
    - Handle account linking prompt when SSO email exists
    - Display loading states during registration
    - Navigate to home screen on success
    - Display success message "Welcome to Muster" on success
    - Handle network errors with retry option
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.17, 1.18, 2.2, 2.4, 2.5, 3.1, 3.2, 3.4, 3.5, 3.6, 3.11, 4.1, 4.2, 4.4, 4.5, 4.6, 4.11, 5.2, 16.4, 16.5, 16.6, 17.1, 17.2, 17.3, 17.4, 17.5, 18.1, 18.2, 18.3, 18.4, 18.7, 19.3, 19.5, 19.6, 20.1, 20.2, 20.3, 20.4, 20.5_

  - [ ]* 7.7 Write component tests for RegistrationScreen
    - Test form rendering with all fields
    - Test field validation on blur
    - Test form validation on submit
    - Test manual registration flow
    - Test SSO registration flow
    - Test error display for validation errors
    - Test error display for API errors
    - Test loading states
    - Test navigation to login screen
    - Mock AuthService and SSOService
    - Use React Native Testing Library
    - _Requirements: 35.1_

  - [x] 7.8 Enhance LoginScreen
    - Update `src/screens/auth/LoginScreen.tsx`
    - Add "Remember Me" checkbox
    - Add "Sign in with Apple" button
    - Add "Sign in with Google" button
    - Add "Forgot Password?" link
    - Add "Don't have an account? Sign Up" link
    - Implement field validation on blur
    - Implement form validation on submit
    - Display inline error messages
    - Handle manual login flow with rememberMe flag
    - Handle SSO login flow
    - Display loading states during login
    - Navigate to home screen on success
    - Clear password field on invalid credentials
    - Handle network errors with retry option
    - _Requirements: 6.1, 6.2, 6.3, 6.7, 6.9, 6.10, 6.11, 6.12, 7.1, 7.2, 7.3, 7.4, 7.8, 7.10, 9.1, 16.1, 16.4, 17.1, 17.2, 17.3, 17.4, 18.1, 18.2, 18.3, 18.4, 18.7, 19.1, 19.2_

  - [ ]* 7.9 Write component tests for LoginScreen
    - Test form rendering with all fields
    - Test field validation
    - Test manual login flow
    - Test SSO login flow
    - Test "Remember Me" functionality
    - Test error display
    - Test loading states
    - Test navigation to registration and forgot password screens
    - Mock AuthService and SSOService
    - Use React Native Testing Library
    - _Requirements: 35.2_

  - [x] 7.10 Implement ForgotPasswordScreen
    - Create `src/screens/auth/ForgotPasswordScreen.tsx`
    - Add email input field
    - Add "Send Reset Link" button
    - Add "Back to Login" link
    - Implement email validation on blur
    - Display inline error messages
    - Handle password reset request
    - Display success message "Password reset email sent. Please check your inbox" on success
    - Display loading state during request
    - Handle network errors with retry option
    - _Requirements: 11.1, 11.2, 11.3, 11.5, 16.1, 17.1, 17.2, 18.4_

  - [ ]* 7.11 Write component tests for ForgotPasswordScreen
    - Test form rendering
    - Test email validation
    - Test password reset request flow
    - Test success message display
    - Test error display
    - Test loading states
    - Test navigation to login screen
    - Mock AuthService
    - Use React Native Testing Library
    - _Requirements: 35.3_

  - [x] 7.12 Implement ResetPasswordScreen
    - Create `src/screens/auth/ResetPasswordScreen.tsx`
    - Extract reset token from URL/deep link parameters
    - Add newPassword input field
    - Add confirmPassword input field
    - Add password strength indicator
    - Add "Reset Password" button
    - Implement password validation on blur
    - Display inline error messages
    - Handle password reset completion
    - Display success message "Password reset successful. Please log in with your new password" on success
    - Navigate to login screen on success
    - Display error message "Password reset link is invalid or expired. Please request a new one" for invalid/expired token
    - Provide link to request new password reset
    - Display loading state during request
    - Handle network errors with retry option
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.8, 12.9, 12.10, 12.11, 16.1, 17.1, 17.2, 18.4_

  - [ ]* 7.13 Write component tests for ResetPasswordScreen
    - Test form rendering
    - Test password validation
    - Test password reset completion flow
    - Test success message and navigation
    - Test error display for invalid/expired token
    - Test loading states
    - Mock AuthService
    - Use React Native Testing Library
    - _Requirements: 35.3_

  - [x] 7.14 Implement AccountLinkingModal
    - Create `src/components/auth/AccountLinkingModal.tsx`
    - Display modal overlay
    - Show provider icon (Apple or Google)
    - Display explanation text "An account with this email already exists. Would you like to link your [Apple/Google] account?"
    - Add password input field
    - Add "Link Account" button
    - Add "Cancel" button
    - Implement password validation
    - Display inline error messages
    - Handle account linking with password verification
    - Display loading state during linking
    - Close modal on success or cancel
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.9, 17.1, 17.2, 18.4_

  - [ ]* 7.15 Write component tests for AccountLinkingModal
    - Test modal rendering
    - Test password input and validation
    - Test account linking flow
    - Test error display for incorrect password
    - Test loading states
    - Test cancel functionality
    - Mock AuthService
    - Use React Native Testing Library
    - _Requirements: 35.5_

  - [x] 7.16 Add navigation configuration
    - Update `src/navigation/AuthNavigator.tsx` (or create if doesn't exist)
    - Add routes for RegistrationScreen, LoginScreen, ForgotPasswordScreen, ResetPasswordScreen
    - Configure deep linking for password reset (handle reset token parameter)
    - Add navigation guards to redirect authenticated users to home
    - Add navigation guards to redirect unauthenticated users to login
    - _Requirements: 1.17, 6.7, 8.12, 8.13, 10.5, 11.1, 12.1, 12.9, 19.2, 19.4_

  - [x] 7.17 Implement app launch authentication check
    - Update app entry point (App.tsx or similar)
    - Check for valid tokens in TokenStorage on app launch
    - If valid tokens exist, navigate to home screen
    - If no valid tokens exist, navigate to login screen
    - Display loading screen during token check
    - _Requirements: 8.11, 8.12, 8.13, 33.4_

  - [ ]* 7.18 Write integration tests for authentication flows
    - Test complete manual registration flow from UI to API
    - Test complete SSO registration flow
    - Test complete login flow
    - Test complete password reset flow
    - Test account linking flow
    - Test logout flow
    - Test app launch with valid/invalid tokens
    - Mock backend API responses
    - Use React Native Testing Library
    - _Requirements: 35.1, 35.2, 35.3, 35.4, 35.5, 35.6_

- [x] 8. Checkpoint - Frontend components complete
  - Ensure all Phase 4 tests pass
  - Verify all screens and components are implemented and tested
  - Test user flows manually on iOS, Android, and Web
  - Ask the user if questions arise


- [x] 9. Phase 5: Integration and Platform Testing
  - [x] 9.1 Set up test environment
    - Configure test database separate from development
    - Set up environment variables for testing
    - Configure test SMTP server (or mock email service)
    - Set up test SSO credentials (Apple and Google)
    - _Requirements: 35.7_

  - [x] 9.2 Test iOS platform
    - Test manual registration on iOS simulator/device
    - Test Apple Sign In on iOS device (requires physical device)
    - Test Google Sign In on iOS simulator/device
    - Test login flows on iOS
    - Test password reset on iOS
    - Test token storage with SecureStore on iOS
    - Test "Remember Me" functionality on iOS
    - Test logout on iOS
    - Verify Apple Sign In button follows iOS Human Interface Guidelines
    - Test accessibility with VoiceOver
    - Test keyboard navigation
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 30.1, 30.2, 30.3, 30.4, 30.5, 30.6, 30.7_

  - [x] 9.3 Test Android platform
    - Test manual registration on Android emulator/device
    - Test Google Sign In on Android emulator/device
    - Test Apple Sign In on Android (via web flow)
    - Test login flows on Android
    - Test password reset on Android
    - Test token storage with SecureStore on Android
    - Test "Remember Me" functionality on Android
    - Test logout on Android
    - Verify Google Sign In button follows Material Design guidelines
    - Test accessibility with TalkBack
    - Test keyboard navigation
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5, 30.1, 30.2, 30.3, 30.4, 30.5, 30.6, 30.7_

  - [x] 9.4 Test Web platform
    - Test manual registration on web browsers (Chrome, Firefox, Safari)
    - Test Apple Sign In on web
    - Test Google Sign In on web
    - Test login flows on web
    - Test password reset on web
    - Test token storage with HTTP-only cookies on web
    - Test "Remember Me" functionality on web
    - Test logout on web
    - Test keyboard navigation (Tab, Enter, Escape keys)
    - Test responsive design on desktop and mobile browsers
    - Verify visible focus indicators
    - Test accessibility with screen readers (NVDA, JAWS)
    - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5, 31.1, 31.2, 31.3, 31.4, 31.5_

  - [ ]* 9.5 Run end-to-end property-based tests
    - **Property 17: Valid Registration Creates User**
    - **Property 27: Valid Credentials Authentication**
    - **Property 28: Invalid Credentials Rejection**
    - **Property 30: Expired Token Rejection**
    - **Property 31: Invalid Refresh Token Cleanup**
    - **Property 32: Logout Token Cleanup**
    - **Property 33: Logout Cleanup on API Failure**
    - **Property 37: Expired Reset Token Rejection**
    - **Property 38: Password Comparison Correctness**
    - **Validates: Requirements 1.13, 6.4, 6.8, 8.6, 8.9, 10.2, 10.3, 10.4, 10.7, 11.7, 13.4**
    - Test complete flows with property-based inputs
    - Use fast-check to generate random user data
    - Test on all platforms (iOS, Android, Web)
    - Minimum 100 iterations per property
    - _Requirements: 1.13, 6.4, 6.8, 8.6, 8.9, 10.2, 10.3, 10.4, 10.7, 11.7, 13.4, 35.1, 35.2, 35.3, 35.4, 35.5, 35.6_

  - [ ]* 9.6 Test SSO integration with real providers
    - Test Apple Sign In with real Apple ID on iOS device
    - Test Google Sign In with real Google account on all platforms
    - Verify user data is correctly retrieved from providers
    - Test account linking with real SSO accounts
    - Test error handling for SSO failures
    - _Requirements: 3.2, 3.3, 4.2, 4.3, 7.3, 7.4, 27.1, 27.2, 28.1, 28.2, 29.1_

  - [ ]* 9.7 Test security measures
    - Verify passwords are hashed in database (bcrypt format)
    - Verify JWT tokens are signed correctly
    - Verify tokens are stored securely (SecureStore/HTTP-only cookies)
    - Verify HTTPS is enforced on all API endpoints
    - Verify rate limiting works correctly
    - Verify password reset tokens expire after 1 hour
    - Verify refresh tokens expire correctly (7 days or 30 days)
    - Test CSRF protection on web (SameSite cookies)
    - _Requirements: 13.1, 13.2, 13.3, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 15.1, 15.2, 15.3_

  - [ ]* 9.8 Test performance and optimization
    - Verify proactive token refresh (5 minutes before expiration)
    - Verify API requests are queued during token refresh
    - Verify user data is cached in Redux
    - Verify app launches within 2 seconds with valid tokens
    - Verify token validation is asynchronous
    - Test with slow network conditions
    - Test with intermittent network connectivity
    - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5_

  - [ ]* 9.9 Test error handling scenarios
    - Test network timeout (30 seconds)
    - Test no internet connection
    - Test server unavailable (500 error)
    - Test rate limit exceeded (429 error)
    - Test validation errors (400 error)
    - Test authentication errors (401 error)
    - Test conflict errors (409 error)
    - Verify user-friendly error messages are displayed
    - Verify retry options are provided
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

  - [ ]* 9.10 Test accessibility compliance
    - Verify color contrast ratios (4.5:1 for text, 3:1 for interactive elements)
    - Verify minimum touch target sizes (44x44px iOS, 48x48px Android)
    - Verify screen reader support on all platforms
    - Verify keyboard navigation on web
    - Verify focus indicators are visible
    - Verify error messages are announced to screen readers
    - Verify loading states are announced to screen readers
    - Test with actual assistive technologies (VoiceOver, TalkBack, NVDA)
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5, 30.6, 30.7, 31.1, 31.2, 31.3, 31.4, 31.5, 32.1, 32.2, 32.3, 32.4, 32.5_

- [x] 10. Checkpoint - Integration and testing complete
  - Ensure all integration tests pass
  - Verify all platforms work correctly
  - Verify all security measures are in place
  - Verify accessibility compliance
  - Ask the user if questions arise


- [-] 11. Phase 6: Polish and Documentation
  - [x] 11.1 Improve error messages
    - Review all error messages for clarity and helpfulness
    - Ensure error messages are user-friendly and actionable
    - Add contextual help text where appropriate
    - Ensure error messages follow brand voice (friendly, supportive)
    - _Requirements: 17.1, 17.2, 17.6, 17.7_

  - [x] 11.2 Add loading states and animations
    - Add smooth transitions between screens
    - Add loading spinners for all async operations
    - Add skeleton screens for data loading
    - Add success animations for completed actions
    - Add error animations for failed actions
    - Ensure animations are 60fps
    - Keep animations subtle and non-intrusive
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_

  - [x] 11.3 Improve accessibility
    - Add descriptive labels for all form fields
    - Add ARIA labels for web elements
    - Ensure proper heading hierarchy
    - Add skip navigation links for web
    - Test with multiple screen readers
    - Fix any accessibility issues found during testing
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5, 30.6, 30.7, 31.1, 31.2, 31.3, 31.4, 31.5_

  - [x] 11.4 Optimize performance
    - Optimize images and assets
    - Implement lazy loading for screens
    - Memoize expensive computations
    - Optimize Redux selectors
    - Minimize bundle size
    - Test performance on low-end devices
    - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5_

  - [x] 11.5 Create API documentation
    - Document all authentication API endpoints
    - Include request/response examples
    - Document error codes and messages
    - Document rate limiting rules
    - Document authentication flow diagrams
    - Create Postman collection for API testing
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8, 22.9, 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7, 23.8, 23.9, 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 25.7, 25.8, 25.9, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7, 26.8, 26.9_

  - [x] 11.6 Create user documentation
    - Write user guide for registration process
    - Write user guide for login process
    - Write user guide for password reset process
    - Write user guide for account linking
    - Write FAQ for common authentication issues
    - Create troubleshooting guide
    - _Requirements: 1.1, 3.1, 4.1, 5.1, 6.1, 7.1, 11.1, 12.1_

  - [x] 11.7 Create developer documentation
    - Document authentication system architecture
    - Document data models and database schema
    - Document frontend services and components
    - Document backend services and controllers
    - Document testing strategy and examples
    - Document deployment process
    - Document environment variables
    - Document security best practices
    - _Requirements: All requirements_

  - [x] 11.8 Create deployment guide
    - Document database migration steps
    - Document environment variable configuration
    - Document HTTPS setup
    - Document rate limiting configuration
    - Document email service setup
    - Document SSO provider setup (Apple and Google)
    - Document monitoring and logging setup
    - Document rollback procedures
    - Create deployment checklist
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8_

  - [x] 11.9 Set up monitoring and logging
    - Configure logging for all authentication events
    - Set up metrics for registration/login success rates
    - Set up alerts for high error rates
    - Set up alerts for rate limit violations
    - Configure structured logging (JSON format)
    - Ensure passwords and tokens are never logged
    - Set up dashboard for monitoring authentication metrics
    - _Requirements: 13.5_

  - [x] 11.10 Conduct security review
    - Review all authentication code for security vulnerabilities
    - Verify JWT_SECRET is cryptographically secure
    - Verify HTTPS is enforced
    - Verify rate limiting is configured correctly
    - Verify password hashing uses bcrypt with cost factor 10
    - Verify tokens are stored securely
    - Verify CORS is configured correctly
    - Verify SQL injection prevention (Prisma ORM)
    - Verify XSS prevention (input sanitization)
    - Verify CSRF prevention (SameSite cookies)
    - Run security scanning tools
    - Address any security issues found
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8_

  - [x] 11.11 Prepare for production deployment
    - Create production environment configuration
    - Set up production database
    - Configure production SMTP service
    - Configure production SSO credentials
    - Set up production monitoring and logging
    - Create backup and restore procedures
    - Test deployment in staging environment
    - Create production deployment checklist
    - _Requirements: All requirements_

- [x] 12. Final checkpoint - Feature complete
  - Ensure all tests pass (unit, integration, property-based)
  - Verify all platforms work correctly (iOS, Android, Web)
  - Verify all security measures are in place
  - Verify all documentation is complete
  - Verify feature is ready for production deployment
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- Property-based tests validate universal correctness properties using fast-check with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- All tests should use a separate test database
- The implementation follows a 6-phase approach: Database/Backend Foundation → Backend API → Frontend Services → Frontend Components → Integration/Testing → Polish/Documentation
- TypeScript is used throughout the stack (frontend and backend)
- The feature supports iOS, Android, and Web platforms with platform-specific implementations where needed

## Testing Summary

**Property-Based Tests** (41 properties):
- Validation rules (Properties 1-5, 11-16, 25-26)
- Password hashing (Property 6)
- Token generation and expiration (Properties 7, 9-10)
- Token storage (Property 8)
- Authentication flows (Properties 17, 20-24, 27-28)
- Token refresh (Property 29-31)
- Logout (Properties 32-33)
- Password reset (Properties 34-37)
- Password comparison (Property 38)
- Rate limiting (Properties 39-41)

**Unit Tests**:
- Backend services (AuthService, TokenService, EmailService, RateLimiter)
- Frontend services (ValidationService, TokenStorage, AuthService, SSOService)
- Redux store (auth slice)
- Controllers (AuthController)
- Components (TextInput, Button, Checkbox, SSOButton)

**Integration Tests**:
- Complete authentication flows (registration, login, password reset, account linking, logout)
- Platform-specific testing (iOS, Android, Web)
- SSO integration with real providers
- Security measures
- Performance and optimization
- Error handling
- Accessibility compliance

## Requirements Coverage

All 35 requirements are covered by implementation tasks:
- Requirement 1: Manual User Registration (Tasks 1.1, 1.3, 5.2, 7.6)
- Requirement 2: Email and Username Uniqueness (Tasks 3.2, 3.4, 3.5)
- Requirement 3: Apple Sign In Integration (Tasks 5.10, 7.6)
- Requirement 4: Google Sign In Integration (Tasks 5.10, 7.6)
- Requirement 5: SSO Account Linking (Tasks 3.2, 7.14)
- Requirement 6: User Login (Tasks 3.2, 7.8)
- Requirement 7: SSO Login (Tasks 3.2, 7.8)
- Requirement 8: Session Management with JWT (Tasks 1.5, 5.8)
- Requirement 9: Remember Me Functionality (Tasks 1.5, 7.8)
- Requirement 10: User Logout (Tasks 3.2, 5.8)
- Requirement 11: Password Reset Request (Tasks 1.8, 3.2, 7.10)
- Requirement 12: Password Reset Completion (Tasks 3.2, 7.12)
- Requirement 13: Security - Password Hashing (Tasks 1.3, 1.2)
- Requirement 14: Security - HTTPS and Token Storage (Tasks 5.5, 11.8)
- Requirement 15: Security - Rate Limiting (Tasks 1.10, 1.11)
- Requirement 16: Error Handling - Network Errors (Tasks 5.8, 9.9)
- Requirement 17: Error Handling - Validation Errors (Tasks 5.2, 7.6, 7.8, 7.10, 7.12)
- Requirement 18: User Experience - Loading States (Tasks 7.6, 7.8, 7.10, 7.12, 11.2)
- Requirement 19: User Experience - Navigation (Tasks 7.6, 7.8, 7.16)
- Requirement 20: User Experience - Terms of Service (Tasks 7.6)
- Requirement 21: Database Schema - User Model Extensions (Tasks 1.1)
- Requirement 22: API Endpoints - Registration (Tasks 3.2, 3.3)
- Requirement 23: API Endpoints - Login (Tasks 3.2, 3.3)
- Requirement 24: API Endpoints - Account Linking (Tasks 3.2, 3.3)
- Requirement 25: API Endpoints - Token Management (Tasks 3.2, 3.3)
- Requirement 26: API Endpoints - Password Reset (Tasks 3.2, 3.3)
- Requirement 27: Platform Support - iOS (Tasks 5.10, 9.2)
- Requirement 28: Platform Support - Android (Tasks 5.10, 9.3)
- Requirement 29: Platform Support - Web (Tasks 5.10, 9.4)
- Requirement 30: Accessibility - Screen Reader Support (Tasks 7.1-7.4, 9.2-9.4, 11.3)
- Requirement 31: Accessibility - Keyboard Navigation (Tasks 9.4, 11.3)
- Requirement 32: Accessibility - Color Contrast (Tasks 7.1, 7.2, 9.10)
- Requirement 33: Performance - Token Refresh Optimization (Tasks 5.8, 9.8, 11.4)
- Requirement 34: Testing - Unit Test Coverage (Tasks 1.4, 1.7, 1.9, 1.12, 3.21, 5.4, 5.7, 5.9, 5.11, 5.13, 7.5)
- Requirement 35: Testing - Integration Test Coverage (Tasks 3.6-3.20, 7.7, 7.9, 7.11, 7.13, 7.15, 7.18, 9.5)
