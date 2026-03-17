/**
 * Unit tests for escrow service — createEscrowIntent & captureEscrow
 *
 * Mocks Stripe SDK and Prisma to verify PaymentIntent creation/capture,
 * idempotency key usage, and BookingParticipant record updates.
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

const mockSnapshotPolicy = jest.fn();

jest.mock('../stripe-connect', () => ({
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
      findFirst: jest.fn(),
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
  generateIdempotencyKey: jest.fn(),
  IdempotencyAction: { CREATE: 'create', CAPTURE: 'capture', CANCEL: 'cancel', REFUND: 'refund' },
}));

jest.mock('../cancellation', () => ({
  snapshotPolicy: function () { return mockSnapshotPolicy.apply(null, arguments); },
}));

// ---------------------------------------------------------------------------
// Imports (resolved to mocked versions)
// ---------------------------------------------------------------------------

import { stripe, calculatePlatformFee } from '../stripe-connect';
import { prisma } from '../../index';
import { generateIdempotencyKey } from '../../utils/idempotency';
import { createEscrowIntent, captureEscrow, releaseEscrow } from '../escrow';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PARTICIPANT_ID = 'participant-001';
const BOOKING_ID = 'booking-abc';
const FACILITY_ID = 'facility-xyz';
const FACILITY_CONNECT_ID = 'acct_facility_123';
const AMOUNT = 5000; // $50.00
const ROLE = 'home';

function makeFakeIntent(overrides) {
  return {
    id: 'pi_test_123',
    object: 'payment_intent',
    amount: AMOUNT,
    currency: 'usd',
    status: 'requires_capture',
    capture_method: 'manual',
    ...overrides,
  };
}

function makeParticipant(overrides) {
  return {
    id: 'participant-001',
    bookingId: BOOKING_ID,
    rosterId: 'roster-home',
    role: 'home',
    escrowAmount: 2500,
    stripePaymentIntentId: 'pi_home_123',
    paymentStatus: 'authorized',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests — createEscrowIntent
// ---------------------------------------------------------------------------

describe('createEscrowIntent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (calculatePlatformFee).mockReturnValue(250);
    (generateIdempotencyKey).mockImplementation(
      (bookingId, role, action) => `${bookingId}:${role}:${action}`,
    );
    (stripe.paymentIntents.create).mockResolvedValue(makeFakeIntent());
    (prisma.bookingParticipant.update).mockResolvedValue({});
  });

  it('creates a PaymentIntent with manual capture', async () => {
    await createEscrowIntent(PARTICIPANT_ID, AMOUNT, FACILITY_CONNECT_ID, BOOKING_ID, ROLE);

    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: AMOUNT,
        currency: 'usd',
        capture_method: 'manual',
      }),
      expect.any(Object),
    );
  });

  it('sets application_fee_amount from platform fee calculation', async () => {
    await createEscrowIntent(PARTICIPANT_ID, AMOUNT, FACILITY_CONNECT_ID, BOOKING_ID, ROLE);

    expect(calculatePlatformFee).toHaveBeenCalledWith(AMOUNT);
    const [params] = (stripe.paymentIntents.create).mock.calls[0];
    expect(params.application_fee_amount).toBe(250);
  });

  it('routes funds to the facility via transfer_data.destination', async () => {
    await createEscrowIntent(PARTICIPANT_ID, AMOUNT, FACILITY_CONNECT_ID, BOOKING_ID, ROLE);

    const [params] = (stripe.paymentIntents.create).mock.calls[0];
    expect(params.transfer_data).toEqual({ destination: FACILITY_CONNECT_ID });
  });

  it('sets transfer_group to the booking ID', async () => {
    await createEscrowIntent(PARTICIPANT_ID, AMOUNT, FACILITY_CONNECT_ID, BOOKING_ID, ROLE);

    const [params] = (stripe.paymentIntents.create).mock.calls[0];
    expect(params.transfer_group).toBe(BOOKING_ID);
  });

  it('includes booking metadata on the intent', async () => {
    await createEscrowIntent(PARTICIPANT_ID, AMOUNT, FACILITY_CONNECT_ID, BOOKING_ID, ROLE);

    const [params] = (stripe.paymentIntents.create).mock.calls[0];
    expect(params.metadata).toEqual({
      booking_id: BOOKING_ID,
      participant_role: ROLE,
      participant_id: PARTICIPANT_ID,
    });
  });

  it('passes the correct idempotency key', async () => {
    await createEscrowIntent(PARTICIPANT_ID, AMOUNT, FACILITY_CONNECT_ID, BOOKING_ID, ROLE);

    expect(generateIdempotencyKey).toHaveBeenCalledWith(BOOKING_ID, ROLE, 'create');
    const [, options] = (stripe.paymentIntents.create).mock.calls[0];
    expect(options.idempotencyKey).toBe(`${BOOKING_ID}:${ROLE}:create`);
  });

  it('updates the BookingParticipant with intent ID and authorized status', async () => {
    (stripe.paymentIntents.create).mockResolvedValue(makeFakeIntent({ id: 'pi_updated_456' }));

    await createEscrowIntent(PARTICIPANT_ID, AMOUNT, FACILITY_CONNECT_ID, BOOKING_ID, ROLE);

    expect(prisma.bookingParticipant.update).toHaveBeenCalledWith({
      where: { id: PARTICIPANT_ID },
      data: {
        stripePaymentIntentId: 'pi_updated_456',
        paymentStatus: 'authorized',
      },
    });
  });

  it('returns the created PaymentIntent', async () => {
    (stripe.paymentIntents.create).mockResolvedValue(makeFakeIntent({ id: 'pi_return_789' }));

    const result = await createEscrowIntent(PARTICIPANT_ID, AMOUNT, FACILITY_CONNECT_ID, BOOKING_ID, ROLE);

    expect(result.id).toBe('pi_return_789');
    expect(result.capture_method).toBe('manual');
  });

  it('propagates Stripe errors without updating the participant', async () => {
    (stripe.paymentIntents.create).mockRejectedValue(new Error('Stripe error'));

    await expect(
      createEscrowIntent(PARTICIPANT_ID, AMOUNT, FACILITY_CONNECT_ID, BOOKING_ID, ROLE),
    ).rejects.toThrow('Stripe error');

    expect(prisma.bookingParticipant.update).not.toHaveBeenCalled();
  });

  it('works with different roles (away)', async () => {
    await createEscrowIntent(PARTICIPANT_ID, AMOUNT, FACILITY_CONNECT_ID, BOOKING_ID, 'away');

    const [params, options] = (stripe.paymentIntents.create).mock.calls[0];
    expect(params.metadata.participant_role).toBe('away');
    expect(options.idempotencyKey).toBe(`${BOOKING_ID}:away:create`);
  });
});


// ---------------------------------------------------------------------------
// Tests — captureEscrow
// ---------------------------------------------------------------------------

describe('captureEscrow', () => {
  const homeParticipant = makeParticipant({
    id: 'p-home',
    role: 'home',
    stripePaymentIntentId: 'pi_home_123',
  });
  const awayParticipant = makeParticipant({
    id: 'p-away',
    role: 'away',
    rosterId: 'roster-away',
    stripePaymentIntentId: 'pi_away_456',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (generateIdempotencyKey).mockImplementation(
      (bookingId, role, action) => `${bookingId}:${role}:${action}`,
    );

    // Default: two authorized participants
    (prisma.bookingParticipant.findMany).mockResolvedValue([
      homeParticipant,
      awayParticipant,
    ]);

    // Default: booking exists with a facility
    (prisma.booking.findUnique).mockResolvedValue({
      facilityId: FACILITY_ID,
    });

    // Default: captures succeed
    (stripe.paymentIntents.capture).mockResolvedValue(
      makeFakeIntent({ status: 'succeeded' }),
    );

    // Default: $transaction executes the callback
    (prisma.$transaction).mockImplementation(async (cb) => {
      return cb({
        bookingParticipant: { updateMany: jest.fn() },
        booking: { update: jest.fn() },
      });
    });

    mockSnapshotPolicy.mockResolvedValue(undefined);
  });

  // --- Happy path ---

  it('fetches authorized participants for the booking', async () => {
    await captureEscrow(BOOKING_ID);

    expect(prisma.bookingParticipant.findMany).toHaveBeenCalledWith({
      where: { bookingId: BOOKING_ID, paymentStatus: 'authorized' },
    });
  });

  it('fetches the booking to get the facilityId', async () => {
    await captureEscrow(BOOKING_ID);

    expect(prisma.booking.findUnique).toHaveBeenCalledWith({
      where: { id: BOOKING_ID },
      select: { facilityId: true },
    });
  });

  it('captures all participant PaymentIntents simultaneously', async () => {
    await captureEscrow(BOOKING_ID);

    expect(stripe.paymentIntents.capture).toHaveBeenCalledTimes(2);
    expect(stripe.paymentIntents.capture).toHaveBeenCalledWith('pi_home_123', {
      idempotencyKey: `${BOOKING_ID}:home:capture`,
    });
    expect(stripe.paymentIntents.capture).toHaveBeenCalledWith('pi_away_456', {
      idempotencyKey: `${BOOKING_ID}:away:capture`,
    });
  });

  it('uses correct idempotency keys for capture', async () => {
    await captureEscrow(BOOKING_ID);

    expect(generateIdempotencyKey).toHaveBeenCalledWith(BOOKING_ID, 'home', 'capture');
    expect(generateIdempotencyKey).toHaveBeenCalledWith(BOOKING_ID, 'away', 'capture');
  });

  it('updates participants to captured and booking to confirmed on success', async () => {
    const mockUpdateMany = jest.fn();
    const mockBookingUpdate = jest.fn();
    (prisma.$transaction).mockImplementation(async (cb) => {
      return cb({
        bookingParticipant: { updateMany: mockUpdateMany },
        booking: { update: mockBookingUpdate },
      });
    });

    await captureEscrow(BOOKING_ID);

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { bookingId: BOOKING_ID, paymentStatus: 'authorized' },
      data: { paymentStatus: 'captured' },
    });
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: BOOKING_ID },
      data: { status: 'confirmed' },
    });
  });

  it('calls snapshotPolicy with the booking and facility IDs inside the transaction', async () => {
    const txProxy = {
      bookingParticipant: { updateMany: jest.fn() },
      booking: { update: jest.fn() },
    };
    (prisma.$transaction).mockImplementation(async (cb) => cb(txProxy));

    await captureEscrow(BOOKING_ID);

    expect(mockSnapshotPolicy).toHaveBeenCalledWith(BOOKING_ID, FACILITY_ID, txProxy);
  });

  it('performs all DB updates atomically via $transaction', async () => {
    await captureEscrow(BOOKING_ID);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
  });

  // --- Error: no authorized participants ---

  it('throws if no authorized participants are found', async () => {
    (prisma.bookingParticipant.findMany).mockResolvedValue([]);

    await expect(captureEscrow(BOOKING_ID)).rejects.toThrow(
      `No authorized participants found for booking ${BOOKING_ID}`,
    );

    expect(stripe.paymentIntents.capture).not.toHaveBeenCalled();
  });

  // --- Error: booking not found ---

  it('throws if the booking is not found', async () => {
    (prisma.booking.findUnique).mockResolvedValue(null);

    await expect(captureEscrow(BOOKING_ID)).rejects.toThrow(
      `Booking ${BOOKING_ID} not found`,
    );

    expect(stripe.paymentIntents.capture).not.toHaveBeenCalled();
  });

  // --- Error: booking has no facility ---

  it('throws if the booking has no associated facility', async () => {
    (prisma.booking.findUnique).mockResolvedValue({ facilityId: null });

    await expect(captureEscrow(BOOKING_ID)).rejects.toThrow(
      `Booking ${BOOKING_ID} has no associated facility`,
    );

    expect(stripe.paymentIntents.capture).not.toHaveBeenCalled();
  });

  // --- Partial failure: one capture fails ---

  it('cancels successful captures when one fails', async () => {
    (stripe.paymentIntents.capture)
      .mockResolvedValueOnce(makeFakeIntent({ id: 'pi_home_123', status: 'succeeded' }))
      .mockRejectedValueOnce(new Error('Card declined'));

    (stripe.paymentIntents.cancel).mockResolvedValue({});
    (prisma.bookingParticipant.updateMany).mockResolvedValue({});
    (prisma.$transaction).mockImplementation(async (cb) => {
      return cb({
        bookingParticipant: { updateMany: prisma.bookingParticipant.updateMany },
      });
    });

    await expect(captureEscrow(BOOKING_ID)).rejects.toThrow(
      /Escrow capture failed/,
    );

    // The first capture succeeded, so it should be cancelled
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_home_123', {
      idempotencyKey: `${BOOKING_ID}:home:cancel`,
    });
  });

  it('resets participants to pending when capture fails', async () => {
    (stripe.paymentIntents.capture)
      .mockResolvedValueOnce(makeFakeIntent({ status: 'succeeded' }))
      .mockRejectedValueOnce(new Error('Insufficient funds'));

    (stripe.paymentIntents.cancel).mockResolvedValue({});
    const mockUpdateMany = jest.fn();
    (prisma.$transaction).mockImplementation(async (cb) => {
      return cb({
        bookingParticipant: { updateMany: mockUpdateMany },
      });
    });

    await expect(captureEscrow(BOOKING_ID)).rejects.toThrow(/Escrow capture failed/);

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { bookingId: BOOKING_ID, paymentStatus: 'authorized' },
      data: { paymentStatus: 'pending' },
    });
  });

  it('includes failure reasons in the thrown error message', async () => {
    (stripe.paymentIntents.capture)
      .mockRejectedValueOnce(new Error('Card declined'))
      .mockRejectedValueOnce(new Error('Insufficient funds'));

    (stripe.paymentIntents.cancel).mockResolvedValue({});
    (prisma.$transaction).mockImplementation(async (cb) => {
      return cb({ bookingParticipant: { updateMany: jest.fn() } });
    });

    await expect(captureEscrow(BOOKING_ID)).rejects.toThrow(
      /Card declined.*Insufficient funds/,
    );
  });

  it('does not cancel any intents when all captures fail', async () => {
    (stripe.paymentIntents.capture)
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'));

    (stripe.paymentIntents.cancel).mockResolvedValue({});
    (prisma.$transaction).mockImplementation(async (cb) => {
      return cb({ bookingParticipant: { updateMany: jest.fn() } });
    });

    await expect(captureEscrow(BOOKING_ID)).rejects.toThrow(/Escrow capture failed/);

    expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it('does not call snapshotPolicy when capture fails', async () => {
    (stripe.paymentIntents.capture)
      .mockResolvedValueOnce(makeFakeIntent({ status: 'succeeded' }))
      .mockRejectedValueOnce(new Error('Card declined'));

    (stripe.paymentIntents.cancel).mockResolvedValue({});
    (prisma.$transaction).mockImplementation(async (cb) => {
      return cb({ bookingParticipant: { updateMany: jest.fn() } });
    });

    await expect(captureEscrow(BOOKING_ID)).rejects.toThrow(/Escrow capture failed/);

    expect(mockSnapshotPolicy).not.toHaveBeenCalled();
  });

  // --- Single participant ---

  it('works with a single participant', async () => {
    (prisma.bookingParticipant.findMany).mockResolvedValue([homeParticipant]);

    const txProxy = {
      bookingParticipant: { updateMany: jest.fn() },
      booking: { update: jest.fn() },
    };
    (prisma.$transaction).mockImplementation(async (cb) => cb(txProxy));

    await captureEscrow(BOOKING_ID);

    expect(stripe.paymentIntents.capture).toHaveBeenCalledTimes(1);
    expect(txProxy.bookingParticipant.updateMany).toHaveBeenCalled();
    expect(txProxy.booking.update).toHaveBeenCalled();
    expect(mockSnapshotPolicy).toHaveBeenCalled();
  });
});


// ---------------------------------------------------------------------------
// Tests — releaseEscrow
// ---------------------------------------------------------------------------

describe('releaseEscrow', () => {
  const INTENT_ID = 'pi_release_123';
  const PARTICIPANT = {
    id: 'p-release',
    bookingId: 'booking-abc',
    rosterId: 'roster-home',
    role: 'home',
    escrowAmount: 2500,
    stripePaymentIntentId: INTENT_ID,
    paymentStatus: 'authorized',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (stripe.paymentIntents.cancel).mockResolvedValue({ id: INTENT_ID, status: 'canceled' });
    (prisma.bookingParticipant.findFirst).mockResolvedValue(PARTICIPANT);
    (prisma.bookingParticipant.update).mockResolvedValue({});
  });

  it('cancels the PaymentIntent via Stripe', async () => {
    await releaseEscrow(INTENT_ID);

    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith(INTENT_ID);
  });

  it('finds the BookingParticipant by stripePaymentIntentId', async () => {
    await releaseEscrow(INTENT_ID);

    expect(prisma.bookingParticipant.findFirst).toHaveBeenCalledWith({
      where: { stripePaymentIntentId: INTENT_ID },
    });
  });

  it('updates the participant paymentStatus to refunded', async () => {
    await releaseEscrow(INTENT_ID);

    expect(prisma.bookingParticipant.update).toHaveBeenCalledWith({
      where: { id: PARTICIPANT.id },
      data: { paymentStatus: 'refunded' },
    });
  });

  it('handles already-cancelled intents gracefully', async () => {
    const alreadyCancelledError = new Error('Intent already cancelled');
    alreadyCancelledError.code = 'payment_intent_unexpected_state';
    (stripe.paymentIntents.cancel).mockRejectedValue(alreadyCancelledError);

    await releaseEscrow(INTENT_ID);

    // Should still update the DB record
    expect(prisma.bookingParticipant.findFirst).toHaveBeenCalled();
    expect(prisma.bookingParticipant.update).toHaveBeenCalledWith({
      where: { id: PARTICIPANT.id },
      data: { paymentStatus: 'refunded' },
    });
  });

  it('propagates non-cancellation Stripe errors', async () => {
    (stripe.paymentIntents.cancel).mockRejectedValue(new Error('Network error'));

    await expect(releaseEscrow(INTENT_ID)).rejects.toThrow('Network error');

    expect(prisma.bookingParticipant.findFirst).not.toHaveBeenCalled();
    expect(prisma.bookingParticipant.update).not.toHaveBeenCalled();
  });

  it('skips DB update when no participant is found for the intent', async () => {
    (prisma.bookingParticipant.findFirst).mockResolvedValue(null);

    await releaseEscrow(INTENT_ID);

    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith(INTENT_ID);
    expect(prisma.bookingParticipant.findFirst).toHaveBeenCalled();
    expect(prisma.bookingParticipant.update).not.toHaveBeenCalled();
  });
});
