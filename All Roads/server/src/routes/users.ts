import { Router } from 'express';
import { prisma } from '../index';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

// Search users by name or email
router.get('/search', optionalAuthMiddleware, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    if (query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    // Search users by first name, last name, or email
    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            firstName: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profileImage: true,
      },
      take: 20, // Limit results to 20 users
    });

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get current user profile
router.get('/profile', optionalAuthMiddleware, async (req, res) => {
  try {
    // Get user ID from authenticated request or fall back to first user
    let userId = req.user?.userId;

    if (!userId) {
      // Fallback: use first user for development
      const user = await prisma.user.findFirst({
        select: { id: true },
      });
      userId = user?.id;
    }

    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        dateOfBirth: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get current user stats
router.get('/profile/stats', optionalAuthMiddleware, async (req, res) => {
  try {
    // Get user ID from authenticated request or fall back to first user
    let userId = req.user?.userId;

    if (!userId) {
      // Fallback: use first user for development
      const user = await prisma.user.findFirst({
        select: { id: true },
      });
      userId = user?.id;
    }

    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get event statistics
    const eventsOrganized = await prisma.event.count({
      where: { organizerId: userId },
    });

    // Count events where user has bookings
    const eventsAttended = await prisma.booking.count({
      where: {
        userId,
        status: 'confirmed',
      },
    });

    // Get booking statistics
    const totalBookings = await prisma.booking.count({
      where: { userId },
    });

    const upcomingBookings = await prisma.booking.count({
      where: {
        userId,
        status: 'confirmed',
        event: {
          startTime: {
            gte: new Date(),
          },
        },
      },
    });

    // Get team statistics
    const teamsJoined = await prisma.teamMember.count({
      where: {
        userId,
      },
    });

    const stats = {
      eventsOrganized,
      eventsAttended,
      totalBookings,
      upcomingBookings,
      teamsJoined,
      memberSince: new Date(), // Will be set from user data if needed
    };

    res.json(stats);
  } catch (error) {
    console.error('Get profile stats error:', error);
    res.status(500).json({ error: 'Failed to fetch profile stats' });
  }
});

// Get current user bookings
router.get('/bookings', optionalAuthMiddleware, async (req, res) => {
  try {
    // Get user ID from authenticated request
    let userId = req.user?.userId;

    console.log('📋 GET /users/bookings');
    console.log('📋 Auth header:', req.headers.authorization ? `Bearer ${req.headers.authorization.substring(7, 27)}...` : 'none');
    console.log('📋 X-User-Id header:', req.headers['x-user-id']);
    console.log('📋 Decoded user ID from middleware:', userId);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Log which user we're fetching bookings for
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });
    console.log('📋 Fetching bookings for user:', user?.email, `${user?.firstName} ${user?.lastName}`);

    const { page = '1', limit = '20', status } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = { userId };
    
    if (status === 'upcoming') {
      where.status = { not: 'cancelled' };
      where.event = {
        startTime: { gte: new Date() },
        status: { not: 'cancelled' },
      };
    } else if (status === 'past') {
      where.status = { not: 'cancelled' };
      where.OR = [
        { event: { startTime: { lt: new Date() } } },
        { event: { status: 'cancelled' } },
      ];
    } else if (status === 'cancelled') {
      where.status = 'cancelled';
    } else if (status) {
      where.status = status;
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: {
          event: {
            startTime: 'asc', // Sort by event start time, soonest first
          },
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              sportType: true,
              status: true,
              startTime: true,
              endTime: true,
              imageUrl: true,
              price: true,
              currentParticipants: true,
              maxParticipants: true,
              facility: {
                select: {
                  id: true,
                  name: true,
                  street: true,
                  city: true,
                  state: true,
                },
              },
            },
          },
          facility: {
            select: {
              id: true,
              name: true,
              street: true,
              city: true,
              state: true,
              imageUrl: true,
            },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    console.log('📋 Found bookings:', bookings.length, 'for user:', userId);
    console.log('📋 Status filter:', status);
    bookings.forEach(b => {
      console.log(`  - ${b.event?.title}: ${b.event?.startTime}`);
    });

    res.json({
      data: bookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get current user's leagues (leagues they organize or are a member of)
router.get('/leagues', optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId || req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Find leagues where user is organizer or has an active membership
    const [organizedLeagues, memberships] = await Promise.all([
      prisma.league.findMany({
        where: { organizerId: userId, isActive: true },
        select: {
          id: true, name: true, sportType: true, leagueType: true,
          isActive: true, imageUrl: true, isCertified: true,
          memberships: { where: { status: 'active' }, select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.leagueMembership.findMany({
        where: { memberId: userId, status: 'active' },
        include: {
          league: {
            select: {
              id: true, name: true, sportType: true, leagueType: true,
              isActive: true, imageUrl: true, isCertified: true, organizerId: true,
              memberships: { where: { status: 'active' }, select: { id: true } },
            },
          },
        },
        take: 20,
      }),
    ]);

    // Merge and deduplicate
    const leagueMap = new Map<string, any>();
    organizedLeagues.forEach(l => {
      leagueMap.set(l.id, { ...l, memberCount: l.memberships.length, role: 'commissioner' });
    });
    memberships.forEach(m => {
      if (m.league && !leagueMap.has(m.league.id)) {
        leagueMap.set(m.league.id, { ...m.league, memberCount: m.league.memberships.length, role: 'player' });
      }
    });

    const leagues = Array.from(leagueMap.values()).map(({ memberships, ...rest }) => rest);
    res.json(leagues);
  } catch (error) {
    console.error('Get user leagues error:', error);
    res.status(500).json({ error: 'Failed to fetch user leagues' });
  }
});

// Get user profile by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        dateOfBirth: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password, ...updateData } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        dateOfBirth: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;
