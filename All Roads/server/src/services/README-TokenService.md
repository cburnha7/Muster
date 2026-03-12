# TokenService Implementation

## Overview

The `TokenService` handles JWT token generation, validation, and management for the Muster authentication system. It implements a dual-token strategy with short-lived access tokens and longer-lived refresh tokens.

## Requirements Implemented

- **8.1**: Generate JWT access token with 15 minutes expiration
- **8.2**: Generate JWT refresh token with 7 days (default) or 30 days (Remember Me) expiration
- **9.2**: Support "Remember Me" functionality with 30-day refresh tokens
- **9.3**: Default refresh tokens expire in 7 days
- **25.3**: Store refresh tokens in database for validation

## Token Configuration

### Access Token
- **Expiration**: 15 minutes
- **Algorithm**: HS256
- **Payload**: `{ userId, iat, exp }`
- **Purpose**: Short-lived token for API authentication

### Refresh Token
- **Expiration**: 
  - Default: 7 days
  - Remember Me: 30 days
- **Algorithm**: HS256
- **Payload**: `{ userId, iat, exp }`
- **Storage**: Stored in database for validation
- **Purpose**: Long-lived token for obtaining new access tokens

## Environment Variables

The service requires the following environment variable:

```env
JWT_SECRET=your-secret-key-minimum-32-characters
```

**Security Requirements**:
- Minimum 32 characters
- Cryptographically secure random string
- Never commit to version control

## API Reference

### Token Generation

#### `generateAccessToken(userId: string): string`
Generates a new access token with 15-minute expiration.

```typescript
const accessToken = TokenService.generateAccessToken('user-123');
```

#### `generateRefreshToken(userId: string, rememberMe: boolean = false): string`
Generates a new refresh token with 7-day (default) or 30-day (Remember Me) expiration.

```typescript
// Default 7-day expiration
const refreshToken = TokenService.generateRefreshToken('user-123', false);

// 30-day expiration with Remember Me
const rememberMeToken = TokenService.generateRefreshToken('user-123', true);
```

### Token Validation

#### `verifyAccessToken(token: string): TokenPayload | null`
Verifies and decodes an access token. Returns `TokenPayload` if valid, `null` if invalid or expired.

```typescript
const payload = TokenService.verifyAccessToken(token);
if (payload) {
  console.log('User ID:', payload.userId);
  console.log('Expires at:', new Date(payload.exp * 1000));
}
```

#### `verifyRefreshToken(token: string): TokenPayload | null`
Verifies and decodes a refresh token. Returns `TokenPayload` if valid, `null` if invalid or expired.

```typescript
const payload = TokenService.verifyRefreshToken(token);
if (payload) {
  // Token is valid, generate new access token
  const newAccessToken = TokenService.generateAccessToken(payload.userId);
}
```

### Token Management

#### `storeRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void>`
Stores a refresh token in the database for validation.

```typescript
const refreshToken = TokenService.generateRefreshToken(userId, rememberMe);
const expiresAt = TokenService.getExpirationDate(refreshToken);
await TokenService.storeRefreshToken(userId, refreshToken, expiresAt);
```

#### `invalidateRefreshToken(token: string): Promise<void>`
Invalidates a specific refresh token (used during logout).

```typescript
await TokenService.invalidateRefreshToken(refreshToken);
```

#### `invalidateAllUserTokens(userId: string): Promise<void>`
Invalidates all refresh tokens for a user (used for security purposes).

```typescript
await TokenService.invalidateAllUserTokens(userId);
```

#### `isRefreshTokenValid(token: string): Promise<boolean>`
Checks if a refresh token is valid (exists in database and not expired).

```typescript
const isValid = await TokenService.isRefreshTokenValid(refreshToken);
if (isValid) {
  // Token is valid, proceed with refresh
}
```

#### `getExpirationDate(token: string): Date | null`
Extracts the expiration date from a JWT token.

```typescript
const expiresAt = TokenService.getExpirationDate(token);
if (expiresAt) {
  console.log('Token expires at:', expiresAt.toISOString());
}
```

## Usage Examples

### Complete Authentication Flow

```typescript
import TokenService from './services/TokenService';

// 1. User logs in successfully
const userId = 'user-123';
const rememberMe = true;

// 2. Generate tokens
const accessToken = TokenService.generateAccessToken(userId);
const refreshToken = TokenService.generateRefreshToken(userId, rememberMe);

// 3. Store refresh token in database
const expiresAt = TokenService.getExpirationDate(refreshToken);
await TokenService.storeRefreshToken(userId, refreshToken, expiresAt);

// 4. Return tokens to client
res.json({
  accessToken,
  refreshToken,
  user: { id: userId, ... }
});
```

### Token Refresh Flow

```typescript
// 1. Client sends refresh token
const { refreshToken } = req.body;

// 2. Verify refresh token
const payload = TokenService.verifyRefreshToken(refreshToken);
if (!payload) {
  return res.status(401).json({ error: 'Invalid refresh token' });
}

// 3. Check if token exists in database
const isValid = await TokenService.isRefreshTokenValid(refreshToken);
if (!isValid) {
  return res.status(401).json({ error: 'Refresh token not found or expired' });
}

// 4. Generate new tokens
const newAccessToken = TokenService.generateAccessToken(payload.userId);
const newRefreshToken = TokenService.generateRefreshToken(payload.userId, rememberMe);

// 5. Invalidate old refresh token
await TokenService.invalidateRefreshToken(refreshToken);

// 6. Store new refresh token
const expiresAt = TokenService.getExpirationDate(newRefreshToken);
await TokenService.storeRefreshToken(payload.userId, newRefreshToken, expiresAt);

// 7. Return new tokens
res.json({
  accessToken: newAccessToken,
  refreshToken: newRefreshToken
});
```

### Logout Flow

```typescript
// 1. Client sends refresh token
const { refreshToken } = req.body;

// 2. Invalidate refresh token
await TokenService.invalidateRefreshToken(refreshToken);

// 3. Return success
res.json({ message: 'Logged out successfully' });
```

### Security: Invalidate All User Tokens

```typescript
// When user changes password or security breach detected
await TokenService.invalidateAllUserTokens(userId);
```

## Testing

Run the test script to verify the TokenService implementation:

```bash
cd server
npx tsx src/scripts/test-token-service.ts
```

The test script verifies:
- Access token generation and validation
- Refresh token generation and validation
- Remember Me token generation (30 days)
- Invalid token rejection
- Expiration date extraction
- Correct expiration times (15 min, 7 days, 30 days)

## Security Considerations

1. **JWT Secret**: Must be at least 32 characters and cryptographically secure
2. **Token Storage**: Refresh tokens are stored in database for validation
3. **Token Invalidation**: Tokens can be invalidated on logout or security events
4. **Expiration**: Short-lived access tokens minimize exposure window
5. **Algorithm**: HS256 (HMAC with SHA-256) for token signing

## Database Schema

The service uses the `RefreshToken` model:

```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  userId    String

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
  @@index([expiresAt])
  @@map("refresh_tokens")
}
```

## Error Handling

The service handles the following error cases:

1. **Missing JWT_SECRET**: Throws error on initialization
2. **Invalid token**: Returns `null` from verify methods
3. **Expired token**: Returns `null` from verify methods
4. **Token not in database**: `isRefreshTokenValid` returns `false`
5. **Expired token in database**: Automatically cleaned up and returns `false`

## Integration with AuthController

The TokenService is used by the AuthController for:
- Registration: Generate tokens after user creation
- Login: Generate tokens after authentication
- Token Refresh: Validate and generate new tokens
- Logout: Invalidate refresh tokens
- Password Reset: Invalidate all tokens after password change

## Next Steps

After implementing TokenService, the following tasks should be completed:

1. **Task 1.6**: Write property tests for token generation and expiration
2. **Task 1.7**: Write unit tests for TokenService
3. **Task 3.2**: Integrate TokenService into AuthController
4. **Task 3.14**: Implement token refresh endpoint
5. **Task 3.16**: Implement logout endpoint with token invalidation
