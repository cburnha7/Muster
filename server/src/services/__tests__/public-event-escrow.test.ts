/**
 * Unit tests for capturePublicEventEscrow
 *
 * Covers: minimum reached (capture all), capture failure handling,
 * facility payment via separate transfer, and booking confirmation.
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

const mockSnapshotPolicy = jest.fn();

jest.mock('../stripe-connect', () => ({
  stripe: {
    paymentIntents: {
      capture: jest.fn(),
      cancel: jest.fn(),
    },
    transfers: {
      create: jest.fn(),
    },
    refunds: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../../index', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    facility: {
      findUnique: jest.fn(),
    },
    bookingParticipant: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../utils/idempotency', () => ({
  generateIdempotencyKey: jest.fn(),
  IdempotencyAction: { CREATE: 'create', CAPTURE: 'capture', CANCEL: 'cancel', REFUND: 'refund' },
}));

jest.mock('../cancellation', () => ({
  snapshotPolicy: function () { return mockSnapshotPolicy.apply(null, arguments); },
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { stripe } from '../stripe-connect';
import { prisma } from '../../index';
import { generateIdempotencyKey } from '../../utils/idempotency';
import { capturePublicEventEscrow, facilityCancelPublicEvent } from '../public-event-escrow';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BOOKING_ID = 'booking-pub-001';
const FACILITY_ID = 'facility-001';
const FACILITY_CONNECT_ID = 'acct_facility_pub';

function makeBooking(overrides) {
  return {
    id: BOOKING_ID,
    bookingType: 'public_event',
    status: 'pending',
    facilityId: FACILITY_ID,
    totalPrice: 100,
    minAttendeeCount: 3,
    stripeTransferGroup: BOOKING_ID,
    ...overrides,
  };
}

function makeParticipant(index, overrides) {
  return {
    id: `bp-attendee-${index}`,
    bookingId: BOOKING_ID,
    rosterId: `user-${index}`,
    role: 'participant',
    escrowAmount: 2000,
    stripePaymentIntentId: `pi_attendee_${index}`,
    paymentStatus: 'authorized',
    ...overrides,
  };
}

function setupHappyPath(participantCount) {
  const count = participantCount || 3;
  const participants = Array.from({ length: count }, function (_, i) { return makeParticipant(i); });

  (prisma.booking.findUnique).mockResolvedValue(makeBooking());
  (prisma.facility.findUnique).mockResolvedValue({
    stripeConnectAccountId: FACILITY_CONNECT_ID,
  });
  (prisma.bookingParticipant.findMany).mockResolvedValue(participants);
  (stripe.paymentIntents.capture).mockResolvedValue({ status: 'succeeded' });
  (stripe.transfers.create).mockResolvedValue({ id: 'tr_test_123' });
  (prisma.$transaction).mockImplementation(async (cb) =>
    cb({
      bookingParticipant: { updateMany: jest.fn() },
      booking: { update: jest.fn() },
    }),
  );
  mockSnapshotPolicy.mockResolvedValue(undefined);

  return participants;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('capturePublicEventEscrow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (generateIdempotencyKey).mockImplementation(
      (bookingId, role, action) => `${bookingId}:${role}:${action}`,
    );
  });

  // --- Happy path: minimum reached, capture all ---

  describe('when minimum attendee count is reached', () => {
    it('captures all attendee PaymentIntents simultaneously', async () => {
      const participants = setupHappyPath(3);

      await capturePublicEventEscrow(BOOKING_ID);

      expect(stripe.paymentIntents.capture).toHaveBeenCalledTimes(3);
      participants.forEach((p) => {
        expect(stripe.paymentIntents.capture).toHaveBeenCalledWith(
          p.stripePaymentIntentId,
          expect.objectContaining({ idempotencyKey: expect.any(String) }),
        );
      });
    });

    it('uses idempotency keys for each capture', async () => {
      setupHappyPath(3);

      await capturePublicEventEscrow(BOOKING_ID);

      expect(stripe.paymentIntents.capture).toHaveBeenCalledWith(
        'pi_attendee_0',
        { idempotencyKey: `${BOOKING_ID}:user-0:participant:capture` },
      );
      expect(stripe.paymentIntents.capture).toHaveBeenCalledWith(
        'pi_attendee_1',
        { idempotencyKey: `${BOOKING_ID}:user-1:participant:capture` },
      );
    });

    it('pays the facility court cost via a separate Stripe Transfer', async () => {
      setupHappyPath(3);

      await capturePublicEventEscrow(BOOKING_ID);

      expect(stripe.transfers.create).toHaveBeenCalledWith(
        {
          amount: 10000,
          currency: 'usd',
          destination: FACILITY_CONNECT_ID,
          transfer_group: BOOKING_ID,
          metadata: {
            booking_id: BOOKING_ID,
            type: 'facility_court_cost',
          },
        },
        {
          idempotencyKey: `${BOOKING_ID}:facility:create`,
        },
      );
    });

    it('updates all participants to captured and booking to confirmed atomically', async () => {
      const mockUpdateMany = jest.fn();
      const mockBookingUpdate = jest.fn();
      setupHappyPath(3);
      (prisma.$transaction).mockImplementation(async (cb) =>
        cb({
          bookingParticipant: { updateMany: mockUpdateMany },
          booking: { update: mockBookingUpdate },
        }),
      );

      await capturePublicEventEscrow(BOOKING_ID);

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { bookingId: BOOKING_ID, role: 'participant', paymentStatus: 'authorized' },
        data: { paymentStatus: 'captured' },
      });
      expect(mockBookingUpdate).toHaveBeenCalledWith({
        where: { id: BOOKING_ID },
        data: { status: 'confirmed' },
      });
    });

    it('snapshots the facility cancellation policy inside the transaction', async () => {
      const txProxy = {
        bookingParticipant: { updateMany: jest.fn() },
        booking: { update: jest.fn() },
      };
      setupHappyPath(3);
      (prisma.$transaction).mockImplementation(async (cb) => cb(txProxy));

      await capturePublicEventEscrow(BOOKING_ID);

      expect(mockSnapshotPolicy).toHaveBeenCalledWith(BOOKING_ID, FACILITY_ID, txProxy);
    });

    it('works when attendee count exceeds minimum', async () => {
      setupHappyPath(5);

      await capturePublicEventEscrow(BOOKING_ID);

      expect(stripe.paymentIntents.capture).toHaveBeenCalledTimes(5);
      expect(stripe.transfers.create).toHaveBeenCalledTimes(1);
    });
  });

  // --- Capture failure handling ---

  describe('when a capture fails', () => {
    it('cancels all successfully captured intents', async () => {
      setupHappyPath(3);
      (stripe.paymentIntents.capture)
        .mockResolvedValueOnce({ status: 'succeeded' })
        .mockResolvedValueOnce({ status: 'succeeded' })
        .mockRejectedValueOnce(new Error('Card declined'));

      (stripe.paymentIntents.cancel).mockResolvedValue({});
      (prisma.$transaction).mockImplementation(async (cb) =>
        cb({ bookingParticipant: { updateMany: jest.fn() } }),
      );

      await expect(capturePublicEventEscrow(BOOKING_ID)).rejects.toThrow(
        /Public event escrow capture failed/,
      );

      expect(stripe.paymentIntents.cancel).toHaveBeenCalledTimes(2);
      expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith(
        'pi_attendee_0',
        expect.objectContaining({ idempotencyKey: expect.any(String) }),
      );
      expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith(
        'pi_attendee_1',
        expect.objectContaining({ idempotencyKey: expect.any(String) }),
      );
    });

    it('resets all participants to pending status', async () => {
      setupHappyPath(3);
      (stripe.paymentIntents.capture)
        .mockResolvedValueOnce({ status: 'succeeded' })
        .mockRejectedValueOnce(new Error('Card declined'))
        .mockResolvedValueOnce({ status: 'succeeded' });

      (stripe.paymentIntents.cancel).mockResolvedValue({});
      const mockUpdateMany = jest.fn();
      (prisma.$transaction).mockImplementation(async (cb) =>
        cb({ bookingParticipant: { updateMany: mockUpdateMany } }),
      );

      await expect(capturePublicEventEscrow(BOOKING_ID)).rejects.toThrow(
        /Public event escrow capture failed/,
      );

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { bookingId: BOOKING_ID, role: 'participant', paymentStatus: 'authorized' },
        data: { paymentStatus: 'pending' },
      });
    });

    it('does not pay the facility when capture fails', async () => {
      setupHappyPath(3);
      (stripe.paymentIntents.capture)
        .mockResolvedValueOnce({ status: 'succeeded' })
        .mockRejectedValueOnce(new Error('Card declined'))
        .mockResolvedValueOnce({ status: 'succeeded' });

      (stripe.paymentIntents.cancel).mockResolvedValue({});
      (prisma.$transaction).mockImplementation(async (cb) =>
        cb({ bookingParticipant: { updateMany: jest.fn() } }),
      );

      await expect(capturePublicEventEscrow(BOOKING_ID)).rejects.toThrow();

      expect(stripe.transfers.create).not.toHaveBeenCalled();
    });

    it('does not snapshot policy when capture fails', async () => {
      setupHappyPath(3);
      (stripe.paymentIntents.capture)
        .mockRejectedValueOnce(new Error('Fail'));

      (stripe.paymentIntents.cancel).mockResolvedValue({});
      (prisma.$transaction).mockImplementation(async (cb) =>
        cb({ bookingParticipant: { updateMany: jest.fn() } }),
      );

      await expect(capturePublicEventEscrow(BOOKING_ID)).rejects.toThrow();

      expect(mockSnapshotPolicy).not.toHaveBeenCalled();
    });

    it('includes failure reasons in the error message', async () => {
      setupHappyPath(2);
      (prisma.booking.findUnique).mockResolvedValue(
        makeBooking({ minAttendeeCount: 2 }),
      );
      (stripe.paymentIntents.capture)
        .mockRejectedValueOnce(new Error('Card declined'))
        .mockRejectedValueOnce(new Error('Insufficient funds'));

      (prisma.$transaction).mockImplementation(async (cb) =>
        cb({ bookingParticipant: { updateMany: jest.fn() } }),
      );

      await expect(capturePublicEventEscrow(BOOKING_ID)).rejects.toThrow(
        /Card declined.*Insufficient funds/,
      );
    });
  });

  // --- Validation errors ---

  describe('validation', () => {
    it('throws if booking not found', async () => {
      (prisma.booking.findUnique).mockResolvedValue(null);

      await expect(capturePublicEventEscrow(BOOKING_ID)).rejects.toThrow(
        `Booking ${BOOKING_ID} not found`,
      );
    });

    it('throws if booking is not a public event', async () => {
      (prisma.booking.findUnique).mockResolvedValue(
        makeBooking({ bookingType: 'game_challenge' }),
      );

      await expect(capturePublicEventEscrow(BOOKING_ID)).rejects.toThrow(
        /not a public event/,
      );
    });

    it('throws if booking has no facility', async () => {
      (prisma.booking.findUnique).mockResolvedValue(
        makeBooking({ facilityId: null }),
      );

      await expect(capturePublicEventEscrow(BOOKING_ID)).rejects.toThrow(
        /no associated facility/,
      );
    });

    it('throws if facility has no Stripe Connect account', async () => {
      (prisma.booking.findUnique).mockResolvedValue(makeBooking());
      (prisma.facility.findUnique).mockResolvedValue({
        stripeConnectAccountId: null,
      });

      await expect(capturePublicEventEscrow(BOOKING_ID)).rejects.toThrow(
        /no Stripe Connect account/,
      );
    });

    it('throws if minimum attendee count not reached', async () => {
      (prisma.booking.findUnique).mockResolvedValue(
        makeBooking({ minAttendeeCount: 5 }),
      );
      (prisma.facility.findUnique).mockResolvedValue({
        stripeConnectAccountId: FACILITY_CONNECT_ID,
      });
      (prisma.bookingParticipant.findMany).mockResolvedValue([
        makeParticipant(0),
        makeParticipant(1),
      ]);

      await expect(capturePublicEventEscrow(BOOKING_ID)).rejects.toThrow(
        /Minimum attendee count not reached.*2\/5/,
      );
    });

    it('throws if no authorized participants found', async () => {
      (prisma.booking.findUnique).mockResolvedValue(
        makeBooking({ minAttendeeCount: 0 }),
      );
      (prisma.facility.findUnique).mockResolvedValue({
        stripeConnectAccountId: FACILITY_CONNECT_ID,
      });
      (prisma.bookingParticipant.findMany).mockResolvedValue([]);

      await expect(capturePublicEventEscrow(BOOKING_ID)).rejects.toThrow(
        /No authorized attendee participants/,
      );
    });
  });
});



// ---------------------------------------------------------------------------
// facilityCancelPublicEvent tests
// ---------------------------------------------------------------------------

describe('facilityCancelPublicEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (generateIdempotencyKey as jest.Mock).mockImplementation(
      (bookingId: string, role: string, action: string) => `${bookingId}:${role}:${action}`,
    );
  });

  function makeCancelBooking(overrides?: Record<string, any>) {
    return {
      id: BOOKING_ID,
      bookingType: 'public_event',
      status: 'confirmed',
      ...overrides,
    };
  }

  function makeCancelParticipant(index: number, overrides?: Record<string, any>) {
    return {
      id: `bp-attendee-${index}`,
      bookingId: BOOKING_ID,
      rosterId: `user-${index}`,
      role: 'participant',
      stripePaymentIntentId: `pi_attendee_${index}`,
      paymentStatus: 'captured',
      ...overrides,
    };
  }

  function setupCancelHappyPath(participantCount?: number, paymentStatus?: string) {
    const count = participantCount || 3;
    const status = paymentStatus || 'captured';
    const participants = Array.from({ length: count }, (_, i) =>
      makeCancelParticipant(i, { paymentStatus: status }),
    );

    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(makeCancelBooking());
    (prisma.bookingParticipant.findMany as jest.Mock).mockResolvedValue(participants);
    (stripe.refunds as any).create.mockResolvedValue({ id: 'refund_test' });
    (stripe.paymentIntents.cancel as jest.Mock).mockResolvedValue({});
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) =>
      cb({
        bookingParticipant: { updateMany: jest.fn() },
        booking: { update: jest.fn() },
      }),
    );

    return participants;
  }

  // --- Happy path: captured intents ---

  describe('when all attendee intents are captured', () => {
    it('refunds all attendees with reverse_transfer and refund_application_fee', async () => {
      const participants = setupCancelHappyPath(3, 'captured');

      await facilityCancelPublicEvent(BOOKING_ID);

      expect((stripe.refunds as any).create).toHaveBeenCalledTimes(3);
      participants.forEach((p) => {
        expect((stripe.refunds as any).create).toHaveBeenCalledWith(
          {
            payment_intent: p.stripePaymentIntentId,
            reverse_transfer: true,
            refund_application_fee: true,
          },
          {
            idempotencyKey: `${BOOKING_ID}:${p.rosterId}:${p.role}:refund`,
          },
        );
      });
    });

    it('does not call paymentIntents.cancel for captured intents', async () => {
      setupCancelHappyPath(3, 'captured');

      await facilityCancelPublicEvent(BOOKING_ID);

      expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled();
    });

    it('updates all participants to refunded and booking to facility_cancelled atomically', async () => {
      const mockUpdateMany = jest.fn();
      const mockBookingUpdate = jest.fn();
      setupCancelHappyPath(3, 'captured');
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) =>
        cb({
          bookingParticipant: { updateMany: mockUpdateMany },
          booking: { update: mockBookingUpdate },
        }),
      );

      await facilityCancelPublicEvent(BOOKING_ID);

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { bookingId: BOOKING_ID, stripePaymentIntentId: { not: null } },
        data: { paymentStatus: 'refunded' },
      });
      expect(mockBookingUpdate).toHaveBeenCalledWith({
        where: { id: BOOKING_ID },
        data: { status: 'facility_cancelled' },
      });
    });
  });

  // --- Authorized (uncaptured) intents ---

  describe('when attendee intents are authorized but not captured', () => {
    it('cancels all authorized intents instead of refunding', async () => {
      const participants = setupCancelHappyPath(3, 'authorized');

      await facilityCancelPublicEvent(BOOKING_ID);

      expect(stripe.paymentIntents.cancel).toHaveBeenCalledTimes(3);
      participants.forEach((p) => {
        expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith(
          p.stripePaymentIntentId,
          {
            idempotencyKey: `${BOOKING_ID}:${p.rosterId}:${p.role}:cancel`,
          },
        );
      });
      expect((stripe.refunds as any).create).not.toHaveBeenCalled();
    });
  });

  // --- Mixed statuses ---

  describe('when participants have mixed payment statuses', () => {
    it('refunds captured and cancels authorized intents', async () => {
      const participants = [
        makeCancelParticipant(0, { paymentStatus: 'captured' }),
        makeCancelParticipant(1, { paymentStatus: 'authorized' }),
        makeCancelParticipant(2, { paymentStatus: 'captured' }),
      ];

      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(makeCancelBooking());
      (prisma.bookingParticipant.findMany as jest.Mock).mockResolvedValue(participants);
      (stripe.refunds as any).create.mockResolvedValue({ id: 'refund_test' });
      (stripe.paymentIntents.cancel as jest.Mock).mockResolvedValue({});
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) =>
        cb({
          bookingParticipant: { updateMany: jest.fn() },
          booking: { update: jest.fn() },
        }),
      );

      await facilityCancelPublicEvent(BOOKING_ID);

      expect((stripe.refunds as any).create).toHaveBeenCalledTimes(2);
      expect(stripe.paymentIntents.cancel).toHaveBeenCalledTimes(1);
      expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith(
        'pi_attendee_1',
        expect.objectContaining({ idempotencyKey: expect.any(String) }),
      );
    });
  });

  // --- Skips participants with other statuses ---

  describe('when participants have non-actionable statuses', () => {
    it('skips participants with pending status', async () => {
      const participants = [
        makeCancelParticipant(0, { paymentStatus: 'captured' }),
        makeCancelParticipant(1, { paymentStatus: 'pending' }),
      ];

      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(makeCancelBooking());
      (prisma.bookingParticipant.findMany as jest.Mock).mockResolvedValue(participants);
      (stripe.refunds as any).create.mockResolvedValue({ id: 'refund_test' });
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) =>
        cb({
          bookingParticipant: { updateMany: jest.fn() },
          booking: { update: jest.fn() },
        }),
      );

      await facilityCancelPublicEvent(BOOKING_ID);

      expect((stripe.refunds as any).create).toHaveBeenCalledTimes(1);
      expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled();
    });
  });

  // --- No participants with intents ---

  describe('when no participants have PaymentIntents', () => {
    it('still transitions booking to facility_cancelled', async () => {
      const mockBookingUpdate = jest.fn();
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(makeCancelBooking());
      (prisma.bookingParticipant.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) =>
        cb({
          bookingParticipant: { updateMany: jest.fn() },
          booking: { update: mockBookingUpdate },
        }),
      );

      await facilityCancelPublicEvent(BOOKING_ID);

      expect((stripe.refunds as any).create).not.toHaveBeenCalled();
      expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled();
      expect(mockBookingUpdate).toHaveBeenCalledWith({
        where: { id: BOOKING_ID },
        data: { status: 'facility_cancelled' },
      });
    });
  });

  // --- Validation errors ---

  describe('validation', () => {
    it('throws if booking not found', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(facilityCancelPublicEvent(BOOKING_ID)).rejects.toThrow(
        `Booking ${BOOKING_ID} not found`,
      );
    });

    it('throws if booking is not a public event', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(
        makeCancelBooking({ bookingType: 'game_challenge' }),
      );

      await expect(facilityCancelPublicEvent(BOOKING_ID)).rejects.toThrow(
        /not a public event/,
      );
    });

    it('throws if booking is already cancelled', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(
        makeCancelBooking({ status: 'cancelled' }),
      );

      await expect(facilityCancelPublicEvent(BOOKING_ID)).rejects.toThrow(
        /already cancelled/,
      );
    });

    it('throws if booking is already facility_cancelled', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(
        makeCancelBooking({ status: 'facility_cancelled' }),
      );

      await expect(facilityCancelPublicEvent(BOOKING_ID)).rejects.toThrow(
        /already cancelled/,
      );
    });
  });
});
