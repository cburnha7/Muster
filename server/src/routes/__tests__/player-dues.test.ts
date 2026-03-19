/**
 * Tests for the player dues routes
 */

// --- Mock fns ---
const mockSeasonFindUnique = jest.fn();
const mockPlayerDuesPaymentFindUnique = jest.fn();
const mockPlayerDuesPaymentUpdate = jest.fn();
const mockTeamMemberFindMany = jest.fn();
const mockPlayerDuesPaymentFindMany = jest.fn();

jest.mock('../../index', () => ({
  prisma: {
    season: { findUnique: (...args: any[]) => mockSeasonFindUnique(...args) },
    playerDuesPayment: {
      findUnique: (...args: any[]) => mockPlayerDuesPaymentFindUnique(...args),
      update: (...args: any[]) => mockPlayerDuesPaymentUpdate(...args),
      findMany: (...args: any[]) => mockPlayerDuesPaymentFindMany(...args),
    },
    teamMember: {
      findMany: (...args: any[]) => mockTeamMemberFindMany(...args),
    },
  },
}));

const mockCreatePlayerDuesPayment = jest.fn();
const mockConfirmPlayerDuesPayment = jest.fn();

jest.mock('../../services/dues', () => ({
  createPlayerDuesPayment: (...args: any[]) => mockCreatePlayerDuesPayment(...args),
  confirmPlayerDuesPayment: (...args: any[]) => mockConfirmPlayerDuesPayment(...args),
}));

import { Request, Response } from 'express';
import router from '../player-dues';

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
// POST /api/player-dues
// ---------------------------------------------------------------------------

describe('POST /api/player-dues', () => {
  const handler = findHandler('post', '/');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 if required fields are missing', async () => {
    const req = buildReq({ body: { playerId: 'p1' } });
    const res = buildRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 201 with payment details on success', async () => {
    mockCreatePlayerDuesPayment.mockResolvedValue({
      payment: { id: 'pay-1', amount: 5000, platformFee: 250 },
      clientSecret: 'cs_test',
    });

    const req = buildReq({
      body: { playerId: 'p1', rosterId: 'r1', seasonId: 's1' },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res._json).toEqual({
      paymentId: 'pay-1',
      clientSecret: 'cs_test',
      amount: 5000,
      platformFee: 250,
    });
  });

  it('returns 404 when season not found', async () => {
    mockCreatePlayerDuesPayment.mockRejectedValue(new Error('Season not found'));

    const req = buildReq({
      body: { playerId: 'p1', rosterId: 'r1', seasonId: 's1' },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 when dues already paid', async () => {
    mockCreatePlayerDuesPayment.mockRejectedValue(new Error('Dues already paid for this season'));

    const req = buildReq({
      body: { playerId: 'p1', rosterId: 'r1', seasonId: 's1' },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/player-dues/:paymentId/confirm
// ---------------------------------------------------------------------------

describe('POST /api/player-dues/:paymentId/confirm', () => {
  const handler = findHandler('post', '/:paymentId/confirm');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 if paymentIntentId is missing', async () => {
    const req = buildReq({ params: { paymentId: 'pay-1' }, body: {} });
    const res = buildRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 if payment not found', async () => {
    mockPlayerDuesPaymentFindUnique.mockResolvedValue(null);

    const req = buildReq({
      params: { paymentId: 'pay-1' },
      body: { paymentIntentId: 'pi_123' },
    });
    const res = buildRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 if paymentIntentId does not match', async () => {
    mockPlayerDuesPaymentFindUnique.mockResolvedValue({
      id: 'pay-1',
      stripePaymentIntentId: 'pi_other',
    });

    const req = buildReq({
      params: { paymentId: 'pay-1' },
      body: { paymentIntentId: 'pi_123' },
    });
    const res = buildRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns success when confirmation succeeds', async () => {
    mockPlayerDuesPaymentFindUnique.mockResolvedValue({
      id: 'pay-1',
      stripePaymentIntentId: 'pi_123',
    });
    mockConfirmPlayerDuesPayment.mockResolvedValue(undefined);

    const req = buildReq({
      params: { paymentId: 'pay-1' },
      body: { paymentIntentId: 'pi_123' },
    });
    const res = buildRes();
    await handler(req, res);
    expect(res._json).toEqual({ status: 'succeeded' });
  });
});

// ---------------------------------------------------------------------------
// GET /api/player-dues/status
// ---------------------------------------------------------------------------

describe('GET /api/player-dues/status', () => {
  const handler = findHandler('get', '/status');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 if query params are missing', async () => {
    const req = buildReq({ query: { playerId: 'p1' } });
    const res = buildRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns unpaid status when no payment exists', async () => {
    mockPlayerDuesPaymentFindUnique.mockResolvedValue(null);
    mockSeasonFindUnique.mockResolvedValue({ duesAmount: 50 });

    const req = buildReq({
      query: { playerId: 'p1', rosterId: 'r1', seasonId: 's1' },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res._json).toEqual({
      paid: false,
      paymentStatus: null,
      duesAmount: 50,
      paymentId: null,
    });
  });

  it('returns paid status when payment succeeded', async () => {
    mockPlayerDuesPaymentFindUnique.mockResolvedValue({
      id: 'pay-1',
      paymentStatus: 'succeeded',
    });
    mockSeasonFindUnique.mockResolvedValue({ duesAmount: 50 });

    const req = buildReq({
      query: { playerId: 'p1', rosterId: 'r1', seasonId: 's1' },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res._json).toEqual({
      paid: true,
      paymentStatus: 'succeeded',
      duesAmount: 50,
      paymentId: 'pay-1',
    });
  });
});


// ---------------------------------------------------------------------------
// GET /api/player-dues/roster-status
// ---------------------------------------------------------------------------

describe('GET /api/player-dues/roster-status', () => {
  const handler = findHandler('get', '/roster-status');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 if query params are missing', async () => {
    const req = buildReq({ query: { rosterId: 'r1' } });
    const res = buildRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns all players with their dues status', async () => {
    mockTeamMemberFindMany.mockResolvedValue([
      { userId: 'p1', role: 'captain', user: { id: 'p1', firstName: 'Alice', lastName: 'A', profileImage: null } },
      { userId: 'p2', role: 'member', user: { id: 'p2', firstName: 'Bob', lastName: 'B', profileImage: 'img.jpg' } },
      { userId: 'p3', role: 'member', user: { id: 'p3', firstName: 'Carol', lastName: 'C', profileImage: null } },
    ]);
    mockPlayerDuesPaymentFindMany.mockResolvedValue([
      { playerId: 'p1', paymentStatus: 'succeeded' },
      { playerId: 'p2', paymentStatus: 'pending' },
    ]);
    mockSeasonFindUnique.mockResolvedValue({ duesAmount: 5000 });

    const req = buildReq({ query: { rosterId: 'r1', seasonId: 's1' } });
    const res = buildRes();
    await handler(req, res);

    expect(res._json).toEqual({
      duesAmount: 5000,
      players: [
        { playerId: 'p1', firstName: 'Alice', lastName: 'A', profileImage: null, role: 'captain', paid: true, paymentStatus: 'succeeded' },
        { playerId: 'p2', firstName: 'Bob', lastName: 'B', profileImage: 'img.jpg', role: 'member', paid: false, paymentStatus: 'pending' },
        { playerId: 'p3', firstName: 'Carol', lastName: 'C', profileImage: null, role: 'member', paid: false, paymentStatus: null },
      ],
    });
  });

  it('returns empty players array when roster has no members', async () => {
    mockTeamMemberFindMany.mockResolvedValue([]);
    mockPlayerDuesPaymentFindMany.mockResolvedValue([]);
    mockSeasonFindUnique.mockResolvedValue({ duesAmount: 3000 });

    const req = buildReq({ query: { rosterId: 'r1', seasonId: 's1' } });
    const res = buildRes();
    await handler(req, res);

    expect(res._json).toEqual({
      duesAmount: 3000,
      players: [],
    });
  });

  it('returns null duesAmount when season has no dues set', async () => {
    mockTeamMemberFindMany.mockResolvedValue([
      { userId: 'p1', role: 'member', user: { id: 'p1', firstName: 'Dan', lastName: 'D', profileImage: null } },
    ]);
    mockPlayerDuesPaymentFindMany.mockResolvedValue([]);
    mockSeasonFindUnique.mockResolvedValue({ duesAmount: null });

    const req = buildReq({ query: { rosterId: 'r1', seasonId: 's1' } });
    const res = buildRes();
    await handler(req, res);

    expect(res._json.duesAmount).toBeNull();
    expect(res._json.players[0].paid).toBe(false);
  });
});
