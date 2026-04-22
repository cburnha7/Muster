import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get eligible locations for event creation
// Returns owned facilities and unused rentals
router.get(
  '/users/:userId/eligible-locations',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user!.userId;

      // Get owned facilities
      const ownedFacilities = await prisma.facility.findMany({
        where: {
          ownerId: userId,
          isActive: true,
        },
        include: {
          courts: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Get unused rentals (confirmed, not cancelled, not used for an event)
      const unusedRentals = await prisma.facilityRental.findMany({
        where: {
          userId,
          status: 'confirmed',
          usedForEventId: null,
          timeSlot: {
            date: { gte: new Date() }, // Only future rentals
          },
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
        orderBy: {
          timeSlot: {
            date: 'asc',
          },
        },
      });

      res.json({
        ownedFacilities,
        unusedRentals,
      });
    } catch (error) {
      console.error('Get eligible locations error:', error);
      res.status(500).json({ error: 'Failed to fetch eligible locations' });
    }
  }
);

export default router;
