/**
 * Test setup — creates a testable Express app and JWT helpers.
 *
 * Usage in tests:
 *   import { createTestApp, generateTestToken } from './setup';
 *   const app = createTestApp();
 *   const token = generateTestToken('user-id-123');
 *   const res = await request(app).get('/api/events').set('Authorization', `Bearer ${token}`);
 */

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const TEST_JWT_SECRET = 'test-secret-for-jest-only';

// Override JWT_SECRET before importing routes
process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.NODE_ENV = 'test';
process.env.MEMBERSHIPS_ENABLED = 'false';

/**
 * Generate a valid JWT for testing.
 */
export function generateTestToken(userId: string, expiresIn = '1h'): string {
  return jwt.sign({ userId }, TEST_JWT_SECRET, { expiresIn });
}

/**
 * Generate an expired JWT for testing token refresh flows.
 */
export function generateExpiredToken(userId: string): string {
  return jwt.sign({ userId }, TEST_JWT_SECRET, { expiresIn: '0s' });
}

/**
 * Create a minimal Express app with JSON parsing and CORS.
 * Routes are NOT mounted — tests mount only what they need.
 */
export function createBaseApp(): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  return app;
}
