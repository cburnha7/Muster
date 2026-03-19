/**
 * Integration tests for the two-party escrow flow.
 *
 * Tests the full captureEscrow flow end-to-end with mocked Stripe SDK
 * and Prisma, covering all four two-party outcomes:
 *   1. Both succeed
 *   2. Home (A) fails
 *   3. Away (B) fails
 *   4. Both fail
 */

// ---------------------------------------------------------------------------
// Mocks — declared before imports
// ---------------------------------------------------------------------------

const mockSnapshotPolicy = jest.fn();

jest.mock('../../services/stripe-connect', () => ({
  stripe: {
    paymentIntents: {
      create: jest.fn(),
      capture: jest.fn(),
      cancel: jest.fn(),
    },
  },
  calculatePlatformFee: jest.fn(),
}));

jest.mock('../../index', () => ({
  prisma: {
    bookingParticipant: {
      update: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../utils/idempotency', () => ({
  generateIdempotencyKey: jest.fn(
    (bookingId: string, role: string, action: string) =>
      `${bookingId}:${role}:${action}`,
  ),
  IdempotencyAction: {
    CREATE: 'create',
    CAPTURE: 'capture',
    CANCEL: 'cancel',
    REFUND: 'refund',
  },
}));

jest.mock('../../services/cancellation', () => ({
  snapshotPolicy: (...args: unknown[]) => mockSnapshotPolicy(...args),
}));

// ---------------------------------------------------------------------------
// Imports (resolved to mocked versions)
// ---------------------------------------------------------------------------

import { stripe } from '../../services/stripe-connect';
import { prisma } from '../../index';
import { captureEscrow } from '../../services/escrow';

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const BOOKING_ID = 'booking-integ-001';
const FACILITY_ID = 'facility-integ-xyz';

const homeParticipant = {
  id: 'p-home-integ',
  bookingId: BOOKING_ID,
  rosterId: 'roster-home',
  role: 'home',
  escrowAmount: 2500,
  stripePaymentIntentId: 'pi_home_integ',
  paymentStatus: 'authorized',
};

const awayParticipant = {
  id: 'p-away-integ',
  bookingId: BOOKING_ID,
  rosterId: 'roster-away',
  role: 'away',
  escrowAmount: 2500,
  stripePaymentIntentId: 'pi_away_integ',
  paymentStatus: 'authorized',
};

function capturedIntent(id: string) {
  return { id, status: 'succeeded', object: 'payment_intent' };
}

// ---------------------------------------------------------------------------
// Helpers to wire up the common mock plumbing
// ---------------------------------------------------------------------------

function setupParticipantsAndBooking() {
  (prisma.bookingParticipant.findMany as jest.Mock).mockResolvedValue([
    homeParticipant,
    awayParticipant,
  ]);
  (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
    facilityId: FACILITY_ID,
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Two-party escrow flow integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSnapshotPolicy.mockResolvedValue(undefined);
  });

  // =========================================================================
  // Scenario 1: Both succeed
  // =========================================================================

  describe('both succeed', () => {
    let txUpdateMany: jest.Mock;
    let txBookingUpdate: jest.Mock;

    beforeEach(async () => {
      setupParticipantsAndBooking();

      (stripe.paymentIntents.capture as jest.Mock)
        .mockResolvedValueOnce(capturedIntent('pi_home_integ'))
        .mockResolvedValueOnce(capturedIntent('pi_away_integ'));

      txUpdateMany = jest.fn();
      txBookingUpdate = jest.fn();
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (cb: Function) =>
          cb({
            bookingParticipant: { updateMany: txUpdateMany },
            booking: { update: txBookingUpdate },
          }),
      );

      await captureEscrow(BOOKING_ID);
    });

    it('captures both home and away PaymentIntents', () => {
      expect(stripe.paymentIntents.capture).toHaveBeenCalledTimes(2);
      expect(stripe.paymentIntents.capture).toHaveBeenCalledWith(
        'pi_home_integ',
        { idempotencyKey: `${BOOKING_ID}:home:capture` },
      );
      expect(stripe.paymentIntents.capture).toHaveBeenCalledWith(
        'pi_away_integ',
        { idempotencyKey: `${BOOKING_ID}:away:capture` },
      );
    });

    it('marks both participants as captured', () => {
      expect(txUpdateMany).toHaveBeenCalledWith({
        where: { bookingId: BOOKING_ID, paymentStatus: 'authorized' },
        data: { paymentStatus: 'captured' },
      });
    });

    it('confirms the booking', () => {
      expect(txBookingUpdate).toHaveBeenCalledWith({
        where: { id: BOOKING_ID },
        data: { status: 'confirmed' },
      });
    });

    it('snapshots the facility cancellation policy', () => {
      expect(mockSnapshotPolicy).toHaveBeenCalledWith(
        BOOKING_ID,
        FACILITY_ID,
        expect.objectContaining({
          bookingParticipant: expect.any(Object),
          booking: expect.any(Object),
        }),
      );
    });

    it('does not cancel any intents', () => {
      expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Scenario 2: Home (A) fails
  // =========================================================================

  describe('home (A) fails', () => {
    let txUpdateMany: jest.Mock;

    beforeEach(() => {
      setupParticipantsAndBooking();

      // Home capture fails, away capture succeeds
      (stripe.paymentIntents.capture as jest.Mock)
        .mockRejectedValueOnce(new Error('Home card declined'))
        .mockResolvedValueOnce(capturedIntent('pi_away_integ'));

      (stripe.paymentIntents.cancel as jest.Mock).mockResolvedValue({});

      txUpdateMany = jest.fn();
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (cb: Function) =>
          cb({ bookingParticipant: { updateMany: txUpdateMany } }),
      );
    });

    it('cancels the away intent that succeeded', async () => {
      await expect(captureEscrow(BOOKING_ID)).rejects.toThrow(
        /Escrow capture failed/,
      );

      expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith(
        'pi_away_integ',
        { idempotencyKey: `${BOOKING_ID}:away:cancel` },
      );
    });

    it('does not cancel the home intent that failed', async () => {
      await expect(captureEscrow(BOOKING_ID)).rejects.toThrow();

      // cancel should only be called once — for the away intent
      expect(stripe.paymentIntents.cancel).toHaveBeenCalledTimes(1);
    });

    it('resets both participants to pending', async () => {
      await expect(captureEscrow(BOOKING_ID)).rejects.toThrow();

      expect(txUpdateMany).toHaveBeenCalledWith({
        where: { bookingId: BOOKING_ID, paymentStatus: 'authorized' },
        data: { paymentStatus: 'pending' },
      });
    });

    it('does not confirm the booking', async () => {
      await expect(captureEscrow(BOOKING_ID)).rejects.toThrow();

      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('does not snapshot the cancellation policy', async () => {
      await expect(captureEscrow(BOOKING_ID)).rejects.toThrow();

      expect(mockSnapshotPolicy).not.toHaveBeenCalled();
    });

    it('includes the failure reason in the error', async () => {
      await expect(captureEscrow(BOOKING_ID)).rejects.toThrow(
        /Home card declined/,
      );
    });
  });

  // =========================================================================
  // Scenario 3: Away (B) fails
  // =========================================================================

  describe('away (B) fails', () => {
    let txUpdateMany: jest.Mock;

    beforeEach(() => {
      setupParticipantsAndBooking();

      // Home capture succeeds, away capture fails
      (stripe.paymentIntents.capture as jest.Mock)
        .mockResolvedValueOnce(capturedIntent('pi_home_integ'))
        .mockRejectedValueOnce(new Error('Away insufficient funds'));

      (stripe.paymentIntents.cancel as jest.Mock).mockResolvedValue({});

      txUpdateMany = jest.fn();
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (cb: Function) =>
          cb({ bookingParticipant: { updateMany: txUpdateMany } }),
      );
    });

    it('cancels the home intent that succeeded', async () => {
      await expect(captureEscrow(BOOKING_ID)).rejects.toThrow(
        /Escrow capture failed/,
      );

      expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith(
        'pi_home_integ',
        { idempotencyKey: `${BOOKING_ID}:home:cancel` },
      );
    });

    it('does not cancel the away intent that failed', async () => {
      await expect(captureEscrow(BOOKING_ID)).rejects.toThrow();

      expect(stripe.paymentIntents.cancel).toHaveBeenCalledTimes(1);
    });

    it('resets both participants to pending', async () => {
      await expect(captureEscrow(BOOKING_ID)).rejects.toThrow();

      expect(txUpdateMany).toHaveBeenCalledWith({
        where: { bookingId: BOOKING_ID, paymentStatus: 'authorized' },
        data: { paymentStatus: 'pending' },
      });
    });

    it('does not confirm the booking', async () => {
      await expect(captureEscrow(BOOKING_ID)).rejects.toThrow();

      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('does not snapshot the cancellation policy', async () => {
      await expect(captureEscrow(BOOKING_ID)).rejects.toThrow();

      expect(mockSnapshotPolicy).not.toHaveBeenCalled();
    });

    it('includes the failure reason in the error', async () => {
      await expect(captureEscrow(BOOKING_ID)).rejects.toThrow(
        /Away insufficient funds/,
      );
    });
  });

  // =========================================================================
  // Scenario 4: Both fail
  // =========================================================================

  describe('both fail', () => {
    let txUpdateMany: jest.Mock;

    beforeEach(() => {
      setupParticipantsAndBooking();

      // Both captures fail
      (stripe.paymentIntents.capture as jest.Mock)
        .mockRejectedValueOnce(new Error('Home card expired'))
        .mockRejectedValueOnce(new Error('Away card expired'));

      (stripe.paymentIntents.cancel as jest.Mock).mockResolvedValue({});

      txUpdateMany = jest.fn();
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (cb: Function) =>
          cb({ bookingParticipant: { updateMany: txUpdateMany } }),
      );
    });

    it('does not cancel any intents (none succeeded)', async () => {
      await expect(captureEscrow(BOOKING_ID)).rejects.toThrow();

      expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled();
    });

    it('resets both participants to pending', async () => {
      await expect(captureEscrow(BOOKING_ID)).rejects.toThrow();

      expect(txUpdateMany).toHaveBeenCalledWith({
        where: { bookingId: BOOKING_ID, paymentStatus: 'authorized' },
        data: { paymentStatus: 'pending' },
      });
    });

    it('does not confirm the booking', async () => {
      await expect(captureEscrow(BOOKING_ID)).rejects.toThrow();

      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('does not snapshot the cancellation policy', async () => {
      await expect(captureEscrow(BOOKING_ID)).rejects.toThrow();

      expect(mockSnapshotPolicy).not.toHaveBeenCalled();
    });

    it('includes both failure reasons in the error', async () => {
      await expect(captureEscrow(BOOKING_ID)).rejects.toThrow(
        /Home card expired.*Away card expired/,
      );
    });
  });
});
