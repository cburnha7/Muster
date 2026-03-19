/**
 * Unit tests for facility cancellation policy endpoints
 *
 * Tests GET and PUT /facilities/:id/cancellation-policy
 */

const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();

jest.mock('../../index', () => ({
  prisma: {
    facility: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      update: (...args: any[]) => mockUpdate(...args),
    },
  },
}));

// Mock dependencies that the facilities router imports
jest.mock('../../services/RateCalculator', () => ({
  rateCalculator: { calculatePrice: jest.fn() },
}));
jest.mock('../../services/AvailabilityService', () => ({
  availabilityService: { isAvailable: jest.fn(), getConflicts: jest.fn() },
}));
jest.mock('../../services/VerificationService', () => ({
  verificationService: { submitVerification: jest.fn(), getVerification: jest.fn() },
}));
jest.mock('../../services/TimeSlotGeneratorService', () => ({
  TimeSlotGeneratorService: jest.fn().mockImplementation(() => ({
    regenerateSlotsAfterIncrementChange: jest.fn(),
  })),
}));
jest.mock('../../services/ImageUploadService', () => ({
  uploadMap: { single: () => (_req: any, _res: any, next: any) => next() },
  validateImageFile: jest.fn(),
  generateImageUrl: jest.fn(),
  processMapImage: jest.fn(),
  deleteImageFiles: jest.fn(),
}));

import { Request, Response } from 'express';

// We need to extract the route handlers from the router.
// Import the router after mocks are set up.
import router from '../facilities';

/** Build a minimal Express Request */
function buildReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    params: {},
    body: {},
    query: {},
    headers: {},
    ...overrides,
  };
}

/** Build a minimal Express Response with chainable json/status */
function buildRes(): Partial<Response> & { _status: number; _json: any } {
  const res: any = { _status: 200, _json: null };
  res.status = jest.fn((code: number) => { res._status = code; return res; });
  res.json = jest.fn((data: any) => { res._json = data; return res; });
  res.send = jest.fn(() => res);
  return res;
}

/**
 * Helper to find and invoke a route handler from the Express router.
 * Express stores routes in router.stack as Layer objects.
 */
function findHandler(method: string, pathPattern: string) {
  const stack = (router as any).stack || [];
  for (const layer of stack) {
    if (
      layer.route &&
      layer.route.methods[method] &&
      layer.route.path === pathPattern
    ) {
      // Return the last handler in the stack (the actual handler, not middleware)
      const handlers = layer.route.stack;
      return handlers[handlers.length - 1].handle;
    }
  }
  return null;
}

describe('GET /facilities/:id/cancellation-policy', () => {
  let handler: Function;

  beforeAll(() => {
    handler = findHandler('get', '/:id/cancellation-policy');
    expect(handler).toBeTruthy();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when facility not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const req = buildReq({ params: { id: 'nonexistent' } });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(404);
    expect(res._json.error).toBe('Facility not found');
  });

  it('returns hasPolicy: false when policy fields are null', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'fac-1',
      noticeWindowHours: null,
      teamPenaltyPct: null,
      penaltyDestination: null,
      policyVersion: null,
    });
    const req = buildReq({ params: { id: 'fac-1' } });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.hasPolicy).toBe(false);
  });

  it('returns hasPolicy: true when all policy fields are set', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'fac-1',
      noticeWindowHours: 24,
      teamPenaltyPct: 50,
      penaltyDestination: 'facility',
      policyVersion: '2025-01-01T00:00:00.000Z',
    });
    const req = buildReq({ params: { id: 'fac-1' } });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.hasPolicy).toBe(true);
    expect(res._json.noticeWindowHours).toBe(24);
    expect(res._json.teamPenaltyPct).toBe(50);
    expect(res._json.penaltyDestination).toBe('facility');
  });
});

describe('PUT /facilities/:id/cancellation-policy', () => {
  let handler: Function;

  beforeAll(() => {
    handler = findHandler('put', '/:id/cancellation-policy');
    expect(handler).toBeTruthy();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when noticeWindowHours is missing', async () => {
    const req = buildReq({
      params: { id: 'fac-1' },
      body: { teamPenaltyPct: 50, penaltyDestination: 'facility' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json.error).toContain('noticeWindowHours');
  });

  it('returns 400 when teamPenaltyPct is missing', async () => {
    const req = buildReq({
      params: { id: 'fac-1' },
      body: { noticeWindowHours: 24, penaltyDestination: 'facility' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json.error).toContain('teamPenaltyPct');
  });

  it('returns 400 when penaltyDestination is missing', async () => {
    const req = buildReq({
      params: { id: 'fac-1' },
      body: { noticeWindowHours: 24, teamPenaltyPct: 50 },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json.error).toContain('penaltyDestination');
  });

  it('returns 400 when teamPenaltyPct is out of range (> 100)', async () => {
    const req = buildReq({
      params: { id: 'fac-1' },
      body: { noticeWindowHours: 24, teamPenaltyPct: 150, penaltyDestination: 'facility' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json.error).toContain('teamPenaltyPct');
  });

  it('returns 400 when teamPenaltyPct is negative', async () => {
    const req = buildReq({
      params: { id: 'fac-1' },
      body: { noticeWindowHours: 24, teamPenaltyPct: -5, penaltyDestination: 'facility' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json.error).toContain('teamPenaltyPct');
  });

  it('returns 400 when noticeWindowHours is negative', async () => {
    const req = buildReq({
      params: { id: 'fac-1' },
      body: { noticeWindowHours: -1, teamPenaltyPct: 50, penaltyDestination: 'facility' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json.error).toContain('noticeWindowHours');
  });

  it('returns 400 for invalid penaltyDestination', async () => {
    const req = buildReq({
      params: { id: 'fac-1' },
      body: { noticeWindowHours: 24, teamPenaltyPct: 50, penaltyDestination: 'invalid' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json.error).toContain('penaltyDestination');
  });

  it('returns 404 when facility not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const req = buildReq({
      params: { id: 'nonexistent' },
      body: { noticeWindowHours: 24, teamPenaltyPct: 50, penaltyDestination: 'facility' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(404);
  });

  it('saves policy and returns updated data with policyVersion', async () => {
    mockFindUnique.mockResolvedValue({ id: 'fac-1' });
    mockUpdate.mockResolvedValue({
      id: 'fac-1',
      noticeWindowHours: 48,
      teamPenaltyPct: 25,
      penaltyDestination: 'split',
      policyVersion: '2025-06-01T00:00:00.000Z',
    });

    const req = buildReq({
      params: { id: 'fac-1' },
      body: { noticeWindowHours: 48, teamPenaltyPct: 25, penaltyDestination: 'split' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.hasPolicy).toBe(true);
    expect(res._json.noticeWindowHours).toBe(48);
    expect(res._json.teamPenaltyPct).toBe(25);
    expect(res._json.penaltyDestination).toBe('split');
    expect(res._json.policyVersion).toBeTruthy();

    // Verify prisma.facility.update was called with correct data
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'fac-1' },
        data: expect.objectContaining({
          noticeWindowHours: 48,
          teamPenaltyPct: 25,
          penaltyDestination: 'split',
          policyVersion: expect.any(String),
        }),
      })
    );
  });

  it('accepts all three valid penaltyDestination values', async () => {
    for (const dest of ['facility', 'opposing_team', 'split']) {
      jest.clearAllMocks();
      mockFindUnique.mockResolvedValue({ id: 'fac-1' });
      mockUpdate.mockResolvedValue({
        id: 'fac-1',
        noticeWindowHours: 24,
        teamPenaltyPct: 50,
        penaltyDestination: dest,
        policyVersion: '2025-06-01T00:00:00.000Z',
      });

      const req = buildReq({
        params: { id: 'fac-1' },
        body: { noticeWindowHours: 24, teamPenaltyPct: 50, penaltyDestination: dest },
      });
      const res = buildRes();

      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.penaltyDestination).toBe(dest);
    }
  });

  it('accepts boundary values: 0% penalty and 100% penalty', async () => {
    for (const pct of [0, 100]) {
      jest.clearAllMocks();
      mockFindUnique.mockResolvedValue({ id: 'fac-1' });
      mockUpdate.mockResolvedValue({
        id: 'fac-1',
        noticeWindowHours: 24,
        teamPenaltyPct: pct,
        penaltyDestination: 'facility',
        policyVersion: '2025-06-01T00:00:00.000Z',
      });

      const req = buildReq({
        params: { id: 'fac-1' },
        body: { noticeWindowHours: 24, teamPenaltyPct: pct, penaltyDestination: 'facility' },
      });
      const res = buildRes();

      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.teamPenaltyPct).toBe(pct);
    }
  });
});
