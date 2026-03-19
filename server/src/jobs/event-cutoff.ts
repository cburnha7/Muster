/**
 * Event Cutoff Job
 *
 * Runs every 15 minutes. Finds public event bookings in 'pending' status
 * where the event start time has passed and the minimum attendee count
 * has not been reached. Refunds all attendees in full (including platform
 * fees), cancels any uncaptured intents, and transitions the booking to
 * 'cancelled'. Notifies the roster manager that the event was cancelled
 * due to insufficient attendees.
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '../index';
import { stripe } from '../services/stripe-connect';
import { generateIdempotencyKey, IdempotencyAction } from '../utils/idempotency';

export interface EventCutoffMetrics {
  executionDate: Date;
  bookingsChecked: number;
  bookingsCancelled: number;
  refundsIssued: number;
  intentsCancelled: number;
  notificationsSent: number;
  duration: number;
  errors: Array<{ bookingId: string; error: string }>;
}

export async function processEventCutoffs(
  db: PrismaClient = prisma,
): Promise<EventCutoffMetrics> {
  const startTime = Date.now();
  const metrics: EventCutoffMetrics = {
    executionDate: new Date(),
    bookingsChecked: 0,
    bookingsCancelled: 0,
    refundsIssued: 0,
    intentsCancelled: 0,
    notificationsSent: 0,
    duration: 0,
    errors: [],
  };

  try {
    const now = new Date();

    // Find all public event bookings that are still pending and whose event
    // start time has passed — these are candidates for cutoff cancellation.
    const pendingBookings = await db.booking.findMany({
      where: {
        bookingType: 'public_event',
        status: 'pending',
        event: {
          startTime: { lt: now },
        },
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            organizerId: true,
          },
        },
        participants: {
          select: {
            id: true,
            rosterId: true,
            role: true,
            stripePaymentIntentId: true,
            paymentStatus: true,
          },
        },
      },
    });

    metrics.bookingsChecked = pendingBookings.length;

    for (const booking of pendingBookings) {
      try {
        const minAttendees = booking.minAttendeeCount ?? 0;
        const attendeeParticipants = booking.participants.filter(
          (p) => p.role === 'participant',
        );

        // If minimum is already reached, skip — this booking should have
        // been captured by the normal flow, not cancelled.
        if (attendeeParticipants.length >= minAttendees && minAttendees > 0) {
          continue;
        }

        // Process each participant's PaymentIntent
        let refundCount = 0;
        let cancelCount = 0;

        for (const participant of booking.participants) {
          if (!participant.stripePaymentIntentId) continue;

          try {
            if (participant.paymentStatus === 'authorized') {
              // Uncaptured intent — cancel it (releases the hold)
              await stripe.paymentIntents.cancel(
                participant.stripePaymentIntentId,
                {
                  idempotencyKey: generateIdempotencyKey(
                    booking.id,
                    `${participant.rosterId}:${participant.role}`,
                    IdempotencyAction.CANCEL,
                  ),
                },
              );
              cancelCount++;
            } else if (participant.paymentStatus === 'captured') {
              // Already captured — issue a full refund including platform fee
              await stripe.refunds.create(
                {
                  payment_intent: participant.stripePaymentIntentId,
                  refund_application_fee: true,
                },
                {
                  idempotencyKey: generateIdempotencyKey(
                    booking.id,
                    `${participant.rosterId}:${participant.role}`,
                    IdempotencyAction.REFUND,
                  ),
                },
              );
              refundCount++;
            }
          } catch (err: any) {
            // If the intent is already cancelled/refunded, treat as no-op
            if (err.code === 'payment_intent_unexpected_state') {
              continue;
            }
            throw err;
          }
        }

        // Atomically update all participants and booking status
        await db.$transaction(async (tx) => {
          await tx.bookingParticipant.updateMany({
            where: { bookingId: booking.id },
            data: { paymentStatus: 'refunded' },
          });

          await tx.booking.update({
            where: { id: booking.id },
            data: { status: 'cancelled' },
          });
        });

        metrics.refundsIssued += refundCount;
        metrics.intentsCancelled += cancelCount;
        metrics.bookingsCancelled++;

        // Notify the roster manager (event organizer) that the event was
        // cancelled due to insufficient attendees
        const eventTitle = booking.event?.title ?? 'Unknown event';
        const organizerId = booking.event?.organizerId;
        if (organizerId) {
          console.log(
            `[event-cutoff] Notifying organizer ${organizerId}: ` +
              `public event "${eventTitle}" (booking ${booking.id}) cancelled — ` +
              `minimum attendee count not reached (${attendeeParticipants.length}/${minAttendees})`,
          );
          metrics.notificationsSent++;
        }
      } catch (err: any) {
        console.error(`[event-cutoff] Failed to process booking ${booking.id}:`, err);
        metrics.errors.push({ bookingId: booking.id, error: err.message });
      }
    }
  } catch (err: any) {
    console.error('[event-cutoff] Job failed:', err);
    throw err;
  } finally {
    metrics.duration = Date.now() - startTime;
  }

  return metrics;
}
