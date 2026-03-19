/**
 * Unit tests for the event-cutoff background job.
 *
 * Mocks Prisma and Stripe to verify:
 * - Pending public event bookings past start time with insufficient attendees are cancelled
 * - Uncaptured (authorized) intents are cancelled via paymentIntents.cancel()
 * - Captured intents are refunded with refund_application_fee: true
 * - Bookings that already meet minimum attendee count are skipped
 * - Booking and participant records are updated atomically
 * - Organizer is notified on cancellation
 * - Per-booking errors are captured without crashing the job
 * - Stripe "payment_intent_unexpected_state" errors are treated as no-ops
 */

// ---------------------------------------------------------------------------
// Stripe mocks
// ---------------------------------------------------------------------------
const mockPaymentIntentsCancel = jest.fn();
const mockRefundsCreate = jest.fn();

jest.mock('../../services/stripe-connect', () => ({
  stripe: {
    paymentIntents: { cancel: (...args: any[]) => mockPaymentIntentsCancel(...args) },
    refunds: { create: (...args: any[]) => mockRefundsCreate(...args) },
  },
}));

// ---------------------------------------------------------------------------
// Prisma mocks
// ---------------------------------------------------------------------------
const mockBookingFindMany = jest.fn();
const mockBookingParticipantUpdateMany = jest.fn();
const mockBookingUpdate = jest.fn();

const txClient = {
  bookingParticipant: { updateMany: mockBookingParticipantUpdateMany },
  booking: { update: mockBookingUpdate },
};

const mockTransaction = jest.fn((cb: (tx: any) => Promise<any>) => cb(txClient));

const mockPrisma: any = {
  booking: { findMany: mockBookingFindMany },
  $transaction: mockTransaction,
};

jest.mock('../../index', () => ({
  prisma: {
    booking: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Idempotency mock — pass through to real implementation
// ---------------------------------------------------------------------------
jest.mock('../../utils/idempotency', () => ({
  generateIdempotencyKey: (bookingId: string, role: string, action: string) =>
    `${bookingId}:${role}:${action}`,
  IdempotencyAction: {
    CREATE: 'create',
    CAPTURE: 'capture',
    CANCEL: 'cancel',
    REFUND: 'refund',
  },
}));

import { processEventCutoffs } from '../event-cutoff';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildPendingBooking(overrides: Record<string, any> = {}) {
  return {
    id: 'booking-1',
    bookingType: 'public_event',
    status: 'pending',
    minAttendeeCount: 5,
    event: {
      id: 'event-1',
      title: 'Saturday Pickup',
      startTime: new Date(Date.now() - 60_000),
      organizerId: 'organizer-1',
    },
    participants: [
      {
        id: 'bp-1',
        rosterId: 'attendee-1',
        role: 'participant',
        stripePaymentIntentId: 'pi_auth_1',
        paymentStatus: 'authorized',
      },
      {
        id: 'bp-2',
        rosterId: 'attendee-2',
        role: 'participant',
        stripePaymentIntentId: 'pi_auth_2',
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
  mockTransaction.mockImplementation((cb: any) => cb(txClient));
  mockPaymentIntentsCancel.mockResolvedValue({});
  mockRefundsCreate.mockResolvedValue({});
  mockBookingParticipantUpdateMany.mockResolvedValue({ count: 0 });
  mockBookingUpdate.mockResolvedValue({});
});

describe('processEventCutoffs', () => {
  it('returns zero counts when no pending bookings exist', async () => {
    mockBookingFindMany.mockResolvedValue([]);

    const metrics = await processEventCutoffs(mockPrisma);

    expect(metrics.bookingsChecked).toBe(0);
    expect(metrics.bookingsCancelled).toBe(0);
    expect(metrics.refundsIssued).toBe(0);
    expect(metrics.intentsCancelled).toBe(0);
    expect(metrics.errors).toHaveLength(0);
  });

  it('cancels authorized intents and transitions booking to cancelled', async () => {
    const booking = buildPendingBooking();
    mockBookingFindMany.mockResolvedValue([booking]);

    const metrics = await processEventCutoffs(mockPrisma);

    expect(metrics.bookingsChecked).toBe(1);
    expect(metrics.bookingsCancelled).toBe(1);
    expect(metrics.intentsCancelled).toBe(2);
    expect(metrics.refundsIssued).toBe(0);
    expect(metrics.errors).toHaveLength(0);

    // Verify both intents were cancelled
    expect(mockPaymentIntentsCancel).toHaveBeenCalledTimes(2);
    expect(mockPaymentIntentsCancel).toHaveBeenCalledWith('pi_auth_1', {
      idempotencyKey: 'booking-1:attendee-1:participant:cancel',
    });
    expect(mockPaymentIntentsCancel).toHaveBeenCalledWith('pi_auth_2', {
      idempotencyKey: 'booking-1:attendee-2:participant:cancel',
    });

    // Verify atomic DB update
    expect(mockBookingParticipantUpdateMany).toHaveBeenCalledWith({
      where: { bookingId: 'booking-1' },
      data: { paymentStatus: 'refunded' },
    });
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { status: 'cancelled' },
    });
  });

  it('refunds captured intents with refund_application_fee: true', async () => {
    const booking = buildPendingBooking({
      participants: [
        {
          id: 'bp-1',
          rosterId: 'attendee-1',
          role: 'participant',
          stripePaymentIntentId: 'pi_cap_1',
          paymentStatus: 'captured',
        },
        {
          id: 'bp-2',
          rosterId: 'attendee-2',
          role: 'participant',
          stripePaymentIntentId: 'pi_cap_2',
          paymentStatus: 'captured',
        },
      ],
    });
    mockBookingFindMany.mockResolvedValue([booking]);

    const metrics = await processEventCutoffs(mockPrisma);

    expect(metrics.refundsIssued).toBe(2);
    expect(metrics.intentsCancelled).toBe(0);
    expect(metrics.bookingsCancelled).toBe(1);

    expect(mockRefundsCreate).toHaveBeenCalledTimes(2);
    expect(mockRefundsCreate).toHaveBeenCalledWith(
      {
        payment_intent: 'pi_cap_1',
        refund_application_fee: true,
      },
      {
        idempotencyKey: 'booking-1:attendee-1:participant:refund',
      },
    );
    expect(mockRefundsCreate).toHaveBeenCalledWith(
      {
        payment_intent: 'pi_cap_2',
        refund_application_fee: true,
      },
      {
        idempotencyKey: 'booking-1:attendee-2:participant:refund',
      },
    );
  });

  it('handles a mix of authorized and captured intents', async () => {
    const booking = buildPendingBooking({
      participants: [
        {
          id: 'bp-1',
          rosterId: 'attendee-1',
          role: 'participant',
          stripePaymentIntentId: 'pi_auth_1',
          paymentStatus: 'authorized',
        },
        {
          id: 'bp-2',
          rosterId: 'attendee-2',
          role: 'participant',
          stripePaymentIntentId: 'pi_cap_1',
          paymentStatus: 'captured',
        },
      ],
    });
    mockBookingFindMany.mockResolvedValue([booking]);

    const metrics = await processEventCutoffs(mockPrisma);

    expect(metrics.intentsCancelled).toBe(1);
    expect(metrics.refundsIssued).toBe(1);
    expect(metrics.bookingsCancelled).toBe(1);
    expect(mockPaymentIntentsCancel).toHaveBeenCalledTimes(1);
    expect(mockRefundsCreate).toHaveBeenCalledTimes(1);
  });

  it('skips bookings that already meet minimum attendee count', async () => {
    const booking = buildPendingBooking({
      minAttendeeCount: 2,
      participants: [
        {
          id: 'bp-1',
          rosterId: 'a-1',
          role: 'participant',
          stripePaymentIntentId: 'pi_1',
          paymentStatus: 'authorized',
        },
        {
          id: 'bp-2',
          rosterId: 'a-2',
          role: 'participant',
          stripePaymentIntentId: 'pi_2',
          paymentStatus: 'authorized',
        },
      ],
    });
    mockBookingFindMany.mockResolvedValue([booking]);

    const metrics = await processEventCutoffs(mockPrisma);

    expect(metrics.bookingsCancelled).toBe(0);
    expect(mockPaymentIntentsCancel).not.toHaveBeenCalled();
    expect(mockRefundsCreate).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('skips participants with no stripePaymentIntentId', async () => {
    const booking = buildPendingBooking({
      participants: [
        {
          id: 'bp-1',
          rosterId: 'a-1',
          role: 'participant',
          stripePaymentIntentId: null,
          paymentStatus: 'authorized',
        },
        {
          id: 'bp-2',
          rosterId: 'a-2',
          role: 'participant',
          stripePaymentIntentId: 'pi_auth_1',
          paymentStatus: 'authorized',
        },
      ],
    });
    mockBookingFindMany.mockResolvedValue([booking]);

    const metrics = await processEventCutoffs(mockPrisma);

    expect(metrics.intentsCancelled).toBe(1);
    expect(mockPaymentIntentsCancel).toHaveBeenCalledTimes(1);
  });

  it('treats payment_intent_unexpected_state as a no-op', async () => {
    const stripeError = new Error('Intent already cancelled');
    (stripeError as any).code = 'payment_intent_unexpected_state';
    mockPaymentIntentsCancel.mockRejectedValueOnce(stripeError);

    const booking = buildPendingBooking({
      participants: [
        {
          id: 'bp-1',
          rosterId: 'a-1',
          role: 'participant',
          stripePaymentIntentId: 'pi_already_cancelled',
          paymentStatus: 'authorized',
        },
      ],
    });
    mockBookingFindMany.mockResolvedValue([booking]);

    const metrics = await processEventCutoffs(mockPrisma);

    // Should still succeed — the error is swallowed
    expect(metrics.bookingsCancelled).toBe(1);
    expect(metrics.intentsCancelled).toBe(0);
    expect(metrics.errors).toHaveLength(0);
  });

  it('captures per-booking errors without crashing the job', async () => {
    const booking1 = buildPendingBooking({ id: 'booking-fail' });
    const booking2 = buildPendingBooking({
      id: 'booking-ok',
      participants: [
        {
          id: 'bp-3',
          rosterId: 'a-3',
          role: 'participant',
          stripePaymentIntentId: 'pi_ok',
          paymentStatus: 'authorized',
        },
      ],
    });

    mockBookingFindMany.mockResolvedValue([booking1, booking2]);

    // First booking's cancel call throws a real error
    mockPaymentIntentsCancel
      .mockRejectedValueOnce(new Error('Stripe network error'))
      .mockResolvedValueOnce({}) // second participant of booking1 won't be reached
      .mockResolvedValueOnce({}); // booking2's participant

    const metrics = await processEventCutoffs(mockPrisma);

    expect(metrics.bookingsChecked).toBe(2);
    expect(metrics.bookingsCancelled).toBe(1);
    expect(metrics.errors).toHaveLength(1);
    expect(metrics.errors[0].bookingId).toBe('booking-fail');
  });

  it('notifies organizer when event is cancelled', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const booking = buildPendingBooking();
    mockBookingFindMany.mockResolvedValue([booking]);

    const metrics = await processEventCutoffs(mockPrisma);

    expect(metrics.notificationsSent).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('organizer-1'),
    );
    consoleSpy.mockRestore();
  });

  it('processes multiple bookings independently', async () => {
    const bookings = [
      buildPendingBooking({ id: 'b-1', event: { id: 'e-1', title: 'Game A', startTime: new Date(Date.now() - 60_000), organizerId: 'org-1' } }),
      buildPendingBooking({ id: 'b-2', event: { id: 'e-2', title: 'Game B', startTime: new Date(Date.now() - 60_000), organizerId: 'org-2' } }),
    ];
    mockBookingFindMany.mockResolvedValue(bookings);

    const metrics = await processEventCutoffs(mockPrisma);

    expect(metrics.bookingsChecked).toBe(2);
    expect(metrics.bookingsCancelled).toBe(2);
    expect(metrics.notificationsSent).toBe(2);
  });

  it('handles booking with no event gracefully (no notification)', async () => {
    const booking = buildPendingBooking({ event: null });
    mockBookingFindMany.mockResolvedValue([booking]);

    const metrics = await processEventCutoffs(mockPrisma);

    expect(metrics.bookingsCancelled).toBe(1);
    expect(metrics.notificationsSent).toBe(0);
  });

  it('skips participants with pending paymentStatus (not yet authorized)', async () => {
    const booking = buildPendingBooking({
      participants: [
        {
          id: 'bp-1',
          rosterId: 'a-1',
          role: 'participant',
          stripePaymentIntentId: 'pi_pending',
          paymentStatus: 'pending',
        },
      ],
    });
    mockBookingFindMany.mockResolvedValue([booking]);

    const metrics = await processEventCutoffs(mockPrisma);

    expect(metrics.bookingsCancelled).toBe(1);
    expect(metrics.intentsCancelled).toBe(0);
    expect(metrics.refundsIssued).toBe(0);
    // No Stripe calls for pending intents
    expect(mockPaymentIntentsCancel).not.toHaveBeenCalled();
    expect(mockRefundsCreate).not.toHaveBeenCalled();
  });
});
