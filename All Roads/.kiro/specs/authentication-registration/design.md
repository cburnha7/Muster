# Design Document: Authentication and Registration System

## Overview

This document provides the technical design for the authentication and registration system for Muster, a sports booking and event management platform. The system enables users to create accounts, authenticate securely, and manage their sessions across iOS, Android, and Web platforms.

### Purpose

The authentication system serves as the security foundation for the Muster platform, providing:
- Secure user registration with email/password or SSO (Apple, Google)
- Multi-method authentication (email, username, SSO)
- Session management with JWT tokens and automatic refresh
- Password reset functionality
- Account linking for multiple authentication methods
- Platform-specific implementations (iOS, Android, Web)

### Scope

This design covers:
- Frontend components (React Native Expo with Redux)
- Backend services (Express.js with Prisma ORM and PostgreSQL)
- Authentication flows (registration, login, logout, password reset)
- Security measures (password hashing, token management, rate limiting)
- Platform-specific integrations (Apple Sign In, Google Sign In)
- Data models and API endpoints

### Key Design Decisions

1. **JWT-based Authentication**: Using JSON Web Tokens for stateless authentication with 15-minute access tokens and 7-day (or 30-day with "Remember Me") refresh tokens
2. **Dual Token Strategy**: Separate access and refresh tokens to balance security and user experience
3. **Platform-Specific Storage**: SecureStore for mobile, HTTP-only cookies for web
4. **Centralized Validation**: Single ValidationService for consistent validation across all forms
5. **SSO Account Linking**: Allow users to link multiple authentication methods to a single account
6. **Nullable Password Field**: Support SSO-only accounts without requiring a password
7. **Rate Limiting**: Protect against brute force attacks with IP-based rate limiting
8. **Proactive Token Refresh**: Refresh tokens 5 minutes before expiration to prevent interruptions

## Architecture

### High-Level System Architecture

```mermaid
graph TB
    subgraph "Frontend - React Native Expo"
        UI[UI Components]
        Redux[Redux Store]
        AuthSvc[AuthService]
        SSOSvc[SSOService]
        ValSvc[ValidationService]
        TokenStore[Token Storage]
    end
    
    subgraph "Backend - Express.js"
        API[API Routes]
        AuthCtrl[Auth Controller]
        TokenSvc[Token Service]
        EmailSvc[Email Service]
        RateLimit[Rate Limiter]
    end
    
    subgraph "Data Layer"
        Prisma[Prisma ORM]
        DB[(PostgreSQL)]
    end
    
    subgraph "External Services"
        Apple[Apple Sign In]
        Google[Google Sign In]
        SMTP[Email Service]
    end
    
    UI --> Redux
    Redux --> AuthSvc
    AuthSvc --> SSOSvc
    AuthSvc --> ValSvc
    AuthSvc --> TokenStore
    AuthSvc --> API
    
    API --> RateLimit
    RateLimit --> AuthCtrl
    AuthCtrl --> TokenSvc
    AuthCtrl --> EmailSvc
    AuthCtrl --> Prisma
    
    Prisma --> DB
    
    SSOSvc --> Apple
    SSOSvc --> Google
    EmailSvc --> SMTP
    
    style UI fill:#3D8C5E,color:#fff
    style Redux fill:#3D8C5E,color:#fff
    style API fill:#E8A030,color:#fff
    style DB fill:#5B9FD4,color:#fff
```

### Authentication Flow Diagrams

#### Manual Registration Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Registration Screen
    participant Val as Validation Service
    participant Auth as Auth Service
    participant API as Backend API
    participant DB as Database
    
    User->>UI: Enter registration data
    UI->>Val: Validate input
    Val-->>UI: Validation result
    
    alt Validation fails
        UI->>User: Show inline errors
    else Validation succeeds
        UI->>Auth: Submit registration
        Auth->>API: POST /api/auth/register
        API->>DB: Check email/username uniqueness
        
        alt Email/username exists
            DB-->>API: Conflict
            API-->>Auth: 409 Conflict
            Auth-->>UI: Show error
            UI->>User: Display conflict message
        else Unique credentials
            API->>API: Hash password (bcrypt)
            API->>DB: Create user
            API->>API: Generate JWT tokens
            DB-->>API: User created
            API-->>Auth: 201 + tokens + user
            Auth->>Auth: Store tokens
            Auth-->>UI: Success
            UI->>User: Navigate to home
        end
    end
```

#### SSO Registration Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Registration Screen
    participant SSO as SSO Service
    participant Provider as Apple/Google
    participant Auth as Auth Service
    participant API as Backend API
    participant DB as Database
    
    User->>UI: Tap "Sign in with Apple/Google"
    UI->>SSO: Initiate SSO flow
    SSO->>Provider: OAuth request
    Provider->>User: Authentication prompt
    User->>Provider: Approve
    Provider-->>SSO: User data + token
    SSO-->>UI: Pre-populate form
    
    UI->>User: Show username field
    User->>UI: Enter username
    UI->>Auth: Submit SSO registration
    Auth->>API: POST /api/auth/register/sso
    API->>DB: Check email uniqueness
    
    alt Email exists
        DB-->>API: User found
        API-->>Auth: Prompt for account linking
        Auth-->>UI: Show linking modal
        UI->>User: Request password (if manual account)
        User->>UI: Enter password
        UI->>Auth: Link account
        Auth->>API: POST /api/auth/link-account
        API->>DB: Verify password & link SSO
        DB-->>API: Account linked
        API-->>Auth: 200 + tokens + user
    else Email unique
        API->>DB: Create SSO user
        API->>API: Generate JWT tokens
        DB-->>API: User created
        API-->>Auth: 201 + tokens + user
    end
    
    Auth->>Auth: Store tokens
    Auth-->>UI: Success
    UI->>User: Navigate to home
```

#### Login Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Login Screen
    participant Auth as Auth Service
    participant API as Backend API
    participant DB as Database
    participant Store as Token Storage
    
    User->>UI: Enter credentials
    UI->>Auth: Submit login
    Auth->>API: POST /api/auth/login
    API->>DB: Find user by email/username
    
    alt User not found
        DB-->>API: Not found
        API-->>Auth: 401 Unauthorized
        Auth-->>UI: Invalid credentials
        UI->>User: Show error
    else User found
        DB-->>API: User data
        API->>API: Compare password (bcrypt)
        
        alt Password invalid
            API-->>Auth: 401 Unauthorized
            Auth-->>UI: Invalid credentials
            UI->>User: Show error
        else Password valid
            API->>API: Generate JWT tokens
            API-->>Auth: 200 + tokens + user
            Auth->>Store: Store tokens
            Auth-->>UI: Success
            UI->>User: Navigate to home
        end
    end
```

#### Token Refresh Flow

```mermaid
sequenceDiagram
    participant App as Frontend App
    participant Auth as Auth Service
    participant API as Backend API
    participant Store as Token Storage
    
    App->>Auth: Make API request
    Auth->>Auth: Check token expiration
    
    alt Token expires in < 5 min
        Auth->>Store: Get refresh token
        Store-->>Auth: Refresh token
        Auth->>API: POST /api/auth/refresh
        
        alt Refresh token valid
            API->>API: Verify refresh token
            API->>API: Generate new tokens
            API-->>Auth: 200 + new tokens
            Auth->>Store: Store new tokens
            Auth->>API: Retry original request
            API-->>Auth: Response
            Auth-->>App: Success
        else Refresh token invalid/expired
            API-->>Auth: 401 Unauthorized
            Auth->>Store: Clear tokens
            Auth-->>App: Redirect to login
        end
    else Token still valid
        Auth->>API: Make request with token
        API-->>Auth: Response
        Auth-->>App: Success
    end
```

#### Password Reset Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as UI Screens
    participant Auth as Auth Service
    participant API as Backend API
    participant Email as Email Service
    participant DB as Database
    
    User->>UI: Tap "Forgot Password"
    UI->>User: Show email input
    User->>UI: Enter email
    UI->>Auth: Request reset
    Auth->>API: POST /api/auth/forgot-password
    API->>DB: Find user by email
    
    alt User exists
        DB-->>API: User found
        API->>API: Generate reset token
        API->>DB: Store reset token
        API->>Email: Send reset email
        Email->>User: Email with reset link
    else User not found
        Note over API: Return success anyway<br/>(prevent email enumeration)
    end
    
    API-->>Auth: 200 Success
    Auth-->>UI: Show success message
    
    User->>User: Open email
    User->>UI: Click reset link
    UI->>User: Show password form
    User->>UI: Enter new password
    UI->>Auth: Submit reset
    Auth->>API: POST /api/auth/reset-password
    API->>DB: Verify reset token
    
    alt Token valid
        DB-->>API: Token verified
        API->>API: Hash new password
        API->>DB: Update password
        API->>DB: Invalidate reset token
        DB-->>API: Success
        API-->>Auth: 200 Success
        Auth-->>UI: Show success
        UI->>User: Navigate to login
    else Token invalid/expired
        DB-->>API: Invalid token
        API-->>Auth: 401 Unauthorized
        Auth-->>UI: Show error
        UI->>User: Offer to request new link
    end
```

#### Account Linking Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as UI Components
    participant Auth as Auth Service
    participant API as Backend API
    participant DB as Database
    
    User->>UI: Attempt SSO login
    UI->>Auth: SSO authentication
    Auth->>API: POST /api/auth/login/sso
    API->>DB: Find user by email
    DB-->>API: User found (manual account)
    API-->>Auth: Account exists
    Auth-->>UI: Show linking modal
    
    UI->>User: "Link your Apple/Google account?"
    User->>UI: Confirm linking
    UI->>User: Show password field
    User->>UI: Enter password
    UI->>Auth: Link account
    Auth->>API: POST /api/auth/link-account
    API->>DB: Verify password
    
    alt Password correct
        DB-->>API: Password verified
        API->>DB: Add SSO provider to user
        API->>API: Generate JWT tokens
        DB-->>API: Account linked
        API-->>Auth: 200 + tokens + user
        Auth->>Auth: Store tokens
        Auth-->>UI: Success
        UI->>User: Navigate to home
    else Password incorrect
        DB-->>API: Password mismatch
        API-->>Auth: 401 Unauthorized
        Auth-->>UI: Show error
        UI->>User: "Incorrect password"
    end
```

## Components and Interfaces

### Frontend Components

#### RegistrationScreen

**Purpose**: Provides the user interface for creating a new account via manual registration or SSO.

**Location**: `src/screens/auth/RegistrationScreen.tsx`

**State Management**:
```typescript
interface RegistrationState {
  // Form fields
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
  
  // SSO state
  ssoProvider: 'apple' | 'google' | null;
  ssoToken: string | null;
  ssoUserId: string | null;
  
  // UI state
  isLoading: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
  
  // Validation errors
  errors: {
    firstName?: string;
    lastName?: string;
    email?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
    agreedToTerms?: string;
    general?: string;
  };
}
```

**Key Methods**:
- `validateField(field: string, value: string): string | null` - Validate single field
- `validateForm(): boolean` - Validate entire form
- `handleManualRegistration(): Promise<void>` - Submit manual registration
- `handleSSORegistration(provider: 'apple' | 'google'): Promise<void>` - Initiate SSO flow
- `handleSSOComplete(userData: SSOUserData): void` - Handle SSO callback

**Props**: None (navigation handled by React Navigation)

**Styling**: Uses Muster brand colors (Grass green for primary button, Track red for errors)


#### LoginScreen (Enhanced)

**Purpose**: Enhanced version of existing login screen to support SSO and "Remember Me" functionality.

**Location**: `src/screens/auth/LoginScreen.tsx` (existing, to be enhanced)

**New State Fields**:
```typescript
interface LoginState {
  // Existing fields
  username: string;
  password: string;
  showPassword: boolean;
  isLoading: boolean;
  errors: {
    username?: string;
    password?: string;
    general?: string;
  };
  
  // New fields
  rememberMe: boolean;
  ssoLoading: 'apple' | 'google' | null;
}
```

**New Methods**:
- `handleSSOLogin(provider: 'apple' | 'google'): Promise<void>` - Initiate SSO login
- `handleRememberMeToggle(): void` - Toggle remember me checkbox

**Enhancements**:
- Add "Remember Me" checkbox
- Add "Sign in with Apple" button
- Add "Sign in with Google" button
- Add "Forgot Password?" link
- Add "Don't have an account? Sign Up" link


#### ForgotPasswordScreen (New)

**Purpose**: Allow users to request a password reset email.

**Location**: `src/screens/auth/ForgotPasswordScreen.tsx` (new)

**State Management**:
```typescript
interface ForgotPasswordState {
  email: string;
  isLoading: boolean;
  isSuccess: boolean;
  errors: {
    email?: string;
    general?: string;
  };
}
```

**Key Methods**:
- `validateEmail(email: string): string | null` - Validate email format
- `handleSubmit(): Promise<void>` - Submit password reset request
- `handleBackToLogin(): void` - Navigate back to login screen

**UI Elements**:
- Email input field
- Submit button
- Success message (after submission)
- Back to login link


#### ResetPasswordScreen (New)

**Purpose**: Allow users to set a new password using a reset token from email.

**Location**: `src/screens/auth/ResetPasswordScreen.tsx` (new)

**State Management**:
```typescript
interface ResetPasswordState {
  resetToken: string; // From URL/deep link
  newPassword: string;
  confirmPassword: string;
  showPassword: boolean;
  showConfirmPassword: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  errors: {
    newPassword?: string;
    confirmPassword?: string;
    general?: string;
  };
}
```

**Key Methods**:
- `validatePassword(password: string): string | null` - Validate password strength
- `handleSubmit(): Promise<void>` - Submit new password
- `handleNavigateToLogin(): void` - Navigate to login after success

**UI Elements**:
- New password input field
- Confirm password input field
- Password strength indicator
- Submit button
- Success message
- Error message for expired/invalid tokens


#### AccountLinkingModal (New)

**Purpose**: Modal dialog for linking SSO accounts to existing manual accounts.

**Location**: `src/components/auth/AccountLinkingModal.tsx` (new)

**Props**:
```typescript
interface AccountLinkingModalProps {
  visible: boolean;
  provider: 'apple' | 'google';
  email: string;
  onConfirm: (password: string) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  error?: string;
}
```

**State Management**:
```typescript
interface AccountLinkingState {
  password: string;
  showPassword: boolean;
}
```

**UI Elements**:
- Modal overlay
- Provider icon (Apple/Google)
- Explanation text
- Password input field
- Confirm button
- Cancel button
- Error message display


#### Form Components

**TextInput Component**

**Location**: `src/components/forms/TextInput.tsx`

**Props**:
```typescript
interface TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  icon?: string; // Ionicons name
  onBlur?: () => void;
  editable?: boolean;
  accessibilityLabel?: string;
}
```

**Features**:
- Inline error display
- Icon support
- Password visibility toggle (if secureTextEntry)
- Accessible labels
- Brand-consistent styling

**Button Component**

**Location**: `src/components/forms/Button.tsx`

**Props**:
```typescript
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'destructive';
  isLoading?: boolean;
  disabled?: boolean;
  icon?: string; // Ionicons name
  accessibilityLabel?: string;
}
```

**Variants**:
- `primary`: Grass green background (#3D8C5E)
- `secondary`: Light background with grass green text
- `accent`: Court orange background (#E8A030)
- `destructive`: Track red background (#D45B5D)


**Checkbox Component**

**Location**: `src/components/forms/Checkbox.tsx`

**Props**:
```typescript
interface CheckboxProps {
  label: string | React.ReactNode;
  checked: boolean;
  onToggle: () => void;
  error?: string;
  accessibilityLabel?: string;
}
```

**Features**:
- Custom checkbox styling
- Support for rich text labels (for Terms of Service links)
- Error state display
- Accessible

**SSOButton Component**

**Location**: `src/components/auth/SSOButton.tsx`

**Props**:
```typescript
interface SSOButtonProps {
  provider: 'apple' | 'google';
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}
```

**Features**:
- Provider-specific branding (Apple black, Google white with logo)
- Loading state
- Platform-specific styling (follows HIG for iOS, Material Design for Android)


### Frontend Services

#### AuthService (API Layer)

**Purpose**: Handles all authentication-related API calls and token management.

**Location**: `src/services/api/AuthService.ts` (existing, to be enhanced)

**Interface**:
```typescript
interface AuthService {
  // Registration
  register(data: RegisterData): Promise<AuthResponse>;
  registerWithSSO(data: SSORegisterData): Promise<AuthResponse>;
  
  // Login
  login(emailOrUsername: string, password: string, rememberMe: boolean): Promise<AuthResponse>;
  loginWithSSO(provider: 'apple' | 'google', token: string, userId: string): Promise<AuthResponse>;
  
  // Account linking
  linkAccount(email: string, password: string, provider: string, token: string, userId: string): Promise<AuthResponse>;
  
  // Token management
  refreshToken(refreshToken: string): Promise<TokenResponse>;
  
  // Logout
  logout(): Promise<void>;
  
  // Password reset
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  
  // Token storage
  getToken(): string | null;
  getStoredToken(): Promise<string | null>;
  getStoredUser(): Promise<User | null>;
  isAuthenticated(): Promise<boolean>;
}
```

**Key Responsibilities**:
- Make HTTP requests to backend API
- Store and retrieve tokens from SecureStore (mobile) or cookies (web)
- Handle token refresh automatically
- Manage authentication state
- Handle network errors


#### SSOService

**Purpose**: Handles Apple Sign In and Google Sign In OAuth flows.

**Location**: `src/services/auth/SSOService.ts` (new)

**Interface**:
```typescript
interface SSOService {
  // Apple Sign In
  signInWithApple(): Promise<SSOUserData>;
  
  // Google Sign In
  signInWithGoogle(): Promise<SSOUserData>;
  
  // Check availability
  isAppleSignInAvailable(): Promise<boolean>;
  isGoogleSignInAvailable(): Promise<boolean>;
}

interface SSOUserData {
  provider: 'apple' | 'google';
  providerId: string;
  providerToken: string;
  email: string;
  firstName: string;
  lastName: string;
}
```

**Platform-Specific Implementations**:

**iOS (Apple Sign In)**:
- Uses `expo-apple-authentication`
- Requests: email, fullName
- Handles Apple-specific errors

**Android/Web (Google Sign In)**:
- Uses `expo-auth-session` with Google OAuth
- Requests: email, profile
- Handles Google-specific errors

**Error Handling**:
- User cancellation
- Network errors
- Permission denied
- Invalid credentials


#### ValidationService

**Purpose**: Centralized validation logic for all authentication forms.

**Location**: `src/services/auth/ValidationService.ts` (new)

**Interface**:
```typescript
interface ValidationService {
  // Field validators
  validateFirstName(value: string): string | null;
  validateLastName(value: string): string | null;
  validateEmail(value: string): string | null;
  validateUsername(value: string): string | null;
  validatePassword(value: string): string | null;
  validateConfirmPassword(password: string, confirmPassword: string): string | null;
  
  // Form validators
  validateRegistrationForm(data: RegistrationFormData): ValidationErrors;
  validateLoginForm(data: LoginFormData): ValidationErrors;
  validatePasswordResetForm(data: PasswordResetFormData): ValidationErrors;
}

interface ValidationErrors {
  [field: string]: string | undefined;
}
```

**Validation Rules**:

**First Name**:
- Minimum 2 characters
- Error: "First name must be at least 2 characters"

**Last Name**:
- Minimum 2 characters
- Error: "Last name must be at least 2 characters"

**Email**:
- Valid email format (RFC 5322 compliant)
- Error: "Please enter a valid email address"

**Username**:
- Minimum 3 characters
- Alphanumeric, underscore, dash only
- Errors:
  - "Username must be at least 3 characters"
  - "Username can only contain letters, numbers, underscores, and dashes"

**Password**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Errors:
  - "Password must be at least 8 characters"
  - "Password must contain at least one uppercase letter"
  - "Password must contain at least one lowercase letter"
  - "Password must contain at least one number"
  - "Password must contain at least one special character"

**Confirm Password**:
- Must match password field
- Error: "Passwords do not match"


### Backend Services

#### AuthController

**Purpose**: Handles authentication HTTP requests and coordinates with services.

**Location**: `server/src/controllers/AuthController.ts` (new)

**Methods**:
```typescript
class AuthController {
  // Registration
  async register(req: Request, res: Response): Promise<void>;
  async registerWithSSO(req: Request, res: Response): Promise<void>;
  
  // Login
  async login(req: Request, res: Response): Promise<void>;
  async loginWithSSO(req: Request, res: Response): Promise<void>;
  
  // Account linking
  async linkAccount(req: Request, res: Response): Promise<void>;
  
  // Token management
  async refreshToken(req: Request, res: Response): Promise<void>;
  async logout(req: Request, res: Response): Promise<void>;
  
  // Password reset
  async forgotPassword(req: Request, res: Response): Promise<void>;
  async resetPassword(req: Request, res: Response): Promise<void>;
}
```

**Responsibilities**:
- Request validation
- Call appropriate services
- Format responses
- Handle errors
- Apply rate limiting


#### AuthService (Business Logic)

**Purpose**: Core authentication business logic.

**Location**: `server/src/services/AuthService.ts` (new)

**Interface**:
```typescript
class AuthService {
  // Registration
  async createUser(data: CreateUserData): Promise<User>;
  async createSSOUser(data: CreateSSOUserData): Promise<User>;
  
  // Authentication
  async authenticateUser(emailOrUsername: string, password: string): Promise<User>;
  async authenticateSSOUser(provider: string, providerId: string): Promise<User>;
  
  // Account linking
  async linkSSOProvider(userId: string, provider: string, providerId: string): Promise<User>;
  
  // Password management
  async hashPassword(password: string): Promise<string>;
  async comparePassword(password: string, hash: string): Promise<boolean>;
  async updatePassword(userId: string, newPassword: string): Promise<void>;
  
  // Password reset
  async createPasswordResetToken(userId: string): Promise<string>;
  async verifyPasswordResetToken(token: string): Promise<string | null>; // Returns userId
  async invalidatePasswordResetToken(token: string): Promise<void>;
  
  // User lookup
  async findUserByEmail(email: string): Promise<User | null>;
  async findUserByUsername(username: string): Promise<User | null>;
  async findUserByEmailOrUsername(emailOrUsername: string): Promise<User | null>;
  async findUserBySSOProvider(provider: string, providerId: string): Promise<User | null>;
}
```

**Key Implementations**:

**Password Hashing**:
```typescript
async hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Password Reset Token**:
- Generate cryptographically secure random token (32 bytes)
- Store token hash in database with expiration (1 hour)
- Return plain token to send in email


#### TokenService

**Purpose**: JWT token generation, validation, and management.

**Location**: `server/src/services/TokenService.ts` (new)

**Interface**:
```typescript
class TokenService {
  // Token generation
  generateAccessToken(userId: string): string;
  generateRefreshToken(userId: string, rememberMe: boolean): string;
  
  // Token validation
  verifyAccessToken(token: string): TokenPayload | null;
  verifyRefreshToken(token: string): TokenPayload | null;
  
  // Token management
  async storeRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  async invalidateRefreshToken(token: string): Promise<void>;
  async invalidateAllUserTokens(userId: string): Promise<void>;
  async isRefreshTokenValid(token: string): Promise<boolean>;
}

interface TokenPayload {
  userId: string;
  iat: number; // Issued at
  exp: number; // Expiration
}
```

**Token Configuration**:

**Access Token**:
- Expiration: 15 minutes
- Algorithm: HS256
- Payload: `{ userId, iat, exp }`

**Refresh Token**:
- Expiration: 7 days (default) or 30 days (with "Remember Me")
- Algorithm: HS256
- Payload: `{ userId, iat, exp }`
- Stored in database for validation

**JWT Secret**:
- Stored in environment variable: `JWT_SECRET`
- Minimum 32 characters
- Cryptographically secure random string


#### EmailService

**Purpose**: Send password reset and other authentication-related emails.

**Location**: `server/src/services/EmailService.ts` (new)

**Interface**:
```typescript
class EmailService {
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void>;
  async sendWelcomeEmail(email: string, firstName: string): Promise<void>;
  async sendAccountLinkedEmail(email: string, provider: string): Promise<void>;
}
```

**Email Templates**:

**Password Reset Email**:
- Subject: "Reset Your Muster Password"
- Content:
  - Greeting with user's name
  - Reset link with token
  - Expiration notice (1 hour)
  - Security notice (ignore if not requested)
  - Support contact

**Welcome Email** (optional):
- Subject: "Welcome to Muster!"
- Content:
  - Welcome message
  - Getting started tips
  - Link to platform

**Account Linked Email** (optional):
- Subject: "New Sign-In Method Added"
- Content:
  - Confirmation of linked provider
  - Security notice
  - Instructions to unlink if not authorized

**SMTP Configuration**:
- Provider: Configurable (SendGrid, AWS SES, etc.)
- Environment variables:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASSWORD`
  - `SMTP_FROM_EMAIL`
  - `SMTP_FROM_NAME`


#### RateLimiter

**Purpose**: Prevent brute force attacks on authentication endpoints.

**Location**: `server/src/middleware/rateLimiter.ts` (new)

**Configuration**:
```typescript
const rateLimitConfig = {
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many login attempts. Please try again in 15 minutes',
  },
  registration: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 requests per window
    message: 'Too many registration attempts. Please try again in 15 minutes',
  },
  passwordReset: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 requests per window
    message: 'Too many password reset requests. Please try again in 15 minutes',
  },
};
```

**Implementation**:
- Uses `express-rate-limit` package
- Tracks by IP address
- Returns 429 status code when limit exceeded
- Stores rate limit data in memory (Redis for production)

**Middleware Usage**:
```typescript
import { loginRateLimiter, registrationRateLimiter, passwordResetRateLimiter } from './middleware/rateLimiter';

router.post('/auth/login', loginRateLimiter, authController.login);
router.post('/auth/register', registrationRateLimiter, authController.register);
router.post('/auth/forgot-password', passwordResetRateLimiter, authController.forgotPassword);
```


## Data Models

### Database Schema Extensions

#### User Model Extensions

**Location**: `server/prisma/schema.prisma`

**Changes to Existing User Model**:
```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  username      String?  @unique
  password      String?  // Changed from required to optional (nullable)
  firstName     String
  lastName      String
  displayName   String?
  tierTag       String?
  phoneNumber   String?
  dateOfBirth   DateTime
  profileImage  String?
  
  // NEW: SSO provider support
  ssoProviders  String[] @default([])  // ["apple", "google"]
  ssoProviderIds Json?   // {"apple": "001234.abc...", "google": "1234567890"}
  
  // Existing fields...
  membershipTier String @default("standard")
  role          String @default("member")
  currentRating Float @default(1.0)
  pickupRating  Float @default(1.0)
  leagueRating  Float @default(1.0)
  totalGamesPlayed Int @default(0)
  pickupGamesPlayed Int @default(0)
  leagueGamesPlayed Int @default(0)
  ratingLastUpdated DateTime @default(now())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Existing relations...
  organizedEvents Event[]       @relation("EventOrganizer")
  bookings        Booking[]
  teamMemberships TeamMember[]
  facilities      Facility[]    @relation("FacilityOwner")
  reviews         Review[]
  organizedLeagues League[]     @relation("LeagueOrganizer")
  gameParticipations GameParticipation[]
  votesGiven      PlayerVote[]  @relation("VoterVotes")
  votesReceived   PlayerVote[]  @relation("ReceivedVotes")
  salutesGiven    Salute[]      @relation("SalutesGiven")
  salutesReceived Salute[]      @relation("SalutesReceived")
  uploadedDocuments LeagueDocument[] @relation("DocumentUploader")
  uploadedCertifications CertificationDocument[] @relation("CertificationUploader")
  rentals         FacilityRental[]
  
  // NEW: Token relations
  refreshTokens   RefreshToken[]
  passwordResetTokens PasswordResetToken[]

  @@map("users")
}
```

**Field Descriptions**:
- `password`: Now nullable to support SSO-only accounts
- `ssoProviders`: Array of linked SSO providers (e.g., ["apple", "google"])
- `ssoProviderIds`: JSON object mapping provider names to provider user IDs


#### RefreshToken Model (New)

**Purpose**: Store and validate refresh tokens for session management.

**Schema**:
```prisma
model RefreshToken {
  id          String   @id @default(uuid())
  token       String   @unique
  userId      String
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  
  // Relations
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([token])
  @@index([expiresAt])
  @@map("refresh_tokens")
}
```

**Field Descriptions**:
- `token`: The refresh token (hashed for security)
- `userId`: Reference to the user who owns this token
- `expiresAt`: Token expiration timestamp
- `createdAt`: Token creation timestamp

**Indexes**:
- `userId`: Fast lookup of all tokens for a user
- `token`: Fast validation of token
- `expiresAt`: Efficient cleanup of expired tokens


#### PasswordResetToken Model (New)

**Purpose**: Store and validate password reset tokens.

**Schema**:
```prisma
model PasswordResetToken {
  id          String   @id @default(uuid())
  token       String   @unique
  userId      String
  expiresAt   DateTime
  used        Boolean  @default(false)
  usedAt      DateTime?
  createdAt   DateTime @default(now())
  
  // Relations
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([token])
  @@index([expiresAt])
  @@map("password_reset_tokens")
}
```

**Field Descriptions**:
- `token`: The password reset token (hashed for security)
- `userId`: Reference to the user requesting password reset
- `expiresAt`: Token expiration timestamp (1 hour from creation)
- `used`: Whether the token has been used
- `usedAt`: Timestamp when token was used
- `createdAt`: Token creation timestamp

**Indexes**:
- `userId`: Fast lookup of tokens for a user
- `token`: Fast validation of token
- `expiresAt`: Efficient cleanup of expired tokens

**Token Lifecycle**:
1. Created when user requests password reset
2. Expires after 1 hour
3. Marked as `used` when password is successfully reset
4. Cannot be reused once marked as `used`


### TypeScript Interfaces

#### Frontend Types

**Location**: `src/types/auth.ts` (new)

```typescript
// User data
export interface User {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  profileImage?: string;
  phoneNumber?: string;
  dateOfBirth: string;
  membershipTier: string;
  role: string;
  ssoProviders: string[];
  createdAt: string;
  updatedAt: string;
}

// Registration
export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  agreedToTerms: boolean;
}

export interface SSORegisterData {
  provider: 'apple' | 'google';
  providerToken: string;
  providerUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
}

// Login
export interface LoginCredentials {
  emailOrUsername: string;
  password: string;
  rememberMe: boolean;
}

export interface SSOLoginData {
  provider: 'apple' | 'google';
  providerToken: string;
  providerUserId: string;
}

// Account linking
export interface AccountLinkData {
  email: string;
  password: string;
  provider: 'apple' | 'google';
  providerToken: string;
  providerUserId: string;
}

// Responses
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

// SSO
export interface SSOUserData {
  provider: 'apple' | 'google';
  providerId: string;
  providerToken: string;
  email: string;
  firstName: string;
  lastName: string;
}

// Validation
export interface ValidationErrors {
  [field: string]: string | undefined;
}
```


#### Backend Types

**Location**: `server/src/types/auth.ts` (new)

```typescript
// User creation
export interface CreateUserData {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
}

export interface CreateSSOUserData {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  ssoProvider: string;
  ssoProviderId: string;
}

// Request bodies
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  agreedToTerms: boolean;
}

export interface SSORegisterRequest {
  provider: 'apple' | 'google';
  providerToken: string;
  providerUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
}

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
  rememberMe?: boolean;
}

export interface SSOLoginRequest {
  provider: 'apple' | 'google';
  providerToken: string;
  providerUserId: string;
}

export interface LinkAccountRequest {
  email: string;
  password: string;
  provider: 'apple' | 'google';
  providerToken: string;
  providerUserId: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
}

// JWT payload
export interface TokenPayload {
  userId: string;
  iat: number;
  exp: number;
}

// Responses
export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface UserResponse {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  profileImage?: string;
  phoneNumber?: string;
  dateOfBirth: Date;
  membershipTier: string;
  role: string;
  ssoProviders: string[];
  createdAt: Date;
  updatedAt: Date;
}
```


## API Endpoints

### Registration Endpoints

#### POST /api/auth/register

**Purpose**: Register a new user with email and password.

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "agreedToTerms": true
}
```

**Success Response** (201 Created):
```json
{
  "user": {
    "id": "uuid",
    "email": "john.doe@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "membershipTier": "standard",
    "role": "member",
    "ssoProviders": [],
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-01-15T10:15:00Z"
}
```

**Error Responses**:
- 400 Bad Request: Validation errors
- 409 Conflict: Email or username already exists
- 429 Too Many Requests: Rate limit exceeded
- 500 Internal Server Error: Server error


#### POST /api/auth/register/sso

**Purpose**: Register a new user with SSO provider.

**Request Body**:
```json
{
  "provider": "apple",
  "providerToken": "apple_token_here",
  "providerUserId": "001234.abc123def456...",
  "email": "john.doe@privaterelay.appleid.com",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe"
}
```

**Success Response** (201 Created):
```json
{
  "user": {
    "id": "uuid",
    "email": "john.doe@privaterelay.appleid.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "membershipTier": "standard",
    "role": "member",
    "ssoProviders": ["apple"],
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-01-15T10:15:00Z"
}
```

**Error Responses**:
- 400 Bad Request: Validation errors or invalid provider token
- 409 Conflict: Email or username already exists
- 429 Too Many Requests: Rate limit exceeded
- 500 Internal Server Error: Server error


### Login Endpoints

#### POST /api/auth/login

**Purpose**: Authenticate user with email/username and password.

**Request Body**:
```json
{
  "emailOrUsername": "johndoe",
  "password": "SecurePass123!",
  "rememberMe": true
}
```

**Success Response** (200 OK):
```json
{
  "user": {
    "id": "uuid",
    "email": "john.doe@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "membershipTier": "standard",
    "role": "member",
    "ssoProviders": [],
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-01-15T10:15:00Z"
}
```

**Error Responses**:
- 401 Unauthorized: Invalid credentials
- 429 Too Many Requests: Rate limit exceeded
- 500 Internal Server Error: Server error


#### POST /api/auth/login/sso

**Purpose**: Authenticate user with SSO provider.

**Request Body**:
```json
{
  "provider": "google",
  "providerToken": "google_token_here",
  "providerUserId": "1234567890"
}
```

**Success Response** (200 OK):
```json
{
  "user": {
    "id": "uuid",
    "email": "john.doe@gmail.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "membershipTier": "standard",
    "role": "member",
    "ssoProviders": ["google"],
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-01-15T10:15:00Z"
}
```

**Error Responses**:
- 400 Bad Request: Invalid provider token
- 404 Not Found: No account found with this provider
- 429 Too Many Requests: Rate limit exceeded
- 500 Internal Server Error: Server error


### Account Linking Endpoint

#### POST /api/auth/link-account

**Purpose**: Link an SSO provider to an existing account.

**Request Body**:
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "provider": "apple",
  "providerToken": "apple_token_here",
  "providerUserId": "001234.abc123def456..."
}
```

**Success Response** (200 OK):
```json
{
  "user": {
    "id": "uuid",
    "email": "john.doe@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "membershipTier": "standard",
    "role": "member",
    "ssoProviders": ["apple"],
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-01-15T10:15:00Z"
}
```

**Error Responses**:
- 401 Unauthorized: Incorrect password
- 404 Not Found: No account found with this email
- 409 Conflict: Provider already linked to this account
- 500 Internal Server Error: Server error


### Token Management Endpoints

#### POST /api/auth/refresh

**Purpose**: Refresh an expired access token using a refresh token.

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-01-15T10:15:00Z"
}
```

**Error Responses**:
- 401 Unauthorized: Invalid or expired refresh token
- 500 Internal Server Error: Server error

#### POST /api/auth/logout

**Purpose**: Logout user and invalidate refresh token.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Success Response** (200 OK):
```json
{
  "message": "Logged out successfully"
}
```

**Error Responses**:
- 401 Unauthorized: Invalid or missing access token
- 500 Internal Server Error: Server error


### Password Reset Endpoints

#### POST /api/auth/forgot-password

**Purpose**: Request a password reset email.

**Request Body**:
```json
{
  "email": "john.doe@example.com"
}
```

**Success Response** (200 OK):
```json
{
  "message": "Password reset email sent. Please check your inbox"
}
```

**Note**: Returns success even if email doesn't exist (prevents email enumeration).

**Error Responses**:
- 429 Too Many Requests: Rate limit exceeded
- 500 Internal Server Error: Server error

#### POST /api/auth/reset-password

**Purpose**: Reset password using a reset token.

**Request Body**:
```json
{
  "resetToken": "abc123def456...",
  "newPassword": "NewSecurePass123!"
}
```

**Success Response** (200 OK):
```json
{
  "message": "Password reset successful"
}
```

**Error Responses**:
- 401 Unauthorized: Invalid or expired reset token
- 400 Bad Request: Password validation failed
- 500 Internal Server Error: Server error


## Security Design

### Password Hashing

**Algorithm**: bcrypt
**Cost Factor**: 10
**Implementation**:
```typescript
import bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Security Properties**:
- Passwords are never stored in plain text
- Each password has a unique salt
- Cost factor of 10 provides strong protection against brute force
- Comparison is timing-safe

### JWT Token Structure

**Access Token**:
```json
{
  "userId": "uuid",
  "iat": 1705315200,
  "exp": 1705316100
}
```
- Expiration: 15 minutes
- Algorithm: HS256
- Signed with JWT_SECRET

**Refresh Token**:
```json
{
  "userId": "uuid",
  "iat": 1705315200,
  "exp": 1705920000
}
```
- Expiration: 7 days (default) or 30 days (with "Remember Me")
- Algorithm: HS256
- Signed with JWT_SECRET
- Stored in database for validation

### Token Storage

**Mobile (iOS/Android)**:
- Uses Expo SecureStore
- Hardware-backed encryption (when available)
- Isolated per-app storage

**Web**:
- HTTP-only cookies
- Secure flag (HTTPS only)
- SameSite flag (CSRF protection)
- Cannot be accessed by JavaScript

### Rate Limiting

**Configuration**:
- Login: 5 attempts per 15 minutes per IP
- Registration: 3 attempts per 15 minutes per IP
- Password Reset: 3 attempts per 15 minutes per IP

**Implementation**:
- Uses express-rate-limit middleware
- Tracks by IP address
- Returns 429 status code when exceeded
- Memory store for development, Redis for production

### HTTPS Enforcement

**Requirements**:
- All authentication endpoints require HTTPS
- Redirect HTTP to HTTPS in production
- HSTS header enabled
- Certificate validation enforced


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following testable properties. Many requirements were duplicates or covered the same underlying behavior, so I consolidated them:

**Consolidated Properties**:
- Validation properties (1.2-1.12, 6.2-6.3, 12.3-12.4): All validation rules
- Authentication success properties (1.15-1.16, 3.8-3.9, 5.6, 6.5-6.6): Token generation and storage
- Password hashing properties (1.14, 13.1-13.3): All password hashing requirements
- Token expiration properties (8.1-8.2, 9.2-9.3): Access and refresh token expiration
- Rate limiting properties (15.1-15.4): All rate limiting requirements

**Eliminated Redundancies**:
- Properties about token generation after successful authentication (1.15, 3.8, 5.6, 6.5) → Combined into Property 7
- Properties about token storage (1.16, 3.9, 6.6, 8.3-8.4) → Combined into Property 8
- Properties about password hashing (1.14, 13.1-13.3) → Combined into Property 6
- Properties about token expiration (8.1-8.2, 9.2-9.3) → Combined into Properties 9-10
- Properties about rate limiting (15.1, 15.4) → Combined into Property 15


### Property 1: First Name Validation

*For any* string with length less than 2 characters, the validation service should return the error message "First name must be at least 2 characters"

**Validates: Requirements 1.2**

### Property 2: Last Name Validation

*For any* string with length less than 2 characters, the validation service should return the error message "Last name must be at least 2 characters"

**Validates: Requirements 1.3**

### Property 3: Email Format Validation

*For any* string that does not match valid email format (RFC 5322), the validation service should return the error message "Please enter a valid email address"

**Validates: Requirements 1.4**

### Property 4: Username Length Validation

*For any* string with length less than 3 characters, the validation service should return the error message "Username must be at least 3 characters"

**Validates: Requirements 1.5**

### Property 5: Username Character Validation

*For any* string containing characters other than alphanumeric, underscore, or dash, the validation service should return the error message "Username can only contain letters, numbers, underscores, and dashes"

**Validates: Requirements 1.6**


### Property 6: Password Hashing Invariant

*For any* user registration or password reset, the password stored in the database should be a bcrypt hash (starting with "$2b$10$") and should never equal the plain text password

**Validates: Requirements 1.14, 13.1, 13.2, 13.3**

### Property 7: Authentication Success Token Generation

*For any* successful authentication (manual registration, SSO registration, manual login, SSO login, or account linking), the system should generate both a JWT access token and a JWT refresh token

**Validates: Requirements 1.15, 3.8, 5.6, 6.5**

### Property 8: Token Storage Round Trip

*For any* successful authentication, storing tokens in the Token Store and then retrieving them should return the same token values

**Validates: Requirements 1.16, 3.9, 6.6, 8.3, 8.4**

### Property 9: Access Token Expiration

*For any* successful authentication, the generated access token should expire exactly 15 minutes after issuance

**Validates: Requirements 8.1**

### Property 10: Refresh Token Expiration with Remember Me

*For any* successful authentication with "Remember Me" enabled, the generated refresh token should expire exactly 30 days after issuance; otherwise, it should expire exactly 7 days after issuance

**Validates: Requirements 8.2, 9.2, 9.3**


### Property 11: Password Validation - Minimum Length

*For any* string with length less than 8 characters, the password validation should return the error message "Password must be at least 8 characters"

**Validates: Requirements 1.7**

### Property 12: Password Validation - Uppercase Requirement

*For any* string without at least one uppercase letter (A-Z), the password validation should return the error message "Password must contain at least one uppercase letter"

**Validates: Requirements 1.8**

### Property 13: Password Validation - Lowercase Requirement

*For any* string without at least one lowercase letter (a-z), the password validation should return the error message "Password must contain at least one lowercase letter"

**Validates: Requirements 1.9**

### Property 14: Password Validation - Number Requirement

*For any* string without at least one numeric digit (0-9), the password validation should return the error message "Password must contain at least one number"

**Validates: Requirements 1.10**

### Property 15: Password Validation - Special Character Requirement

*For any* string without at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?), the password validation should return the error message "Password must contain at least one special character"

**Validates: Requirements 1.11**


### Property 16: Confirm Password Validation

*For any* two different password strings, the confirm password validation should return the error message "Passwords do not match"

**Validates: Requirements 1.12, 12.4**

### Property 17: Valid Registration Creates User

*For any* valid registration data (meeting all validation requirements), submitting the registration should result in a new user record in the database with matching email, username, firstName, and lastName

**Validates: Requirements 1.13**

### Property 18: Email Uniqueness Constraint

*For any* registration attempt with an email that already exists in the database, the system should return a 409 Conflict status code

**Validates: Requirements 2.1**

### Property 19: Username Uniqueness Constraint

*For any* registration attempt with a username that already exists in the database, the system should return a 409 Conflict status code

**Validates: Requirements 2.3**

### Property 20: SSO Registration Creates User with Provider

*For any* valid SSO registration (Apple or Google), the created user should have the provider name in their ssoProviders array and the provider user ID in their ssoProviderIds object

**Validates: Requirements 3.7, 4.7**


### Property 21: SSO Account Detection

*For any* SSO registration attempt with an email that already exists in the database, the system should detect the existing account and prompt for account linking

**Validates: Requirements 5.1**

### Property 22: Account Linking with Correct Password

*For any* account linking attempt with the correct password, the SSO provider should be added to the user's ssoProviders array and the provider user ID should be added to the ssoProviderIds object

**Validates: Requirements 5.4**

### Property 23: Account Linking with Incorrect Password

*For any* account linking attempt with an incorrect password, the system should return a 401 Unauthorized status code

**Validates: Requirements 5.5**

### Property 24: Multiple SSO Provider Authentication

*For any* user with multiple linked SSO providers, authentication via any of the linked providers should succeed and return valid tokens

**Validates: Requirements 5.10**

### Property 25: Empty Email/Username Validation

*For any* empty string or whitespace-only string, the email/username validation should return the error message "Email or username is required"

**Validates: Requirements 6.2**


### Property 26: Empty Password Validation

*For any* empty string or whitespace-only string, the password validation should return the error message "Password is required"

**Validates: Requirements 6.3**

### Property 27: Valid Credentials Authentication

*For any* user with valid credentials (correct email/username and password), login should succeed and return user data with valid tokens

**Validates: Requirements 6.4**

### Property 28: Invalid Credentials Rejection

*For any* login attempt with invalid credentials (wrong password or non-existent user), the system should return a 401 Unauthorized status code

**Validates: Requirements 6.8**

### Property 29: Token Refresh Round Trip

*For any* valid refresh token, using it to refresh should return a new access token and refresh token, and the new access token should be valid for API requests

**Validates: Requirements 8.6, 8.7**

### Property 30: Expired Token Rejection

*For any* expired access token, API requests should fail with 401 Unauthorized status code

**Validates: Requirements 8.6**


### Property 31: Invalid Refresh Token Cleanup

*For any* invalid or expired refresh token, attempting to refresh should clear all stored tokens from the Token Store

**Validates: Requirements 8.9**

### Property 32: Logout Token Cleanup

*For any* logout operation, all tokens (access token, refresh token) and user data should be cleared from the Token Store

**Validates: Requirements 10.2, 10.3, 10.4**

### Property 33: Logout Cleanup on API Failure

*For any* logout operation where the API request fails, local tokens and user data should still be cleared from the Token Store

**Validates: Requirements 10.7**

### Property 34: Password Reset Token Generation

*For any* valid email in the system, requesting a password reset should generate a unique reset token that expires in 1 hour

**Validates: Requirements 11.4, 11.7**

### Property 35: Password Reset Email Enumeration Prevention

*For any* password reset request (whether the email exists or not), the system should return the same success response to prevent email enumeration

**Validates: Requirements 11.6**


### Property 36: Password Reset Round Trip

*For any* valid reset token and new password meeting validation requirements, completing the password reset should update the user's password, and the user should be able to login with the new password

**Validates: Requirements 12.5, 12.6, 12.7**

### Property 37: Expired Reset Token Rejection

*For any* reset token that is more than 1 hour old, attempting to use it should return a 401 Unauthorized status code

**Validates: Requirements 11.7**

### Property 38: Password Comparison Correctness

*For any* user with a stored password hash, comparing the correct password should return true, and comparing any incorrect password should return false

**Validates: Requirements 13.4**

### Property 39: Login Rate Limiting

*For any* IP address making more than 5 login requests within 15 minutes, the 6th request should return a 429 Too Many Requests status code

**Validates: Requirements 15.1, 15.4**

### Property 40: Registration Rate Limiting

*For any* IP address making more than 3 registration requests within 15 minutes, the 4th request should return a 429 Too Many Requests status code

**Validates: Requirements 15.2**


### Property 41: Password Reset Rate Limiting

*For any* IP address making more than 3 password reset requests within 15 minutes, the 4th request should return a 429 Too Many Requests status code

**Validates: Requirements 15.3**

## Error Handling

### Validation Errors

**Client-Side Validation**:
- Performed on field blur and form submission
- Immediate feedback to user
- Prevents unnecessary API calls

**Server-Side Validation**:
- Always performed regardless of client validation
- Returns 400 Bad Request with detailed errors
- Error format:
```json
{
  "error": "Validation failed",
  "details": {
    "email": "Please enter a valid email address",
    "password": "Password must be at least 8 characters"
  }
}
```

### Authentication Errors

**401 Unauthorized**:
- Invalid credentials
- Expired tokens
- Invalid reset tokens
- Incorrect password for account linking

**409 Conflict**:
- Email already registered
- Username already taken
- SSO provider already linked

**429 Too Many Requests**:
- Rate limit exceeded
- Includes Retry-After header

### Network Errors

**Timeout Handling**:
- 30-second timeout for all requests
- Display user-friendly error message
- Provide retry option

**Connection Errors**:
- Detect offline state
- Display "No internet connection" message
- Queue requests for retry when online (optional)

**Server Errors (500)**:
- Log error details
- Display generic error message
- Provide support contact information


## Testing Strategy

### Dual Testing Approach

The authentication system requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
- Specific validation examples (empty strings, boundary values)
- Integration points between components
- Error handling scenarios
- Mock external dependencies (SSO providers, email service)

**Property-Based Tests**: Verify universal properties across all inputs
- Validation rules hold for all invalid inputs
- Authentication succeeds for all valid credentials
- Token generation and refresh work for all users
- Rate limiting enforces limits for all IPs

Together, unit tests catch concrete bugs while property tests verify general correctness.

### Property-Based Testing Configuration

**Library**: fast-check (JavaScript/TypeScript property-based testing library)

**Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `Feature: authentication-registration, Property {number}: {property_text}`

**Example Property Test**:
```typescript
import fc from 'fast-check';
import { ValidationService } from '../services/auth/ValidationService';

describe('Feature: authentication-registration, Property 1: First Name Validation', () => {
  it('should reject first names with fewer than 2 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 1 }), // Generate strings with 0-1 characters
        (firstName) => {
          const error = ValidationService.validateFirstName(firstName);
          expect(error).toBe('First name must be at least 2 characters');
        }
      ),
      { numRuns: 100 }
    );
  });
});
```


### Unit Testing Strategy

**Frontend Unit Tests**:

**Validation Service** (`src/services/auth/ValidationService.test.ts`):
- Test each validation rule with valid and invalid examples
- Test edge cases (empty strings, whitespace, special characters)
- Test error message accuracy
- Coverage target: 100%

**Auth Service** (`src/services/api/AuthService.test.ts`):
- Mock API responses
- Test token storage and retrieval
- Test error handling
- Test token refresh logic
- Coverage target: 90%

**SSO Service** (`src/services/auth/SSOService.test.ts`):
- Mock SSO provider responses
- Test success and failure scenarios
- Test platform-specific implementations
- Coverage target: 80%

**Backend Unit Tests**:

**AuthService** (`server/src/services/AuthService.test.ts`):
- Test password hashing and comparison
- Test user creation and lookup
- Test account linking logic
- Mock database calls
- Coverage target: 95%

**TokenService** (`server/src/services/TokenService.test.ts`):
- Test token generation
- Test token validation
- Test token expiration
- Test refresh token storage
- Coverage target: 100%

**EmailService** (`server/src/services/EmailService.test.ts`):
- Mock SMTP calls
- Test email template rendering
- Test error handling
- Coverage target: 80%

**RateLimiter** (`server/src/middleware/rateLimiter.test.ts`):
- Test rate limit enforcement
- Test limit reset after window
- Test different endpoints
- Coverage target: 100%


### Integration Testing Strategy

**End-to-End Flows**:

**Manual Registration Flow**:
1. Submit valid registration data
2. Verify user created in database
3. Verify password is hashed
4. Verify tokens are generated
5. Verify tokens are stored
6. Verify user can login with credentials

**SSO Registration Flow**:
1. Mock SSO provider response
2. Submit SSO registration
3. Verify user created with SSO provider
4. Verify tokens are generated
5. Verify user can login with SSO

**Login Flow**:
1. Create test user
2. Submit login credentials
3. Verify tokens are generated
4. Verify tokens are valid for API requests

**Token Refresh Flow**:
1. Create user and get tokens
2. Wait for access token to expire
3. Use refresh token to get new access token
4. Verify new token works for API requests

**Account Linking Flow**:
1. Create user with manual registration
2. Attempt SSO registration with same email
3. Verify account linking prompt
4. Submit correct password
5. Verify SSO provider added to user
6. Verify user can login with both methods

**Password Reset Flow**:
1. Request password reset
2. Verify reset token generated
3. Verify email sent (mock)
4. Use reset token to set new password
5. Verify old password no longer works
6. Verify new password works

**Logout Flow**:
1. Login user
2. Verify tokens stored
3. Logout
4. Verify tokens cleared
5. Verify API requests fail with old token

**Test Database**:
- Use separate test database
- Reset database before each test
- Use transactions for isolation
- Clean up after tests


### Property-Based Test Examples

**Property 6: Password Hashing Invariant**:
```typescript
import fc from 'fast-check';
import { AuthService } from '../services/AuthService';

describe('Feature: authentication-registration, Property 6: Password Hashing Invariant', () => {
  it('should never store passwords in plain text', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 100 }), // Generate random passwords
        async (password) => {
          const hash = await AuthService.hashPassword(password);
          
          // Hash should start with bcrypt prefix
          expect(hash).toMatch(/^\$2b\$10\$/);
          
          // Hash should never equal plain text password
          expect(hash).not.toBe(password);
          
          // Hash should be verifiable
          const isValid = await AuthService.comparePassword(password, hash);
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Property 18: Email Uniqueness Constraint**:
```typescript
import fc from 'fast-check';
import { AuthController } from '../controllers/AuthController';
import { prisma } from '../index';

describe('Feature: authentication-registration, Property 18: Email Uniqueness Constraint', () => {
  it('should reject registration with duplicate email', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(), // Generate random email
        fc.string({ minLength: 3, maxLength: 20 }), // Generate random username
        async (email, username) => {
          // Create first user
          await prisma.user.create({
            data: {
              email,
              username: username + '_1',
              password: 'hashedPassword',
              firstName: 'Test',
              lastName: 'User',
              dateOfBirth: new Date('1990-01-01'),
            },
          });
          
          // Attempt to create second user with same email
          const response = await AuthController.register({
            email,
            username: username + '_2',
            password: 'SecurePass123!',
            firstName: 'Test',
            lastName: 'User',
          });
          
          expect(response.status).toBe(409);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Property 29: Token Refresh Round Trip**:
```typescript
import fc from 'fast-check';
import { TokenService } from '../services/TokenService';

describe('Feature: authentication-registration, Property 29: Token Refresh Round Trip', () => {
  it('should successfully refresh valid tokens', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // Generate random user ID
        fc.boolean(), // Generate random rememberMe flag
        async (userId, rememberMe) => {
          // Generate initial tokens
          const accessToken = TokenService.generateAccessToken(userId);
          const refreshToken = TokenService.generateRefreshToken(userId, rememberMe);
          
          // Store refresh token
          await TokenService.storeRefreshToken(userId, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
          
          // Verify refresh token is valid
          const isValid = await TokenService.isRefreshTokenValid(refreshToken);
          expect(isValid).toBe(true);
          
          // Use refresh token to get new tokens
          const payload = TokenService.verifyRefreshToken(refreshToken);
          expect(payload).not.toBeNull();
          expect(payload?.userId).toBe(userId);
          
          // Generate new tokens
          const newAccessToken = TokenService.generateAccessToken(userId);
          const newRefreshToken = TokenService.generateRefreshToken(userId, rememberMe);
          
          // Verify new access token is valid
          const newPayload = TokenService.verifyAccessToken(newAccessToken);
          expect(newPayload).not.toBeNull();
          expect(newPayload?.userId).toBe(userId);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```


## Implementation Plan

### Phase 1: Database and Backend Foundation (Week 1)

**Database Schema**:
1. Update User model (nullable password, ssoProviders, ssoProviderIds)
2. Create RefreshToken model
3. Create PasswordResetToken model
4. Run migrations

**Backend Services**:
1. Implement AuthService (password hashing, user creation, authentication)
2. Implement TokenService (JWT generation, validation, storage)
3. Implement EmailService (password reset emails)
4. Implement RateLimiter middleware

**Testing**:
- Unit tests for all services
- Property-based tests for password hashing and token generation

### Phase 2: Backend API Endpoints (Week 2)

**Controllers and Routes**:
1. Implement AuthController
2. Create registration endpoints (manual and SSO)
3. Create login endpoints (manual and SSO)
4. Create account linking endpoint
5. Create token management endpoints (refresh, logout)
6. Create password reset endpoints

**Testing**:
- Unit tests for controllers
- Integration tests for all endpoints
- Property-based tests for uniqueness constraints and rate limiting

### Phase 3: Frontend Services (Week 3)

**Services**:
1. Enhance AuthService (API layer)
2. Implement SSOService (Apple and Google Sign In)
3. Implement ValidationService
4. Implement token storage (SecureStore for mobile, cookies for web)

**Testing**:
- Unit tests for all services
- Property-based tests for validation rules
- Mock SSO providers for testing

### Phase 4: Frontend Components (Week 4)

**Screens**:
1. Implement RegistrationScreen
2. Enhance LoginScreen (add SSO buttons, Remember Me)
3. Implement ForgotPasswordScreen
4. Implement ResetPasswordScreen

**Components**:
1. Implement AccountLinkingModal
2. Implement form components (TextInput, Button, Checkbox, SSOButton)

**Testing**:
- Component tests with React Native Testing Library
- Integration tests for complete flows

### Phase 5: Integration and Testing (Week 5)

**Integration**:
1. Connect frontend to backend
2. Test all flows end-to-end
3. Test on all platforms (iOS, Android, Web)
4. Test SSO integrations with real providers

**Testing**:
- End-to-end tests for all user flows
- Property-based tests for complete system
- Performance testing (token refresh, rate limiting)
- Security testing (password hashing, token validation)

### Phase 6: Polish and Documentation (Week 6)

**Polish**:
1. Improve error messages
2. Add loading states and animations
3. Improve accessibility
4. Optimize performance

**Documentation**:
1. API documentation
2. User documentation
3. Developer documentation
4. Deployment guide


## Deployment Considerations

### Environment Variables

**Backend**:
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/muster

# JWT
JWT_SECRET=<32+ character random string>

# Email Service
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid api key>
SMTP_FROM_EMAIL=noreply@muster.app
SMTP_FROM_NAME=Muster

# Rate Limiting (optional, for Redis)
REDIS_URL=redis://localhost:6379

# Environment
NODE_ENV=production
PORT=3000
```

**Frontend**:
```bash
# API
EXPO_PUBLIC_API_URL=https://api.muster.app

# Environment
EXPO_PUBLIC_ENVIRONMENT=production
```

### Database Migrations

**Migration Steps**:
1. Backup production database
2. Run migrations in staging environment
3. Test all authentication flows in staging
4. Run migrations in production during maintenance window
5. Monitor for errors

**Rollback Plan**:
- Keep previous schema version
- Revert migrations if issues occur
- Restore from backup if necessary

### Security Checklist

- [ ] JWT_SECRET is cryptographically secure (32+ characters)
- [ ] HTTPS is enforced on all endpoints
- [ ] HSTS header is enabled
- [ ] Rate limiting is configured correctly
- [ ] Password hashing uses bcrypt with cost factor 10
- [ ] Tokens are stored securely (SecureStore/HTTP-only cookies)
- [ ] CORS is configured correctly
- [ ] SQL injection prevention (using Prisma ORM)
- [ ] XSS prevention (input sanitization)
- [ ] CSRF prevention (SameSite cookies)

### Monitoring and Logging

**Metrics to Monitor**:
- Registration success/failure rate
- Login success/failure rate
- Token refresh success/failure rate
- Password reset request rate
- Rate limit violations
- API response times
- Error rates by endpoint

**Logging**:
- Log all authentication attempts (success and failure)
- Log rate limit violations
- Log password reset requests
- Log account linking events
- Do NOT log passwords or tokens
- Use structured logging (JSON format)

### Performance Optimization

**Database**:
- Index on User.email (unique)
- Index on User.username (unique)
- Index on RefreshToken.token
- Index on RefreshToken.userId
- Index on PasswordResetToken.token

**Caching**:
- Cache user data in Redis after authentication
- Cache rate limit data in Redis
- Set appropriate TTLs

**Token Refresh**:
- Proactive refresh 5 minutes before expiration
- Queue and batch refresh requests
- Avoid thundering herd problem


## Appendix

### Technology Stack Summary

**Frontend**:
- React Native (Expo SDK 55)
- TypeScript
- Redux Toolkit with RTK Query
- React Navigation
- expo-secure-store (mobile token storage)
- expo-apple-authentication (iOS SSO)
- expo-auth-session (Google SSO, web SSO)
- fast-check (property-based testing)
- Jest + React Native Testing Library

**Backend**:
- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- bcrypt (password hashing)
- jsonwebtoken (JWT tokens)
- express-rate-limit (rate limiting)
- nodemailer (email service)
- fast-check (property-based testing)
- Jest

### API Endpoint Summary

**Registration**:
- POST /api/auth/register - Manual registration
- POST /api/auth/register/sso - SSO registration

**Login**:
- POST /api/auth/login - Manual login
- POST /api/auth/login/sso - SSO login

**Account Linking**:
- POST /api/auth/link-account - Link SSO provider

**Token Management**:
- POST /api/auth/refresh - Refresh access token
- POST /api/auth/logout - Logout and invalidate tokens

**Password Reset**:
- POST /api/auth/forgot-password - Request password reset
- POST /api/auth/reset-password - Complete password reset

### File Structure

**Frontend**:
```
src/
├── screens/
│   └── auth/
│       ├── RegistrationScreen.tsx (new)
│       ├── LoginScreen.tsx (enhanced)
│       ├── ForgotPasswordScreen.tsx (new)
│       └── ResetPasswordScreen.tsx (new)
├── components/
│   ├── auth/
│   │   ├── AccountLinkingModal.tsx (new)
│   │   └── SSOButton.tsx (new)
│   └── forms/
│       ├── TextInput.tsx (new)
│       ├── Button.tsx (new)
│       └── Checkbox.tsx (new)
├── services/
│   ├── api/
│   │   └── AuthService.ts (enhanced)
│   └── auth/
│       ├── SSOService.ts (new)
│       └── ValidationService.ts (new)
├── types/
│   └── auth.ts (new)
└── __tests__/
    └── auth/ (new)
```

**Backend**:
```
server/
├── src/
│   ├── controllers/
│   │   └── AuthController.ts (new)
│   ├── services/
│   │   ├── AuthService.ts (new)
│   │   ├── TokenService.ts (new)
│   │   └── EmailService.ts (new)
│   ├── middleware/
│   │   ├── auth.ts (existing)
│   │   └── rateLimiter.ts (new)
│   ├── routes/
│   │   └── auth.ts (new)
│   ├── types/
│   │   └── auth.ts (new)
│   └── __tests__/
│       └── auth/ (new)
└── prisma/
    └── schema.prisma (updated)
```

### References

- [Expo SecureStore Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Expo Auth Session](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [fast-check Documentation](https://fast-check.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)

---

**Document Version**: 1.0
**Last Updated**: 2024-01-15
**Author**: Kiro AI Assistant
**Status**: Ready for Review

