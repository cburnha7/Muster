# Rate Limiter Middleware

## Overview

The Rate Limiter middleware protects authentication endpoints from brute force attacks by limiting the number of requests per IP address within a time window. This is a critical security measure that prevents malicious actors from attempting to guess passwords or overwhelm the system with registration attempts.

## Purpose

- **Prevent Brute Force Attacks**: Limit login attempts to prevent password guessing
- **Prevent Registration Spam**: Limit registration attempts to prevent fake account creation
- **Prevent Password Reset Abuse**: Limit password reset requests to prevent email flooding
- **Protect System Resources**: Prevent excessive requests from overwhelming the server

## Configuration

### Login Rate Limiter

```typescript
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window per IP
  message: 'Too many login attempts. Please try again in 15 minutes',
});
```

**Limits**: 5 requests per IP address per 15 minutes  
**Validates**: Requirements 15.1, 15.4, 15.5

### Registration Rate Limiter

```typescript
export const registrationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per window per IP
  message: 'Too many registration attempts. Please try again in 15 minutes',
});
```

**Limits**: 3 requests per IP address per 15 minutes  
**Validates**: Requirements 15.2, 15.6, 15.7

### Password Reset Rate Limiter

```typescript
export const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per window per IP
  message: 'Too many password reset requests. Please try again in 15 minutes',
});
```

**Limits**: 3 requests per IP address per 15 minutes  
**Validates**: Requirements 15.3, 15.8, 15.9

## Usage

### Applying to Routes

Import the rate limiters and apply them to your authentication routes:

```typescript
import { 
  loginRateLimiter, 
  registrationRateLimiter, 
  passwordResetRateLimiter 
} from './middleware/rateLimiter';

// Apply to login endpoint
router.post('/api/auth/login', loginRateLimiter, authController.login);

// Apply to registration endpoint
router.post('/api/auth/register', registrationRateLimiter, authController.register);

// Apply to password reset endpoint
router.post('/api/auth/forgot-password', passwordResetRateLimiter, authController.forgotPassword);
```

### Response Format

When the rate limit is exceeded, the middleware returns a 429 status code with the following JSON response:

```json
{
  "error": "Too many login attempts. Please try again in 15 minutes",
  "retryAfter": 900
}
```

**Fields**:
- `error`: Human-readable error message
- `retryAfter`: Time in seconds until the rate limit resets

### Response Headers

The middleware includes standard rate limit headers:

- `RateLimit-Limit`: Maximum number of requests allowed in the window
- `RateLimit-Remaining`: Number of requests remaining in the current window
- `RateLimit-Reset`: Timestamp when the rate limit resets

## Implementation Details

### IP Address Tracking

The rate limiter tracks requests by IP address. Each IP address has its own independent rate limit counter.

**How it works**:
1. When a request arrives, the middleware extracts the client's IP address
2. It checks how many requests this IP has made in the current time window
3. If under the limit, the request proceeds and the counter increments
4. If at or over the limit, the request is rejected with a 429 status code

### Memory Store (Development)

By default, the rate limiter uses an in-memory store to track request counts. This is suitable for development and single-server deployments.

**Characteristics**:
- Fast and simple
- No external dependencies
- Data is lost on server restart
- Not suitable for multi-server deployments

### Redis Store (Production)

For production environments with multiple servers, consider using a Redis store:

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:login:',
  }),
  message: 'Too many login attempts. Please try again in 15 minutes',
});
```

**Benefits**:
- Shared state across multiple servers
- Persistent across server restarts
- Scalable for high-traffic applications

## Security Considerations

### Why Different Limits?

**Login (5 requests)**: 
- Higher limit because legitimate users may mistype passwords
- Still low enough to prevent brute force attacks
- 5 attempts gives users reasonable flexibility

**Registration (3 requests)**:
- Lower limit because registration should be infrequent
- Prevents automated bot registration
- Legitimate users rarely need multiple attempts

**Password Reset (3 requests)**:
- Lower limit to prevent email flooding
- Prevents abuse of the email service
- Legitimate users rarely need multiple reset requests

### Bypass Considerations

**Proxy/VPN Users**: Users behind proxies or VPNs may share IP addresses. Consider:
- Monitoring for false positives
- Providing alternative authentication methods
- Implementing user-based rate limiting in addition to IP-based

**Distributed Attacks**: Attackers may use multiple IP addresses. Consider:
- Additional security measures (CAPTCHA, 2FA)
- Monitoring for suspicious patterns
- Account lockout after multiple failed attempts

## Testing

### Unit Tests

The rate limiter includes unit tests in `rateLimiter.test.ts`:

```bash
npm test -- rateLimiter.test.ts
```

### Manual Testing

Test the rate limiter manually using curl or Postman:

```bash
# Test login rate limiter (should succeed 5 times, fail on 6th)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"emailOrUsername":"test@example.com","password":"wrong"}'
  echo "\nRequest $i"
done
```

### Integration Tests

Integration tests should verify:
- Rate limit enforcement across multiple requests
- Proper 429 status code and error message
- Rate limit reset after time window expires
- Independent rate limits per IP address

## Monitoring

### Metrics to Track

- **Rate Limit Violations**: Number of 429 responses per endpoint
- **Top Violating IPs**: IP addresses with the most rate limit violations
- **False Positives**: Legitimate users hitting rate limits
- **Attack Patterns**: Coordinated attacks across multiple IPs

### Logging

Consider logging rate limit violations:

```typescript
handler: (req, res) => {
  console.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
  res.status(429).json({
    error: 'Too many login attempts. Please try again in 15 minutes',
    retryAfter: Math.ceil(req.rateLimit.resetTime! / 1000),
  });
},
```

## Troubleshooting

### Issue: Legitimate users hitting rate limits

**Solution**: 
- Review rate limit thresholds
- Consider implementing user-based rate limiting
- Provide clear error messages with retry time

### Issue: Rate limits not working in production

**Solution**:
- Verify middleware is applied to routes
- Check if reverse proxy is forwarding IP addresses correctly
- Consider using Redis store for multi-server deployments

### Issue: Rate limits reset unexpectedly

**Solution**:
- Check if server is restarting frequently
- Implement Redis store for persistent rate limit data
- Monitor server health and stability

## Requirements Validation

This middleware validates the following requirements:

- **15.1**: Login rate limit (5 requests per 15 minutes)
- **15.2**: Registration rate limit (3 requests per 15 minutes)
- **15.3**: Password reset rate limit (3 requests per 15 minutes)
- **15.4**: 429 status code for exceeded login limit
- **15.5**: Error message for exceeded login limit
- **15.6**: 429 status code for exceeded registration limit
- **15.7**: Error message for exceeded registration limit
- **15.8**: 429 status code for exceeded password reset limit
- **15.9**: Error message for exceeded password reset limit

## Related Documentation

- [Authentication Service](../services/README-AuthService.md)
- [Token Service](../services/README-TokenService.md)
- [Email Service](../services/README-EmailService.md)
- [API Routes](../routes/README-AuthRoutes.md)

## Dependencies

- `express-rate-limit`: ^7.0.0 - Rate limiting middleware for Express
- `@types/express-rate-limit`: ^6.0.0 - TypeScript types

## Future Enhancements

1. **Redis Integration**: Implement Redis store for production
2. **User-Based Rate Limiting**: Add rate limiting per user account
3. **Dynamic Rate Limits**: Adjust limits based on threat level
4. **CAPTCHA Integration**: Add CAPTCHA after multiple failed attempts
5. **Account Lockout**: Temporarily lock accounts after excessive failures
6. **Whitelist/Blacklist**: Allow bypassing rate limits for trusted IPs
