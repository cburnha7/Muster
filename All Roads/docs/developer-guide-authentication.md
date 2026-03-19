# Authentication System - Developer Guide

## Overview

This guide provides comprehensive technical documentation for developers working with the Muster authentication system. It covers architecture, implementation details, testing strategies, and best practices.

## Table of Contents

1. [Architecture](#architecture)
2. [Data Models](#data-models)
3. [Frontend Implementation](#frontend-implementation)
4. [Backend Implementation](#backend-implementation)
5. [Testing Strategy](#testing-strategy)
6. [Security Best Practices](#security-best-practices)
7. [Environment Variables](#environment-variables)
8. [Deployment](#deployment)

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React Native)                  │
├─────────────────────────────────────────────────────────────┤
│  UI Components  │  Redux Store  │  Services  │  Navigation  │
│  - LoginScreen  │  - authSlice  │  - AuthSvc │  - Auth      │
│  - RegScreen    │  - userSlice  │  - SSOSvc  │    Stack     │
│  - ResetScreen  │               │  - ValSvc  │              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/JSON
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express.js)                      │
├─────────────────────────────────────────────────────────────┤
│  Routes  │  Controllers  │  Services  │  Middleware         │
│  - auth  │  - AuthCtrl   │  - AuthSvc │  - RateLimiter     │
│          │               │  - TokenSvc│  - ErrorHandler    │
│          │               │  - EmailSvc│  - Validator       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Prisma ORM
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL)                     │
├─────────────────────────────────────────────────────────────┤
│  Tables: User, RefreshToken, PasswordResetToken             │
└─────────────────────────────────────────────────────────────┘
```

### Authentication Flow

1. **Registration**: User → UI → Validation → API → Hash Password → DB → Generate Tokens → Store Tokens → Navigate
2. **Login**: User → UI → API → Verify Credentials → Generate Tokens → Store Tokens → Navigate
3. **Token Refresh**: App → Check Expiry → API → Verify Refresh Token → Generate New Tokens → Store → Continue
4. **Logout**: User → API → Invalidate Tokens → Clear Storage → Navigate to Login

---

## Data Models

### User Model (Prisma Schema)

```prisma
model User {
  id              String   @id @default(cuid())
  firstName       String
  lastName        String
  email           String   @unique
  username        String   @unique
  password        String?  // Nullable for SSO-only accounts
  ssoProviders    String[] // Array of provider names: ["apple", "google"]
  ssoProviderIds  Json     // Map of provider IDs: { "apple": "001234.abc...", "google": "..." }
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  refreshTokens   RefreshToken[]
  passwordResets  PasswordResetToken[]
  
  @@index([email])
  @@index([username])
}
```

### RefreshToken Model

```prisma
model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  @@index([userId])
  @@index([token])
  @@index([expiresAt])
}
```

### PasswordResetToken Model

```prisma
model PasswordResetToken {
  id        String    @id @default(cuid())
  token     String    @unique
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  used      Boolean   @default(false)
  usedAt    DateTime?
  createdAt DateTime  @default(now())
  
  @@index([userId])
  @@index([token])
  @@index([expiresAt])
}
```

---

## Frontend Implementation

### Directory Structure

```
src/
├── screens/auth/
│   ├── LoginScreen.tsx
│   ├── RegistrationScreen.tsx
│   ├── ForgotPasswordScreen.tsx
│   └── ResetPasswordScreen.tsx
├── components/
│   ├── auth/
│   │   ├── AccountLinkingModal.tsx
│   │   └── SSOButton.tsx
│   ├── forms/
│   │   ├── TextInput.tsx
│   │   ├── Button.tsx
│   │   └── Checkbox.tsx
│   └── ui/
│       ├── LoadingSpinner.tsx
│       ├── SkeletonLoader.tsx
│       ├── SuccessAnimation.tsx
│       └── ErrorAnimation.tsx
├── services/
│   ├── api/
│   │   └── AuthService.ts
│   └── auth/
│       ├── ValidationService.ts
│       ├── SSOService.ts
│       └── TokenStorage.ts
├── store/
│   └── authSlice.ts
├── constants/
│   └── errorMessages.ts
├── types/
│   └── auth.ts
└── utils/
    └── animations.ts
```

### Key Services

#### AuthService (API Layer)

```typescript
// src/services/api/AuthService.ts
class AuthService {
  private baseURL = process.env.EXPO_PUBLIC_API_URL;
  
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw await this.handleError(response);
    }
    
    const result = await response.json();
    await this.storeTokens(result.accessToken, result.refreshToken);
    return result;
  }
  
  // ... other methods
}
```

#### ValidationService

```typescript
// src/services/auth/ValidationService.ts
class ValidationService {
  validateEmail(value: string): string | null {
    if (!value || !EMAIL_REGEX.test(value.trim())) {
      return ErrorMessages.validation.email.invalid;
    }
    return null;
  }
  
  validatePassword(value: string): string | null {
    if (!value || value.length < 8) {
      return ErrorMessages.validation.password.tooShort;
    }
    // ... other validations
    return null;
  }
  
  // ... other validators
}
```

#### TokenStorage

```typescript
// src/services/auth/TokenStorage.ts
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

class TokenStorage {
  async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    if (Platform.OS === 'web') {
      // Use cookies for web
      document.cookie = `accessToken=${accessToken}; Secure; HttpOnly; SameSite=Strict`;
      document.cookie = `refreshToken=${refreshToken}; Secure; HttpOnly; SameSite=Strict`;
    } else {
      // Use SecureStore for mobile
      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
    }
  }
  
  // ... other methods
}
```

### Redux Store

```typescript
// src/store/authSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const authService = new AuthService();
      return await authService.login(
        credentials.emailOrUsername,
        credentials.password,
        credentials.rememberMe
      );
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    clearAuth: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.isLoading = false;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});
```

---

## Backend Implementation

### Directory Structure

```
server/
├── src/
│   ├── controllers/
│   │   └── AuthController.ts
│   ├── services/
│   │   ├── AuthService.ts
│   │   ├── TokenService.ts
│   │   └── EmailService.ts
│   ├── middleware/
│   │   ├── rateLimiter.ts
│   │   ├── errorHandler.ts
│   │   └── validateRequest.ts
│   ├── routes/
│   │   └── auth.ts
│   ├── types/
│   │   └── auth.ts
│   └── utils/
│       └── crypto.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── tests/
    ├── unit/
    ├── integration/
    └── property/
```

### Key Services

#### AuthService (Business Logic)

```typescript
// server/src/services/AuthService.ts
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

class AuthService {
  private prisma = new PrismaClient();
  
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }
  
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  async createUser(data: CreateUserData): Promise<User> {
    const hashedPassword = await this.hashPassword(data.password);
    
    return this.prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        username: data.username,
        password: hashedPassword,
        ssoProviders: [],
        ssoProviderIds: {},
      },
    });
  }
  
  async authenticateUser(emailOrUsername: string, password: string): Promise<User> {
    const user = await this.findUserByEmailOrUsername(emailOrUsername);
    
    if (!user || !user.password) {
      throw new Error('Invalid credentials');
    }
    
    const isValid = await this.comparePassword(password, user.password);
    
    if (!isValid) {
      throw new Error('Invalid credentials');
    }
    
    return user;
  }
  
  // ... other methods
}
```

#### TokenService

```typescript
// server/src/services/TokenService.ts
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

class TokenService {
  private prisma = new PrismaClient();
  private jwtSecret = process.env.JWT_SECRET!;
  
  generateAccessToken(userId: string): string {
    return jwt.sign(
      { userId },
      this.jwtSecret,
      { expiresIn: '15m' }
    );
  }
  
  generateRefreshToken(userId: string, rememberMe: boolean): string {
    const expiresIn = rememberMe ? '30d' : '7d';
    return jwt.sign(
      { userId },
      this.jwtSecret,
      { expiresIn }
    );
  }
  
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.jwtSecret) as TokenPayload;
    } catch {
      return null;
    }
  }
  
  async storeRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  }
  
  // ... other methods
}
```

#### EmailService

```typescript
// server/src/services/EmailService.ts
import nodemailer from 'nodemailer';

class EmailService {
  private transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetLink = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
    
    await this.transporter.sendMail({
      from: `"Muster" <${process.env.SMTP_FROM_EMAIL}>`,
      to: email,
      subject: 'Reset Your Muster Password',
      html: `
        <h1>Reset Your Password</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
  }
  
  // ... other methods
}
```

### Controllers

```typescript
// server/src/controllers/AuthController.ts
import { Request, Response } from 'express';
import AuthService from '../services/AuthService';
import TokenService from '../services/TokenService';

class AuthController {
  private authService = new AuthService();
  private tokenService = new TokenService();
  
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { firstName, lastName, email, username, password, agreedToTerms } = req.body;
      
      // Validate input
      if (!agreedToTerms) {
        res.status(400).json({ error: 'You must agree to the Terms of Service' });
        return;
      }
      
      // Check uniqueness
      const existingUser = await this.authService.findUserByEmail(email);
      if (existingUser) {
        res.status(409).json({ error: 'This email is already registered' });
        return;
      }
      
      // Create user
      const user = await this.authService.createUser({
        firstName,
        lastName,
        email,
        username,
        password,
      });
      
      // Generate tokens
      const accessToken = this.tokenService.generateAccessToken(user.id);
      const refreshToken = this.tokenService.generateRefreshToken(user.id, false);
      
      // Store refresh token
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await this.tokenService.storeRefreshToken(user.id, refreshToken, expiresAt);
      
      res.status(201).json({
        user: this.sanitizeUser(user),
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // ... other methods
}
```

### Middleware

```typescript
// server/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts. Please try again in 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

export const registrationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Too many registration attempts. Please try again in 15 minutes',
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Too many password reset requests. Please try again in 15 minutes',
});
```

---

## Testing Strategy

### Unit Tests

```typescript
// server/tests/unit/AuthService.test.ts
import AuthService from '../../src/services/AuthService';

describe('AuthService', () => {
  let authService: AuthService;
  
  beforeEach(() => {
    authService = new AuthService();
  });
  
  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'TestPass123!';
      const hash = await authService.hashPassword(password);
      
      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2b\$10\$/);
    });
  });
  
  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'TestPass123!';
      const hash = await authService.hashPassword(password);
      const isValid = await authService.comparePassword(password, hash);
      
      expect(isValid).toBe(true);
    });
    
    it('should return false for incorrect password', async () => {
      const password = 'TestPass123!';
      const hash = await authService.hashPassword(password);
      const isValid = await authService.comparePassword('WrongPass123!', hash);
      
      expect(isValid).toBe(false);
    });
  });
});
```

### Integration Tests

```typescript
// server/tests/integration/auth.test.ts
import request from 'supertest';
import app from '../../src/app';

describe('POST /api/auth/register', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        username: 'johndoe',
        password: 'SecurePass123!',
        agreedToTerms: true,
      });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body.user.email).toBe('john.doe@example.com');
  });
  
  it('should return 409 for duplicate email', async () => {
    // Create first user
    await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        username: 'johndoe',
        password: 'SecurePass123!',
        agreedToTerms: true,
      });
    
    // Try to create second user with same email
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'john.doe@example.com',
        username: 'janesmith',
        password: 'SecurePass123!',
        agreedToTerms: true,
      });
    
    expect(response.status).toBe(409);
    expect(response.body.error).toBe('This email is already registered');
  });
});
```

### Property-Based Tests

```typescript
// server/tests/property/validation.test.ts
import fc from 'fast-check';
import ValidationService from '../../src/services/auth/ValidationService';

describe('ValidationService - Property Tests', () => {
  const validationService = new ValidationService();
  
  it('should reject passwords shorter than 8 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 7 }),
        (password) => {
          const error = validationService.validatePassword(password);
          expect(error).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('should accept valid emails', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        (email) => {
          const error = validationService.validateEmail(email);
          expect(error).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

---

## Security Best Practices

### Password Security
- Use bcrypt with cost factor 10
- Never log or transmit passwords in plain text
- Enforce strong password requirements
- Hash passwords before storing

### Token Security
- Use short-lived access tokens (15 minutes)
- Use longer-lived refresh tokens (7-30 days)
- Store tokens securely (SecureStore on mobile, HTTP-only cookies on web)
- Invalidate tokens on logout
- Rotate refresh tokens on use

### API Security
- Require HTTPS in production
- Implement rate limiting
- Validate all inputs
- Use parameterized queries (Prisma ORM)
- Set secure headers (CORS, CSP, etc.)

### SSO Security
- Verify SSO tokens with provider
- Use state parameter to prevent CSRF
- Validate redirect URIs
- Store provider user IDs securely

---

## Environment Variables

### Frontend (.env)

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_ENVIRONMENT=development
```

### Backend (server/.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/muster

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@muster.app
SMTP_FROM_NAME=Muster

# App
APP_URL=http://localhost:3000

# SSO (Optional)
APPLE_CLIENT_ID=com.muster.app
APPLE_TEAM_ID=YOUR_TEAM_ID
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## Deployment

See [Deployment Guide](./deployment-guide-authentication.md) for detailed deployment instructions.

---

## Additional Resources

- [API Documentation](./authentication-api.md)
- [User Guide](./user-guide-authentication.md)
- [Deployment Guide](./deployment-guide-authentication.md)
- [Requirements Document](../.kiro/specs/authentication-registration/requirements.md)
- [Design Document](../.kiro/specs/authentication-registration/design.md)

---

**Last Updated**: January 2024  
**Version**: 1.0
