import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// Get all bookings (with optional userId filter)
router.get('/', async (req, res) => {
  try {
    const { userId, page = '1', limit = '20' } = req.query;
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where = userId ? { userId: userId as string } : {};

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take,
        include: {
          event: {
            include: {
              facility: true,
            },
          },
          facility: true,
        },
        orderBy: {
          event: {
            startTime: 'asc', // Sort by event start time, soonest first
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({
      data: bookings,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get user bookings
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = '1', limit = '10' } = req.query;
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: { userId },
        skip,
        take,
        include: {
          event: {
            include: {
              facility: true,
            },
          },
          facility: true,
        },
        orderBy: {
          event: {
            startTime: 'asc', // Sort by event start time, soonest first
          },
        },
      }),
      prisma.booking.count({ where: { userId } }),
    ]);

    res.json({
      data: bookings,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get booking by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        event: {
          include: {
            facility: true,
          },
        },
        facility: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

export default router;
