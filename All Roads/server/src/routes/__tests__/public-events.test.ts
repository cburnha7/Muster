/**
 * Tests for the public event routes
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
const mockBookingFindMany = jest.fn();
const mockBookingCount = jest.fn();
const mockBookingParticipantCreate = jest.fn();
const mockBookingParticipantUpdate = jest.fn();
const mockBookingParticipantCount = jest.fn();
const mockStripePaymentIntentsCreate = jest.fn();
const mockCapturePublicEventEscrow = jest.fn();
const mockFacilityCancelPublicEvent = jest.fn();

jest.mock('../../services/stripe-connect', () => ({
  stripe: {
    paymentIntents: {
      create: (...args: any[]) => mockStripePaymentIntentsCreate(...args),
    },
  },
  calculatePlatformFee: (amount: number) => Math.floor(amount * 0.05),
}));

jest.mock('../../services/public-event-escrow', () => ({
  capturePublicEventEscrow: (...args: any[]) => mockCapturePublicEventEscrow(...args),
  facilityCancelPublicEvent: (...args: any[]) => mockFacilityCancelPublicEvent(...args),
}));

jest.mock('../../utils/idempotency', () => ({
  generateIdempotencyKey: (a: string, b: string, c: string) => `${a}:${b}:${c}`,
  IdempotencyAction: { CREATE: 'create', CAPTURE: 'capture', CANCEL: 'cancel', REFUND: 'refund' },
}));

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
      findMany: (...args: any[]) => mockBookingFindMany(...args),
      count: (...args: any[]) => mockBookingCount(...args),
    },
    bookingParticipant: {
      create: (...args: any[]) => mockBookingParticipantCreate(...args),
      update: (...args: any[]) => mockBookingParticipantUpdate(...args),
      count: (...args: any[]) => mockBookingParticipantCount(...args),
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

import { Request, Response } from 'express';
import router from '../public-events';

function buildReq(overrides: Partial<Request> = {}): Partial<Request> {
  return { params: {}, body: {}, query: {}, headers: {}, ...overrides };
}

function buildRes(): Partial<Response> & { _status: number; _json: any } {
  const res: any = { _status: 200, _json: null };
  res.status = jest.fn((code: number) => { res._status = code; return res; });
  res.json = jest.fn((data: any) => { res._json = data; return res; });
  res.send = jest.fn(() => res);
  return res;
}

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
  rosterId: 'roster-1',
  facilityId: 'facility-1',
  courtId: 'court-1',
  timeSlotId: 'slot-1',
  perPersonPrice: 15.0,
  minAttendeeCount: 10,
};

function setupHappyPath() {
  mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-1', userId: 'user-1', teamId: 'roster-1', role: 'captain', status: 'active' });
  mockTeamFindUnique.mockResolvedValue({ id: 'roster-1', name: 'Test Roster', stripeAccountId: 'acct_123' });
  mockFacilityFindUnique.mockResolvedValue({ id: 'facility-1', name: 'Test Facility', stripeConnectAccountId: 'acct_fac' });
  mockFacilityCourtFindUnique.mockResolvedValue({ id: 'court-1', name: 'Court A', facilityId: 'facility-1', isActive: true });
  mockFacilityTimeSlotFindUnique.mockResolvedValue({
    id: 'slot-1', courtId: 'court-1', date: '2025-06-15', startTime: '10:00', endTime: '11:00', status: 'available', price: 100,
  });
  mockBookingCreate.mockResolvedValue({ id: 'booking-1', status: 'pending', bookingType: 'public_event' });
  mockBookingUpdate.mockResolvedValue({ id: 'booking-1', status: 'pending', bookingType: 'public_event', stripeTransferGroup: 'booking-1' });
  mockBookingParticipantCreate.mockResolvedValue({ id: 'bp-1', bookingId: 'booking-1', rosterId: 'roster-1', role: 'host' });
  mockBookingFindUnique.mockResolvedValue({
    id: 'booking-1',
    status: 'pending',
    bookingType: 'public_event',
    totalPrice: 100,
    perPersonPrice: 15.0,
    minAttendeeCount: 10,
    bookingHostType: 'roster_manager',
    bookingHostId: 'roster-1',
    stripeTransferGroup: 'booking-1',
    facility: { id: 'facility-1', name: 'Test Facility', street: '123 Main', city: 'Testville' },
    court: { id: 'court-1', name: 'Court A', sportType: 'basketball' },
    participants: [{ id: 'bp-1', rosterId: 'roster-1', role: 'host', escrowAmount: 0, paymentStatus: 'pending' }],
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/public-events', () => {
  const handler = findHandler('post', '/');

  it('creates a public event successfully', async () => {
    setupHappyPath();
    const req = buildReq({ body: validBody });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(201);
    expect(res._json).toMatchObject({
      id: 'booking-1',
      bookingType: 'public_event',
      roster: { id: 'roster-1', name: 'Test Roster' },
    });
  });

  it('returns 400 when required fields are missing', async () => {
    const req = buildReq({ body: { userId: 'user-1' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/Missing required fields/);
  });

  it('returns 400 when perPersonPrice is not positive', async () => {
    const req = buildReq({ body: { ...validBody, perPersonPrice: -5 } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/perPersonPrice must be a positive number/);
  });

  it('returns 400 when minAttendeeCount is not a positive integer', async () => {
    const req = buildReq({ body: { ...validBody, minAttendeeCount: 0 } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/minAttendeeCount must be a positive integer/);
  });

  it('returns 403 when user is not roster manager', async () => {
    mockTeamMemberFindFirst.mockResolvedValue(null);
    const req = buildReq({ body: validBody });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(403);
  });

  it('returns 404 when roster not found', async () => {
    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-1' });
    mockTeamFindUnique.mockResolvedValue(null);
    const req = buildReq({ body: validBody });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(404);
    expect(res._json.error).toMatch(/Roster not found/);
  });

  it('returns 400 when roster has no Stripe Connect', async () => {
    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-1' });
    mockTeamFindUnique.mockResolvedValue({ id: 'roster-1', name: 'Test', stripeAccountId: null });
    const req = buildReq({ body: validBody });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/Stripe Connect onboarding/);
  });

  it('returns 404 when facility not found', async () => {
    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-1' });
    mockTeamFindUnique.mockResolvedValue({ id: 'roster-1', name: 'Test', stripeAccountId: 'acct_123' });
    mockFacilityFindUnique.mockResolvedValue(null);
    const req = buildReq({ body: validBody });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(404);
    expect(res._json.error).toMatch(/Facility not found/);
  });

  it('returns 400 when facility has no Stripe Connect', async () => {
    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-1' });
    mockTeamFindUnique.mockResolvedValue({ id: 'roster-1', name: 'Test', stripeAccountId: 'acct_123' });
    mockFacilityFindUnique.mockResolvedValue({ id: 'facility-1', name: 'Fac', stripeConnectAccountId: null });
    const req = buildReq({ body: validBody });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/Facility has not completed Stripe Connect/);
  });

  it('returns 404 when court not found at facility', async () => {
    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-1' });
    mockTeamFindUnique.mockResolvedValue({ id: 'roster-1', name: 'Test', stripeAccountId: 'acct_123' });
    mockFacilityFindUnique.mockResolvedValue({ id: 'facility-1', name: 'Fac', stripeConnectAccountId: 'acct_fac' });
    mockFacilityCourtFindUnique.mockResolvedValue({ id: 'court-1', name: 'Court A', facilityId: 'other-facility', isActive: true });
    const req = buildReq({ body: validBody });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(404);
    expect(res._json.error).toMatch(/Court not found at this facility/);
  });

  it('returns 400 when court is inactive', async () => {
    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-1' });
    mockTeamFindUnique.mockResolvedValue({ id: 'roster-1', name: 'Test', stripeAccountId: 'acct_123' });
    mockFacilityFindUnique.mockResolvedValue({ id: 'facility-1', name: 'Fac', stripeConnectAccountId: 'acct_fac' });
    mockFacilityCourtFindUnique.mockResolvedValue({ id: 'court-1', name: 'Court A', facilityId: 'facility-1', isActive: false });
    const req = buildReq({ body: validBody });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/Court is not currently active/);
  });

  it('returns 404 when time slot not found for court', async () => {
    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-1' });
    mockTeamFindUnique.mockResolvedValue({ id: 'roster-1', name: 'Test', stripeAccountId: 'acct_123' });
    mockFacilityFindUnique.mockResolvedValue({ id: 'facility-1', name: 'Fac', stripeConnectAccountId: 'acct_fac' });
    mockFacilityCourtFindUnique.mockResolvedValue({ id: 'court-1', name: 'Court A', facilityId: 'facility-1', isActive: true });
    mockFacilityTimeSlotFindUnique.mockResolvedValue({ id: 'slot-1', courtId: 'other-court' });
    const req = buildReq({ body: validBody });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(404);
    expect(res._json.error).toMatch(/Time slot not found/);
  });

  it('returns 400 when time slot is not available', async () => {
    mockTeamMemberFindFirst.mockResolvedValue({ id: 'tm-1' });
    mockTeamFindUnique.mockResolvedValue({ id: 'roster-1', name: 'Test', stripeAccountId: 'acct_123' });
    mockFacilityFindUnique.mockResolvedValue({ id: 'facility-1', name: 'Fac', stripeConnectAccountId: 'acct_fac' });
    mockFacilityCourtFindUnique.mockResolvedValue({ id: 'court-1', name: 'Court A', facilityId: 'facility-1', isActive: true });
    mockFacilityTimeSlotFindUnique.mockResolvedValue({
      id: 'slot-1', courtId: 'court-1', date: '2025-06-15', startTime: '10:00', endTime: '11:00', status: 'rented', price: 100,
    });
    const req = buildReq({ body: validBody });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/Time slot is not available/);
  });

  it('sets stripeTransferGroup to booking ID', async () => {
    setupHappyPath();
    const req = buildReq({ body: validBody });
    const res = buildRes();
    await handler(req, res);
    expect(mockBookingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stripeTransferGroup: 'booking-1' }),
      }),
    );
  });

  it('creates a host participant record', async () => {
    setupHappyPath();
    const req = buildReq({ body: validBody });
    const res = buildRes();
    await handler(req, res);
    expect(mockBookingParticipantCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'host', rosterId: 'roster-1', escrowAmount: 0 }),
      }),
    );
  });
});

describe('GET /api/public-events/:bookingId', () => {
  const handler = findHandler('get', '/:bookingId');

  it('returns a public event by ID', async () => {
    mockBookingFindUnique.mockResolvedValue({
      id: 'booking-1',
      bookingType: 'public_event',
      status: 'pending',
      facility: { id: 'f1', name: 'Fac', street: '123', city: 'City', state: 'ST' },
      court: { id: 'c1', name: 'Court', sportType: 'basketball' },
      participants: [],
    });
    const req = buildReq({ params: { bookingId: 'booking-1' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._json.id).toBe('booking-1');
  });

  it('returns 404 when not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);
    const req = buildReq({ params: { bookingId: 'nope' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(404);
  });

  it('returns 400 when booking is not a public event', async () => {
    mockBookingFindUnique.mockResolvedValue({ id: 'booking-1', bookingType: 'game_challenge' });
    const req = buildReq({ params: { bookingId: 'booking-1' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/not a public event/);
  });
});

describe('GET /api/public-events', () => {
  const handler = findHandler('get', '/');

  it('lists public events', async () => {
    mockBookingFindMany.mockResolvedValue([
      { id: 'b1', bookingType: 'public_event', status: 'pending' },
    ]);
    mockBookingCount.mockResolvedValue(1);
    const req = buildReq({ query: {} });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._json.data).toHaveLength(1);
    expect(res._json.total).toBe(1);
  });

  it('filters by status when provided', async () => {
    mockBookingFindMany.mockResolvedValue([]);
    mockBookingCount.mockResolvedValue(0);
    const req = buildReq({ query: { status: 'confirmed' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(mockBookingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'confirmed' }),
      }),
    );
  });
});

describe('POST /api/public-events/:bookingId/register', () => {
  const handler = findHandler('post', '/:bookingId/register');

  const pendingPublicEvent = {
    id: 'booking-1',
    bookingType: 'public_event',
    status: 'pending',
    perPersonPrice: 15.0,
    minAttendeeCount: 10,
    bookingHostId: 'roster-1',
    participants: [
      { id: 'bp-host', rosterId: 'roster-1', role: 'host', paymentStatus: 'pending' },
    ],
  };

  function setupRegistrationHappyPath() {
    mockBookingFindUnique.mockResolvedValue(pendingPublicEvent);
    mockTeamFindUnique.mockResolvedValue({ id: 'roster-1', stripeAccountId: 'acct_host_123' });
    mockBookingParticipantCreate.mockResolvedValue({
      id: 'bp-new',
      bookingId: 'booking-1',
      rosterId: 'user-attendee',
      role: 'participant',
      escrowAmount: 1500,
      paymentStatus: 'pending',
    });
    mockStripePaymentIntentsCreate.mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret_abc',
      amount: 1500,
    });
    mockBookingParticipantUpdate.mockResolvedValue({
      id: 'bp-new',
      stripePaymentIntentId: 'pi_test_123',
      paymentStatus: 'authorized',
    });
    // Default: below minimum, no auto-capture
    mockBookingParticipantCount.mockResolvedValue(5);
    mockCapturePublicEventEscrow.mockResolvedValue(undefined);
  }

  it('registers an attendee successfully and returns client_secret', async () => {
    setupRegistrationHappyPath();
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-attendee' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(201);
    expect(res._json).toMatchObject({
      participantId: 'bp-new',
      clientSecret: 'pi_test_123_secret_abc',
      escrowAmount: 1500,
      currency: 'usd',
    });
  });

  it('creates a PaymentIntent with manual capture and correct params', async () => {
    setupRegistrationHappyPath();
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-attendee' } });
    const res = buildRes();
    await handler(req, res);
    expect(mockStripePaymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1500,
        currency: 'usd',
        capture_method: 'manual',
        application_fee_amount: 75, // 5% of 1500
        transfer_data: { destination: 'acct_host_123' },
        transfer_group: 'booking-1',
      }),
      expect.objectContaining({
        idempotencyKey: expect.stringContaining('booking-1'),
      }),
    );
  });

  it('creates a BookingParticipant with role participant', async () => {
    setupRegistrationHappyPath();
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-attendee' } });
    const res = buildRes();
    await handler(req, res);
    expect(mockBookingParticipantCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingId: 'booking-1',
          rosterId: 'user-attendee',
          role: 'participant',
          escrowAmount: 1500,
        }),
      }),
    );
  });

  it('returns 400 when userId is missing', async () => {
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: {} });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/Missing required field/);
  });

  it('returns 404 when event not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);
    const req = buildReq({ params: { bookingId: 'nonexistent' }, body: { userId: 'user-1' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(404);
    expect(res._json.error).toMatch(/Public event not found/);
  });

  it('returns 400 when booking is not a public event', async () => {
    mockBookingFindUnique.mockResolvedValue({
      ...pendingPublicEvent,
      bookingType: 'game_challenge',
    });
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-1' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/not a public event/);
  });

  it('returns 400 when event is not in pending status', async () => {
    mockBookingFindUnique.mockResolvedValue({
      ...pendingPublicEvent,
      status: 'confirmed',
    });
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-1' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/not accepting registrations/);
  });

  it('returns 409 when user is already registered', async () => {
    mockBookingFindUnique.mockResolvedValue({
      ...pendingPublicEvent,
      participants: [
        { id: 'bp-host', rosterId: 'roster-1', role: 'host', paymentStatus: 'pending' },
        { id: 'bp-existing', rosterId: 'user-attendee', role: 'participant', paymentStatus: 'authorized' },
      ],
    });
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-attendee' } });
    const res = buildRes();
    await handler(req, res);
    expect(res._status).toBe(409);
    expect(res._json.error).toMatch(/already registered/);
  });

  it('uses idempotency key with bookingId and userId', async () => {
    setupRegistrationHappyPath();
    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-attendee' } });
    const res = buildRes();
    await handler(req, res);
    expect(mockStripePaymentIntentsCreate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        idempotencyKey: 'booking-1:user-attendee:register:create',
      }),
    );
  });

  // --- Auto-trigger capture when minimum reached ---

  it('triggers capture when attendee count reaches minimum', async () => {
    setupRegistrationHappyPath();
    mockBookingParticipantCount.mockResolvedValue(10); // equals minAttendeeCount

    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-attendee' } });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(201);
    expect(mockCapturePublicEventEscrow).toHaveBeenCalledWith('booking-1');
    expect(res._json.escrowCaptured).toBe(true);
  });

  it('does not trigger capture when below minimum', async () => {
    setupRegistrationHappyPath();
    mockBookingParticipantCount.mockResolvedValue(5); // below minAttendeeCount of 10

    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-attendee' } });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(201);
    expect(mockCapturePublicEventEscrow).not.toHaveBeenCalled();
    expect(res._json.escrowCaptured).toBe(false);
  });

  it('still succeeds registration if auto-capture fails', async () => {
    setupRegistrationHappyPath();
    mockBookingParticipantCount.mockResolvedValue(10);
    mockCapturePublicEventEscrow.mockRejectedValue(new Error('Capture failed'));

    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-attendee' } });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(201);
    expect(mockCapturePublicEventEscrow).toHaveBeenCalledWith('booking-1');
    expect(res._json.escrowCaptured).toBe(false);
    expect(res._json.participantId).toBe('bp-new');
  });

  it('triggers capture when attendee count exceeds minimum', async () => {
    setupRegistrationHappyPath();
    mockBookingParticipantCount.mockResolvedValue(15); // exceeds minAttendeeCount of 10

    const req = buildReq({ params: { bookingId: 'booking-1' }, body: { userId: 'user-attendee' } });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(201);
    expect(mockCapturePublicEventEscrow).toHaveBeenCalledWith('booking-1');
    expect(res._json.escrowCaptured).toBe(true);
  });
});

describe('POST /api/public-events/:bookingId/facility-cancel', () => {
  const handler = findHandler('post', '/:bookingId/facility-cancel');

  it('cancels a public event successfully', async () => {
    mockBookingFindUnique.mockResolvedValue({
      id: 'booking-1',
      bookingType: 'public_event',
      status: 'confirmed',
      facilityId: 'facility-1',
    });
    mockFacilityCancelPublicEvent.mockResolvedValue(undefined);

    const req = buildReq({
      params: { bookingId: 'booking-1' },
      body: { facilityId: 'facility-1' },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.message).toMatch(/cancelled/i);
    expect(mockFacilityCancelPublicEvent).toHaveBeenCalledWith('booking-1');
  });

  it('returns 400 when facilityId is missing', async () => {
    const req = buildReq({
      params: { bookingId: 'booking-1' },
      body: {},
    });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/Missing required field/);
  });

  it('returns 404 when booking not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);

    const req = buildReq({
      params: { bookingId: 'nonexistent' },
      body: { facilityId: 'facility-1' },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(404);
    expect(res._json.error).toMatch(/not found/);
  });

  it('returns 400 when booking is not a public event', async () => {
    mockBookingFindUnique.mockResolvedValue({
      id: 'booking-1',
      bookingType: 'game_challenge',
      status: 'confirmed',
      facilityId: 'facility-1',
    });

    const req = buildReq({
      params: { bookingId: 'booking-1' },
      body: { facilityId: 'facility-1' },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/not a public event/);
  });

  it('returns 403 when facility does not own the event', async () => {
    mockBookingFindUnique.mockResolvedValue({
      id: 'booking-1',
      bookingType: 'public_event',
      status: 'confirmed',
      facilityId: 'facility-1',
    });

    const req = buildReq({
      params: { bookingId: 'booking-1' },
      body: { facilityId: 'other-facility' },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(403);
    expect(res._json.error).toMatch(/does not own/);
  });

  it('returns 409 when event is already cancelled', async () => {
    mockBookingFindUnique.mockResolvedValue({
      id: 'booking-1',
      bookingType: 'public_event',
      status: 'confirmed',
      facilityId: 'facility-1',
    });
    mockFacilityCancelPublicEvent.mockRejectedValue(
      new Error('Booking booking-1 is already cancelled'),
    );

    const req = buildReq({
      params: { bookingId: 'booking-1' },
      body: { facilityId: 'facility-1' },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(409);
    expect(res._json.error).toMatch(/already cancelled/);
  });

  it('returns 500 on unexpected errors', async () => {
    mockBookingFindUnique.mockResolvedValue({
      id: 'booking-1',
      bookingType: 'public_event',
      status: 'confirmed',
      facilityId: 'facility-1',
    });
    mockFacilityCancelPublicEvent.mockRejectedValue(new Error('Stripe API down'));

    const req = buildReq({
      params: { bookingId: 'booking-1' },
      body: { facilityId: 'facility-1' },
    });
    const res = buildRes();
    await handler(req, res);

    expect(res._status).toBe(500);
    expect(res._json.error).toMatch(/Failed to cancel/);
  });
});
