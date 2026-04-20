import { Router } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import {
  generateOccurrences,
  RecurringFrequency,
} from '../services/recurring-bookings';
import { evaluateCancellationWindow } from '../services/cancellation-window';
import { createCancelRequest } from '../services/cancel-request';
import { stripe } from '../services/stripe-connect';
import { InsuranceDocumentService } from '../services/InsuranceDocumentService';
import { requireNonDependent } from '../middleware/require-non-dependent';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

// Rent a time slot
router.post(
  '/facilities/:facilityId/courts/:courtId/slots/:slotId/rent',
  authMiddleware,
  requireNonDependent,
  async (req, res) => {
    try {
      const { facilityId, courtId, slotId } = req.params as {
        facilityId: string;
        courtId: string;
        slotId: string;
      };
      const userId = req.user!.userId;

      // Verify time slot exists and is available
      const timeSlot = await prisma.facilityTimeSlot.findFirst({
        where: {
          id: slotId,
          courtId,
        },
        include: {
          court: {
            include: {
              facility: true,
            },
          },
        },
      });

      if (!timeSlot) {
        return res.status(404).json({ error: 'Time slot not found' });
      }

      if (timeSlot.court.facilityId !== facilityId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      if (timeSlot.status !== 'available') {
        return res.status(400).json({ error: 'Time slot is not available' });
      }

      // Check for existing rental record (orphaned data guard)
      const existingRental = await prisma.facilityRental.findUnique({
        where: { timeSlotId: slotId },
      });
      if (existingRental && existingRental.status !== 'cancelled') {
        return res
          .status(400)
          .json({ error: 'Time slot already has an active rental' });
      }

      // Check if slot is in the past (date + time level)
      const slotDate = new Date(timeSlot.date);
      const [slotH, slotM] = timeSlot.startTime.split(':').map(Number);
      slotDate.setUTCHours(slotH, slotM, 0, 0);

      if (slotDate.getTime() <= Date.now()) {
        return res.status(400).json({ error: 'Cannot rent past time slots' });
      }

      // Determine insurance and confirmation requirements from the facility
      const facility = timeSlot.court
        .facility as typeof timeSlot.court.facility & {
        requiresInsurance: boolean;
        requiresBookingConfirmation: boolean;
      };
      const { insuranceDocumentId } = req.body;

      let rentalStatus: string = 'confirmed';
      let attachedInsuranceDocumentId: string | null = null;

      if (facility.requiresInsurance) {
        // Insurance document is required
        if (!insuranceDocumentId) {
          return res.status(400).json({
            error: 'You need a valid insurance document to reserve this court',
          });
        }

        // Re-validate document status at submission time (guard against expiry between selection and submission)
        const isActive =
          await InsuranceDocumentService.validateForAttachment(
            insuranceDocumentId
          );
        if (!isActive) {
          return res.status(400).json({
            error: 'Insurance document is not active or does not exist',
          });
        }

        // Verify the document belongs to the renter
        const document =
          await InsuranceDocumentService.getById(insuranceDocumentId);
        if (!document || document.userId !== userId) {
          return res.status(403).json({
            error: 'Insurance document does not belong to the renter',
          });
        }

        rentalStatus = 'pending_approval';
        attachedInsuranceDocumentId = insuranceDocumentId;
      }

      // If facility requires booking confirmation, set to pending regardless of insurance
      if (facility.requiresBookingConfirmation) {
        rentalStatus = 'pending_approval';
      }

      // Create rental and update slot status in a transaction
      const result = await prisma.$transaction(async tx => {
        // Update time slot status — marked as "rented" in both cases to prevent double-booking
        await tx.facilityTimeSlot.update({
          where: { id: slotId },
          data: { status: 'rented' },
        });

        // Create rental record
        const rental = await tx.facilityRental.create({
          data: {
            userId,
            timeSlotId: slotId,
            totalPrice: timeSlot.price,
            status: rentalStatus,
            paymentStatus: timeSlot.price > 0 ? 'pending' : 'paid',
            ...(attachedInsuranceDocumentId
              ? { attachedInsuranceDocumentId }
              : {}),
          },
          include: {
            timeSlot: {
              include: {
                court: {
                  include: {
                    facility: true,
                  },
                },
              },
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });

        return rental;
      });

      res.status(201).json(result);
    } catch (error) {
      console.error('Rent time slot error:', error);
      res.status(500).json({ error: 'Failed to rent time slot' });
    }
  }
);

// Cancel rental
router.delete('/rentals/:rentalId', authMiddleware, async (req, res) => {
  try {
    const { rentalId } = req.params as { rentalId: string };
    const { cancellationReason } = req.body;
    const userId = req.user!.userId;

    // TODO: Get userId from auth token

    // Verify rental exists — include facility (for policy) and bookings (for Stripe refund)
    const rental = await prisma.facilityRental.findUnique({
      where: { id: rentalId },
      include: {
        timeSlot: {
          include: {
            court: {
              include: { facility: true },
            },
          },
        },
        bookings: {
          include: { participants: true },
        },
      },
    });

    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    // Verify user owns this rental
    if (rental.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (rental.status === 'cancelled') {
      return res.status(400).json({ error: 'Rental already cancelled' });
    }

    if (rental.cancellationStatus === 'pending') {
      return res
        .status(400)
        .json({ error: 'Cancellation request already pending' });
    }

    if (rental.usedForEventId) {
      return res
        .status(400)
        .json({ error: 'Cannot cancel rental used for an event' });
    }

    // Compute booking start time from the time slot
    const bookingStartTime = new Date(rental.timeSlot.date);
    const [hours, minutes] = rental.timeSlot.startTime.split(':').map(Number);
    bookingStartTime.setHours(hours, minutes, 0, 0);

    // Evaluate cancellation window
    const cancellationPolicyHours =
      rental.timeSlot.court.facility.cancellationPolicyHours;
    const windowResult = evaluateCancellationWindow(
      new Date(),
      bookingStartTime,
      cancellationPolicyHours ?? null
    );

    if (windowResult === 'inside') {
      // Inside the window — create a cancel request for owner approval
      const cancelRequest = await createCancelRequest(rentalId, userId, prisma);
      const updatedRental = await prisma.facilityRental.findUnique({
        where: { id: rentalId },
      });
      return res
        .status(200)
        .json({ pendingApproval: true, cancelRequest, rental: updatedRental });
    }

    // Outside the window (or no policy) — proceed with immediate cancellation
    const result = await prisma.$transaction(async tx => {
      const updatedRental = await tx.facilityRental.update({
        where: { id: rentalId },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: cancellationReason || 'Cancelled by user',
          refundAmount: rental.paymentStatus === 'paid' ? rental.totalPrice : 0,
        },
      });

      // Return time slot to available
      await tx.facilityTimeSlot.update({
        where: { id: rental.timeSlotId },
        data: { status: 'available' },
      });

      // If part of a recurring series, decrement active count
      if (rental.recurringGroupId) {
        await tx.recurringBooking.update({
          where: { groupId: rental.recurringGroupId },
          data: { activeInstances: { decrement: 1 } },
        });
      }

      return updatedRental;
    });

    // Issue Stripe refund if there's a paid booking participant with a payment intent
    try {
      const paidParticipant = rental.bookings
        ?.flatMap(b => b.participants ?? [])
        .find(
          p =>
            p.stripePaymentIntentId &&
            (p.paymentStatus === 'captured' || p.paymentStatus === 'authorized')
        );

      if (paidParticipant?.stripePaymentIntentId) {
        await stripe.refunds.create(
          { payment_intent: paidParticipant.stripePaymentIntentId },
          { idempotencyKey: `${rentalId}:refund` }
        );
      }
    } catch (refundError) {
      console.error(
        `[CancelRental] Stripe refund failed for rental ${rentalId}:`,
        refundError
      );
    }

    res.json(result);
  } catch (error) {
    console.error('Cancel rental error:', error);
    res.status(500).json({ error: 'Failed to cancel rental' });
  }
});

// Request rental cancellation (user requests, owner approves)
router.post(
  '/rentals/:rentalId/request-cancellation',
  authMiddleware,
  async (req, res) => {
    try {
      const { rentalId } = req.params as { rentalId: string };
      const { cancellationReason } = req.body;
      const userId = req.user!.userId;

      // TODO: Get userId from auth token

      if (!cancellationReason || cancellationReason.trim().length < 10) {
        return res.status(400).json({
          error: 'Cancellation reason is required (minimum 10 characters)',
        });
      }

      // Verify rental exists
      const rental = await prisma.facilityRental.findUnique({
        where: { id: rentalId },
        include: {
          timeSlot: {
            include: {
              court: {
                include: {
                  facility: true,
                },
              },
            },
          },
        },
      });

      if (!rental) {
        return res.status(404).json({ error: 'Rental not found' });
      }

      // Verify user owns this rental
      if (rental.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      if (rental.status === 'cancelled') {
        return res.status(400).json({ error: 'Rental already cancelled' });
      }

      if (rental.cancellationStatus === 'pending_cancellation') {
        return res
          .status(400)
          .json({ error: 'Cancellation request already pending' });
      }

      // Check if rental has been used for an event
      if (rental.usedForEventId) {
        return res.status(400).json({
          error: 'Cannot cancel rental that has been used for an event',
        });
      }

      // Update rental with cancellation request
      const updatedRental = await prisma.facilityRental.update({
        where: { id: rentalId },
        data: {
          cancellationStatus: 'pending_cancellation',
          cancellationReason: cancellationReason.trim(),
        },
        include: {
          timeSlot: {
            include: {
              court: {
                include: {
                  facility: true,
                },
              },
            },
          },
        },
      });

      // TODO: Send notification to facility owner about cancellation request

      res.json({
        success: true,
        message:
          'Cancellation request submitted. Awaiting facility owner approval.',
        rental: updatedRental,
      });
    } catch (error) {
      console.error('Request rental cancellation error:', error);
      res.status(500).json({ error: 'Failed to request cancellation' });
    }
  }
);

// Bulk rent multiple time slots in a single transaction
router.post(
  '/rentals/bulk',
  authMiddleware,
  requireNonDependent,
  async (req, res) => {
    try {
      const { slots } = req.body;
      const userId = req.user!.userId;

      if (!slots || !Array.isArray(slots) || slots.length === 0) {
        return res.status(400).json({ error: 'At least one slot is required' });
      }

      const slotIds = slots.map((s: any) => s.slotId);

      // Fetch all referenced time slots
      const timeSlots = await prisma.facilityTimeSlot.findMany({
        where: { id: { in: slotIds } },
        include: {
          court: {
            include: { facility: true },
          },
        },
      });

      // Build a lookup for validation
      const slotMap = new Map(timeSlots.map(ts => [ts.id, ts]));

      const conflicts: any[] = [];
      const validSlots: any[] = [];

      for (const reqSlot of slots) {
        const ts = slotMap.get(reqSlot.slotId);

        if (!ts) {
          conflicts.push({
            slotId: reqSlot.slotId,
            courtId: reqSlot.courtId,
            courtName: 'Unknown',
            date: null,
            startTime: null,
            endTime: null,
            reason: 'not_found',
          });
          continue;
        }

        // Validate court/facility ownership
        if (
          ts.courtId !== reqSlot.courtId ||
          ts.court.facilityId !== reqSlot.facilityId
        ) {
          conflicts.push({
            slotId: ts.id,
            courtId: ts.courtId,
            courtName: ts.court.name,
            date: ts.date,
            startTime: ts.startTime,
            endTime: ts.endTime,
            reason: 'invalid_reference',
          });
          continue;
        }

        // Check past date+time
        const slotDate = new Date(ts.date);
        const [slotH, slotM] = ts.startTime.split(':').map(Number);
        slotDate.setUTCHours(slotH, slotM, 0, 0);
        if (slotDate.getTime() <= Date.now()) {
          conflicts.push({
            slotId: ts.id,
            courtId: ts.courtId,
            courtName: ts.court.name,
            date: ts.date,
            startTime: ts.startTime,
            endTime: ts.endTime,
            reason: 'past_date',
          });
          continue;
        }

        // Check availability
        if (ts.status !== 'available') {
          conflicts.push({
            slotId: ts.id,
            courtId: ts.courtId,
            courtName: ts.court.name,
            date: ts.date,
            startTime: ts.startTime,
            endTime: ts.endTime,
            reason: ts.status,
          });
          continue;
        }

        validSlots.push({ reqSlot, timeSlot: ts });
      }

      // If any conflicts, return 409 without creating anything
      if (conflicts.length > 0) {
        return res.status(409).json({
          conflicts,
          availableSlots: validSlots.map(v => ({
            slotId: v.timeSlot.id,
            courtId: v.reqSlot.courtId,
            facilityId: v.reqSlot.facilityId,
          })),
        });
      }

      // All slots valid — create rentals in a transaction
      const bookingSessionId = randomUUID();

      // Check for existing rentals (orphaned data) before transaction
      const existingRentals = await prisma.facilityRental.findMany({
        where: {
          timeSlotId: { in: validSlots.map(v => v.timeSlot.id) },
          status: { not: 'cancelled' },
        },
        select: { timeSlotId: true },
      });

      if (existingRentals.length > 0) {
        // Some slots already have rental records — treat as conflicts
        const existingSlotIds = new Set(existingRentals.map(r => r.timeSlotId));
        const orphanConflicts = validSlots
          .filter(v => existingSlotIds.has(v.timeSlot.id))
          .map(v => ({
            slotId: v.timeSlot.id,
            courtId: v.timeSlot.courtId,
            courtName: v.timeSlot.court.name,
            date: v.timeSlot.date,
            startTime: v.timeSlot.startTime,
            endTime: v.timeSlot.endTime,
            reason: 'already_rented',
          }));

        const stillValid = validSlots.filter(
          v => !existingSlotIds.has(v.timeSlot.id)
        );

        return res.status(409).json({
          conflicts: orphanConflicts,
          availableSlots: stillValid.map(v => ({
            slotId: v.timeSlot.id,
            courtId: v.reqSlot.courtId,
            facilityId: v.reqSlot.facilityId,
          })),
        });
      }

      const result = await prisma.$transaction(
        async tx => {
          const rentals = [];

          for (const { timeSlot: ts } of validSlots) {
            const facility = ts.court.facility as typeof ts.court.facility & {
              requiresBookingConfirmation?: boolean;
              requiresInsurance?: boolean;
            };
            let rentalStatus = 'confirmed';
            let attachedInsuranceDocumentId: string | null = null;

            // If facility requires booking confirmation, set to pending
            if (facility.requiresBookingConfirmation) {
              rentalStatus = 'pending_approval';
            }

            // If facility requires insurance and a document was provided, attach it
            if (facility.requiresInsurance && req.body.insuranceDocumentId) {
              rentalStatus = 'pending_approval';
              attachedInsuranceDocumentId = req.body.insuranceDocumentId;
            }

            // Update slot status
            await tx.facilityTimeSlot.update({
              where: { id: ts.id },
              data: { status: 'rented' },
            });

            // Create rental
            const rental = await tx.facilityRental.create({
              data: {
                userId,
                timeSlotId: ts.id,
                totalPrice: ts.price,
                status: rentalStatus,
                paymentStatus: ts.price > 0 ? 'pending' : 'paid',
                bookingSessionId,
                ...(attachedInsuranceDocumentId
                  ? { attachedInsuranceDocumentId }
                  : {}),
              },
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

            rentals.push(rental);
          }

          return rentals;
        },
        { maxWait: 10000, timeout: 30000 }
      );

      const totalPrice = result.reduce((sum, r) => sum + r.totalPrice, 0);

      res.status(201).json({
        bookingSessionId,
        rentals: result,
        totalPrice,
        slotCount: result.length,
      });
    } catch (error) {
      console.error('Bulk rent error:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to process bulk booking';
      res.status(500).json({ error: message });
    }
  }
);

// Get user's rentals (MUST be before /:rentalId to avoid route conflict)
router.get('/rentals/my-rentals', optionalAuthMiddleware, async (req, res) => {
  try {
    const { status, upcoming } = req.query;
    const userId = req.user?.userId || (req.query.userId as string);

    // TODO: Get userId from auth token

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const where: any = { userId: userId as string };

    if (status) {
      where.status = status;
    }

    if (upcoming === 'true') {
      // Normalize to start of day for date comparison
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      where.timeSlot = {
        date: { gte: today },
      };
    }

    const rentals = await prisma.facilityRental.findMany({
      where,
      include: {
        timeSlot: {
          include: {
            court: {
              include: {
                facility: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Sort by timeSlot date in JS (avoids nested orderBy issues)
    rentals.sort((a: any, b: any) => {
      const dateA = a.timeSlot?.date ? new Date(a.timeSlot.date).getTime() : 0;
      const dateB = b.timeSlot?.date ? new Date(b.timeSlot.date).getTime() : 0;
      return dateA - dateB;
    });

    res.json(rentals);
  } catch (error) {
    console.error('Get user rentals error:', error);
    res.status(500).json({ error: 'Failed to fetch rentals' });
  }
});

// Get single rental by ID
router.get('/rentals/:rentalId', async (req, res) => {
  try {
    const { rentalId } = req.params as { rentalId: string };

    const rental = await prisma.facilityRental.findUnique({
      where: { id: rentalId },
      include: {
        timeSlot: {
          include: {
            court: {
              include: {
                facility: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        attachedInsuranceDocument: true,
      },
    });

    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    // TODO: Add authorization check - only rental owner or facility owner can view

    res.json(rental);
  } catch (error) {
    console.error('Get rental error:', error);
    res.status(500).json({ error: 'Failed to fetch rental' });
  }
});

// Get all rentals for a facility (operator view)
router.get('/rentals/facilities/:facilityId/rentals', async (req, res) => {
  try {
    const { facilityId } = req.params as { facilityId: string };
    const { status, startDate, endDate } = req.query;

    // TODO: Add authorization check - only facility owner can view

    const where: any = {
      timeSlot: {
        court: {
          facilityId,
        },
      },
    };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.timeSlot = {
        ...where.timeSlot,
        date: {},
      };
      if (startDate) {
        where.timeSlot.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.timeSlot.date.lte = new Date(endDate as string);
      }
    }

    const rentals = await prisma.facilityRental.findMany({
      where,
      include: {
        timeSlot: {
          include: {
            court: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        timeSlot: {
          date: 'asc',
        },
      },
    });

    res.json(rentals);
  } catch (error) {
    console.error('Get facility rentals error:', error);
    res.status(500).json({ error: 'Failed to fetch rentals' });
  }
});

// ─── Recurring Bookings ───────────────────────────────────────────────

/**
 * POST /rentals/recurring/check — Check availability for all instances in a recurring series.
 * Body: { userId, courtId, facilityId, slotStartTime, slotEndTime, frequency, startDate, endDate }
 * Returns: { available: [...], conflicts: [...] }
 */
router.post('/rentals/recurring/check', authMiddleware, async (req, res) => {
  try {
    const {
      courtId,
      slotStartTime,
      slotEndTime,
      frequency,
      startDate,
      endDate,
    } = req.body;

    if (
      !courtId ||
      !slotStartTime ||
      !slotEndTime ||
      !frequency ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (frequency !== 'weekly' && frequency !== 'monthly') {
      return res
        .status(400)
        .json({ error: 'Frequency must be "weekly" or "monthly"' });
    }

    const dates = generateOccurrences({
      frequency: frequency as RecurringFrequency,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    if (dates.length === 0) {
      return res
        .status(400)
        .json({ error: 'No occurrences generated for the given date range' });
    }

    if (dates.length > 52) {
      return res
        .status(400)
        .json({ error: 'Recurring series cannot exceed 52 instances' });
    }

    // Find matching time slots for each occurrence date
    const available: any[] = [];
    const conflicts: any[] = [];

    for (const date of dates) {
      const normalizedDate = new Date(date);
      normalizedDate.setUTCHours(0, 0, 0, 0);

      const slot = await prisma.facilityTimeSlot.findFirst({
        where: {
          courtId,
          date: normalizedDate,
          startTime: slotStartTime,
          endTime: slotEndTime,
        },
        include: {
          court: { select: { name: true } },
        },
      });

      const dateStr = normalizedDate.toISOString().split('T')[0];

      if (!slot) {
        conflicts.push({ date: dateStr, reason: 'no_slot', slotId: null });
      } else if (slot.status !== 'available') {
        conflicts.push({ date: dateStr, reason: slot.status, slotId: slot.id });
      } else {
        // Also check for orphaned rental records
        const existingRental = await prisma.facilityRental.findUnique({
          where: { timeSlotId: slot.id },
        });
        if (existingRental && existingRental.status !== 'cancelled') {
          conflicts.push({
            date: dateStr,
            reason: 'already_rented',
            slotId: slot.id,
          });
        } else {
          available.push({ date: dateStr, slotId: slot.id, price: slot.price });
        }
      }
    }

    res.json({ available, conflicts, totalInstances: dates.length });
  } catch (error) {
    console.error('Recurring check error:', error);
    res.status(500).json({ error: 'Failed to check recurring availability' });
  }
});

/**
 * POST /rentals/recurring — Create a recurring booking series.
 * Body: { userId, courtId, facilityId, slotStartTime, slotEndTime, frequency, startDate, endDate, skipConflicts }
 * skipConflicts: if true, only books available slots; if false, fails on any conflict.
 */
router.post(
  '/rentals/recurring',
  authMiddleware,
  requireNonDependent,
  async (req, res) => {
    try {
      const {
        userId,
        courtId,
        facilityId,
        slotStartTime,
        slotEndTime,
        frequency,
        startDate,
        endDate,
        skipConflicts,
      } = req.body;

      if (
        !userId ||
        !courtId ||
        !facilityId ||
        !slotStartTime ||
        !slotEndTime ||
        !frequency ||
        !startDate ||
        !endDate
      ) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (frequency !== 'weekly' && frequency !== 'monthly') {
        return res
          .status(400)
          .json({ error: 'Frequency must be "weekly" or "monthly"' });
      }

      const dates = generateOccurrences({
        frequency: frequency as RecurringFrequency,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });

      if (dates.length === 0) {
        return res.status(400).json({ error: 'No occurrences generated' });
      }

      if (dates.length > 52) {
        return res
          .status(400)
          .json({ error: 'Recurring series cannot exceed 52 instances' });
      }

      // Resolve slots
      const slotsToBook: { slotId: string; price: number; date: Date }[] = [];
      const conflicts: any[] = [];

      for (const date of dates) {
        const normalizedDate = new Date(date);
        normalizedDate.setUTCHours(0, 0, 0, 0);

        const slot = await prisma.facilityTimeSlot.findFirst({
          where: {
            courtId,
            date: normalizedDate,
            startTime: slotStartTime,
            endTime: slotEndTime,
          },
        });

        const dateStr = normalizedDate.toISOString().split('T')[0];

        if (!slot || slot.status !== 'available') {
          conflicts.push({
            date: dateStr,
            reason: slot ? slot.status : 'no_slot',
          });
          continue;
        }

        // Check orphaned rental
        const existingRental = await prisma.facilityRental.findUnique({
          where: { timeSlotId: slot.id },
        });
        if (existingRental && existingRental.status !== 'cancelled') {
          conflicts.push({ date: dateStr, reason: 'already_rented' });
          continue;
        }

        slotsToBook.push({
          slotId: slot.id,
          price: slot.price,
          date: normalizedDate,
        });
      }

      if (!skipConflicts && conflicts.length > 0) {
        return res.status(409).json({
          error: 'Some dates have conflicts',
          conflicts,
          availableCount: slotsToBook.length,
        });
      }

      if (slotsToBook.length === 0) {
        return res.status(400).json({ error: 'No available slots to book' });
      }

      const recurringGroupId = randomUUID();
      const sd = new Date(startDate);
      const firstDate = dates[0]!;

      // Fetch facility to check confirmation requirement
      const facility = await prisma.facility.findUnique({
        where: { id: facilityId },
        select: { requiresBookingConfirmation: true, requiresInsurance: true },
      });
      const needsApproval = facility?.requiresBookingConfirmation === true;

      const result = await prisma.$transaction(
        async tx => {
          // Create recurring booking metadata
          await tx.recurringBooking.create({
            data: {
              groupId: recurringGroupId,
              frequency,
              startDate: new Date(startDate),
              endDate: new Date(endDate),
              dayOfWeek: frequency === 'weekly' ? firstDate.getUTCDay() : null,
              dayOfMonth:
                frequency === 'monthly' ? firstDate.getUTCDate() : null,
              startTime: slotStartTime,
              endTime: slotEndTime,
              courtId,
              userId,
              totalInstances: slotsToBook.length,
              activeInstances: slotsToBook.length,
            },
          });

          const rentals = [];
          for (const { slotId, price } of slotsToBook) {
            await tx.facilityTimeSlot.update({
              where: { id: slotId },
              data: { status: 'rented' },
            });

            const rental = await tx.facilityRental.create({
              data: {
                userId,
                timeSlotId: slotId,
                totalPrice: price,
                status: needsApproval ? 'pending_approval' : 'confirmed',
                paymentStatus: price > 0 ? 'pending' : 'paid',
                recurringGroupId,
              },
              include: {
                timeSlot: {
                  include: {
                    court: { include: { facility: true } },
                  },
                },
              },
            });
            rentals.push(rental);
          }

          return rentals;
        },
        { maxWait: 10000, timeout: 30000 }
      );

      const totalPrice = result.reduce((sum, r) => sum + r.totalPrice, 0);

      res.status(201).json({
        recurringGroupId,
        frequency,
        rentals: result,
        totalPrice,
        instanceCount: result.length,
        skippedConflicts: conflicts,
      });
    } catch (error) {
      console.error('Recurring booking error:', error);
      res.status(500).json({ error: 'Failed to create recurring booking' });
    }
  }
);

/**
 * DELETE /rentals/recurring/:groupId — Cancel all future instances in a recurring series.
 * Body: { userId }
 */
router.delete(
  '/rentals/recurring/:groupId',
  authMiddleware,
  async (req, res) => {
    try {
      const { groupId } = req.params as { groupId: string };
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const recurringBooking = await prisma.recurringBooking.findUnique({
        where: { groupId },
      });

      if (!recurringBooking) {
        return res.status(404).json({ error: 'Recurring series not found' });
      }

      if (recurringBooking.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Find all future confirmed rentals in this series
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const futureRentals = await prisma.facilityRental.findMany({
        where: {
          recurringGroupId: groupId,
          status: 'confirmed',
          usedForEventId: null, // Don't cancel rentals already used for events
          timeSlot: {
            date: { gte: today },
          },
        },
        include: { timeSlot: true },
      });

      if (futureRentals.length === 0) {
        return res.status(400).json({ error: 'No future instances to cancel' });
      }

      await prisma.$transaction(async tx => {
        for (const rental of futureRentals) {
          await tx.facilityRental.update({
            where: { id: rental.id },
            data: {
              status: 'cancelled',
              cancelledAt: new Date(),
              cancellationReason: 'Recurring series cancelled',
              refundAmount:
                rental.paymentStatus === 'paid' ? rental.totalPrice : 0,
            },
          });

          await tx.facilityTimeSlot.update({
            where: { id: rental.timeSlotId },
            data: { status: 'available' },
          });
        }

        // Update active count
        await tx.recurringBooking.update({
          where: { groupId },
          data: {
            activeInstances: {
              decrement: futureRentals.length,
            },
          },
        });
      });

      res.json({
        cancelledCount: futureRentals.length,
        message: `Cancelled ${futureRentals.length} future reservation(s) in this series`,
      });
    } catch (error) {
      console.error('Cancel recurring series error:', error);
      res.status(500).json({ error: 'Failed to cancel recurring series' });
    }
  }
);

/**
 * GET /rentals/recurring/:groupId — Get all rentals in a recurring series.
 */
router.get('/rentals/recurring/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params as { groupId: string };

    const recurringBooking = await prisma.recurringBooking.findUnique({
      where: { groupId },
    });

    if (!recurringBooking) {
      return res.status(404).json({ error: 'Recurring series not found' });
    }

    const rentals = await prisma.facilityRental.findMany({
      where: { recurringGroupId: groupId },
      include: {
        timeSlot: {
          include: {
            court: { include: { facility: true } },
          },
        },
      },
      orderBy: { timeSlot: { date: 'asc' } },
    });

    res.json({
      ...recurringBooking,
      rentals,
    });
  } catch (error) {
    console.error('Get recurring series error:', error);
    res.status(500).json({ error: 'Failed to fetch recurring series' });
  }
});

// ---------------------------------------------------------------------------
// POST /rentals/book-range — Book a court by time range (creates slots + rental)
// ---------------------------------------------------------------------------
router.post(
  '/rentals/book-range',
  authMiddleware,
  requireNonDependent,
  async (req, res) => {
    try {
      const {
        userId,
        facilityId,
        courtId,
        date,
        startTime,
        endTime,
        insuranceDocumentId,
      } = req.body;

      if (
        !userId ||
        !facilityId ||
        !courtId ||
        !date ||
        !startTime ||
        !endTime
      ) {
        return res.status(400).json({
          error:
            'Missing required fields: userId, facilityId, courtId, date, startTime, endTime',
        });
      }

      // Validate court exists and belongs to facility
      const court = await prisma.facilityCourt.findFirst({
        where: { id: courtId, facilityId, isActive: true },
        include: { facility: true },
      });
      if (!court) {
        return res.status(404).json({ error: 'Court not found' });
      }

      const pricePerHour =
        court.pricePerHour ?? court.facility.pricePerHour ?? 0;
      const slotIncrement = court.facility.slotIncrementMinutes || 60;

      // Parse time range into slot boundaries
      const toMin = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
      };
      const startMin = toMin(startTime);
      const endMin = toMin(endTime);
      if (endMin <= startMin) {
        return res
          .status(400)
          .json({ error: 'End time must be after start time' });
      }

      // Check for overlapping rentals
      const targetDate = new Date(date + 'T00:00:00Z');
      const existingRentals = await prisma.facilityRental.findMany({
        where: {
          status: { in: ['confirmed', 'pending_approval'] },
          timeSlot: { courtId, date: targetDate },
        },
        include: { timeSlot: { select: { startTime: true, endTime: true } } },
      });

      for (const r of existingRentals) {
        const rStart = toMin(r.timeSlot.startTime);
        const rEnd = toMin(r.timeSlot.endTime);
        if (startMin < rEnd && endMin > rStart) {
          return res.status(409).json({
            error: 'Selected time overlaps with an existing reservation',
          });
        }
      }

      // Determine status based on facility requirements
      const facility = court.facility as any;
      let rentalStatus = 'confirmed';
      if (facility.requiresInsurance || facility.requiresBookingConfirmation) {
        rentalStatus = 'pending_approval';
      }

      // Calculate total price
      const durationMinutes = endMin - startMin;
      const totalPrice =
        Math.round((pricePerHour / 60) * durationMinutes * 100) / 100;

      // Create time slot + rental in a transaction
      const result = await prisma.$transaction(async tx => {
        const timeSlot = await tx.facilityTimeSlot.create({
          data: {
            courtId,
            date: targetDate,
            startTime,
            endTime,
            price: totalPrice,
            status: 'rented',
          },
        });

        const rental = await tx.facilityRental.create({
          data: {
            userId,
            timeSlotId: timeSlot.id,
            totalPrice,
            status: rentalStatus,
            paymentStatus: totalPrice > 0 ? 'pending' : 'paid',
            ...(insuranceDocumentId
              ? { attachedInsuranceDocumentId: insuranceDocumentId }
              : {}),
          },
          include: {
            timeSlot: {
              include: {
                court: { include: { facility: true } },
              },
            },
          },
        });

        return rental;
      });

      res.status(201).json(result);
    } catch (error) {
      console.error('Book range error:', error);
      res.status(500).json({ error: 'Failed to create reservation' });
    }
  }
);

export default router;
