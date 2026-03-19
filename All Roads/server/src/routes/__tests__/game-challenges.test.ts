/**
 * Tests for the game challenge routes
 */

// --- Mock fns ---
const mockTeamMemberFindFirst = jest.fn();
const mockTeamFindUnique = jest.fn();
const mockFacilityFindUnique = jest.fn();
const mockFacilityCourtFindUnique = jest.fn();
const mockFacilityTimeSlotFindUnique = jest.fn();
const mockBookingCreate = jest.fn();
const mockBookingUpdate = jest.fn();
const mockBookingFindUnique = jest.fn();
const mockBookingParticipantCreate = jest.fn();
const mockBookingParticipantUpdate = jest.fn();
const mockBookingParticipantFindMany = jest.fn();

jest.mock('../../index', () => ({
  prisma: {
    teamMember: { findFirst: (...args: any[]) => mockTeamMemberFindFirst(...args) },
    team: { findUnique: (...args: any[]) => mockTeamFindUnique(...args) },
    facility: { findUnique: (...args: any[]) => mockFacilityFindUnique(...args) },
    facilityCourt: { findUnique: (...args: any[]) => mockFacilityCourtFindUnique(...args) },
    facilityTimeSlot: { findUnique: (...args: any[]) => mockFacilityTimeSlotFindUnique(...args) },
    booking: {
      create: (...args: any[]) => mockBookingCreate(...args),
      update: (...args: any[]) => mockBookingUpdate(...args),
      findUnique: (...args: any[]) => mockBookingFindUnique(...args),
    },
    bookingParticipant: {
      create: (...args: any[]) => mockBookingParticipantCreate(...args),
      update: (...args: any[]) => mockBookingParticipantUpdate(...args),
      findMany: (...args: any[]) => mockBookingParticipantFindMany(...args),
    },
    $transaction: (fn: any) => fn({
      booking: {
        create: (...args: any[]) => mockBookingCreate(...args),
        update: (...args: any[]) => mockBookingUpdate(...args),
      },
      bookingParticipant: {
        create: (...args: any[]) => mockBookingParticipantCreate(...args),
        update: (...args: any[]) => mockBookingParticipantUpdate(...args),
      },
    }),
  },
}));

const mockCheckBalance = jest.fn();
jest.mock('../../services/balance', () => ({
  checkBalance: (...args: any[]) => mockCheckBalance(...args),
}));

const mockCreateEscrowIntent = jest.fn();
const mockCaptureEscrow = jest.fn();
const mockReleaseEscrow = jest.fn();
jest.mock('../../services/escrow', () => ({
  createEscrowIntent: (...args: any[]) => mockCreateEscrowIntent(...args),
  captureEscrow: (...args: any[]) => mockCaptureEscrow(...args),
  releaseEscrow: (...args: any[]) => mockReleaseEscrow(...args),
}));

import { Request, Response } from 'express';
import router from '../game-challenges';

/** Build a minimal Express Request */
function buildReq(overrides: Partial<Request> = {}): Partial<Request> {
  return { params: {}, body: {}, query: {}, headers: {}, ...overrides };
}

/** Build a minimal Express Response with chainable json/status */
function buildRes(): Partial<Response> & { _status: number; _json: any } {
  const res: any = { _status: 200, _json: null };
  res.status = jest.fn((code: number) => { res._status = code; return res; });
  res.json = jest.fn((data: any) => { res._json = data; return res; });
  res.send = jest.fn(() => res);
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

const validBody = {
  userId: 'user-1',
  challengerRosterId: 'roster-home',
  opponentRosterId: 'roster-away',
  facilityId: 'facility-1',
  courtId: 'court-1',
  timeSlotId: 'slot-1',
};

function setupHappyPath() {
  mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-1', userId: 'user-1', teamId: 'roster-home', role: 'captain' });
  mockTeamFindUnique
    .mockResolvedValueOnce({ id: 'roster-home', name: 'Home Roster', stripeAccountId: 'acct_home' })
    .mockResolvedValueOnce({ id: 'roster-away', name: 'Away Roster', stripeAccountId: 'acct_away' });
  mockFacilityFindUnique.mockResolvedValue({ id: 'facility-1', name: 'Test Facility', stripeConnectAccountId: 'acct_fac' });
  mockFacilityCourtFindUnique.mockResolvedValue({ id: 'court-1', name: 'Court A', facilityId: 'facility-1', isActive: true });
  mockFacilityTimeSlotFindUnique.mockResolvedValue({
    id: 'slot-1', courtId: 'court-1', date: '2025-08-01', startTime: '10:00', endTime: '11:00', status: 'available', price: 100,
  });
  mockBookingCreate.mockResolvedValue({ id: 'booking-1', status: 'pending_away_confirm' });
  mockBookingUpdate.mockResolvedValue({ id: 'booking-1' });
  mockBookingParticipantCreate
    .mockResolvedValueOnce({ id: 'bp-home', role: 'home', escrowAmount: 5000 })
    .mockResolvedValueOnce({ id: 'bp-away', role: 'away', escrowAmount: 5000 });
  mockBookingFindUnique.mockResolvedValue({
    id: 'booking-1', status: 'pending_away_confirm', bookingType: 'game_challenge',
    totalPrice: 100, bookingHostType: 'roster_manager', bookingHostId: 'roster-home',
    facility: { id: 'facility-1', name: 'Test Facility', street: '123 Main', city: 'Springfield' },
    court: { id: 'court-1', name: 'Court A', sportType: 'basketball' },
    participants: [
      { id: 'bp-home', rosterId: 'roster-home', role: 'home', escrowAmount: 5000, paymentStatus: 'pending', confirmationDeadline: new Date() },
      { id: 'bp-away', rosterId: 'roster-away', role: 'away', escrowAmount: 5000, paymentStatus: 'pending', confirmationDeadline: new Date() },
    ],
  });
}

beforeEach(() => { jest.clearAllMocks(); });

describe('POST /api/game-challenges', () => {
  const handler = findHandler('post', '/');

  it('returns 400 when required fields are missing', async () => {
    const req = buildReq({ body: { userId: 'user-1' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/Missing required fields/);
  });

  it('returns 400 when challenging own roster', async () => {
    const req = buildReq({ body: { ...validBody, opponentRosterId: 'roster-home' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/Cannot challenge your own roster/);
  });

  it('returns 403 when user is not the roster manager', async () => {
    mockTeamMemberFindFirst.mockResolvedValue(null);
    const req = buildReq({ body: validBody });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(403);
  });

  it('returns 404 when challenger roster not found', async () => {
    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-1' });
    mockTeamFindUnique.mockResolvedValueOnce(null);
    const req = buildReq({ body: validBody });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(404);
    expect(res._json.error).toMatch(/Challenger roster not found/);
  });

  it('returns 400 when challenger has no Stripe account', async () => {
    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-1' });
    mockTeamFindUnique
      .mockResolvedValueOnce({ id: 'roster-home', name: 'Home', stripeAccountId: null })
      .mockResolvedValueOnce({ id: 'roster-away', name: 'Away', stripeAccountId: 'acct_away' });
    const req = buildReq({ body: validBody });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/Stripe Connect onboarding/);
  });

  it('returns 400 when time slot is not available', async () => {
    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-1' });
    mockTeamFindUnique
      .mockResolvedValueOnce({ id: 'roster-home', name: 'Home', stripeAccountId: 'acct_home' })
      .mockResolvedValueOnce({ id: 'roster-away', name: 'Away', stripeAccountId: 'acct_away' });
    mockFacilityFindUnique.mockResolvedValue({ id: 'facility-1', stripeConnectAccountId: 'acct_fac' });
    mockFacilityCourtFindUnique.mockResolvedValue({ id: 'court-1', facilityId: 'facility-1', isActive: true });
    mockFacilityTimeSlotFindUnique.mockResolvedValue({ id: 'slot-1', courtId: 'court-1', status: 'rented', price: 100 });
    const req = buildReq({ body: validBody });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/not available/);
  });

  it('creates a game challenge with 50/50 split and pending_away_confirm', async () => {
    setupHappyPath();
    const req = buildReq({ body: validBody });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(201);
    expect(res._json.status).toBe('pending_away_confirm');
    expect(res._json.bookingType).toBe('game_challenge');
    expect(res._json.participants).toHaveLength(2);

    // Booking created with correct host fields
    expect(mockBookingCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'pending_away_confirm',
        bookingType: 'game_challenge',
        bookingHostType: 'roster_manager',
        bookingHostId: 'roster-home',
      }),
    }));

    // Two participants created
    expect(mockBookingParticipantCreate).toHaveBeenCalledTimes(2);
  });

  it('sets stripeTransferGroup to the booking ID', async () => {
    setupHappyPath();
    const req = buildReq({ body: validBody });
    const res = buildRes();
    await handler(req, res);

    expect(mockBookingUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'booking-1' },
      data: { stripeTransferGroup: 'booking-1' },
    }));
  });

  it('sets a 48h confirmation deadline on participants', async () => {
    setupHappyPath();
    const before = Date.now();
    const req = buildReq({ body: validBody });
    const res = buildRes();
    await handler(req, res);
    const after = Date.now();

    const expectedMin = before + 48 * 60 * 60 * 1000;
    const expectedMax = after + 48 * 60 * 60 * 1000;

    const calls = mockBookingParticipantCreate.mock.calls;
    for (const call of calls) {
      const deadline = call[0].data.confirmationDeadline;
      expect(deadline.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(deadline.getTime()).toBeLessThanOrEqual(expectedMax);
    }
  });

  it('handles odd-cent court costs correctly (total preserved)', async () => {
    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-1' });
    mockTeamFindUnique
      .mockResolvedValueOnce({ id: 'roster-home', name: 'Home', stripeAccountId: 'acct_home' })
      .mockResolvedValueOnce({ id: 'roster-away', name: 'Away', stripeAccountId: 'acct_away' });
    mockFacilityFindUnique.mockResolvedValue({ id: 'facility-1', stripeConnectAccountId: 'acct_fac' });
    mockFacilityCourtFindUnique.mockResolvedValue({ id: 'court-1', facilityId: 'facility-1', isActive: true });
    mockFacilityTimeSlotFindUnique.mockResolvedValue({
      id: 'slot-1', courtId: 'court-1', status: 'available', price: 99.99,
      date: '2025-08-01', startTime: '10:00', endTime: '11:00',
    });
    mockBookingCreate.mockResolvedValue({ id: 'booking-2' });
    mockBookingUpdate.mockResolvedValue({ id: 'booking-2' });
    mockBookingParticipantCreate.mockResolvedValue({ id: 'bp-1' });
    mockBookingFindUnique.mockResolvedValue({
      id: 'booking-2', status: 'pending_away_confirm', bookingType: 'game_challenge',
      totalPrice: 99.99, facility: {}, court: {}, participants: [],
    });

    const req = buildReq({ body: validBody });
    const res = buildRes();
    await handler(req, res);

    const calls = mockBookingParticipantCreate.mock.calls;
    const homeAmount = calls[0][0].data.escrowAmount;
    const awayAmount = calls[1][0].data.escrowAmount;
    expect(homeAmount + awayAmount).toBe(9999);
  });
});

describe('GET /api/game-challenges/:bookingId', () => {
  const handler = findHandler('get', '/:bookingId');

  it('returns 404 when booking not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);
    const req = buildReq({ params: { bookingId: 'nonexistent' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(404);
  });

  it('returns 400 when booking is not a game challenge', async () => {
    mockBookingFindUnique.mockResolvedValue({ id: 'booking-1', bookingType: 'regular' });
    const req = buildReq({ params: { bookingId: 'booking-1' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/not a game challenge/);
  });

  it('returns the game challenge when found', async () => {
    mockBookingFindUnique.mockResolvedValue({
      id: 'booking-1', bookingType: 'game_challenge', status: 'pending_away_confirm', participants: [],
    });
    const req = buildReq({ params: { bookingId: 'booking-1' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._json.id).toBe('booking-1');
  });
});

describe('POST /api/game-challenges/:bookingId/accept', () => {
  const handler = findHandler('post', '/:bookingId/accept');

  const pendingBooking = {
    id: 'booking-1',
    bookingType: 'game_challenge',
    status: 'pending_away_confirm',
    participants: [
      { id: 'bp-home', rosterId: 'roster-home', role: 'home', escrowAmount: 5000, paymentStatus: 'pending', confirmationDeadline: new Date(Date.now() + 86400000) },
      { id: 'bp-away', rosterId: 'roster-away', role: 'away', escrowAmount: 5000, paymentStatus: 'pending', confirmationDeadline: new Date(Date.now() + 86400000) },
    ],
  };

  function setupAcceptHappyPath() {
    // First call: booking lookup with participants
    mockBookingFindUnique
      .mockResolvedValueOnce(pendingBooking)
      // Second call: full booking after update
      .mockResolvedValueOnce({
        ...pendingBooking,
        status: 'escrow_collecting',
        facility: { id: 'facility-1', name: 'Test Facility', street: '123 Main', city: 'Springfield' },
        court: { id: 'court-1', name: 'Court A', sportType: 'basketball' },
        participants: pendingBooking.participants,
      });

    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-away', userId: 'user-away', teamId: 'roster-away', role: 'captain' });

    mockTeamFindUnique
      .mockResolvedValueOnce({ id: 'roster-home', name: 'Home Roster', stripeAccountId: 'acct_home' })
      .mockResolvedValueOnce({ id: 'roster-away', name: 'Away Roster', stripeAccountId: 'acct_away' });

    mockCheckBalance
      .mockResolvedValueOnce({ sufficient: true, shortfall: 0 })
      .mockResolvedValueOnce({ sufficient: true, shortfall: 0 });

    mockBookingUpdate.mockResolvedValue({ id: 'booking-1', status: 'escrow_collecting' });
    mockBookingParticipantUpdate.mockResolvedValue({ id: 'bp-away' });
  }

  it('returns 400 when userId is missing', async () => {
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: {} });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/Missing required fields/);
  });

  it('returns 404 when booking not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);
    const req = buildReq({ params: { bookingId: 'nonexistent' }, body: { userId: 'user-away' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(404);
  });

  it('returns 400 when booking is not a game challenge', async () => {
    mockBookingFindUnique.mockResolvedValue({ id: 'booking-1', bookingType: 'regular', status: 'confirmed', participants: [] });
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-away' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/not a game challenge/);
  });

  it('returns 400 when booking is not pending acceptance', async () => {
    mockBookingFindUnique.mockResolvedValue({ ...pendingBooking, status: 'confirmed' });
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-away' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/not pending acceptance/);
  });

  it('returns 403 when user is not the opponent roster manager', async () => {
    mockBookingFindUnique.mockResolvedValue(pendingBooking);
    mockTeamMemberFindFirst.mockResolvedValue(null);
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'random-user' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(403);
  });

  it('returns 402 when home roster has insufficient balance', async () => {
    mockBookingFindUnique.mockResolvedValue(pendingBooking);
    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-away', role: 'captain' });
    mockTeamFindUnique
      .mockResolvedValueOnce({ id: 'roster-home', name: 'Home Roster', stripeAccountId: 'acct_home' })
      .mockResolvedValueOnce({ id: 'roster-away', name: 'Away Roster', stripeAccountId: 'acct_away' });
    mockCheckBalance
      .mockResolvedValueOnce({ sufficient: false, shortfall: 2000 })
      .mockResolvedValueOnce({ sufficient: true, shortfall: 0 });

    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-away' } });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(402);
    expect(res._json.shortfalls).toHaveLength(1);
    expect(res._json.shortfalls[0].rosterId).toBe('roster-home');
    expect(res._json.shortfalls[0].shortfall).toBe(2000);
  });

  it('returns 402 when away roster has insufficient balance', async () => {
    mockBookingFindUnique.mockResolvedValue(pendingBooking);
    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-away', role: 'captain' });
    mockTeamFindUnique
      .mockResolvedValueOnce({ id: 'roster-home', name: 'Home Roster', stripeAccountId: 'acct_home' })
      .mockResolvedValueOnce({ id: 'roster-away', name: 'Away Roster', stripeAccountId: 'acct_away' });
    mockCheckBalance
      .mockResolvedValueOnce({ sufficient: true, shortfall: 0 })
      .mockResolvedValueOnce({ sufficient: false, shortfall: 1500 });

    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-away' } });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(402);
    expect(res._json.shortfalls).toHaveLength(1);
    expect(res._json.shortfalls[0].rosterId).toBe('roster-away');
    expect(res._json.shortfalls[0].shortfall).toBe(1500);
  });

  it('returns 402 with both shortfalls when both rosters are insufficient', async () => {
    mockBookingFindUnique.mockResolvedValue(pendingBooking);
    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-away', role: 'captain' });
    mockTeamFindUnique
      .mockResolvedValueOnce({ id: 'roster-home', name: 'Home Roster', stripeAccountId: 'acct_home' })
      .mockResolvedValueOnce({ id: 'roster-away', name: 'Away Roster', stripeAccountId: 'acct_away' });
    mockCheckBalance
      .mockResolvedValueOnce({ sufficient: false, shortfall: 3000 })
      .mockResolvedValueOnce({ sufficient: false, shortfall: 1000 });

    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-away' } });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(402);
    expect(res._json.shortfalls).toHaveLength(2);
    expect(res._json.shortfalls[0].role).toBe('home');
    expect(res._json.shortfalls[1].role).toBe('away');
  });

  it('accepts challenge and transitions to escrow_collecting when both balances sufficient', async () => {
    setupAcceptHappyPath();
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-away' } });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(mockBookingUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'booking-1' },
      data: { status: 'escrow_collecting' },
    }));
    expect(mockBookingParticipantUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'bp-away' },
    }));
    expect(res._json.balanceCheck.home.sufficient).toBe(true);
    expect(res._json.balanceCheck.away.sufficient).toBe(true);
  });

  it('checks balance for both rosters with correct escrow amounts', async () => {
    setupAcceptHappyPath();
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-away' } });
    const res = buildRes();
    await handler(req, res);

    expect(mockCheckBalance).toHaveBeenCalledTimes(2);
    expect(mockCheckBalance).toHaveBeenCalledWith('roster-home', 5000);
    expect(mockCheckBalance).toHaveBeenCalledWith('roster-away', 5000);
  });

  it('returns 400 when confirmation deadline has passed', async () => {
    const expiredBooking = {
      ...pendingBooking,
      participants: [
        { ...pendingBooking.participants[0] },
        { ...pendingBooking.participants[1], confirmationDeadline: new Date(Date.now() - 1000) },
      ],
    };
    mockBookingFindUnique.mockResolvedValue(expiredBooking);
    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-away', role: 'captain' });

    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-away' } });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/deadline has passed/);
  });
});

describe('POST /api/game-challenges/:bookingId/capture', () => {
  const handler = findHandler('post', '/:bookingId/capture');

  const escrowBooking = {
    id: 'booking-1',
    bookingType: 'game_challenge',
    status: 'escrow_collecting',
    facilityId: 'facility-1',
    facility: { id: 'facility-1', stripeConnectAccountId: 'acct_fac' },
    participants: [
      { id: 'bp-home', rosterId: 'roster-home', role: 'home', escrowAmount: 5000, paymentStatus: 'pending', stripePaymentIntentId: null },
      { id: 'bp-away', rosterId: 'roster-away', role: 'away', escrowAmount: 5000, paymentStatus: 'pending', stripePaymentIntentId: null },
    ],
  };

  const confirmedBooking = {
    id: 'booking-1',
    bookingType: 'game_challenge',
    status: 'confirmed',
    facility: { id: 'facility-1', name: 'Test Facility', street: '123 Main', city: 'Springfield' },
    court: { id: 'court-1', name: 'Court A', sportType: 'basketball' },
    participants: [
      { id: 'bp-home', rosterId: 'roster-home', role: 'home', escrowAmount: 5000, paymentStatus: 'captured', confirmedAt: new Date() },
      { id: 'bp-away', rosterId: 'roster-away', role: 'away', escrowAmount: 5000, paymentStatus: 'captured', confirmedAt: new Date() },
    ],
  };

  function setupCaptureHappyPath() {
    mockBookingFindUnique
      .mockResolvedValueOnce(escrowBooking)
      .mockResolvedValueOnce(confirmedBooking);

    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-home', userId: 'user-home', teamId: 'roster-home', role: 'captain' });

    mockCreateEscrowIntent
      .mockResolvedValueOnce({ id: 'pi_home_123', status: 'requires_capture' })
      .mockResolvedValueOnce({ id: 'pi_away_456', status: 'requires_capture' });

    mockCaptureEscrow.mockResolvedValue(undefined);
  }

  it('returns 400 when userId is missing', async () => {
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: {} });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/Missing required fields/);
  });

  it('returns 404 when booking not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);
    const req = buildReq({ params: { bookingId: 'nonexistent' }, body: { userId: 'user-home' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(404);
  });

  it('returns 400 when booking is not a game challenge', async () => {
    mockBookingFindUnique.mockResolvedValue({ ...escrowBooking, bookingType: 'regular' });
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-home' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/not a game challenge/);
  });

  it('returns 400 when booking is not in escrow_collecting status', async () => {
    mockBookingFindUnique.mockResolvedValue({ ...escrowBooking, status: 'pending_away_confirm' });
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-home' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/not in escrow_collecting/);
  });

  it('returns 400 when facility has no Connect account', async () => {
    mockBookingFindUnique.mockResolvedValue({
      ...escrowBooking,
      facility: { id: 'facility-1', stripeConnectAccountId: null },
    });
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-home' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/Stripe Connect onboarding/);
  });

  it('returns 403 when user is not a roster manager of either participant', async () => {
    mockBookingFindUnique.mockResolvedValue(escrowBooking);
    mockTeamMemberFindFirst.mockResolvedValue(null);
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'random-user' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(403);
  });

  it('creates escrow intents for both participants and captures successfully', async () => {
    setupCaptureHappyPath();
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-home' } });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(mockCreateEscrowIntent).toHaveBeenCalledTimes(2);
    expect(mockCreateEscrowIntent).toHaveBeenCalledWith(
      'bp-home', 5000, 'acct_fac', 'booking-1', 'home',
    );
    expect(mockCreateEscrowIntent).toHaveBeenCalledWith(
      'bp-away', 5000, 'acct_fac', 'booking-1', 'away',
    );
    expect(mockCaptureEscrow).toHaveBeenCalledWith('booking-1');
    expect(res._json.message).toMatch(/booking confirmed/);
  });

  it('returns 502 when captureEscrow fails (one capture fails)', async () => {
    mockBookingFindUnique.mockResolvedValue(escrowBooking);
    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-home', role: 'captain' });
    mockCreateEscrowIntent
      .mockResolvedValueOnce({ id: 'pi_home_123' })
      .mockResolvedValueOnce({ id: 'pi_away_456' });
    mockCaptureEscrow.mockRejectedValue(new Error('Escrow capture failed for booking booking-1: Card declined'));

    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-home' } });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(502);
    expect(res._json.error).toBe('Escrow capture failed');
    expect(res._json.message).toMatch(/Card declined/);
  });

  it('returns 502 and releases intents when createEscrowIntent fails for away', async () => {
    mockBookingFindUnique.mockResolvedValue(escrowBooking);
    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-home', role: 'captain' });
    mockCreateEscrowIntent
      .mockResolvedValueOnce({ id: 'pi_home_123' })
      .mockRejectedValueOnce(new Error('Card declined'));
    mockReleaseEscrow.mockResolvedValue(undefined);
    mockBookingParticipantFindMany.mockResolvedValue([
      { id: 'bp-home', stripePaymentIntentId: 'pi_home_123', paymentStatus: 'authorized' },
      { id: 'bp-away', stripePaymentIntentId: null, paymentStatus: 'pending' },
    ]);

    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-home' } });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(502);
    expect(res._json.error).toBe('Failed to create escrow intents');
    // Should attempt to release the authorized intent
    expect(mockReleaseEscrow).toHaveBeenCalledWith('pi_home_123');
  });

  it('returns 502 and releases intents when createEscrowIntent fails for home', async () => {
    mockBookingFindUnique.mockResolvedValue(escrowBooking);
    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-home', role: 'captain' });
    mockCreateEscrowIntent.mockRejectedValueOnce(new Error('Insufficient funds'));
    mockReleaseEscrow.mockResolvedValue(undefined);
    mockBookingParticipantFindMany.mockResolvedValue([
      { id: 'bp-home', stripePaymentIntentId: null, paymentStatus: 'pending' },
      { id: 'bp-away', stripePaymentIntentId: null, paymentStatus: 'pending' },
    ]);

    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-home' } });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(502);
    expect(res._json.error).toBe('Failed to create escrow intents');
  });

  it('returns confirmed booking details on success', async () => {
    setupCaptureHappyPath();
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-home' } });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.status).toBe('confirmed');
    expect(res._json.participants).toHaveLength(2);
    expect(res._json.participants[0].paymentStatus).toBe('captured');
    expect(res._json.participants[1].paymentStatus).toBe('captured');
  });

  it('verifies the user is a captain of one of the participating rosters', async () => {
    setupCaptureHappyPath();
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-home' } });
    const res = buildRes();
    await handler(req, res);

    expect(mockTeamMemberFindFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-home',
        teamId: { in: ['roster-home', 'roster-away'] },
        role: 'captain',
        status: 'active',
      },
    });
  });
});
