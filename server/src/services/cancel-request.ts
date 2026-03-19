/**
 * Cancel Request Service
 *
 * Orchestrates cancel request creation, approval, and denial for
 * reservation cancellations that fall inside the cancellation policy window.
 * Handles Stripe refunds (via associated booking participants) and notifications.
 */

import { PrismaClient, CancelRequest } from '@prisma/client';
import { stripe } from './stripe-connect';

// ---------------------------------------------------------------------------
// Create cancel request
// ---------------------------------------------------------------------------

/**
 * Creates a pending cancel request for a rental that falls inside the
 * cancellation policy window.
 *
 * - Verifies the rental exists and belongs to the user
 * - Rejects if a pending cancel request already exists for this rental
 * - Creates a CancelRequest record with status "pending"
 * - Updates the rental's cancellationStatus to "pending"
 */
export async function createCancelRequest(
  rentalId: string,
  userId: string,
  prismaClient: PrismaClient,
): Promise<CancelRequest> {
  // Fetch the rental with its time slot and court → facility
  const rental = await prismaClient.facilityRental.findUnique({
    where: { id: rentalId },
    include: {
      timeSlot: {
        include: {
          court: {
            include: { facility: true },
          },
        },
      },
    },
  });

  if (!rental) {
    throw new Error('Rental not found');
  }

  if (rental.userId !== userId) {
    throw new Error('Unauthorized');
  }

  if (rental.status === 'cancelled') {
    throw new Error('Rental already cancelled');
  }

  // Check for an existing pending cancel request
  const existingRequest = await prismaClient.cancelRequest.findFirst({
    where: {
      reservationId: rentalId,
      status: 'pending',
    },
  });

  if (existingRequest) {
    throw new Error('Cancellation request already pending');
  }

  const groundId = rental.timeSlot.court.facility.id;

  // Create the cancel request and update the rental atomically
  const cancelRequest = await prismaClient.$transaction(async (tx) => {
    const created = await tx.cancelRequest.create({
      data: {
        status: 'pending',
        userId,
        reservationId: rentalId,
        groundId,
      },
    });

    await tx.facilityRental.update({
      where: { id: rentalId },
      data: { cancellationStatus: 'pending' },
    });

    return created;
  });

  return cancelRequest;
}


// ---------------------------------------------------------------------------
// Approve cancel request
// ---------------------------------------------------------------------------

/**
 * Approves a pending cancel request. In a single transaction:
 * - Updates the CancelRequest to "approved" with resolvedAt
 * - Cancels the rental (status → "cancelled", cancellationStatus → "approved")
 * - Returns the time slot to "available"
 * - Issues a Stripe refund if a paid booking participant exists
 * - Creates a notification for the requesting user
 *
 * Only the ground owner can approve.
 */
export async function approveCancelRequest(
  cancelRequestId: string,
  ownerId: string,
  prismaClient: PrismaClient,
): Promise<void> {
  // Fetch the cancel request with reservation, time slot, court, and facility
  const cancelRequest = await prismaClient.cancelRequest.findUnique({
    where: { id: cancelRequestId },
    include: {
      reservation: {
        include: {
          timeSlot: {
            include: {
              court: {
                include: { facility: true },
              },
            },
          },
          bookings: {
            include: {
              participants: true,
            },
          },
        },
      },
      ground: true,
    },
  });

  if (!cancelRequest) {
    throw new Error('Cancel request not found');
  }

  if (cancelRequest.status !== 'pending') {
    throw new Error('Cancel request already resolved');
  }

  if (cancelRequest.ground.ownerId !== ownerId) {
    throw new Error('Unauthorized');
  }

  const rental = cancelRequest.reservation;
  const rentalId = rental.id;

  await prismaClient.$transaction(async (tx) => {
    // 1. Update cancel request → approved
    await tx.cancelRequest.update({
      where: { id: cancelRequestId },
      data: {
        status: 'approved',
        resolvedAt: new Date(),
      },
    });

    // 2. Cancel the rental
    await tx.facilityRental.update({
      where: { id: rentalId },
      data: {
        status: 'cancelled',
        cancellationStatus: 'approved',
        cancelledAt: new Date(),
        refundAmount: rental.paymentStatus === 'paid' ? rental.totalPrice : 0,
      },
    });

    // 3. Return time slot to available
    await tx.facilityTimeSlot.update({
      where: { id: rental.timeSlotId },
      data: {
        status: 'available',
        blockReason: null,
      },
    });
  });

  // 4. Issue Stripe refund if there's a paid booking participant with a payment intent
  try {
    const paidParticipant = rental.bookings
      ?.flatMap((b) => b.participants ?? [])
      .find(
        (p) =>
          p.stripePaymentIntentId &&
          (p.paymentStatus === 'captured' || p.paymentStatus === 'authorized'),
      );

    if (paidParticipant?.stripePaymentIntentId) {
      await stripe.refunds.create(
        { payment_intent: paidParticipant.stripePaymentIntentId },
        { idempotencyKey: `${rentalId}:refund` },
      );
    }
  } catch (error) {
    console.error(`[CancelRequest] Stripe refund failed for rental ${rentalId}:`, error);
    // Refund failure is logged but doesn't roll back the approval —
    // the owner can retry or handle manually.
  }

  // 5. Notify the requesting user
  console.log(
    `[CancelRequest] Notification: Cancellation approved for rental ${rentalId}, user ${cancelRequest.userId}`,
  );
}


// ---------------------------------------------------------------------------
// Deny cancel request
// ---------------------------------------------------------------------------

/**
 * Denies a pending cancel request.
 * - Updates the CancelRequest to "denied" with resolvedAt
 * - Updates the rental's cancellationStatus to "denied"
 * - Creates a notification for the requesting user
 *
 * Only the ground owner can deny.
 */
export async function denyCancelRequest(
  cancelRequestId: string,
  ownerId: string,
  prismaClient: PrismaClient,
): Promise<void> {
  // Fetch the cancel request with reservation and facility
  const cancelRequest = await prismaClient.cancelRequest.findUnique({
    where: { id: cancelRequestId },
    include: {
      reservation: true,
      ground: true,
    },
  });

  if (!cancelRequest) {
    throw new Error('Cancel request not found');
  }

  if (cancelRequest.status !== 'pending') {
    throw new Error('Cancel request already resolved');
  }

  if (cancelRequest.ground.ownerId !== ownerId) {
    throw new Error('Unauthorized');
  }

  // Update cancel request and rental status
  await prismaClient.$transaction(async (tx) => {
    await tx.cancelRequest.update({
      where: { id: cancelRequestId },
      data: {
        status: 'denied',
        resolvedAt: new Date(),
      },
    });

    await tx.facilityRental.update({
      where: { id: cancelRequest.reservationId },
      data: { cancellationStatus: 'denied' },
    });
  });

  // Notify the requesting user
  console.log(
    `[CancelRequest] Notification: Cancellation denied for rental ${cancelRequest.reservationId}, user ${cancelRequest.userId}`,
  );
}
