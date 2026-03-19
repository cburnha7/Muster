# Authentication API Documentation

## Overview

This document provides comprehensive documentation for the Muster authentication API endpoints. All endpoints use JSON for request and response bodies and require HTTPS in production.

**Base URL**: `https://api.muster.app/api/auth` (production)  
**Base URL**: `http://localhost:3000/api/auth` (development)

## Table of Contents

1. [Authentication Flow](#authentication-flow)
2. [API Endpoints](#api-endpoints)
3. [Error Codes](#error-codes)
4. [Rate Limiting](#rate-limiting)
5. [Security](#security)

---

## Authentication Flow

### Manual Registration Flow
```
Client → POST /api/auth/register → Server
Server → Validate input → Hash password → Create user → Generate tokens
Server → 201 Created + { user, accessToken, refreshToken }
```

### SSO Registration Flow
```
Client → SSO Provider (Apple/Google) → Get user data + token
Client → POST /api/auth/register/sso → Server
Server → Validate SSO token → Create user → Generate tokens
Server → 201 Created + { user, accessToken, refreshToken }
```

### Login Flow
```
Client → POST /api/auth/login → Server
Server → Find user → Verify password → Generate tokens
Server → 200 OK + { user, accessToken, refreshToken }
```

### Token Refresh Flow
```
Client → POST /api/auth/refresh → Server
Server → Verify refresh token → Generate new tokens
Server → 200 OK + { accessToken, refreshToken }
```

---

## API Endpoints

### 1. Register (Manual)

Create a new user account with email and password.

**Endpoint**: `POST /api/auth/register`

**Rate Limit**: 3 requests per 15 minutes per IP

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

**Request Fields**:
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| firstName | string | Yes | Min 2 characters |
| lastName | string | Yes | Min 2 characters |
| email | string | Yes | Valid email format |
| username | string | Yes | Min 3 characters, alphanumeric/underscore/dash only |
| password | string | Yes | Min 8 characters, must contain uppercase, lowercase, number, special character |
| agreedToTerms | boolean | Yes | Must be true |

**Success Response** (201 Created):
```json
{
  "user": {
    "id": "user_123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "username": "johndoe",
    "ssoProviders": [],
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:

400 Bad Request - Validation Error:
```json
{
  "error": "Validation failed",
  "details": {
    "password": "Password must contain at least one uppercase letter"
  }
}
```

409 Conflict - Email Already Exists:
```json
{
  "error": "This email is already registered"
}
```

409 Conflict - Username Already Taken:
```json
{
  "error": "This username is taken"
}
```

429 Too Many Requests:
```json
{
  "error": "Too many registration attempts. Please try again in 15 minutes"
}
```

---

### 2. Register (SSO)

Create a new user account using Apple or Google Sign In.

**Endpoint**: `POST /api/auth/register/sso`

**Rate Limit**: 3 requests per 15 minutes per IP

**Request Body**:
```json
{
  "provider": "apple",
  "providerToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "providerUserId": "001234.abc123def456.7890",
  "email": "john.doe@privaterelay.appleid.com",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe"
}
```

**Request Fields**:
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| provider | string | Yes | Must be "apple" or "google" |
| providerToken | string | Yes | Valid SSO token from provider |
| providerUserId | string | Yes | User ID from SSO provider |
| email | string | Yes | Valid email format |
| firstName | string | Yes | Min 2 characters |
| lastName | string | Yes | Min 2 characters |
| username | string | Yes | Min 3 characters, alphanumeric/underscore/dash only |

**Success Response** (201 Created):
```json
{
  "user": {
    "id": "user_124",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@privaterelay.appleid.com",
    "username": "johndoe",
    "ssoProviders": ["apple"],
    "ssoProviderIds": {
      "apple": "001234.abc123def456.7890"
    },
    "createdAt": "2024-01-15T10:35:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:

400 Bad Request - Invalid Provider:
```json
{
  "error": "Invalid SSO provider. Must be 'apple' or 'google'"
}
```

401 Unauthorized - Invalid SSO Token:
```json
{
  "error": "Invalid SSO token"
}
```

409 Conflict - Email Already Exists:
```json
{
  "error": "This email is already registered",
  "accountLinkingRequired": true
}
```

---

### 3. Login (Manual)

Authenticate with email/username and password.

**Endpoint**: `POST /api/auth/login`

**Rate Limit**: 5 requests per 15 minutes per IP

**Request Body**:
```json
{
  "emailOrUsername": "johndoe",
  "password": "SecurePass123!",
  "rememberMe": true
}
```

**Request Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| emailOrUsername | string | Yes | Email address or username |
| password | string | Yes | User's password |
| rememberMe | boolean | No | If true, refresh token expires in 30 days instead of 7 |

**Success Response** (200 OK):
```json
{
  "user": {
    "id": "user_123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "username": "johndoe",
    "ssoProviders": [],
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:

401 Unauthorized - Invalid Credentials:
```json
{
  "error": "Invalid email or password"
}
```

429 Too Many Requests:
```json
{
  "error": "Too many login attempts. Please try again in 15 minutes"
}
```

---

### 4. Login (SSO)

Authenticate using Apple or Google Sign In.

**Endpoint**: `POST /api/auth/login/sso`

**Rate Limit**: 5 requests per 15 minutes per IP

**Request Body**:
```json
{
  "provider": "apple",
  "providerToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "providerUserId": "001234.abc123def456.7890"
}
```

**Request Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| provider | string | Yes | Must be "apple" or "google" |
| providerToken | string | Yes | Valid SSO token from provider |
| providerUserId | string | Yes | User ID from SSO provider |

**Success Response** (200 OK):
```json
{
  "user": {
    "id": "user_124",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@privaterelay.appleid.com",
    "username": "johndoe",
    "ssoProviders": ["apple"],
    "createdAt": "2024-01-15T10:35:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:

404 Not Found - No Account Found:
```json
{
  "error": "No account found with this provider"
}
```

401 Unauthorized - Invalid SSO Token:
```json
{
  "error": "Invalid SSO token"
}
```

---

### 5. Link Account

Link an SSO provider to an existing manual account.

**Endpoint**: `POST /api/auth/link-account`

**Request Body**:
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "provider": "apple",
  "providerToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "providerUserId": "001234.abc123def456.7890"
}
```

**Request Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Email of existing account |
| password | string | Yes | Password of existing account |
| provider | string | Yes | SSO provider to link ("apple" or "google") |
| providerToken | string | Yes | Valid SSO token from provider |
| providerUserId | string | Yes | User ID from SSO provider |

**Success Response** (200 OK):
```json
{
  "user": {
    "id": "user_123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "username": "johndoe",
    "ssoProviders": ["apple"],
    "ssoProviderIds": {
      "apple": "001234.abc123def456.7890"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:

401 Unauthorized - Incorrect Password:
```json
{
  "error": "Incorrect password"
}
```

404 Not Found - Email Not Found:
```json
{
  "error": "No account found with this email"
}
```

409 Conflict - Provider Already Linked:
```json
{
  "error": "This provider is already linked to your account"
}
```

---

### 6. Refresh Token

Get new access and refresh tokens using a valid refresh token.

**Endpoint**: `POST /api/auth/refresh`

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
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:

401 Unauthorized - Invalid or Expired Token:
```json
{
  "error": "Invalid or expired refresh token"
}
```

---

### 7. Logout

Invalidate the current refresh token.

**Endpoint**: `POST /api/auth/logout`

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response** (200 OK):
```json
{
  "message": "Logged out successfully"
}
```

---

### 8. Forgot Password

Request a password reset email.

**Endpoint**: `POST /api/auth/forgot-password`

**Rate Limit**: 3 requests per 15 minutes per IP

**Request Body**:
```json
{
  "email": "john.doe@example.com"
}
```

**Success Response** (200 OK):
```json
{
  "message": "If an account exists with this email, you'll receive a password reset link shortly"
}
```

**Note**: Returns same response whether email exists or not to prevent email enumeration.

**Error Responses**:

429 Too Many Requests:
```json
{
  "error": "Too many password reset requests. Please try again in 15 minutes"
}
```

---

### 9. Reset Password

Complete password reset with token from email.

**Endpoint**: `POST /api/auth/reset-password`

**Request Body**:
```json
{
  "token": "abc123def456ghi789",
  "newPassword": "NewSecurePass123!"
}
```

**Request Fields**:
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| token | string | Yes | Valid reset token from email |
| newPassword | string | Yes | Min 8 characters, must contain uppercase, lowercase, number, special character |

**Success Response** (200 OK):
```json
{
  "message": "Password reset successful"
}
```

**Error Responses**:

401 Unauthorized - Invalid or Expired Token:
```json
{
  "error": "Password reset link is invalid or expired"
}
```

400 Bad Request - Validation Error:
```json
{
  "error": "Validation failed",
  "details": {
    "newPassword": "Password must contain at least one number"
  }
}
```

---

## Error Codes

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| 400 | Bad Request | Invalid input, validation errors |
| 401 | Unauthorized | Invalid credentials, expired token |
| 404 | Not Found | User not found, resource doesn't exist |
| 409 | Conflict | Email/username already exists, provider already linked |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error, database error |
| 503 | Service Unavailable | Server temporarily unavailable |

---

## Rate Limiting

Rate limits are applied per IP address to prevent abuse:

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/auth/login | 5 requests | 15 minutes |
| POST /api/auth/login/sso | 5 requests | 15 minutes |
| POST /api/auth/register | 3 requests | 15 minutes |
| POST /api/auth/register/sso | 3 requests | 15 minutes |
| POST /api/auth/forgot-password | 3 requests | 15 minutes |

When rate limit is exceeded, the API returns:
- Status Code: 429 Too Many Requests
- Header: `Retry-After: 900` (seconds until limit resets)

---

## Security

### HTTPS
All API endpoints require HTTPS in production. HTTP requests are automatically redirected to HTTPS.

### Password Hashing
Passwords are hashed using bcrypt with a cost factor of 10 before storage.

### JWT Tokens
- **Access Token**: Expires in 15 minutes
- **Refresh Token**: Expires in 7 days (default) or 30 days (with "Remember Me")
- **Algorithm**: HS256
- **Secret**: Stored in environment variable `JWT_SECRET`

### Token Storage
- **Mobile (iOS/Android)**: Expo SecureStore (encrypted keychain/keystore)
- **Web**: Secure HTTP-only cookies with SameSite=Strict

### CORS
CORS is configured to allow requests only from authorized origins.

### Input Validation
All inputs are validated on both client and server side to prevent injection attacks.

---

## Postman Collection

A Postman collection with all endpoints and example requests is available at:
`docs/postman/muster-auth-api.postman_collection.json`

Import this collection into Postman to test the API endpoints.

---

## Support

For API support or questions, contact: dev@muster.app
