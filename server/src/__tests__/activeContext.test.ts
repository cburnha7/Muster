/**
 * Active context middleware tests.
 *
 * Tests guardian/dependent verification for X-Active-User-Id header.
 * Uses mocked Prisma to avoid database dependency.
 */

import request from 'supertest';
import { createBaseApp, generateTestToken } from './setup';
import { authMiddleware } from '../middleware/auth';
import { activeContextMiddleware } from '../middleware/activeContext';

// Mock Prisma
jest.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
  },
}));

import { prisma } from '../lib/prisma';
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function createContextTestApp() {
  const app = createBaseApp();

  app.get('/context', authMiddleware, activeContextMiddleware, (req, res) => {
    res.json({
      authUserId: req.user?.userId,
      effectiveUserId: req.effectiveUserId,
    });
  });

  return app;
}

describe('activeContextMiddleware', () => {
  const app = createContextTestApp();
  const guardianToken = generateTestToken('guardian-123');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets effectiveUserId to auth user when no X-Active-User-Id header', async () => {
    const res = await request(app)
      .get('/context')
      .set('Authorization', `Bearer ${guardianToken}`);

    expect(res.status).toBe(200);
    expect(res.body.authUserId).toBe('guardian-123');
    expect(res.body.effectiveUserId).toBe('guardian-123');
  });

  it('sets effectiveUserId to auth user when X-Active-User-Id matches auth user', async () => {
    const res = await request(app)
      .get('/context')
      .set('Authorization', `Bearer ${guardianToken}`)
      .set('X-Active-User-Id', 'guardian-123');

    expect(res.status).toBe(200);
    expect(res.body.effectiveUserId).toBe('guardian-123');
  });

  it('allows dependent context when guardian relationship exists', async () => {
    (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: 'dependent-456',
    });

    const res = await request(app)
      .get('/context')
      .set('Authorization', `Bearer ${guardianToken}`)
      .set('X-Active-User-Id', 'dependent-456');

    expect(res.status).toBe(200);
    expect(res.body.effectiveUserId).toBe('dependent-456');
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'dependent-456',
        guardianId: 'guardian-123',
        isDependent: true,
      },
      select: { id: true },
    });
  });

  it('rejects dependent context when no guardian relationship', async () => {
    (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/context')
      .set('Authorization', `Bearer ${guardianToken}`)
      .set('X-Active-User-Id', 'stranger-789');

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('dependents');
  });
});
