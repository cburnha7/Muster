/**
 * Escrow Service
 *
 * Manages Stripe PaymentIntents with manual capture for court-cost escrow.
 * All escrow intents use `capture_method: 'manual'` so funds are authorised
 * but not charged until both parties confirm.
 */

import Stripe from 'stripe';
import { prisma } from '../index';
import { stripe, calculatePlatformFee } from './stripe-connect';
import { generateIdempotencyKey, IdempotencyAction } from '../utils/idempotency';
import { snapshotPolicy } from './cancellation';
import { recalculateBalanceStatuses } from './balance';
import { EscrowTransactionService } from './EscrowTransactionService';

/**
 * Create an escrow PaymentIntent with manual capture for a booking participant.
 *
 * - Attaches `application_fee_amount` derived from PLATFORM_FEE_RATE
 * - Routes funds to the facility via `transfer_data.destination`
 * - Links all intents for the booking via `transfer_group`
 * - Uses a deterministic idempotency key to prevent double-charges on retries
 * - Updates the BookingParticipant record with the intent ID and status
 *
 * @param participantId - BookingParticipant record ID
 * @param amount - Escrow amount in cents (USD)
 * @param facilityConnectId - Facility's Stripe Connect account ID
 * @param bookingId - Booking ID (used for transfer_group and idempotency)
 * @param role - Participant role ('home' | 'away' | 'host' | 'participant')
 * @returns The created Stripe PaymentIntent
 */
export async function createEscrowIntent(
  participantId: string,
  amount: number,
  facilityConnectId: string,
  bookingId: string,
  role: string,
): Promise<Stripe.PaymentIntent> {
  const platformFee = calculatePlatformFee(amount);
  const idempotencyKey = generateIdempotencyKey(bookingId, role, IdempotencyAction.CREATE);

  const intent = await stripe.paymentIntents.create(
    {
      amount,
      currency: 'usd',
      capture_method: 'manual',
      application_fee_amount: platformFee,
      transfer_data: {
        destination: facilityConnectId,
      },
      transfer_group: bookingId,
      metadata: {
        booking_id: bookingId,
        participant_role: role,
        participant_id: participantId,
      },
    },
    {
      idempotencyKey,
    },
  );

  await prisma.bookingParticipant.update({
    where: { id: participantId },
    data: {
      stripePaymentIntentId: intent.id,
      paymentStatus: 'authorized',
    },
  });

  return intent;
}

/**
 * Create an escrow PaymentIntent with manual capture for a join fee linked
 * to a FacilityRental.
 *
 * - Routes funds to the facility via `transfer_data.destination`
 * - Links all intents for the rental via `transfer_group`
 * - Attaches `application_fee_amount` derived from PLATFORM_FEE_RATE
 * - Uses a deterministic idempotency key to prevent double-charges on retries
 * - Increments `FacilityRental.escrowBalance` by the held amount
 * - Logs the authorization via `EscrowTransactionService.logTransaction`
 *
 * @param rentalId - FacilityRental record ID (also used as transfer_group)
 * @param amount - Join fee amount in cents (USD)
 * @param facilityConnectId - Facility's Stripe Connect account ID
 * @param participantId - Identifier for the participant paying the join fee
 * @returns The created Stripe PaymentIntent
 */
export async function createRentalEscrowIntent(
  rentalId: string,
  amount: number,
  facilityConnectId: string,
  participantId: string,
): Promise<Stripe.PaymentIntent> {
  const platformFee = calculatePlatformFee(amount);
  const idempotencyKey = generateIdempotencyKey(rentalId, participantId, IdempotencyAction.CREATE);

  const intent = await stripe.paymentIntents.create(
    {
      amount,
      currency: 'usd',
      capture_method: 'manual',
      application_fee_amount: platformFee,
      transfer_data: {
        destination: facilityConnectId,
      },
      transfer_group: rentalId,
      metadata: {
        rental_id: rentalId,
        participant_id: participantId,
      },
    },
    {
      idempotencyKey,
    },
  );

  // Increment the rental's escrow balance by the authorized amount
  await prisma.facilityRental.update({
    where: { id: rentalId },
    data: {
      escrowBalance: {
        increment: amount,
      },
    },
  });

  // Log the authorization event
  await EscrowTransactionService.logTransaction({
    rentalId,
    type: 'authorization',
    amount,
    stripePaymentIntentId: intent.id,
    status: 'completed',
  });

  return intent;
}

/**
 * Capture all authorised escrow PaymentIntents for a booking simultaneously.
 *
 * 1. Fetches all BookingParticipant records with status 'authorized'
 * 2. Fetches the booking to get the facilityId
 * 3. Attempts to capture all PaymentIntents via Promise.allSettled
 * 4. If all succeed: atomically updates participants to 'captured', marks
 *    booking as 'confirmed', and snapshots the facility cancellation policy
 * 5. If any fail: cancels all successfully captured intents (releases escrow),
 *    resets participants to 'pending', and throws an error
 *
 * @param bookingId - The booking whose escrow intents should be captured
 * @throws Error if no authorized participants are found
 * @throws Error if the booking is not found
 * @throws Error if any PaymentIntent capture fails (after cleanup)
 */
export async function captureEscrow(bookingId: string): Promise<void> {
  // 1. Fetch all authorized participants for this booking
  const participants = await prisma.bookingParticipant.findMany({
    where: {
      bookingId,
      paymentStatus: 'authorized',
    },
  });

  if (participants.length === 0) {
    throw new Error(`No authorized participants found for booking ${bookingId}`);
  }

  // 2. Fetch the booking to get the facilityId
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { facilityId: true },
  });

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  if (!booking.facilityId) {
    throw new Error(`Booking ${bookingId} has no associated facility`);
  }

  // 3. Attempt to capture all PaymentIntents simultaneously
  const captureResults = await Promise.allSettled(
    participants.map((p) =>
      stripe.paymentIntents.capture(p.stripePaymentIntentId!, {
        idempotencyKey: generateIdempotencyKey(bookingId, p.role, IdempotencyAction.CAPTURE),
      }),
    ),
  );

  const allSucceeded = captureResults.every((r) => r.status === 'fulfilled');

  if (allSucceeded) {
    // 4. All captures succeeded — atomically update DB and snapshot policy
    await prisma.$transaction(async (tx) => {
      // Update all participants to 'captured'
      await tx.bookingParticipant.updateMany({
        where: {
          bookingId,
          paymentStatus: 'authorized',
        },
        data: { paymentStatus: 'captured' },
      });

      // Mark booking as confirmed
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'confirmed' },
      });

      // Snapshot the facility's cancellation policy onto the booking
      await snapshotPolicy(bookingId, booking.facilityId!, tx);
    });

    // Trigger balance status recalculation for the associated league season
    try {
      const bookingWithRental = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { rentalId: true },
      });
      if (bookingWithRental?.rentalId) {
        const match = await prisma.match.findFirst({
          where: { rentalId: bookingWithRental.rentalId },
          select: { leagueId: true, seasonId: true },
        });
        if (match?.leagueId && match?.seasonId) {
          recalculateBalanceStatuses(match.leagueId, match.seasonId).catch((err) =>
            console.error('Balance recalculation failed after escrow capture:', err),
          );
        }
      }
    } catch {
      // Balance recalculation is supplementary — don't fail the capture
    }
  } else {
    // 5. At least one capture failed — cancel all successful ones and reset
    const cancelPromises: Promise<Stripe.PaymentIntent>[] = [];

    captureResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        cancelPromises.push(
          stripe.paymentIntents.cancel(participants[index].stripePaymentIntentId!, {
            idempotencyKey: generateIdempotencyKey(
              bookingId,
              participants[index].role,
              IdempotencyAction.CANCEL,
            ),
          }),
        );
      }
    });

    await Promise.allSettled(cancelPromises);

    // Reset all participants to 'pending' atomically
    await prisma.$transaction(async (tx) => {
      await tx.bookingParticipant.updateMany({
        where: {
          bookingId,
          paymentStatus: 'authorized',
        },
        data: { paymentStatus: 'pending' },
      });
    });

    // Collect failure reasons for the error message
    const failures = captureResults
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => r.reason?.message || 'Unknown error');

    throw new Error(
      `Escrow capture failed for booking ${bookingId}: ${failures.join('; ')}`,
    );
  }
}

/**
 * Release a single escrow PaymentIntent by cancelling it.
 *
 * Used when the other party's charge fails — we must never leave an orphaned
 * authorisation. If the intent is already cancelled (e.g. duplicate call or
 * webhook race), the function succeeds silently.
 *
 * 1. Calls `stripe.paymentIntents.cancel(intentId)`
 * 2. Finds the BookingParticipant by `stripePaymentIntentId`
 * 3. Updates the participant's `paymentStatus` to 'refunded'
 *
 * @param intentId - The Stripe PaymentIntent ID to cancel
 */
export async function releaseEscrow(intentId: string): Promise<void> {
  try {
    await stripe.paymentIntents.cancel(intentId);
  } catch (error: unknown) {
    // If the intent is already cancelled, Stripe throws an error with
    // status 400 and code 'payment_intent_unexpected_state'. We treat
    // this as a no-op so the function is idempotent.
    const stripeError = error as { code?: string };
    if (stripeError.code === 'payment_intent_unexpected_state') {
      // Already cancelled — fall through to update the DB record
    } else {
      throw error;
    }
  }

  // Find and update the BookingParticipant linked to this intent
  const participant = await prisma.bookingParticipant.findFirst({
    where: { stripePaymentIntentId: intentId },
  });

  if (participant) {
    await prisma.bookingParticipant.update({
      where: { id: participant.id },
      data: { paymentStatus: 'refunded' },
    });

    // Trigger balance status recalculation for the associated league season
    try {
      const bookingWithRental = await prisma.booking.findUnique({
        where: { id: participant.bookingId },
        select: { rentalId: true },
      });
      if (bookingWithRental?.rentalId) {
        const match = await prisma.match.findFirst({
          where: { rentalId: bookingWithRental.rentalId },
          select: { leagueId: true, seasonId: true },
        });
        if (match?.leagueId && match?.seasonId) {
          recalculateBalanceStatuses(match.leagueId, match.seasonId).catch((err) =>
            console.error('Balance recalculation failed after escrow release:', err),
          );
        }
      }
    } catch {
      // Balance recalculation is supplementary
    }
  }
}
