/**
 * Public Event Escrow Service
 *
 * Handles capturing attendee PaymentIntents when a public event reaches
 * its minimum attendee count, paying the facility court cost, and
 * transitioning the booking to confirmed.
 *
 * Key differences from two-party escrow (escrow.ts):
 * - Multiple attendee intents (N participants, not just 2)
 * - Attendee intents transfer to the roster manager (not the facility)
 * - Facility court cost is paid via a separate Stripe Transfer
 * - Platform fee is already on each attendee's PaymentIntent via application_fee_amount
 */

import Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import { stripe } from './stripe-connect';
import { generateIdempotencyKey, IdempotencyAction } from '../utils/idempotency';
import { snapshotPolicy } from './cancellation';

/**
 * Capture all attendee escrow intents for a public event once the minimum
 * attendee count is reached, pay the facility court cost, and confirm the booking.
 *
 * Flow:
 * 1. Fetch booking with all participants
 * 2. Verify attendee count >= minAttendeeCount
 * 3. Capture all attendee PaymentIntents simultaneously
 * 4. If any capture fails, cancel all successfully captured intents
 * 5. Pay facility court cost via a separate Stripe Transfer
 * 6. Transition booking status to 'confirmed' atomically
 *
 * @param bookingId - The public event booking ID
 * @throws Error if booking not found or not a public event
 * @throws Error if minimum attendee count not reached
 * @throws Error if no authorized participants found
 * @throws Error if any capture fails (after cleanup)
 */
export async function capturePublicEventEscrow(bookingId: string): Promise<void> {
  // 1. Fetch the booking with facility info
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      bookingType: true,
      status: true,
      facilityId: true,
      totalPrice: true,
      minAttendeeCount: true,
      stripeTransferGroup: true,
    },
  });

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  if (booking.bookingType !== 'public_event') {
    throw new Error(`Booking ${bookingId} is not a public event`);
  }

  if (!booking.facilityId) {
    throw new Error(`Booking ${bookingId} has no associated facility`);
  }

  // 2. Fetch the facility's Connect account for the court cost transfer
  const facility = await prisma.facility.findUnique({
    where: { id: booking.facilityId },
    select: { stripeConnectAccountId: true },
  });

  if (!facility?.stripeConnectAccountId) {
    throw new Error(`Facility for booking ${bookingId} has no Stripe Connect account`);
  }

  // 3. Fetch all authorized attendee participants
  const participants = await prisma.bookingParticipant.findMany({
    where: {
      bookingId,
      role: 'participant',
      paymentStatus: 'authorized',
    },
  });

  // 4. Verify minimum attendee count is reached
  const minAttendees = booking.minAttendeeCount ?? 0;
  if (participants.length < minAttendees) {
    throw new Error(
      `Minimum attendee count not reached for booking ${bookingId}: ${participants.length}/${minAttendees}`,
    );
  }

  if (participants.length === 0) {
    throw new Error(`No authorized attendee participants found for booking ${bookingId}`);
  }

  // 5. Capture all attendee PaymentIntents simultaneously
  const captureResults = await Promise.allSettled(
    participants.map((p) =>
      stripe.paymentIntents.capture(p.stripePaymentIntentId!, {
        idempotencyKey: generateIdempotencyKey(
          bookingId,
          `${p.rosterId}:participant`,
          IdempotencyAction.CAPTURE,
        ),
      }),
    ),
  );

  const allSucceeded = captureResults.every((r) => r.status === 'fulfilled');

  if (!allSucceeded) {
    // Cancel all successfully captured intents to release funds
    const cancelPromises: Promise<Stripe.PaymentIntent>[] = [];

    captureResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        cancelPromises.push(
          stripe.paymentIntents.cancel(participants[index].stripePaymentIntentId!, {
            idempotencyKey: generateIdempotencyKey(
              bookingId,
              `${participants[index].rosterId}:participant`,
              IdempotencyAction.CANCEL,
            ),
          }),
        );
      }
    });

    await Promise.allSettled(cancelPromises);

    // Reset all participants to 'pending'
    await prisma.$transaction(async (tx) => {
      await tx.bookingParticipant.updateMany({
        where: {
          bookingId,
          role: 'participant',
          paymentStatus: 'authorized',
        },
        data: { paymentStatus: 'pending' },
      });
    });

    const failures = captureResults
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => r.reason?.message || 'Unknown error');

    throw new Error(
      `Public event escrow capture failed for booking ${bookingId}: ${failures.join('; ')}`,
    );
  }

  // 6. Pay the facility court cost via a separate Stripe Transfer
  const courtCostCents = Math.round((booking.totalPrice ?? 0) * 100);

  await stripe.transfers.create(
    {
      amount: courtCostCents,
      currency: 'usd',
      destination: facility.stripeConnectAccountId,
      transfer_group: booking.stripeTransferGroup || bookingId,
      metadata: {
        booking_id: bookingId,
        type: 'facility_court_cost',
      },
    },
    {
      idempotencyKey: generateIdempotencyKey(
        bookingId,
        'facility',
        IdempotencyAction.CREATE,
      ),
    },
  );

  // 7. Atomically update all participants and booking status
  await prisma.$transaction(async (tx) => {
    await tx.bookingParticipant.updateMany({
      where: {
        bookingId,
        role: 'participant',
        paymentStatus: 'authorized',
      },
      data: { paymentStatus: 'captured' },
    });

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: 'confirmed' },
    });

    // Snapshot the facility's cancellation policy onto the booking
    await snapshotPolicy(bookingId, booking.facilityId!, tx);
  });
}

/**
 * Facility cancellation of a public event.
 *
 * When a facility cancels, ALL attendees are refunded in full including
 * platform fees. The facility payout is clawed back via `reverse_transfer: true`.
 * No cancellation policy fields are consulted — facility cancellations always
 * result in a 100% refund to every party.
 *
 * Flow:
 * 1. Fetch booking and validate it's a public event
 * 2. Fetch all participants with PaymentIntents
 * 3. For each participant:
 *    - If captured → refund with reverse_transfer + refund_application_fee
 *    - If authorized (uncaptured) → cancel the intent
 * 4. Atomically update all participants to 'refunded' and booking to 'facility_cancelled'
 *
 * @param eventId - The public event booking ID
 * @throws Error if booking not found or not a public event
 * @throws Error if booking is already cancelled
 */
export async function facilityCancelPublicEvent(eventId: string): Promise<void> {
  // 1. Fetch the booking
  const booking = await prisma.booking.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      bookingType: true,
      status: true,
    },
  });

  if (!booking) {
    throw new Error(`Booking ${eventId} not found`);
  }

  if (booking.bookingType !== 'public_event') {
    throw new Error(`Booking ${eventId} is not a public event`);
  }

  if (booking.status === 'cancelled' || booking.status === 'facility_cancelled') {
    throw new Error(`Booking ${eventId} is already cancelled`);
  }

  // 2. Fetch all participants that have PaymentIntents
  const participants = await prisma.bookingParticipant.findMany({
    where: {
      bookingId: eventId,
      stripePaymentIntentId: { not: null },
    },
    select: {
      id: true,
      rosterId: true,
      role: true,
      stripePaymentIntentId: true,
      paymentStatus: true,
    },
  });

  // 3. Process each participant's PaymentIntent
  for (const participant of participants) {
    if (!participant.stripePaymentIntentId) continue;

    if (participant.paymentStatus === 'captured') {
      // Already captured — full refund with reverse_transfer to claw back facility payout
      await stripe.refunds.create(
        {
          payment_intent: participant.stripePaymentIntentId,
          reverse_transfer: true,
          refund_application_fee: true,
        },
        {
          idempotencyKey: generateIdempotencyKey(
            eventId,
            `${participant.rosterId}:${participant.role}`,
            IdempotencyAction.REFUND,
          ),
        },
      );
    } else if (participant.paymentStatus === 'authorized') {
      // Uncaptured — cancel the hold
      await stripe.paymentIntents.cancel(
        participant.stripePaymentIntentId,
        {
          idempotencyKey: generateIdempotencyKey(
            eventId,
            `${participant.rosterId}:${participant.role}`,
            IdempotencyAction.CANCEL,
          ),
        },
      );
    }
  }

  // 4. Atomically update all participants and booking status
  await prisma.$transaction(async (tx) => {
    await tx.bookingParticipant.updateMany({
      where: {
        bookingId: eventId,
        stripePaymentIntentId: { not: null },
      },
      data: { paymentStatus: 'refunded' },
    });

    await tx.booking.update({
      where: { id: eventId },
      data: { status: 'facility_cancelled' },
    });
  });
}
