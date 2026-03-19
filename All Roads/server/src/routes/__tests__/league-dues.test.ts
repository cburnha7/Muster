/**
 * Tests for the league dues routes
 */

// --- Mock fns ---
const mockCreateLeagueDuesPayment = jest.fn();
const mockConfirmLeagueDuesPayment = jest.fn();
const mockGetLeagueDuesStatus = jest.fn();

const mockSeasonFindUnique = jest.fn();
const mockLeagueMembershipFindMany = jest.fn();

jest.mock('../../index', () => ({
  prisma: {
    season: { findUnique: (...args: any[]) => mockSeasonFindUnique(...args) },
    leagueMembership: { findMany: (...args: any[]) => mockLeagueMembershipFindMany(...args) },
  },
}));

jest.mock('../../services/dues', () => ({
  createLeagueDuesPayment: (...args: any[]) => mockCreateLeagueDuesPayment(...args),
  confirmLeagueDuesPayment: (...args: any[]) => mockConfirmLeagueDuesPayment(...args),
  getLeagueDuesStatus: (...args: any[]) => mockGetLeagueDuesStatus(...args),
}));

import { Request, Response } from 'express';
import router from '../league-dues';

/** Build a minimal Express Request */
function buildReq(overrides: Partial<Request> = {}): Partial<Request> {
  return { params: {}, body: {}, query: {}, headers: {}, ...overrides };
}

/** Build a minimal Express Response with chainable json/status */
function buildRes(): Partial<Response> & { _status: number; _json: any } {
  const res: any = { _status: 200, _json: null };
  res.status = jest.fn((code: number) => { res._status = code; return res; });
  res.json = jest.fn((data: any) => { res._json = data; return res; });
  return res;
}

/** Find and invoke a route handler from the Express router */
function findHandler(method: string, pathPattern: string) {
  const stack = (router as any).stack || [];
  for (const layer of stack) {
    if (layer.route && layer.route.methods[method] && layer.route.path === pathPattern) {
      const handlers = layer.route.stack;
      return handlers[handlers.length - 1].handle;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// POST /api/league-dues
// ---------------------------------------------------------------------------

describe('POST /api/league-dues', () => {
  const handler = findHandler('post', '/');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 if required fields are missing', async () => {
    const req = buildReq({ body: { rosterId: 'r1' } });
    const res = buildRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 201 with payment details on success', async () => {
    mockCreateLeagueDuesPayment.mockResolvedValue({
      clientSecret: 'cs_league_test',
      paymentIntentId: 'pi_league_123',
      amount: 20000,
      platformFee: 1000,
    });

    const req = buildReq({
      body: { rosterId: 'r1', leagueId: 'l1', seasonId: 's1', managerId: 'm1' },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res._json).toEqual({
      clientSecret: 'cs_league_test',
      paymentIntentId: 'pi_league_123',
      amount: 20000,
      platformFee: 1000,
    });
  });

  it('returns 404 when season not found', async () => {
    mockCreateLeagueDuesPayment.mockRejectedValue(new Error('Season not found'));

    const req = buildReq({
      body: { rosterId: 'r1', leagueId: 'l1', seasonId: 's1', managerId: 'm1' },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 when roster not found', async () => {
    mockCreateLeagueDuesPayment.mockRejectedValue(new Error('Roster not found'));

    const req = buildReq({
      body: { rosterId: 'r1', leagueId: 'l1', seasonId: 's1', managerId: 'm1' },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 when roster is already an active member', async () => {
    mockCreateLeagueDuesPayment.mockRejectedValue(
      new Error('Roster is already an active member of this season'),
    );

    const req = buildReq({
      body: { rosterId: 'r1', leagueId: 'l1', seasonId: 's1', managerId: 'm1' },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when user is not the roster manager', async () => {
    mockCreateLeagueDuesPayment.mockRejectedValue(
      new Error('User is not the manager of this roster'),
    );

    const req = buildReq({
      body: { rosterId: 'r1', leagueId: 'l1', seasonId: 's1', managerId: 'm1' },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 500 on unexpected errors', async () => {
    mockCreateLeagueDuesPayment.mockRejectedValue(new Error('Stripe exploded'));

    const req = buildReq({
      body: { rosterId: 'r1', leagueId: 'l1', seasonId: 's1', managerId: 'm1' },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// POST /api/league-dues/confirm
// ---------------------------------------------------------------------------

describe('POST /api/league-dues/confirm', () => {
  const handler = findHandler('post', '/confirm');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 if required fields are missing', async () => {
    const req = buildReq({ body: { paymentIntentId: 'pi_123' } });
    const res = buildRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns success when confirmation succeeds', async () => {
    mockConfirmLeagueDuesPayment.mockResolvedValue(undefined);

    const req = buildReq({
      body: {
        paymentIntentId: 'pi_123',
        rosterId: 'r1',
        leagueId: 'l1',
        seasonId: 's1',
      },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res._json).toEqual({ status: 'succeeded' });
    expect(mockConfirmLeagueDuesPayment).toHaveBeenCalledWith('pi_123', 'r1', 'l1', 's1');
  });

  it('returns 500 on confirmation failure', async () => {
    mockConfirmLeagueDuesPayment.mockRejectedValue(new Error('DB error'));

    const req = buildReq({
      body: {
        paymentIntentId: 'pi_123',
        rosterId: 'r1',
        leagueId: 'l1',
        seasonId: 's1',
      },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// GET /api/league-dues/status
// ---------------------------------------------------------------------------

describe('GET /api/league-dues/status', () => {
  const handler = findHandler('get', '/status');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 if query params are missing', async () => {
    const req = buildReq({ query: { rosterId: 'r1' } });
    const res = buildRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns unpaid status when roster has not paid', async () => {
    mockGetLeagueDuesStatus.mockResolvedValue({
      paid: false,
      duesAmount: 200,
      leagueName: 'Test League',
    });

    const req = buildReq({
      query: { rosterId: 'r1', leagueId: 'l1', seasonId: 's1' },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res._json).toEqual({
      paid: false,
      duesAmount: 200,
      leagueName: 'Test League',
    });
  });

  it('returns paid status when roster is active member', async () => {
    mockGetLeagueDuesStatus.mockResolvedValue({
      paid: true,
      duesAmount: 200,
      leagueName: 'Test League',
    });

    const req = buildReq({
      query: { rosterId: 'r1', leagueId: 'l1', seasonId: 's1' },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res._json).toEqual({
      paid: true,
      duesAmount: 200,
      leagueName: 'Test League',
    });
  });

  it('returns 404 when season not found', async () => {
    mockGetLeagueDuesStatus.mockRejectedValue(new Error('Season not found'));

    const req = buildReq({
      query: { rosterId: 'r1', leagueId: 'l1', seasonId: 's1' },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});


// ---------------------------------------------------------------------------
// GET /api/league-dues/league-roster-status
// ---------------------------------------------------------------------------

describe('GET /api/league-dues/league-roster-status', () => {
  const handler = findHandler('get', '/league-roster-status');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 if query params are missing', async () => {
    const req = buildReq({ query: { leagueId: 'l1' } });
    const res = buildRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when season not found', async () => {
    mockSeasonFindUnique.mockResolvedValue(null);

    const req = buildReq({ query: { leagueId: 'l1', seasonId: 's1' } });
    const res = buildRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns all rosters with their dues status', async () => {
    mockSeasonFindUnique.mockResolvedValue({
      id: 's1',
      pricingType: 'paid',
      duesAmount: 20000,
      league: { id: 'l1', pricingType: 'paid' },
    });
    mockLeagueMembershipFindMany.mockResolvedValue([
      {
        id: 'lm1', memberId: 'r1', status: 'active', memberType: 'roster',
        team: { id: 'r1', name: 'Eagles', sportType: 'basketball', imageUrl: null },
      },
      {
        id: 'lm2', memberId: 'r2', status: 'pending', memberType: 'roster',
        team: { id: 'r2', name: 'Hawks', sportType: 'basketball', imageUrl: 'img.jpg' },
      },
    ]);

    const req = buildReq({ query: { leagueId: 'l1', seasonId: 's1' } });
    const res = buildRes();
    await handler(req, res);

    expect(res._json).toEqual({
      pricingType: 'paid',
      duesAmount: 20000,
      rosters: [
        { rosterId: 'r1', rosterName: 'Eagles', sportType: 'basketball', imageUrl: null, membershipStatus: 'active', paid: true },
        { rosterId: 'r2', rosterName: 'Hawks', sportType: 'basketball', imageUrl: 'img.jpg', membershipStatus: 'pending', paid: false },
      ],
    });
  });

  it('returns empty rosters array when no memberships exist', async () => {
    mockSeasonFindUnique.mockResolvedValue({
      id: 's1',
      pricingType: 'paid',
      duesAmount: 15000,
      league: { id: 'l1', pricingType: 'paid' },
    });
    mockLeagueMembershipFindMany.mockResolvedValue([]);

    const req = buildReq({ query: { leagueId: 'l1', seasonId: 's1' } });
    const res = buildRes();
    await handler(req, res);

    expect(res._json).toEqual({
      pricingType: 'paid',
      duesAmount: 15000,
      rosters: [],
    });
  });
});
