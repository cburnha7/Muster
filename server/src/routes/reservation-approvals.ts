/**
 * Reservation Approval Routes
 *
 * Endpoints for ground owners to review and approve/deny pending reservations:
 * - GET  /api/reservation-approvals         — list pending reservations for an owner
 * - POST /api/reservation-approvals/:rentalId/approve — approve a pending reservation
 * - POST /api/reservation-approvals/:rentalId/deny    — deny a pending reservation
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { NotificationService } from '../services/NotificationService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * GET /api/reservation-approvals
 *
 * List all pending_approval rentals across the owner's facilities.
 * Query param: ownerId (required)
 * Returns renter info, court, time slot, and attached insurance document.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const ownerId = req.query.ownerId as string;
    if (!ownerId) {
      return res
        .status(400)
        .json({ error: 'ownerId query parameter is required' });
    }

    const rentals = await prisma.facilityRental.findMany({
      where: {
        status: 'pending_approval',
        timeSlot: {
          court: {
            facility: {
              ownerId,
            },
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        timeSlot: {
          include: {
            court: {
              include: {
                facility: true,
              },
            },
          },
        },
        attachedInsuranceDocument: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(rentals);
  } catch (error) {
    console.error('Error listing pending reservations:', error);
    res.status(500).json({ error: 'Failed to list pending reservations' });
  }
});

/**
 * POST /api/reservation-approvals/:rentalId/approve
 *
 * Approve a pending reservation: transitions pending_approval → confirmed.
 * Sends confirmation notification to the renter.
 */
router.post(
  '/:rentalId/approve',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { rentalId } = req.params as { rentalId: string };

      const rental = await prisma.facilityRental.findUnique({
        where: { id: rentalId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          timeSlot: {
            include: {
              court: { include: { facility: true } },
            },
          },
        },
      });

      if (!rental) {
        return res.status(404).json({ error: 'Rental not found' });
      }

      if (rental.status !== 'pending_approval') {
        return res
          .status(409)
          .json({ error: 'Reservation is not pending approval' });
      }

      const updatedRental = await prisma.$transaction(async tx => {
        return tx.facilityRental.update({
          where: { id: rentalId },
          data: { status: 'confirmed' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            timeSlot: {
              include: {
                court: { include: { facility: true } },
              },
            },
            attachedInsuranceDocument: true,
          },
        });
      });

      // Send confirmation notification to the renter (non-blocking)
      const facility = updatedRental.timeSlot.court.facility;
      const court = updatedRental.timeSlot.court;
      const slot = updatedRental.timeSlot;

      NotificationService.notifyReservationApproved(
        updatedRental.userId,
        facility.name,
        court.name,
        new Date(slot.date).toLocaleDateString(),
        slot.startTime,
        updatedRental.id,
        facility.id
      ).catch(err =>
        console.error('Error sending approval notification:', err)
      );

      res.json(updatedRental);
    } catch (error) {
      console.error('Error approving reservation:', error);
      res.status(500).json({ error: 'Failed to approve reservation' });
    }
  }
);

/**
 * POST /api/reservation-approvals/:rentalId/deny
 *
 * Deny a pending reservation: transitions pending_approval → cancelled.
 * Releases the held time slot (sets back to available).
 * Sends denial notification to the renter. No Stripe charges created.
 */
router.post(
  '/:rentalId/deny',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { rentalId } = req.params as { rentalId: string };

      const rental = await prisma.facilityRental.findUnique({
        where: { id: rentalId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          timeSlot: {
            include: {
              court: { include: { facility: true } },
            },
          },
        },
      });

      if (!rental) {
        return res.status(404).json({ error: 'Rental not found' });
      }

      if (rental.status !== 'pending_approval') {
        return res
          .status(409)
          .json({ error: 'Reservation is not pending approval' });
      }

      const updatedRental = await prisma.$transaction(async tx => {
        // Transition rental to cancelled
        const updated = await tx.facilityRental.update({
          where: { id: rentalId },
          data: {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancellationReason: 'Denied by ground owner',
          },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            timeSlot: {
              include: {
                court: { include: { facility: true } },
              },
            },
            attachedInsuranceDocument: true,
          },
        });

        // Release the held time slot
        await tx.facilityTimeSlot.update({
          where: { id: rental.timeSlotId },
          data: { status: 'available' },
        });

        return updated;
      });

      // Send denial notification to the renter (non-blocking)
      const facility = updatedRental.timeSlot.court.facility;
      const court = updatedRental.timeSlot.court;
      const slot = updatedRental.timeSlot;

      NotificationService.notifyReservationDenied(
        updatedRental.userId,
        facility.name,
        court.name,
        new Date(slot.date).toLocaleDateString(),
        slot.startTime,
        updatedRental.id,
        facility.id
      ).catch(err => console.error('Error sending denial notification:', err));

      res.json(updatedRental);
    } catch (error) {
      console.error('Error denying reservation:', error);
      res.status(500).json({ error: 'Failed to deny reservation' });
    }
  }
);

export default router;
