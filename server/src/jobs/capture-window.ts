/**
 * Capture Window Renewal Job
 *
 * Runs daily at 02:00 UTC. Stripe's manual capture window is 7 days.
 * For confirmed bookings with authorized (manual-capture) intents where
 * the game date is between 6 and 7 days away, this job:
 *
 * 1. Cancels the existing PaymentIntents
 * 2. Re-creates new ones with fresh 7-day capture windows
 * 3. Uses idempotency keys (with 'renew' action) to prevent duplicates
 * 4. On re-authorization failure, transitions the booking to 'payment_hold'
 *    and notifies both managers and the commissioner
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { stripe, calculatePlatformFee } from '../services/stripe-connect';
import { generateIdempotencyKey, IdempotencyAction } from '../utils/idempotency';
import { NotificationService } from '../services/NotificationService';

export interface CaptureWindowMetrics {
  executionDate: Date;
  bookingsChecked: number;
  intentsRenewed: number;
  renewalsFailed: number;
  duration: number;
  errors: Array<{ bookingId: string; participantId?: string; error: string }>;
}

/**
 * Find confirmed bookings with authorized manual-capture intents where the
 * game date (from the linked rental's timeslot) is between 6 and 7 days away,
 * then renew each participant's PaymentIntent.
 */
export async function processCaptureWindowRenewals(
  db: PrismaClient = prisma,
): Promise<CaptureWindowMetrics> {
  const startTime = Date.now();
  const metrics: CaptureWindowMetrics = {
    executionDate: new Date(),
    bookingsChecked: 0,
    intentsRenewed: 0,
    renewalsFailed: 0,
    duration: 0,
    errors: [],
  };

  try {
    const now = new Date();
    const sixDaysFromNow = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find confirmed bookings where the game date (via rental → timeslot)
    // is between 6 and 7 days from now, and at least one participant has
    // an authorized (manual-capture) intent that needs renewal.
    const bookings = await db.booking.findMany({
      where: {
        status: 'confirmed',
        rental: {
          timeSlot: {
            date: {
              gte: sixDaysFromNow,
              lt: sevenDaysFromNow,
            },
          },
        },
        participants: {
          some: {
            paymentStatus: 'authorized',
            stripePaymentIntentId: { not: null },
          },
        },
      },
      include: {
        participants: {
          where: {
            paymentStatus: 'authorized',
            stripePaymentIntentId: { not: null },
          },
        },
        facility: {
          select: {
            stripeConnectAccountId: true,
          },
        },
      },
    });

    metrics.bookingsChecked = bookings.length;

    for (const booking of bookings) {
      const facilityConnectId = booking.facility?.stripeConnectAccountId;
      if (!facilityConnectId) {
        metrics.errors.push({
          bookingId: booking.id,
          error: 'Booking facility has no Stripe Connect account',
        });
        continue;
      }

      for (const participant of booking.participants) {
        try {
          await renewParticipantIntent(
            db,
            booking.id,
            participant.id,
            participant.stripePaymentIntentId!,
            participant.escrowAmount,
            participant.role,
            facilityConnectId,
          );
          metrics.intentsRenewed++;
        } catch (err: any) {
          console.error(
            `[capture-window] Re-authorization failed for participant ${participant.id} ` +
              `in booking ${booking.id}:`,
            err,
          );

          metrics.renewalsFailed++;
          metrics.errors.push({
            bookingId: booking.id,
            participantId: participant.id,
            error: err.message,
          });

          // Transition booking to payment_hold and notify
          try {
            await db.booking.update({
              where: { id: booking.id },
              data: { status: 'payment_hold' },
            });

            await NotificationService.notifyPaymentHold(
              booking.id,
              participant.rosterId,
            );
          } catch (holdErr: any) {
            console.error(
              `[capture-window] Failed to transition booking ${booking.id} to payment_hold:`,
              holdErr,
            );
          }

          // Stop processing remaining participants for this booking —
          // the booking is already on hold.
          break;
        }
      }
    }
  } catch (err: any) {
    console.error('[capture-window] Job failed:', err);
    throw err;
  } finally {
    metrics.duration = Date.now() - startTime;
  }

  return metrics;
}

/**
 * Cancel an existing PaymentIntent and create a fresh one with a new 7-day
 * capture window. Uses idempotency keys with the 'renew' action type to
 * prevent duplicate charges on retries.
 *
 * @param db - Prisma client
 * @param bookingId - The booking ID
 * @param participantId - The BookingParticipant record ID
 * @param oldIntentId - The existing Stripe PaymentIntent ID to cancel
 * @param amount - Escrow amount in cents
 * @param role - Participant role (home/away/host/participant)
 * @param facilityConnectId - Facility's Stripe Connect account ID
 */
async function renewParticipantIntent(
  db: PrismaClient,
  bookingId: string,
  participantId: string,
  oldIntentId: string,
  amount: number,
  role: string,
  facilityConnectId: string,
): Promise<void> {
  // 1. Cancel the existing intent to release the hold
  try {
    await stripe.paymentIntents.cancel(oldIntentId);
  } catch (err: any) {
    // If already cancelled, treat as no-op and proceed with re-creation
    if (err.code !== 'payment_intent_unexpected_state') {
      throw err;
    }
  }

  // 2. Create a fresh PaymentIntent with a new 7-day capture window
  const platformFee = calculatePlatformFee(amount);
  const idempotencyKey = generateIdempotencyKey(bookingId, role, IdempotencyAction.RENEW);

  const newIntent = await stripe.paymentIntents.create(
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
        renewal: 'true',
      },
    },
    {
      idempotencyKey,
    },
  );

  // 3. Update the participant record with the new intent ID
  await db.bookingParticipant.update({
    where: { id: participantId },
    data: {
      stripePaymentIntentId: newIntent.id,
      paymentStatus: 'authorized',
    },
  });
}
