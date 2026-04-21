/**
 * Auth middleware tests.
 *
 * Tests JWT verification, token expiration, and missing auth headers.
 */

import request from 'supertest';
import {
  createBaseApp,
  generateTestToken,
  generateExpiredToken,
} from './setup';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

function createAuthTestApp() {
  const app = createBaseApp();

  // Protected endpoint
  app.get('/protected', authMiddleware, (req, res) => {
    res.json({ userId: req.user?.userId });
  });

  // Optional auth endpoint
  app.get('/optional', optionalAuthMiddleware, (req, res) => {
    res.json({ userId: req.user?.userId ?? null });
  });

  return app;
}

describe('authMiddleware', () => {
  const app = createAuthTestApp();

  it('allows request with valid JWT', async () => {
    const token = generateTestToken('user-123');
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('user-123');
  });

  it('rejects request with no auth header', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authentication required');
  });

  it('rejects request with invalid token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
  });

  it('rejects request with expired token', async () => {
    const token = generateExpiredToken('user-123');
    // Wait a tick for the token to actually expire
    await new Promise(r => setTimeout(r, 100));

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  it('rejects request with malformed auth header', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'NotBearer some-token');

    expect(res.status).toBe(401);
  });
});

describe('optionalAuthMiddleware', () => {
  const app = createAuthTestApp();

  it('sets user when valid JWT provided', async () => {
    const token = generateTestToken('user-456');
    const res = await request(app)
      .get('/optional')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('user-456');
  });

  it('proceeds without user when no auth header', async () => {
    const res = await request(app).get('/optional');
    expect(res.status).toBe(200);
    expect(res.body.userId).toBeNull();
  });

  it('proceeds without user when token is invalid', async () => {
    const res = await request(app)
      .get('/optional')
      .set('Authorization', 'Bearer bad-token');

    expect(res.status).toBe(200);
    expect(res.body.userId).toBeNull();
  });
});
