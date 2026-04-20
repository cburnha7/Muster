/**
 * Unit tests for the capture-window background job.
 *
 * Mocks Prisma and Stripe to verify:
 * - Confirmed bookings with authorized intents in the 6–7 day window are found
 * - Existing PaymentIntents are cancelled and new ones created
 * - Idempotency keys use the 'renew' action type
 * - Re-authorization failures transition booking to 'payment_hold'
 * - Notifications are sent on payment hold
 * - Bookings without a facility Connect account are skipped with an error
 * - Already-cancelled intents are handled gracefully
 */

// ---------------------------------------------------------------------------
// Stripe mock
// ---------------------------------------------------------------------------
const mockPaymentIntentsCancel = jest.fn();
const mockPaymentIntentsCreate = jest.fn();

jest.mock('../../services/stripe-connect', () => ({
  stripe: {
    paymentIntents: {
      cancel: function (...args: any[]) {
        return mockPaymentIntentsCancel.apply(null, args);
      },
      create: function (...args: any[]) {
        return mockPaymentIntentsCreate.apply(null, args);
      },
    },
  },
  calculatePlatformFee: function (amount: number) {
    return Math.floor(amount * 0.05);
  },
}));

// ---------------------------------------------------------------------------
// Idempotency mock
// ---------------------------------------------------------------------------
jest.mock('../../utils/idempotency', () => ({
  generateIdempotencyKey: function (
    bookingId: string,
    role: string,
    action: string
  ) {
    return bookingId + ':' + role + ':' + action;
  },
  IdempotencyAction: {
    CREATE: 'create',
    CAPTURE: 'capture',
    CANCEL: 'cancel',
    REFUND: 'refund',
    RENEW: 'renew',
  },
}));

// ---------------------------------------------------------------------------
// NotificationService mock
// ---------------------------------------------------------------------------
const mockNotifyPaymentHold = jest.fn();
jest.mock('../../services/NotificationService', () => ({
  NotificationService: {
    notifyPaymentHold: function (...args: any[]) {
      return mockNotifyPaymentHold.apply(null, args);
    },
  },
}));

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------
const mockBookingFindMany = jest.fn();
const mockBookingUpdate = jest.fn();
const mockParticipantUpdate = jest.fn();

const mockPrisma: any = {
  booking: {
    findMany: mockBookingFindMany,
    update: mockBookingUpdate,
  },
  bookingParticipant: {
    update: mockParticipantUpdate,
  },
};

jest.mock('../../index', () => ({
  prisma: {
    booking: { findMany: jest.fn(), update: jest.fn() },
    bookingParticipant: { update: jest.fn() },
  },
}));

import { processCaptureWindowRenewals } from '../capture-window';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildBooking(overrides: Record<string, any> = {}) {
  return {
    id: 'booking-1',
    status: 'confirmed',
    facility: { stripeConnectAccountId: 'acct_facility_1' },
    participants: [
      {
        id: 'participant-home',
        rosterId: 'roster-home',
        role: 'home',
        escrowAmount: 5000,
        stripePaymentIntentId: 'pi_old_home',
        paymentStatus: 'authorized',
      },
      {
        id: 'participant-away',
        rosterId: 'roster-away',
        role: 'away',
        escrowAmount: 5000,
        stripePaymentIntentId: 'pi_old_away',
        paymentStatus: 'authorized',
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
  mockBookingUpdate.mockResolvedValue({});
  mockParticipantUpdate.mockResolvedValue({});
});

describe('processCaptureWindowRenewals', () => {
  it('returns zero counts when no bookings need renewal', async () => {
    mockBookingFindMany.mockResolvedValue([]);

    const metrics = await processCaptureWindowRenewals(mockPrisma);

    expect(metrics.bookingsChecked).toBe(0);
    expect(metrics.intentsRenewed).toBe(0);
    expect(metrics.renewalsFailed).toBe(0);
    expect(metrics.errors).toHaveLength(0);
  });

  it('cancels old intents and creates new ones for each participant', async () => {
    const booking = buildBooking();
    mockBookingFindMany.mockResolvedValue([booking]);
    mockPaymentIntentsCancel.mockResolvedValue({});
    mockPaymentIntentsCreate
      .mockResolvedValueOnce({ id: 'pi_new_home' })
      .mockResolvedValueOnce({ id: 'pi_new_away' });

    const metrics = await processCaptureWindowRenewals(mockPrisma);

    expect(metrics.bookingsChecked).toBe(1);
    expect(metrics.intentsRenewed).toBe(2);
    expect(metrics.renewalsFailed).toBe(0);
    expect(metrics.errors).toHaveLength(0);

    // Verify old intents were cancelled
    expect(mockPaymentIntentsCancel).toHaveBeenCalledWith('pi_old_home');
    expect(mockPaymentIntentsCancel).toHaveBeenCalledWith('pi_old_away');

    // Verify new intents were created with correct params
    expect(mockPaymentIntentsCreate).toHaveBeenCalledTimes(2);
    expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5000,
        currency: 'usd',
        capture_method: 'manual',
        application_fee_amount: 250, // 5% of 5000
        transfer_data: { destination: 'acct_facility_1' },
        transfer_group: 'booking-1',
        metadata: expect.objectContaining({
          booking_id: 'booking-1',
          participant_role: 'home',
          renewal: 'true',
        }),
      }),
      { idempotencyKey: 'booking-1:home:renew' }
    );

    // Verify participant records were updated
    expect(mockParticipantUpdate).toHaveBeenCalledWith({
      where: { id: 'participant-home' },
      data: {
        stripePaymentIntentId: 'pi_new_home',
        paymentStatus: 'authorized',
      },
    });
    expect(mockParticipantUpdate).toHaveBeenCalledWith({
      where: { id: 'participant-away' },
      data: {
        stripePaymentIntentId: 'pi_new_away',
        paymentStatus: 'authorized',
      },
    });
  });

  it('uses renew idempotency action type', async () => {
    const booking = buildBooking({
      participants: [
        {
          id: 'p-1',
          rosterId: 'r-1',
          role: 'host',
          escrowAmount: 3000,
          stripePaymentIntentId: 'pi_old',
          paymentStatus: 'authorized',
        },
      ],
    });
    mockBookingFindMany.mockResolvedValue([booking]);
    mockPaymentIntentsCancel.mockResolvedValue({});
    mockPaymentIntentsCreate.mockResolvedValue({ id: 'pi_new' });

    await processCaptureWindowRenewals(mockPrisma);

    expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(expect.anything(), {
      idempotencyKey: 'booking-1:host:renew',
    });
  });

  it('skips bookings without a facility Connect account', async () => {
    const booking = buildBooking({
      facility: { stripeConnectAccountId: null },
    });
    mockBookingFindMany.mockResolvedValue([booking]);

    const metrics = await processCaptureWindowRenewals(mockPrisma);

    expect(metrics.bookingsChecked).toBe(1);
    expect(metrics.intentsRenewed).toBe(0);
    expect(metrics.errors).toHaveLength(1);
    expect(metrics.errors[0].error).toMatch(/no Stripe Connect account/i);
    expect(mockPaymentIntentsCancel).not.toHaveBeenCalled();
    expect(mockPaymentIntentsCreate).not.toHaveBeenCalled();
  });

  it('handles already-cancelled intents gracefully', async () => {
    const booking = buildBooking({
      participants: [
        {
          id: 'p-1',
          rosterId: 'r-1',
          role: 'home',
          escrowAmount: 5000,
          stripePaymentIntentId: 'pi_already_cancelled',
          paymentStatus: 'authorized',
        },
      ],
    });
    mockBookingFindMany.mockResolvedValue([booking]);
    // Simulate Stripe error for already-cancelled intent
    mockPaymentIntentsCancel.mockRejectedValue({
      code: 'payment_intent_unexpected_state',
    });
    mockPaymentIntentsCreate.mockResolvedValue({ id: 'pi_new' });

    const metrics = await processCaptureWindowRenewals(mockPrisma);

    expect(metrics.intentsRenewed).toBe(1);
    expect(metrics.renewalsFailed).toBe(0);
    // Should still create a new intent
    expect(mockPaymentIntentsCreate).toHaveBeenCalledTimes(1);
  });

  it('transitions booking to payment_hold on re-authorization failure', async () => {
    const booking = buildBooking({
      participants: [
        {
          id: 'p-fail',
          rosterId: 'roster-fail',
          role: 'home',
          escrowAmount: 5000,
          stripePaymentIntentId: 'pi_old',
          paymentStatus: 'authorized',
        },
      ],
    });
    mockBookingFindMany.mockResolvedValue([booking]);
    mockPaymentIntentsCancel.mockResolvedValue({});
    // New intent creation fails (insufficient funds)
    mockPaymentIntentsCreate.mockRejectedValue(new Error('Insufficient funds'));

    const metrics = await processCaptureWindowRenewals(mockPrisma);

    expect(metrics.renewalsFailed).toBe(1);
    expect(metrics.intentsRenewed).toBe(0);
    expect(metrics.errors).toHaveLength(1);
    expect(metrics.errors[0].error).toBe('Insufficient funds');

    // Verify booking was transitioned to payment_hold
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { status: 'payment_hold' },
    });

    // Verify notification was sent
    expect(mockNotifyPaymentHold).toHaveBeenCalledWith(
      'booking-1',
      'roster-fail'
    );
  });

  it('stops processing remaining participants after a failure', async () => {
    const booking = buildBooking();
    mockBookingFindMany.mockResolvedValue([booking]);
    mockPaymentIntentsCancel.mockResolvedValue({});
    // First participant fails, second should not be attempted
    mockPaymentIntentsCreate.mockRejectedValueOnce(new Error('Card declined'));

    const metrics = await processCaptureWindowRenewals(mockPrisma);

    expect(metrics.renewalsFailed).toBe(1);
    expect(metrics.intentsRenewed).toBe(0);
    // Only one create call — second participant was skipped
    expect(mockPaymentIntentsCreate).toHaveBeenCalledTimes(1);
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { status: 'payment_hold' },
    });
  });

  it('processes multiple bookings independently', async () => {
    const booking1 = buildBooking({
      id: 'booking-1',
      participants: [
        {
          id: 'p-1',
          rosterId: 'r-1',
          role: 'home',
          escrowAmount: 4000,
          stripePaymentIntentId: 'pi_1',
          paymentStatus: 'authorized',
        },
      ],
    });
    const booking2 = buildBooking({
      id: 'booking-2',
      participants: [
        {
          id: 'p-2',
          rosterId: 'r-2',
          role: 'away',
          escrowAmount: 6000,
          stripePaymentIntentId: 'pi_2',
          paymentStatus: 'authorized',
        },
      ],
    });
    mockBookingFindMany.mockResolvedValue([booking1, booking2]);
    mockPaymentIntentsCancel.mockResolvedValue({});
    mockPaymentIntentsCreate
      .mockResolvedValueOnce({ id: 'pi_new_1' })
      .mockResolvedValueOnce({ id: 'pi_new_2' });

    const metrics = await processCaptureWindowRenewals(mockPrisma);

    expect(metrics.bookingsChecked).toBe(2);
    expect(metrics.intentsRenewed).toBe(2);
    expect(metrics.renewalsFailed).toBe(0);
  });

  it('continues processing other bookings when one fails', async () => {
    const failBooking = buildBooking({
      id: 'booking-fail',
      participants: [
        {
          id: 'p-fail',
          rosterId: 'r-fail',
          role: 'home',
          escrowAmount: 5000,
          stripePaymentIntentId: 'pi_fail',
          paymentStatus: 'authorized',
        },
      ],
    });
    const okBooking = buildBooking({
      id: 'booking-ok',
      participants: [
        {
          id: 'p-ok',
          rosterId: 'r-ok',
          role: 'away',
          escrowAmount: 3000,
          stripePaymentIntentId: 'pi_ok',
          paymentStatus: 'authorized',
        },
      ],
    });
    mockBookingFindMany.mockResolvedValue([failBooking, okBooking]);
    mockPaymentIntentsCancel.mockResolvedValue({});
    mockPaymentIntentsCreate
      .mockRejectedValueOnce(new Error('Card declined'))
      .mockResolvedValueOnce({ id: 'pi_new_ok' });

    const metrics = await processCaptureWindowRenewals(mockPrisma);

    expect(metrics.bookingsChecked).toBe(2);
    expect(metrics.intentsRenewed).toBe(1);
    expect(metrics.renewalsFailed).toBe(1);
    // Only the failed booking should be on hold
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: 'booking-fail' },
      data: { status: 'payment_hold' },
    });
  });

  it('queries for bookings with correct date range and status filters', async () => {
    mockBookingFindMany.mockResolvedValue([]);

    await processCaptureWindowRenewals(mockPrisma);

    expect(mockBookingFindMany).toHaveBeenCalledTimes(1);
    const queryArg = mockBookingFindMany.mock.calls[0][0];

    // Verify status filter
    expect(queryArg.where.status).toBe('confirmed');

    // Verify date range is roughly 6–7 days from now
    const dateFilter = queryArg.where.rental.timeSlot.date;
    const now = Date.now();
    const gteMs = new Date(dateFilter.gte).getTime();
    const ltMs = new Date(dateFilter.lt).getTime();

    // 6 days in ms = 518400000, 7 days = 604800000
    expect(gteMs - now).toBeGreaterThan(5.9 * 24 * 60 * 60 * 1000);
    expect(gteMs - now).toBeLessThan(6.1 * 24 * 60 * 60 * 1000);
    expect(ltMs - now).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000);
    expect(ltMs - now).toBeLessThan(7.1 * 24 * 60 * 60 * 1000);

    // Verify participant filter
    expect(queryArg.where.participants.some).toEqual({
      paymentStatus: 'authorized',
      stripePaymentIntentId: { not: null },
    });
  });
});
