/**
 * Unit tests for paid league game scheduling in matches route.
 *
 * Tests that when a commissioner creates a match in a paid league:
 * - courtCost is required
 * - checkBalance is called against the league Connect account
 * - Match creation is blocked with shortfall when balance is insufficient
 * - Match creation succeeds when balance is sufficient
 * - Free league games do NOT run the balance check
 */

// --- Prisma mock fns ---
const mockMatchCreate = jest.fn();
const mockLeagueFindUnique = jest.fn();
const mockLeagueMembershipFindFirst = jest.fn();
const mockEventFindUnique = jest.fn();

jest.mock('../../index', () => ({
  prisma: {
    match: {
      create: (...args: any[]) => mockMatchCreate(...args),
    },
    league: {
      findUnique: (...args: any[]) => mockLeagueFindUnique(...args),
    },
    leagueMembership: {
      findFirst: (...args: any[]) => mockLeagueMembershipFindFirst(...args),
    },
    event: {
      findUnique: (...args: any[]) => mockEventFindUnique(...args),
    },
  },
}));

// --- NotificationService mock ---
const mockNotifyHomeManagerBookFacility = jest.fn().mockResolvedValue(undefined);

jest.mock('../../services/NotificationService', () => ({
  NotificationService: {
    notifyHomeManagerBookFacility: (...args: any[]) => mockNotifyHomeManagerBookFacility(...args),
  },
}));

// --- Balance service mock ---
const mockCheckBalance = jest.fn();

jest.mock('../../services/balance', () => ({
  checkBalance: (...args: any[]) => mockCheckBalance(...args),
}));

// --- League ledger service mock ---
jest.mock('../../services/league-ledger', () => ({
  recordLeagueTransaction: jest.fn().mockResolvedValue({ id: 'txn-mock' }),
}));

import { Request, Response } from 'express';
import router from '../matches';

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
 */
function findHandler(method: string, pathPattern: string) {
  const stack = (router as any).stack || [];
  for (const layer of stack) {
    if (
      layer.route &&
      layer.route.methods[method] &&
      layer.route.path === pathPattern
    ) {
      const handlers = layer.route.stack;
      return handlers[handlers.length - 1].handle;
    }
  }
  return null;
}

// --- Shared test data ---
const PAID_LEAGUE = {
  id: 'league-paid',
  name: 'Pro League',
  sportType: 'basketball',
  organizerId: 'commissioner-1',
  pricingType: 'paid',
};

const FREE_LEAGUE = {
  id: 'league-free',
  name: 'Sunday Pickup League',
  sportType: 'basketball',
  organizerId: 'commissioner-2',
  pricingType: 'free',
};

const CREATED_MATCH_PAID = {
  id: 'match-paid-1',
  leagueId: 'league-paid',
  homeTeamId: 'roster-home',
  awayTeamId: 'roster-away',
  scheduledAt: new Date('2025-08-15T18:00:00Z'),
  league: { id: 'league-paid', name: 'Pro League', sportType: 'basketball', pricingType: 'paid' },
  homeTeam: { id: 'roster-home', name: 'Court Kings', imageUrl: null },
  awayTeam: { id: 'roster-away', name: 'Hoop Dreams', imageUrl: null },
};

const CREATED_MATCH_FREE = {
  id: 'match-free-1',
  leagueId: 'league-free',
  homeTeamId: 'roster-home',
  awayTeamId: 'roster-away',
  scheduledAt: new Date('2025-08-15T18:00:00Z'),
  league: { id: 'league-free', name: 'Sunday Pickup League', sportType: 'basketball', pricingType: 'free' },
  homeTeam: { id: 'roster-home', name: 'Court Kings', imageUrl: null },
  awayTeam: { id: 'roster-away', name: 'Hoop Dreams', imageUrl: null },
};

describe('POST /api/matches — paid league balance check', () => {
  let handler: Function;

  beforeAll(() => {
    handler = findHandler('post', '/');
    expect(handler).toBeTruthy();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates match when paid league has sufficient balance', async () => {
    mockLeagueFindUnique.mockResolvedValue(PAID_LEAGUE);
    mockLeagueMembershipFindFirst.mockResolvedValue({ id: 'mem-1' });
    mockCheckBalance.mockResolvedValue({ sufficient: true, shortfall: 0 });
    mockMatchCreate.mockResolvedValue(CREATED_MATCH_PAID);

    const req = buildReq({
      body: {
        leagueId: 'league-paid',
        homeTeamId: 'roster-home',
        awayTeamId: 'roster-away',
        scheduledAt: '2025-08-15T18:00:00Z',
        userId: 'commissioner-1',
        courtCost: 8000,
      },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(201);
    expect(res._json.id).toBe('match-paid-1');
    expect(mockCheckBalance).toHaveBeenCalledWith('league-paid', 8000);
  });

  it('blocks match creation when paid league has insufficient balance', async () => {
    mockLeagueFindUnique.mockResolvedValue(PAID_LEAGUE);
    mockLeagueMembershipFindFirst.mockResolvedValue({ id: 'mem-1' });
    mockCheckBalance.mockResolvedValue({ sufficient: false, shortfall: 3500 });

    const req = buildReq({
      body: {
        leagueId: 'league-paid',
        homeTeamId: 'roster-home',
        awayTeamId: 'roster-away',
        scheduledAt: '2025-08-15T18:00:00Z',
        userId: 'commissioner-1',
        courtCost: 8000,
      },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json.error).toBe('Insufficient league balance');
    expect(res._json.shortfall).toBe(3500);
    expect(mockMatchCreate).not.toHaveBeenCalled();
  });

  it('returns 400 when courtCost is missing for a paid league', async () => {
    mockLeagueFindUnique.mockResolvedValue(PAID_LEAGUE);
    mockLeagueMembershipFindFirst.mockResolvedValue({ id: 'mem-1' });

    const req = buildReq({
      body: {
        leagueId: 'league-paid',
        homeTeamId: 'roster-home',
        awayTeamId: 'roster-away',
        scheduledAt: '2025-08-15T18:00:00Z',
        userId: 'commissioner-1',
      },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json.error).toBe('courtCost is required for paid league games');
    expect(mockCheckBalance).not.toHaveBeenCalled();
    expect(mockMatchCreate).not.toHaveBeenCalled();
  });

  it('does NOT run balance check for free league games', async () => {
    mockLeagueFindUnique.mockResolvedValue(FREE_LEAGUE);
    mockLeagueMembershipFindFirst.mockResolvedValue({ id: 'mem-1' });
    mockMatchCreate.mockResolvedValue(CREATED_MATCH_FREE);

    const req = buildReq({
      body: {
        leagueId: 'league-free',
        homeTeamId: 'roster-home',
        awayTeamId: 'roster-away',
        scheduledAt: '2025-08-15T18:00:00Z',
        userId: 'commissioner-2',
      },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(201);
    expect(mockCheckBalance).not.toHaveBeenCalled();
  });
});
