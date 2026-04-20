/**
 * Escrow Transaction Routes
 *
 * Endpoints for ground owners to view escrow transaction logs:
 * - GET /api/escrow-transactions?rentalId= — list escrow transactions for a rental
 *
 * Access restricted to the ground owner of the associated facility.
 *
 * Requirements: 9.2, 9.3
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { EscrowTransactionService } from '../services/EscrowTransactionService';
import { optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

/**
 * Extract the authenticated user's ID from the request.
 */
function getUserId(req: Request): string | undefined {
  return req.user?.userId;
}

/**
 * GET /api/escrow-transactions
 *
 * Returns all escrow transactions for a given rental.
 * Query param: rentalId (required)
 * Access: restricted to the ground owner of the associated facility (403 for non-owners).
 */
router.get('/', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const rentalId = req.query.rentalId as string;
    if (!rentalId) {
      return res
        .status(400)
        .json({ error: 'rentalId query parameter is required' });
    }

    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Look up the rental to find the facility and its owner
    const rental = await prisma.facilityRental.findUnique({
      where: { id: rentalId },
      include: {
        timeSlot: {
          include: {
            court: {
              include: {
                facility: {
                  select: { ownerId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    // Restrict access to the ground owner
    const facilityOwnerId = rental.timeSlot.court.facility.ownerId;
    if (userId !== facilityOwnerId) {
      return res.status(403).json({
        error:
          'Access denied. Only the ground owner can view escrow transactions.',
      });
    }

    const transactions = await EscrowTransactionService.getByRental(rentalId);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching escrow transactions:', error);
    res.status(500).json({ error: 'Failed to fetch escrow transactions' });
  }
});

export default router;
