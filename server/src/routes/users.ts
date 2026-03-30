import { Router } from 'express';
import { prisma } from '../index';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

/**
 * Resolve the effective user ID for the request.
 * If the guardian is acting on behalf of a dependent, X-Active-User-Id takes precedence.
 * Falls back to the authenticated user, then X-User-Id header, then query param.
 */
function resolveUserId(req: any): string | undefined {
  const activeId = req.headers['x-active-user-id'] as string | undefined;
  if (activeId) return activeId;
  return req.user?.userId || req.headers['x-user-id'] as string || req.query.userId as string || undefined;
}

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

// Upload profile image
router.post('/profile/image', optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId || req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    // For now, accept a base64 image or URL in the body
    const { imageUrl, imageData } = req.body;
    
    let finalUrl = imageUrl;
    
    // If base64 data is provided, store it (in production this would go to S3/CloudStorage)
    if (imageData && !imageUrl) {
      // Store as a data URI for now — in production, upload to cloud storage
      finalUrl = imageData;
    }

    if (!finalUrl) {
      return res.status(400).json({ error: 'Image URL or data is required' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { profileImage: finalUrl },
      select: { id: true, profileImage: true },
    });

    res.json({ imageUrl: user.profileImage });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({ error: 'Failed to upload profile image' });
  }
});

// Delete profile image
router.delete('/profile/image', optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId || req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    await prisma.user.update({
      where: { id: userId },
      data: { profileImage: null },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete profile image error:', error);
    res.status(500).json({ error: 'Failed to delete profile image' });
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

// Get sport ratings for a user (own profile or another user's)
router.get('/sport-ratings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const ratings = await prisma.playerSportRating.findMany({
      where: {
        userId,
        OR: [
          { bracketEventCount: { gt: 0 } },
          { overallEventCount: { gt: 0 } },
          { gamesPlayed: { gt: 0 } },
        ],
      },
      select: {
        sportType: true,
        bracketRating: true,
        overallRating: true,
        bracketPercentile: true,
        overallPercentile: true,
        ageBracket: true,
        bracketEventCount: true,
        overallEventCount: true,
        // Legacy fields
        rating: true,
        percentile: true,
        gamesPlayed: true,
        lastUpdated: true,
      },
      orderBy: { overallRating: 'desc' },
    });

    res.json(ratings);
  } catch (error) {
    console.error('Get sport ratings error:', error);
    res.status(500).json({ error: 'Failed to fetch sport ratings' });
  }
});

// Get current user bookings
router.get('/bookings', optionalAuthMiddleware, async (req, res) => {
  try {
    // Get user ID — respects X-Active-User-Id for dependent context
    let userId = resolveUserId(req);

    console.log('📋 GET /users/bookings');
    console.log('📋 Auth header:', req.headers.authorization ? `Bearer ${req.headers.authorization.substring(7, 27)}...` : 'none');
    console.log('📋 X-User-Id header:', req.headers['x-user-id']);
    console.log('📋 X-Active-User-Id header:', req.headers['x-active-user-id']);
    console.log('📋 Resolved user ID:', userId);

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
        { event: { endTime: { lt: new Date() } } },
        { event: { status: 'cancelled' } },
      ];
    } else if (status === 'cancelled') {
      where.status = 'cancelled';
    } else if (status && status !== 'all') {
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

// Get current user's pending invitations (roster + league)
router.get('/invitations', optionalAuthMiddleware, async (req, res) => {
  try {
    let userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // 1. Pending roster invitations — user was added to a team with status 'pending'
    const pendingRosterMemberships = await prisma.teamMember.findMany({
      where: { userId, status: 'pending' },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            sportType: true,
            imageUrl: true,
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const rosterInvitations = pendingRosterMemberships.map((m) => ({
      id: m.id,
      type: 'roster' as const,
      rosterId: m.teamId,
      rosterName: m.team.name,
      sportType: m.team.sportType,
      imageUrl: m.team.imageUrl,
      playerCount: m.team._count.members,
      invitedAt: m.joinedAt,
    }));

    // 2. Pending league invitations for rosters the user owns (captain only)
    // Only the roster Manager/Owner can see and respond to league invitations
    const captainedTeamIds = await prisma.teamMember.findMany({
      where: { userId, status: 'active', role: 'captain' },
      select: { teamId: true },
    });
    const teamIds = captainedTeamIds.map((t) => t.teamId);

    let leagueInvitations: any[] = [];
    if (teamIds.length > 0) {
      const pendingLeagueMemberships = await prisma.leagueMembership.findMany({
        where: {
          memberType: 'roster',
          memberId: { in: teamIds },
          status: 'pending',
        },
        include: {
          league: {
            select: {
              id: true,
              name: true,
              sportType: true,
              imageUrl: true,
              leagueType: true,
            },
          },
          team: {
            select: { id: true, name: true },
          },
        },
        orderBy: { joinedAt: 'desc' },
      });

      // Exclude pending invitations where the roster already has an active membership
      // in the same league (handles duplicate membership data)
      const activeLeagueMemberships = await prisma.leagueMembership.findMany({
        where: {
          memberType: 'roster',
          memberId: { in: teamIds },
          status: 'active',
        },
        select: { leagueId: true, memberId: true },
      });
      const activeKeys = new Set(
        activeLeagueMemberships.map((m) => `${m.leagueId}:${m.memberId}`)
      );

      const filteredPending = pendingLeagueMemberships.filter(
        (m) => !activeKeys.has(`${m.leagueId}:${m.memberId}`)
      );

      leagueInvitations = filteredPending.map((m) => ({
        id: m.id,
        type: 'league' as const,
        leagueId: m.league.id,
        leagueName: m.league.name,
        sportType: m.league.sportType,
        imageUrl: m.league.imageUrl,
        leagueType: m.league.leagueType,
        rosterId: m.team?.id,
        rosterName: m.team?.name,
        invitedAt: m.joinedAt,
      }));
    }

    // 3. Event invitations — league events where the user is in invitedUserIds
    const eventInvitations = await prisma.event.findMany({
      where: {
        invitedUserIds: { has: userId },
        status: 'active',
        startTime: { gte: new Date() },
        bookings: { none: { userId, status: { in: ['confirmed', 'pending'] } } },
      },
      select: {
        id: true,
        title: true,
        sportType: true,
        startTime: true,
        imageUrl: true,
        eligibilityRestrictedToLeagues: true,
        facility: {
          select: { id: true, name: true, city: true, state: true },
        },
      },
      orderBy: { startTime: 'asc' },
      take: 50,
    });

    const mappedEventInvitations = eventInvitations.map((e) => ({
      id: e.id,
      type: 'event' as const,
      eventId: e.id,
      eventTitle: e.title,
      sportType: e.sportType,
      imageUrl: e.imageUrl,
      startTime: e.startTime,
      facilityName: e.facility?.name || null,
      leagueId: e.eligibilityRestrictedToLeagues?.[0] || null,
    }));

    res.json({
      rosterInvitations,
      leagueInvitations,
      eventInvitations: mappedEventInvitations,
      total: rosterInvitations.length + leagueInvitations.length + mappedEventInvitations.length,
    });
  } catch (error) {
    console.error('Get user invitations error:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Get leagues ready to schedule for the current user (Commissioner only)
router.get('/leagues-ready-to-schedule', optionalAuthMiddleware, async (req, res) => {
  try {
    let userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Find leagues where user is commissioner, notification was sent, and schedule not yet generated
    const readyLeagues = await prisma.league.findMany({
      where: {
        organizerId: userId,
        readyNotificationSent: true,
        scheduleGenerated: false,
      },
      select: {
        id: true,
        name: true,
        sportType: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(readyLeagues);
  } catch (error) {
    console.error('Get leagues ready to schedule error:', error);
    res.status(500).json({ error: 'Failed to fetch leagues ready to schedule' });
  }
});

// Get current user's events (organized + confirmed participant)
router.get('/events', optionalAuthMiddleware, async (req, res) => {
  try {
    let userId = req.user?.userId;
    if (!userId) {
      userId = req.headers['x-user-id'] as string || req.query.userId as string;
    }
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { page = '1', limit = '50', status } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    // 1. Events user organized
    const organizedWhere: any = { organizerId: userId };
    if (status && status !== 'all') {
      organizedWhere.status = status;
    }

    // 2. Events user is a confirmed participant in (has a confirmed booking)
    const participantBookings = await prisma.booking.findMany({
      where: {
        userId,
        status: 'confirmed',
      },
      select: { eventId: true },
    });
    const participantEventIds = participantBookings
      .map(b => b.eventId)
      .filter((id): id is string => id !== null);

    // Build combined query: organized OR confirmed participant
    const combinedWhere: any = {
      OR: [
        organizedWhere,
        ...(participantEventIds.length > 0
          ? [{ id: { in: participantEventIds }, ...(status && status !== 'all' ? { status } : {}) }]
          : []),
      ],
    };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where: combinedWhere,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { startTime: 'desc' },
        include: {
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
      }),
      prisma.event.count({ where: combinedWhere }),
    ]);

    res.json({
      data: events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get user events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get current user's teams (teams the user is an active member of)
router.get('/teams', optionalAuthMiddleware, async (req, res) => {
  try {
    let userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const memberships = await prisma.teamMember.findMany({
      where: { userId, status: 'active' },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const teams = memberships.map((m) => {
      const { isPrivate, ...rest } = m.team;
      return { ...rest, isPublic: !isPrivate, currentUserRole: m.role };
    });

    res.json({
      data: teams,
      pagination: {
        page: 1,
        limit: teams.length,
        total: teams.length,
        totalPages: 1,
      },
    });
  } catch (error) {
    console.error('Get user teams error:', error);
    res.status(500).json({ error: 'Failed to fetch user teams' });
  }
});

// Get current user's leagues (leagues they organize or are a member of)
router.get('/leagues', optionalAuthMiddleware, async (req, res) => {
  try {
    let userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Find teams the user is an active member of
    const userTeamIds = (await prisma.teamMember.findMany({
      where: { userId, status: 'active' },
      select: { teamId: true },
    })).map(t => t.teamId);

    // Find leagues where user is organizer, direct member, or roster member
    const [organizedLeagues, directMemberships, rosterMemberships] = await Promise.all([
      prisma.league.findMany({
        where: { organizerId: userId },
        select: {
          id: true, name: true, sportType: true, leagueType: true,
          isActive: true, imageUrl: true, isCertified: true, organizerId: true,
          memberships: { where: { status: 'active' }, select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
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
        take: 50,
      }),
      userTeamIds.length > 0
        ? prisma.leagueMembership.findMany({
            where: { memberId: { in: userTeamIds }, memberType: 'roster', status: 'active' },
            include: {
              league: {
                select: {
                  id: true, name: true, sportType: true, leagueType: true,
                  isActive: true, imageUrl: true, isCertified: true, organizerId: true,
                  memberships: { where: { status: 'active' }, select: { id: true } },
                },
              },
            },
            take: 50,
          })
        : Promise.resolve([]),
    ]);

    // Merge and deduplicate
    const leagueMap = new Map<string, any>();
    organizedLeagues.forEach(l => {
      leagueMap.set(l.id, { ...l, memberCount: l.memberships.length, role: 'commissioner' });
    });
    directMemberships.forEach(m => {
      if (m.league && !leagueMap.has(m.league.id)) {
        leagueMap.set(m.league.id, { ...m.league, memberCount: m.league.memberships.length, role: 'player' });
      }
    });
    rosterMemberships.forEach(m => {
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

// Complete onboarding
router.put('/onboarding', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId || req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { intents, sportPreferences, locationCity, locationState, locationLat, locationLng } = req.body;

    if (!intents || !Array.isArray(intents) || intents.length === 0) {
      return res.status(400).json({ error: 'At least one intent is required' });
    }
    if (!sportPreferences || !Array.isArray(sportPreferences) || sportPreferences.length === 0) {
      return res.status(400).json({ error: 'At least one sport preference is required' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        intents,
        sportPreferences,
        locationCity: locationCity || null,
        locationState: locationState || null,
        locationLat: locationLat || null,
        locationLng: locationLng || null,
        onboardingComplete: true,
      },
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

// Update user intents
router.put('/intents', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId || req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { intents } = req.body;
    if (!intents || !Array.isArray(intents) || intents.length === 0) {
      return res.status(400).json({ error: 'At least one intent is required' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { intents },
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error('Update intents error:', error);
    res.status(500).json({ error: 'Failed to update intents' });
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

// ---------------------------------------------------------------------------
// GET /onboarding — Check user onboarding status
// ---------------------------------------------------------------------------
router.get('/onboarding', authMiddleware, async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      completed: true,
      userId: user.id,
    });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return res.status(500).json({ error: 'Failed to check onboarding status' });
  }
});

// ---------------------------------------------------------------------------
// PUT /onboarding — Mark user onboarding as complete
// ---------------------------------------------------------------------------
router.put('/onboarding', authMiddleware, async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      completed: true,
      userId: user.id,
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

export default router;
