/**
 * Unit tests for free league game scheduling in matches route.
 *
 * Tests that when a commissioner creates a match in a free league:
 * - The home roster manager is notified to book a facility
 * - Paid league matches do NOT trigger the notification
 *
 * Also tests PATCH /matches/:id/rental for assigning a rental to a match.
 */

// --- Prisma mock fns ---
const mockMatchCreate = jest.fn();
const mockMatchFindUnique = jest.fn();
const mockMatchUpdate = jest.fn();
const mockMatchCount = jest.fn();
const mockMatchFindMany = jest.fn();
const mockMatchDelete = jest.fn();
const mockLeagueFindUnique = jest.fn();
const mockLeagueMembershipFindFirst = jest.fn();
const mockLeagueMembershipUpdate = jest.fn();
const mockEventFindUnique = jest.fn();
const mockRentalFindUnique = jest.fn();

jest.mock('../../index', () => ({
  prisma: {
    match: {
      create: (...args: any[]) => mockMatchCreate(...args),
      findUnique: (...args: any[]) => mockMatchFindUnique(...args),
      findMany: (...args: any[]) => mockMatchFindMany(...args),
      update: (...args: any[]) => mockMatchUpdate(...args),
      count: (...args: any[]) => mockMatchCount(...args),
      delete: (...args: any[]) => mockMatchDelete(...args),
    },
    league: {
      findUnique: (...args: any[]) => mockLeagueFindUnique(...args),
    },
    leagueMembership: {
      findFirst: (...args: any[]) => mockLeagueMembershipFindFirst(...args),
      update: (...args: any[]) => mockLeagueMembershipUpdate(...args),
    },
    event: {
      findUnique: (...args: any[]) => mockEventFindUnique(...args),
    },
    facilityRental: {
      findUnique: (...args: any[]) => mockRentalFindUnique(...args),
    },
  },
}));

// --- NotificationService mock ---
const mockNotifyHomeManagerBookFacility = jest.fn().mockResolvedValue(undefined);
const mockNotifyAwayManagerConfirmation = jest.fn().mockResolvedValue(undefined);

jest.mock('../../services/NotificationService', () => ({
  NotificationService: {
    notifyHomeManagerBookFacility: (...args: any[]) => mockNotifyHomeManagerBookFacility(...args),
    notifyAwayManagerConfirmation: (...args: any[]) => mockNotifyAwayManagerConfirmation(...args),
  },
}));

// --- Balance service mock (prevents transitive stripe-connect import) ---
jest.mock('../../services/balance', () => ({
  checkBalance: jest.fn().mockResolvedValue({ sufficient: true, shortfall: 0 }),
}));

// --- League ledger service mock ---
const mockRecordLeagueTransaction = jest.fn().mockResolvedValue({ id: 'txn-1' });

jest.mock('../../services/league-ledger', () => ({
  recordLeagueTransaction: (...args: any[]) => mockRecordLeagueTransaction(...args),
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
const FREE_LEAGUE = {
  id: 'league-1',
  name: 'Sunday Pickup League',
  sportType: 'basketball',
  organizerId: 'commissioner-1',
  pricingType: 'free',
};

const PAID_LEAGUE = {
  id: 'league-2',
  name: 'Pro League',
  sportType: 'basketball',
  organizerId: 'commissioner-2',
  pricingType: 'paid',
};

const CREATED_MATCH = {
  id: 'match-1',
  leagueId: 'league-1',
  homeTeamId: 'roster-home',
  awayTeamId: 'roster-away',
  scheduledAt: new Date('2025-08-15T18:00:00Z'),
  league: { id: 'league-1', name: 'Sunday Pickup League', sportType: 'basketball', pricingType: 'free' },
  homeTeam: { id: 'roster-home', name: 'Court Kings', imageUrl: null },
  awayTeam: { id: 'roster-away', name: 'Hoop Dreams', imageUrl: null },
};

describe('POST /api/matches — free league notification', () => {
  let handler: Function;

  beforeAll(() => {
    handler = findHandler('post', '/');
    expect(handler).toBeTruthy();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('notifies home roster manager when match is created in a free league', async () => {
    mockLeagueFindUnique.mockResolvedValue(FREE_LEAGUE);
    mockLeagueMembershipFindFirst.mockResolvedValue({ id: 'mem-1' });
    mockMatchCreate.mockResolvedValue(CREATED_MATCH);

    const req = buildReq({
      body: {
        leagueId: 'league-1',
        homeTeamId: 'roster-home',
        awayTeamId: 'roster-away',
        scheduledAt: '2025-08-15T18:00:00Z',
        userId: 'commissioner-1',
      },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(201);
    expect(mockNotifyHomeManagerBookFacility).toHaveBeenCalledWith('match-1');
  });

  it('does NOT notify home roster manager when match is created in a paid league', async () => {
    mockLeagueFindUnique.mockResolvedValue(PAID_LEAGUE);
    mockLeagueMembershipFindFirst.mockResolvedValue({ id: 'mem-1' });
    mockMatchCreate.mockResolvedValue({
      ...CREATED_MATCH,
      leagueId: 'league-2',
      league: { id: 'league-2', name: 'Pro League', sportType: 'basketball', pricingType: 'paid' },
    });

    const req = buildReq({
      body: {
        leagueId: 'league-2',
        homeTeamId: 'roster-home',
        awayTeamId: 'roster-away',
        scheduledAt: '2025-08-15T18:00:00Z',
        userId: 'commissioner-2',
        courtCost: 8000,
      },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(201);
    expect(mockNotifyHomeManagerBookFacility).not.toHaveBeenCalled();
  });

  it('still creates the match even if notification fails', async () => {
    mockLeagueFindUnique.mockResolvedValue(FREE_LEAGUE);
    mockLeagueMembershipFindFirst.mockResolvedValue({ id: 'mem-1' });
    mockMatchCreate.mockResolvedValue(CREATED_MATCH);
    mockNotifyHomeManagerBookFacility.mockRejectedValue(new Error('notification failed'));

    const req = buildReq({
      body: {
        leagueId: 'league-1',
        homeTeamId: 'roster-home',
        awayTeamId: 'roster-away',
        scheduledAt: '2025-08-15T18:00:00Z',
        userId: 'commissioner-1',
      },
    });
    const res = buildRes();

    await handler(req, res);

    // Match creation should succeed regardless of notification failure
    expect(res._status).toBe(201);
    expect(res._json.id).toBe('match-1');
  });

  it('includes pricingType in the league select of the created match response', async () => {
    mockLeagueFindUnique.mockResolvedValue(FREE_LEAGUE);
    mockLeagueMembershipFindFirst.mockResolvedValue({ id: 'mem-1' });
    mockMatchCreate.mockResolvedValue(CREATED_MATCH);

    const req = buildReq({
      body: {
        leagueId: 'league-1',
        homeTeamId: 'roster-home',
        awayTeamId: 'roster-away',
        scheduledAt: '2025-08-15T18:00:00Z',
        userId: 'commissioner-1',
      },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._json.league.pricingType).toBe('free');
  });
});

describe('PATCH /api/matches/:id/rental — assign rental to match', () => {
  let handler: Function;

  beforeAll(() => {
    handler = findHandler('patch', '/:id/rental');
    expect(handler).toBeTruthy();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when rentalId is missing', async () => {
    const req = buildReq({
      params: { id: 'match-1' },
      body: { userId: 'user-1' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json.error).toContain('rentalId');
  });

  it('returns 404 when match not found', async () => {
    mockMatchFindUnique.mockResolvedValue(null);

    const req = buildReq({
      params: { id: 'nonexistent' },
      body: { rentalId: 'rental-1', userId: 'user-1' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(404);
    expect(res._json.error).toBe('Match not found');
  });

  it('returns 403 when user is neither home roster manager nor commissioner', async () => {
    mockMatchFindUnique.mockResolvedValue({
      id: 'match-1',
      league: { id: 'league-1', pricingType: 'free', organizerId: 'commissioner-1' },
      homeTeam: {
        id: 'roster-home',
        members: [{ userId: 'captain-1' }],
      },
    });

    const req = buildReq({
      params: { id: 'match-1' },
      body: { rentalId: 'rental-1', userId: 'random-user' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(403);
  });

  it('allows the home roster manager to assign a rental', async () => {
    mockMatchFindUnique.mockResolvedValue({
      id: 'match-1',
      league: { id: 'league-1', pricingType: 'free', organizerId: 'commissioner-1' },
      homeTeam: {
        id: 'roster-home',
        members: [{ userId: 'captain-1' }],
      },
    });
    mockRentalFindUnique.mockResolvedValue({
      id: 'rental-1',
      userId: 'captain-1',
      status: 'confirmed',
    });
    mockMatchUpdate.mockResolvedValue({
      id: 'match-1',
      rentalId: 'rental-1',
      status: 'pending_away_confirm',
      confirmationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      league: { id: 'league-1', name: 'Sunday Pickup League', sportType: 'basketball' },
      homeTeam: { id: 'roster-home', name: 'Court Kings', imageUrl: null },
      awayTeam: { id: 'roster-away', name: 'Hoop Dreams', imageUrl: null },
      rental: {
        id: 'rental-1',
        status: 'confirmed',
        totalPrice: 80,
        timeSlot: {
          date: new Date('2025-08-15'),
          startTime: '18:00',
          endTime: '19:00',
          court: {
            name: 'Court 1',
            facility: { id: 'fac-1', name: 'Downtown Gym', street: '123 Main St', city: 'Springfield' },
          },
        },
      },
    });

    const req = buildReq({
      params: { id: 'match-1' },
      body: { rentalId: 'rental-1', userId: 'captain-1' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.rentalId).toBe('rental-1');
    expect(res._json.rental.id).toBe('rental-1');
  });

  it('allows the league commissioner to assign a rental', async () => {
    mockMatchFindUnique.mockResolvedValue({
      id: 'match-1',
      league: { id: 'league-1', pricingType: 'free', organizerId: 'commissioner-1' },
      homeTeam: {
        id: 'roster-home',
        members: [{ userId: 'captain-1' }],
      },
    });
    mockRentalFindUnique.mockResolvedValue({
      id: 'rental-1',
      userId: 'captain-1',
      status: 'confirmed',
    });
    mockMatchUpdate.mockResolvedValue({
      id: 'match-1',
      rentalId: 'rental-1',
      status: 'pending_away_confirm',
      confirmationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      league: { id: 'league-1', name: 'Sunday Pickup League', sportType: 'basketball' },
      homeTeam: { id: 'roster-home', name: 'Court Kings', imageUrl: null },
      awayTeam: { id: 'roster-away', name: 'Hoop Dreams', imageUrl: null },
      rental: {
        id: 'rental-1',
        status: 'confirmed',
        totalPrice: 80,
        timeSlot: {
          date: new Date('2025-08-15'),
          startTime: '18:00',
          endTime: '19:00',
          court: {
            name: 'Court 1',
            facility: { id: 'fac-1', name: 'Downtown Gym', street: '123 Main St', city: 'Springfield' },
          },
        },
      },
    });

    const req = buildReq({
      params: { id: 'match-1' },
      body: { rentalId: 'rental-1', userId: 'commissioner-1' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.rentalId).toBe('rental-1');
  });

  it('returns 404 when rental not found', async () => {
    mockMatchFindUnique.mockResolvedValue({
      id: 'match-1',
      league: { id: 'league-1', pricingType: 'free', organizerId: 'commissioner-1' },
      homeTeam: {
        id: 'roster-home',
        members: [{ userId: 'captain-1' }],
      },
    });
    mockRentalFindUnique.mockResolvedValue(null);

    const req = buildReq({
      params: { id: 'match-1' },
      body: { rentalId: 'nonexistent', userId: 'captain-1' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(404);
    expect(res._json.error).toBe('Rental not found');
  });

  it('returns 400 when rental is not confirmed', async () => {
    mockMatchFindUnique.mockResolvedValue({
      id: 'match-1',
      league: { id: 'league-1', pricingType: 'free', organizerId: 'commissioner-1' },
      homeTeam: {
        id: 'roster-home',
        members: [{ userId: 'captain-1' }],
      },
    });
    mockRentalFindUnique.mockResolvedValue({
      id: 'rental-1',
      userId: 'captain-1',
      status: 'cancelled',
    });

    const req = buildReq({
      params: { id: 'match-1' },
      body: { rentalId: 'rental-1', userId: 'captain-1' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json.error).toContain('confirmed');
  });

  it('sets match status to pending_away_confirm and sets a 48h confirmationDeadline', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    mockMatchFindUnique.mockResolvedValue({
      id: 'match-1',
      league: { id: 'league-1', pricingType: 'free', organizerId: 'commissioner-1' },
      homeTeam: {
        id: 'roster-home',
        members: [{ userId: 'captain-1' }],
      },
    });
    mockRentalFindUnique.mockResolvedValue({
      id: 'rental-1',
      userId: 'captain-1',
      status: 'confirmed',
    });
    mockMatchUpdate.mockResolvedValue({
      id: 'match-1',
      rentalId: 'rental-1',
      status: 'pending_away_confirm',
      confirmationDeadline: new Date(now + 48 * 60 * 60 * 1000),
      league: { id: 'league-1', name: 'Sunday Pickup League', sportType: 'basketball' },
      homeTeam: { id: 'roster-home', name: 'Court Kings', imageUrl: null },
      awayTeam: { id: 'roster-away', name: 'Hoop Dreams', imageUrl: null },
      rental: { id: 'rental-1', status: 'confirmed', totalPrice: 80, timeSlot: null },
    });

    const req = buildReq({
      params: { id: 'match-1' },
      body: { rentalId: 'rental-1', userId: 'captain-1' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    // Verify the update call includes status and confirmationDeadline
    expect(mockMatchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rentalId: 'rental-1',
          status: 'pending_away_confirm',
          confirmationDeadline: new Date(now + 48 * 60 * 60 * 1000),
        }),
      })
    );

    jest.restoreAllMocks();
  });

  it('sends away roster manager a confirmation notification with venue details', async () => {
    mockMatchFindUnique.mockResolvedValue({
      id: 'match-1',
      league: { id: 'league-1', pricingType: 'free', organizerId: 'commissioner-1' },
      homeTeam: {
        id: 'roster-home',
        members: [{ userId: 'captain-1' }],
      },
    });
    mockRentalFindUnique.mockResolvedValue({
      id: 'rental-1',
      userId: 'captain-1',
      status: 'confirmed',
    });
    const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
    mockMatchUpdate.mockResolvedValue({
      id: 'match-1',
      rentalId: 'rental-1',
      status: 'pending_away_confirm',
      confirmationDeadline: deadline,
      league: { id: 'league-1', name: 'Sunday Pickup League', sportType: 'basketball' },
      homeTeam: { id: 'roster-home', name: 'Court Kings', imageUrl: null },
      awayTeam: { id: 'roster-away', name: 'Hoop Dreams', imageUrl: null },
      rental: {
        id: 'rental-1',
        status: 'confirmed',
        totalPrice: 80,
        timeSlot: {
          date: new Date('2025-08-15'),
          startTime: '18:00',
          endTime: '19:00',
          court: {
            name: 'Court 1',
            facility: { id: 'fac-1', name: 'Downtown Gym', street: '123 Main St', city: 'Springfield' },
          },
        },
      },
    });

    const req = buildReq({
      params: { id: 'match-1' },
      body: { rentalId: 'rental-1', userId: 'captain-1' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(mockNotifyAwayManagerConfirmation).toHaveBeenCalledWith(
      'match-1',
      expect.objectContaining({
        facilityName: 'Downtown Gym',
        courtName: 'Court 1',
        facilityAddress: '123 Main St, Springfield',
        startTime: '18:00',
        endTime: '19:00',
      }),
      expect.any(Date)
    );
  });

  it('does not send away notification when rental has no timeSlot data', async () => {
    mockMatchFindUnique.mockResolvedValue({
      id: 'match-1',
      league: { id: 'league-1', pricingType: 'free', organizerId: 'commissioner-1' },
      homeTeam: {
        id: 'roster-home',
        members: [{ userId: 'captain-1' }],
      },
    });
    mockRentalFindUnique.mockResolvedValue({
      id: 'rental-1',
      userId: 'captain-1',
      status: 'confirmed',
    });
    mockMatchUpdate.mockResolvedValue({
      id: 'match-1',
      rentalId: 'rental-1',
      status: 'pending_away_confirm',
      confirmationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      league: { id: 'league-1', name: 'Sunday Pickup League', sportType: 'basketball' },
      homeTeam: { id: 'roster-home', name: 'Court Kings', imageUrl: null },
      awayTeam: { id: 'roster-away', name: 'Hoop Dreams', imageUrl: null },
      rental: { id: 'rental-1', status: 'confirmed', totalPrice: 80, timeSlot: null },
    });

    const req = buildReq({
      params: { id: 'match-1' },
      body: { rentalId: 'rental-1', userId: 'captain-1' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(mockNotifyAwayManagerConfirmation).not.toHaveBeenCalled();
  });

  it('still assigns the rental even if away notification fails', async () => {
    mockMatchFindUnique.mockResolvedValue({
      id: 'match-1',
      league: { id: 'league-1', pricingType: 'free', organizerId: 'commissioner-1' },
      homeTeam: {
        id: 'roster-home',
        members: [{ userId: 'captain-1' }],
      },
    });
    mockRentalFindUnique.mockResolvedValue({
      id: 'rental-1',
      userId: 'captain-1',
      status: 'confirmed',
    });
    mockMatchUpdate.mockResolvedValue({
      id: 'match-1',
      rentalId: 'rental-1',
      status: 'pending_away_confirm',
      confirmationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      league: { id: 'league-1', name: 'Sunday Pickup League', sportType: 'basketball' },
      homeTeam: { id: 'roster-home', name: 'Court Kings', imageUrl: null },
      awayTeam: { id: 'roster-away', name: 'Hoop Dreams', imageUrl: null },
      rental: {
        id: 'rental-1',
        status: 'confirmed',
        totalPrice: 80,
        timeSlot: {
          date: new Date('2025-08-15'),
          startTime: '18:00',
          endTime: '19:00',
          court: {
            name: 'Court 1',
            facility: { id: 'fac-1', name: 'Downtown Gym', street: '123 Main St', city: 'Springfield' },
          },
        },
      },
    });
    mockNotifyAwayManagerConfirmation.mockRejectedValue(new Error('notification failed'));

    const req = buildReq({
      params: { id: 'match-1' },
      body: { rentalId: 'rental-1', userId: 'captain-1' },
    });
    const res = buildRes();

    await handler(req, res);

    // Rental assignment should succeed regardless of notification failure
    expect(res._status).toBe(200);
    expect(res._json.rentalId).toBe('rental-1');
    expect(res._json.status).toBe('pending_away_confirm');
  });
});


describe('PATCH /api/matches/:id/confirm — away roster manager confirms game', () => {
  let handler: Function;

  beforeAll(() => {
    handler = findHandler('patch', '/:id/confirm');
    expect(handler).toBeTruthy();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when userId is missing', async () => {
    const req = buildReq({
      params: { id: 'match-1' },
      body: {},
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json.error).toContain('userId');
  });

  it('returns 404 when match not found', async () => {
    mockMatchFindUnique.mockResolvedValue(null);

    const req = buildReq({
      params: { id: 'nonexistent' },
      body: { userId: 'user-1' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(404);
    expect(res._json.error).toBe('Match not found');
  });

  it('returns 400 when match is not in pending_away_confirm status', async () => {
    mockMatchFindUnique.mockResolvedValue({
      id: 'match-1',
      status: 'scheduled',
      confirmationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      awayTeam: {
        id: 'roster-away',
        members: [{ userId: 'away-captain' }],
      },
    });

    const req = buildReq({
      params: { id: 'match-1' },
      body: { userId: 'away-captain' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json.error).toContain('not awaiting away roster confirmation');
  });

  it('returns 403 when user is not the away roster manager', async () => {
    mockMatchFindUnique.mockResolvedValue({
      id: 'match-1',
      status: 'pending_away_confirm',
      confirmationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      awayTeam: {
        id: 'roster-away',
        members: [{ userId: 'away-captain' }],
      },
    });

    const req = buildReq({
      params: { id: 'match-1' },
      body: { userId: 'random-user' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(403);
    expect(res._json.error).toContain('away roster manager');
  });

  it('returns 400 when confirmation deadline has passed', async () => {
    mockMatchFindUnique.mockResolvedValue({
      id: 'match-1',
      status: 'pending_away_confirm',
      confirmationDeadline: new Date(Date.now() - 1000), // 1 second ago
      awayTeam: {
        id: 'roster-away',
        members: [{ userId: 'away-captain' }],
      },
    });

    const req = buildReq({
      params: { id: 'match-1' },
      body: { userId: 'away-captain' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json.error).toContain('deadline has passed');
  });

  it('confirms the match when away roster manager confirms within deadline', async () => {
    mockMatchFindUnique.mockResolvedValue({
      id: 'match-1',
      status: 'pending_away_confirm',
      confirmationDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      awayTeam: {
        id: 'roster-away',
        members: [{ userId: 'away-captain' }],
      },
    });
    mockMatchUpdate.mockResolvedValue({
      id: 'match-1',
      status: 'confirmed',
      league: { id: 'league-1', name: 'Sunday Pickup League', sportType: 'basketball' },
      homeTeam: { id: 'roster-home', name: 'Court Kings', imageUrl: null },
      awayTeam: { id: 'roster-away', name: 'Hoop Dreams', imageUrl: null },
    });

    const req = buildReq({
      params: { id: 'match-1' },
      body: { userId: 'away-captain' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.status).toBe('confirmed');
    expect(mockMatchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'match-1' },
        data: expect.objectContaining({
          status: 'confirmed',
        }),
      })
    );
  });

  it('works when confirmationDeadline is null (no deadline set)', async () => {
    mockMatchFindUnique.mockResolvedValue({
      id: 'match-1',
      status: 'pending_away_confirm',
      confirmationDeadline: null,
      awayTeam: {
        id: 'roster-away',
        members: [{ userId: 'away-captain' }],
      },
    });
    mockMatchUpdate.mockResolvedValue({
      id: 'match-1',
      status: 'confirmed',
      league: { id: 'league-1', name: 'Sunday Pickup League', sportType: 'basketball' },
      homeTeam: { id: 'roster-home', name: 'Court Kings', imageUrl: null },
      awayTeam: { id: 'roster-away', name: 'Hoop Dreams', imageUrl: null },
    });

    const req = buildReq({
      params: { id: 'match-1' },
      body: { userId: 'away-captain' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.status).toBe('confirmed');
  });
});


describe('PATCH /api/matches/:id/rental — paid league: confirm immediately', () => {
  let handler: Function;

  beforeAll(() => {
    handler = findHandler('patch', '/:id/rental');
    expect(handler).toBeTruthy();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets match status to confirmed immediately for paid leagues (no pending_away_confirm)', async () => {
    mockMatchFindUnique.mockResolvedValue({
      id: 'match-paid-1',
      league: { id: 'league-2', pricingType: 'paid', organizerId: 'commissioner-2' },
      homeTeam: {
        id: 'roster-home',
        members: [{ userId: 'captain-1' }],
      },
    });
    mockRentalFindUnique.mockResolvedValue({
      id: 'rental-1',
      userId: 'commissioner-2',
      status: 'confirmed',
    });
    mockMatchUpdate.mockResolvedValue({
      id: 'match-paid-1',
      rentalId: 'rental-1',
      status: 'confirmed',
      confirmationDeadline: null,
      league: { id: 'league-2', name: 'Pro League', sportType: 'basketball' },
      homeTeam: { id: 'roster-home', name: 'Court Kings', imageUrl: null },
      awayTeam: { id: 'roster-away', name: 'Hoop Dreams', imageUrl: null },
      rental: {
        id: 'rental-1',
        status: 'confirmed',
        totalPrice: 80,
        timeSlot: {
          date: new Date('2025-08-15'),
          startTime: '18:00',
          endTime: '19:00',
          court: {
            name: 'Court 1',
            facility: { id: 'fac-1', name: 'Downtown Gym', street: '123 Main St', city: 'Springfield' },
          },
        },
      },
    });

    const req = buildReq({
      params: { id: 'match-paid-1' },
      body: { rentalId: 'rental-1', userId: 'commissioner-2' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.status).toBe('confirmed');
    // Verify the update call uses 'confirmed' status with no confirmationDeadline
    expect(mockMatchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rentalId: 'rental-1',
          status: 'confirmed',
        }),
      })
    );
    // Ensure confirmationDeadline is NOT set for paid leagues
    const updateCall = mockMatchUpdate.mock.calls[0][0];
    expect(updateCall.data.confirmationDeadline).toBeUndefined();
  });

  it('does NOT send away confirmation notification for paid leagues', async () => {
    mockMatchFindUnique.mockResolvedValue({
      id: 'match-paid-1',
      league: { id: 'league-2', pricingType: 'paid', organizerId: 'commissioner-2' },
      homeTeam: {
        id: 'roster-home',
        members: [{ userId: 'captain-1' }],
      },
    });
    mockRentalFindUnique.mockResolvedValue({
      id: 'rental-1',
      userId: 'commissioner-2',
      status: 'confirmed',
    });
    mockMatchUpdate.mockResolvedValue({
      id: 'match-paid-1',
      rentalId: 'rental-1',
      status: 'confirmed',
      confirmationDeadline: null,
      league: { id: 'league-2', name: 'Pro League', sportType: 'basketball' },
      homeTeam: { id: 'roster-home', name: 'Court Kings', imageUrl: null },
      awayTeam: { id: 'roster-away', name: 'Hoop Dreams', imageUrl: null },
      rental: {
        id: 'rental-1',
        status: 'confirmed',
        totalPrice: 80,
        timeSlot: {
          date: new Date('2025-08-15'),
          startTime: '18:00',
          endTime: '19:00',
          court: {
            name: 'Court 1',
            facility: { id: 'fac-1', name: 'Downtown Gym', street: '123 Main St', city: 'Springfield' },
          },
        },
      },
    });

    const req = buildReq({
      params: { id: 'match-paid-1' },
      body: { rentalId: 'rental-1', userId: 'commissioner-2' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(mockNotifyAwayManagerConfirmation).not.toHaveBeenCalled();
  });

  it('allows the league commissioner to assign a rental in a paid league', async () => {
    mockMatchFindUnique.mockResolvedValue({
      id: 'match-paid-1',
      league: { id: 'league-2', pricingType: 'paid', organizerId: 'commissioner-2' },
      homeTeam: {
        id: 'roster-home',
        members: [{ userId: 'captain-1' }],
      },
    });
    mockRentalFindUnique.mockResolvedValue({
      id: 'rental-1',
      userId: 'commissioner-2',
      status: 'confirmed',
    });
    mockMatchUpdate.mockResolvedValue({
      id: 'match-paid-1',
      rentalId: 'rental-1',
      status: 'confirmed',
      league: { id: 'league-2', name: 'Pro League', sportType: 'basketball' },
      homeTeam: { id: 'roster-home', name: 'Court Kings', imageUrl: null },
      awayTeam: { id: 'roster-away', name: 'Hoop Dreams', imageUrl: null },
      rental: { id: 'rental-1', status: 'confirmed', totalPrice: 80, timeSlot: null },
    });

    const req = buildReq({
      params: { id: 'match-paid-1' },
      body: { rentalId: 'rental-1', userId: 'commissioner-2' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.rentalId).toBe('rental-1');
    expect(res._json.status).toBe('confirmed');
  });

  it('still sends away notification for free leagues (regression check)', async () => {
    mockMatchFindUnique.mockResolvedValue({
      id: 'match-1',
      league: { id: 'league-1', pricingType: 'free', organizerId: 'commissioner-1' },
      homeTeam: {
        id: 'roster-home',
        members: [{ userId: 'captain-1' }],
      },
    });
    mockRentalFindUnique.mockResolvedValue({
      id: 'rental-1',
      userId: 'captain-1',
      status: 'confirmed',
    });
    const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
    mockMatchUpdate.mockResolvedValue({
      id: 'match-1',
      rentalId: 'rental-1',
      status: 'pending_away_confirm',
      confirmationDeadline: deadline,
      league: { id: 'league-1', name: 'Sunday Pickup League', sportType: 'basketball' },
      homeTeam: { id: 'roster-home', name: 'Court Kings', imageUrl: null },
      awayTeam: { id: 'roster-away', name: 'Hoop Dreams', imageUrl: null },
      rental: {
        id: 'rental-1',
        status: 'confirmed',
        totalPrice: 80,
        timeSlot: {
          date: new Date('2025-08-15'),
          startTime: '18:00',
          endTime: '19:00',
          court: {
            name: 'Court 1',
            facility: { id: 'fac-1', name: 'Downtown Gym', street: '123 Main St', city: 'Springfield' },
          },
        },
      },
    });

    const req = buildReq({
      params: { id: 'match-1' },
      body: { rentalId: 'rental-1', userId: 'captain-1' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.status).toBe('pending_away_confirm');
    expect(mockNotifyAwayManagerConfirmation).toHaveBeenCalled();
  });
});


describe('PATCH /api/matches/:id/rental — paid league: league ledger recording', () => {
  let handler: Function;

  beforeAll(() => {
    handler = findHandler('patch', '/:id/rental');
    expect(handler).toBeTruthy();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records court cost transaction in the league ledger when paid league game is confirmed', async () => {
    mockMatchFindUnique.mockResolvedValue({
      id: 'match-paid-1',
      seasonId: 'season-1',
      league: { id: 'league-2', pricingType: 'paid', organizerId: 'commissioner-2' },
      homeTeam: {
        id: 'roster-home',
        members: [{ userId: 'captain-1' }],
      },
    });
    mockRentalFindUnique.mockResolvedValue({
      id: 'rental-1',
      userId: 'commissioner-2',
      status: 'confirmed',
      totalPrice: 8000,
      timeSlot: {
        court: {
          facility: { id: 'fac-1' },
        },
      },
    });
    mockMatchUpdate.mockResolvedValue({
      id: 'match-paid-1',
      rentalId: 'rental-1',
      status: 'confirmed',
      league: { id: 'league-2', name: 'Pro League', sportType: 'basketball' },
      homeTeam: { id: 'roster-home', name: 'Court Kings', imageUrl: null },
      awayTeam: { id: 'roster-away', name: 'Hoop Dreams', imageUrl: null },
      rental: { id: 'rental-1', status: 'confirmed', totalPrice: 8000, timeSlot: null },
    });

    const req = buildReq({
      params: { id: 'match-paid-1' },
      body: { rentalId: 'rental-1', userId: 'commissioner-2' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(mockRecordLeagueTransaction).toHaveBeenCalledWith({
      leagueId: 'league-2',
      seasonId: 'season-1',
      type: 'court_cost',
      amount: -8000,
      description: 'Court cost for Court Kings vs Hoop Dreams',
      facilityId: 'fac-1',
      rentalId: 'rental-1',
      matchId: 'match-paid-1',
    });
  });

  it('does NOT record a ledger transaction for free league games', async () => {
    mockMatchFindUnique.mockResolvedValue({
      id: 'match-1',
      seasonId: 'season-1',
      league: { id: 'league-1', pricingType: 'free', organizerId: 'commissioner-1' },
      homeTeam: {
        id: 'roster-home',
        members: [{ userId: 'captain-1' }],
      },
    });
    mockRentalFindUnique.mockResolvedValue({
      id: 'rental-1',
      userId: 'captain-1',
      status: 'confirmed',
      totalPrice: 8000,
      timeSlot: {
        court: {
          facility: { id: 'fac-1' },
        },
      },
    });
    mockMatchUpdate.mockResolvedValue({
      id: 'match-1',
      rentalId: 'rental-1',
      status: 'pending_away_confirm',
      confirmationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      league: { id: 'league-1', name: 'Sunday Pickup League', sportType: 'basketball' },
      homeTeam: { id: 'roster-home', name: 'Court Kings', imageUrl: null },
      awayTeam: { id: 'roster-away', name: 'Hoop Dreams', imageUrl: null },
      rental: { id: 'rental-1', status: 'confirmed', totalPrice: 8000, timeSlot: null },
    });

    const req = buildReq({
      params: { id: 'match-1' },
      body: { rentalId: 'rental-1', userId: 'captain-1' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(mockRecordLeagueTransaction).not.toHaveBeenCalled();
  });

  it('does NOT record a ledger transaction when match has no seasonId', async () => {
    mockMatchFindUnique.mockResolvedValue({
      id: 'match-paid-1',
      seasonId: null,
      league: { id: 'league-2', pricingType: 'paid', organizerId: 'commissioner-2' },
      homeTeam: {
        id: 'roster-home',
        members: [{ userId: 'captain-1' }],
      },
    });
    mockRentalFindUnique.mockResolvedValue({
      id: 'rental-1',
      userId: 'commissioner-2',
      status: 'confirmed',
      totalPrice: 8000,
      timeSlot: {
        court: {
          facility: { id: 'fac-1' },
        },
      },
    });
    mockMatchUpdate.mockResolvedValue({
      id: 'match-paid-1',
      rentalId: 'rental-1',
      status: 'confirmed',
      league: { id: 'league-2', name: 'Pro League', sportType: 'basketball' },
      homeTeam: { id: 'roster-home', name: 'Court Kings', imageUrl: null },
      awayTeam: { id: 'roster-away', name: 'Hoop Dreams', imageUrl: null },
      rental: { id: 'rental-1', status: 'confirmed', totalPrice: 8000, timeSlot: null },
    });

    const req = buildReq({
      params: { id: 'match-paid-1' },
      body: { rentalId: 'rental-1', userId: 'commissioner-2' },
    });
    const res = buildRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(mockRecordLeagueTransaction).not.toHaveBeenCalled();
  });
});
