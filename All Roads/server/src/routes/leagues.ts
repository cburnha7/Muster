import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from '../services/NotificationService';
import { ScheduleGeneratorService } from '../services/ScheduleGeneratorService';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/leagues - Get all leagues with filtering and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      sportType,
      isCertified,
      isActive,
      search,
      page = '1',
      limit = '20'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};
    
    if (sportType) {
      where.sportType = sportType;
    }
    
    if (isCertified !== undefined) {
      where.isCertified = isCertified === 'true';
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (search) {
      where.name = {
        contains: search as string,
        mode: 'insensitive'
      };
    }

    // Get total count
    const total = await prisma.league.count({ where });

    // Get leagues with relations
    const leagues = await prisma.league.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true
          }
        },
        memberships: {
          where: { status: 'active' },
          select: { id: true }
        },
        matches: {
          select: { id: true }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Add counts
    const leaguesWithCounts = leagues.map(league => ({
      ...league,
      memberCount: league.memberships.length,
      matchCount: league.matches.length,
      memberships: undefined,
      matches: undefined
    }));

    res.json({
      data: leaguesWithCounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching leagues:', error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

// GET /api/leagues/:id - Get league by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const league = await prisma.league.findUnique({
      where: { id },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true
          }
        },
        memberships: {
          where: { status: { in: ['active', 'pending'] } },
          include: {
            team: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                sportType: true
              }
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profileImage: true
              }
            }
          }
        },
        matches: {
          take: 10,
          orderBy: { scheduledAt: 'desc' },
          include: {
            homeTeam: {
              select: {
                id: true,
                name: true,
                imageUrl: true
              }
            },
            awayTeam: {
              select: {
                id: true,
                name: true,
                imageUrl: true
              }
            }
          }
        },
        seasons: {
          orderBy: { startDate: 'desc' }
        }
      }
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    res.json(league);
  } catch (error) {
    console.error('Error fetching league:', error);
    res.status(500).json({ error: 'Failed to fetch league' });
  }
});

// POST /api/leagues - Create new league
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      sportType,
      skillLevel,
      seasonName,
      startDate,
      endDate,
      pointsConfig,
      imageUrl,
      organizerId,
      leagueType,
      visibility,
      membershipFee,
      minimumRosterSize,
      registrationCloseDate,
      preferredGameDays,
      preferredTimeWindowStart,
      preferredTimeWindowEnd,
      seasonGameCount,
      rosterIds,
      trackStandings
    } = req.body;

    // Validate required fields
    if (!name || !sportType || !skillLevel || !organizerId) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, sportType, skillLevel, organizerId' 
      });
    }

    // Validate leagueType if provided
    if (leagueType !== undefined && leagueType !== 'team' && leagueType !== 'pickup') {
      return res.status(400).json({ error: "leagueType must be 'team' or 'pickup'" });
    }

    // Enforce pickup leagues are always public
    if (leagueType === 'pickup' && visibility === 'private') {
      return res.status(400).json({ error: 'Pickup leagues must be public' });
    }

    // Determine final visibility: pickup leagues are always public, team leagues default to "public"
    const finalLeagueType = leagueType || 'team';
    const finalVisibility = finalLeagueType === 'pickup' 
      ? 'public' 
      : (visibility === 'public' || visibility === 'private' ? visibility : 'public');

    // Validate name uniqueness within sport and season
    if (startDate && endDate) {
      const existingLeague = await prisma.league.findFirst({
        where: {
          name,
          sportType,
          OR: [
            {
              AND: [
                { startDate: { lte: new Date(endDate) } },
                { endDate: { gte: new Date(startDate) } }
              ]
            }
          ]
        }
      });

      if (existingLeague) {
        return res.status(409).json({ 
          error: 'A league with this name already exists for this sport and season timeframe' 
        });
      }
    }

    // Validate HH:MM format for time windows
    const hhmmRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (preferredTimeWindowStart && !hhmmRegex.test(preferredTimeWindowStart)) {
      return res.status(400).json({ error: 'preferredTimeWindowStart must be in HH:MM 24-hour format' });
    }
    if (preferredTimeWindowEnd && !hhmmRegex.test(preferredTimeWindowEnd)) {
      return res.status(400).json({ error: 'preferredTimeWindowEnd must be in HH:MM 24-hour format' });
    }
    if (preferredTimeWindowStart && preferredTimeWindowEnd && preferredTimeWindowStart >= preferredTimeWindowEnd) {
      return res.status(400).json({ error: 'preferredTimeWindowStart must be before preferredTimeWindowEnd' });
    }

    // Validate minimumRosterSize
    if (minimumRosterSize !== undefined && minimumRosterSize !== null && (typeof minimumRosterSize !== 'number' || minimumRosterSize < 1)) {
      return res.status(400).json({ error: 'minimumRosterSize must be a positive integer' });
    }

    // Validate registrationCloseDate is in the future
    if (registrationCloseDate) {
      const closeDate = new Date(registrationCloseDate);
      if (closeDate <= new Date()) {
        return res.status(400).json({ error: 'registrationCloseDate must be in the future' });
      }
    }

    // Validate preferredGameDays values (0-6)
    if (preferredGameDays && Array.isArray(preferredGameDays)) {
      if (preferredGameDays.some((d: number) => d < 0 || d > 6)) {
        return res.status(400).json({ error: 'preferredGameDays values must be between 0 (Sunday) and 6 (Saturday)' });
      }
    }

    // Create league
    const league = await prisma.league.create({
      data: {
        name,
        description,
        sportType,
        skillLevel,
        seasonName,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        pointsConfig: pointsConfig || { win: 3, draw: 1, loss: 0 },
        imageUrl,
        organizerId,
        leagueType: finalLeagueType,
        visibility: finalVisibility,
        ...(membershipFee !== undefined && { membershipFee }),
        ...(minimumRosterSize !== undefined && { minimumRosterSize }),
        ...(registrationCloseDate && { registrationCloseDate: new Date(registrationCloseDate) }),
        ...(preferredGameDays && { preferredGameDays }),
        ...(preferredTimeWindowStart && { preferredTimeWindowStart }),
        ...(preferredTimeWindowEnd && { preferredTimeWindowEnd }),
        ...(seasonGameCount !== undefined && seasonGameCount !== null && { seasonGameCount }),
        ...(trackStandings !== undefined && { trackStandings })
      },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true
          }
        }
      }
    });

    // Create roster memberships if rosterIds provided
    if (Array.isArray(rosterIds) && rosterIds.length > 0) {
      await prisma.leagueMembership.createMany({
        data: rosterIds.map((rid: string) => ({
          leagueId: league.id,
          memberId: rid,
          teamId: rid,
          memberType: 'roster',
          status: 'active',
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          points: 0,
        })),
        skipDuplicates: true,
      });
    }

    res.status(201).json(league);
  } catch (error) {
    console.error('Error creating league:', error);
    res.status(500).json({ error: 'Failed to create league' });
  }
});

// PUT /api/leagues/:id - Update league
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      skillLevel,
      seasonName,
      startDate,
      endDate,
      pointsConfig,
      imageUrl,
      isActive,
      leagueType,
      visibility,
      userId, // For authorization check
      minimumRosterSize,
      registrationCloseDate,
      preferredGameDays,
      preferredTimeWindowStart,
      preferredTimeWindowEnd,
      seasonGameCount,
      rosterIds,
      invitedRosterIds,
      trackStandings,
      seasonLength,
      scheduleFrequency,
      autoGenerateMatchups
    } = req.body;

    // Check if league exists and user is operator
    const existingLeague = await prisma.league.findUnique({
      where: { id }
    });

    if (!existingLeague) {
      return res.status(404).json({ error: 'League not found' });
    }

    if (existingLeague.organizerId !== userId) {
      return res.status(403).json({ error: 'Only the league operator can update this league' });
    }

    // Prevent leagueType modification after creation
    if (leagueType !== undefined && leagueType !== existingLeague.leagueType) {
      return res.status(400).json({ error: 'leagueType cannot be modified after creation' });
    }

    // Prevent setting visibility to "private" on pickup leagues
    if (existingLeague.leagueType === 'pickup' && visibility === 'private') {
      return res.status(400).json({ error: 'Pickup leagues must be public' });
    }

    // Validate schedule management fields
    const hhmmRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (preferredTimeWindowStart && !hhmmRegex.test(preferredTimeWindowStart)) {
      return res.status(400).json({ error: 'preferredTimeWindowStart must be in HH:MM 24-hour format' });
    }
    if (preferredTimeWindowEnd && !hhmmRegex.test(preferredTimeWindowEnd)) {
      return res.status(400).json({ error: 'preferredTimeWindowEnd must be in HH:MM 24-hour format' });
    }
    if (preferredTimeWindowStart && preferredTimeWindowEnd && preferredTimeWindowStart >= preferredTimeWindowEnd) {
      return res.status(400).json({ error: 'preferredTimeWindowStart must be before preferredTimeWindowEnd' });
    }
    if (minimumRosterSize !== undefined && minimumRosterSize !== null && (typeof minimumRosterSize !== 'number' || minimumRosterSize < 1)) {
      return res.status(400).json({ error: 'minimumRosterSize must be a positive integer' });
    }
    if (preferredGameDays && Array.isArray(preferredGameDays)) {
      if (preferredGameDays.some((d: number) => d < 0 || d > 6)) {
        return res.status(400).json({ error: 'preferredGameDays values must be between 0 (Sunday) and 6 (Saturday)' });
      }
    }

    // Update league (leagueType is never included in the update data)
    const league = await prisma.league.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(skillLevel && { skillLevel }),
        ...(seasonName !== undefined && { seasonName }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(pointsConfig && { pointsConfig }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isActive !== undefined && { isActive }),
        ...(visibility !== undefined && { visibility }),
        ...(minimumRosterSize !== undefined && { minimumRosterSize }),
        ...(registrationCloseDate !== undefined && { registrationCloseDate: registrationCloseDate ? new Date(registrationCloseDate) : null }),
        ...(preferredGameDays !== undefined && { preferredGameDays }),
        ...(preferredTimeWindowStart !== undefined && { preferredTimeWindowStart }),
        ...(preferredTimeWindowEnd !== undefined && { preferredTimeWindowEnd }),
        ...(seasonGameCount !== undefined && { seasonGameCount }),
        ...(trackStandings !== undefined && { trackStandings }),
        ...(seasonLength !== undefined && { seasonLength }),
        ...(scheduleFrequency !== undefined && { scheduleFrequency }),
        ...(autoGenerateMatchups !== undefined && { autoGenerateMatchups }),
      },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true
          }
        }
      }
    });

    // Sync roster memberships if rosterIds provided
    if (Array.isArray(rosterIds)) {
      // Get current active memberships
      const currentActiveMemberships = await prisma.leagueMembership.findMany({
        where: { leagueId: id, memberType: 'roster', status: 'active' },
        select: { id: true, memberId: true },
      });
      const currentActiveRosterIds = currentActiveMemberships.map((m: any) => m.memberId);

      // Rosters to add as active (not already active in league)
      const toAddActive = rosterIds.filter((rid: string) => !currentActiveRosterIds.includes(rid));
      // Active rosters to remove (in league but not in submitted list)
      const toRemoveActive = currentActiveMemberships.filter((m: any) => !rosterIds.includes(m.memberId));

      if (toAddActive.length > 0) {
        await prisma.leagueMembership.createMany({
          data: toAddActive.map((rid: string) => ({
            leagueId: id,
            memberId: rid,
            teamId: rid,
            memberType: 'roster',
            status: 'active',
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            points: 0,
          })),
          skipDuplicates: true,
        });
      }

      if (toRemoveActive.length > 0) {
        await prisma.leagueMembership.deleteMany({
          where: { id: { in: toRemoveActive.map((m: any) => m.id) } },
        });
      }
    }

    // Sync invited (pending) roster memberships if invitedRosterIds provided
    if (Array.isArray(invitedRosterIds)) {
      const currentPendingMemberships = await prisma.leagueMembership.findMany({
        where: { leagueId: id, memberType: 'roster', status: 'pending' },
        select: { id: true, memberId: true },
      });
      const currentPendingRosterIds = currentPendingMemberships.map((m: any) => m.memberId);

      // Rosters to invite (not already pending)
      const toInvite = invitedRosterIds.filter((rid: string) => !currentPendingRosterIds.includes(rid));
      // Pending rosters to remove (no longer in invited list)
      const toRemovePending = currentPendingMemberships.filter((m: any) => !invitedRosterIds.includes(m.memberId));

      if (toInvite.length > 0) {
        await prisma.leagueMembership.createMany({
          data: toInvite.map((rid: string) => ({
            leagueId: id,
            memberId: rid,
            teamId: rid,
            memberType: 'roster',
            status: 'pending',
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            points: 0,
          })),
          skipDuplicates: true,
        });
      }

      if (toRemovePending.length > 0) {
        await prisma.leagueMembership.deleteMany({
          where: { id: { in: toRemovePending.map((m: any) => m.id) } },
        });
      }
    }

    res.json(league);
  } catch (error) {
    console.error('Error updating league:', error);
    res.status(500).json({ error: 'Failed to update league' });
  }
});

// DELETE /api/leagues/:id - Delete league
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body; // For authorization check

    // Check if league exists and user is operator
    const existingLeague = await prisma.league.findUnique({
      where: { id }
    });

    if (!existingLeague) {
      return res.status(404).json({ error: 'League not found' });
    }

    if (existingLeague.organizerId !== userId) {
      return res.status(403).json({ error: 'Only the league operator can delete this league' });
    }

    // Delete league (cascade will handle related records)
    await prisma.league.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting league:', error);
    res.status(500).json({ error: 'Failed to delete league' });
  }
});

export default router;

// GET /api/leagues/:id/standings - Get league standings (team league) or player rankings (pickup league)
router.get('/:id/standings', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { seasonId } = req.query;

    // Fetch league to determine type and points config
    const league = await prisma.league.findUnique({
      where: { id },
      select: { id: true, leagueType: true, pointsConfig: true }
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    const baseWhere: any = { leagueId: id, status: 'active' };
    if (seasonId) {
      baseWhere.seasonId = seasonId;
    }

    if (league.leagueType === 'team') {
      // Team league: roster standings ranked by calculated points with tiebreakers
      const memberships = await prisma.leagueMembership.findMany({
        where: { ...baseWhere, memberType: 'roster' },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              imageUrl: true
            }
          }
        }
      });

      // Parse pointsConfig from league
      const pointsConfig = (league.pointsConfig as { win: number; draw: number; loss: number }) || { win: 3, draw: 1, loss: 0 };

      // Calculate points using pointsConfig and sort with tiebreakers
      const ranked = memberships
        .map(m => {
          const calculatedPoints =
            (m.wins * pointsConfig.win) +
            (m.draws * pointsConfig.draw) +
            (m.losses * pointsConfig.loss);

          return {
            membership: m,
            calculatedPoints
          };
        })
        .sort((a, b) => {
          // Primary: points DESC
          if (b.calculatedPoints !== a.calculatedPoints) return b.calculatedPoints - a.calculatedPoints;
          // First tiebreaker: goalDifference DESC
          if (b.membership.goalDifference !== a.membership.goalDifference) return b.membership.goalDifference - a.membership.goalDifference;
          // Second tiebreaker: goalsFor DESC
          return b.membership.goalsFor - a.membership.goalsFor;
        });

      const standings = ranked.map((entry, index) => ({
        rank: index + 1,
        team: entry.membership.team,
        stats: {
          matchesPlayed: entry.membership.matchesPlayed,
          wins: entry.membership.wins,
          losses: entry.membership.losses,
          draws: entry.membership.draws,
          points: entry.calculatedPoints,
          goalsFor: entry.membership.goalsFor,
          goalsAgainst: entry.membership.goalsAgainst,
          goalDifference: entry.membership.goalDifference
        }
      }));

      return res.json(standings);
    } else {
      // Pickup league: individual player rankings
      const memberships = await prisma.leagueMembership.findMany({
        where: { ...baseWhere, memberType: 'user' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true
            }
          }
        }
      });

      // Sort by matchesPlayed DESC, then wins DESC as a simple ranking
      const sorted = memberships.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.matchesPlayed - a.matchesPlayed;
      });

      const rankings = sorted.map((m, index) => ({
        rank: index + 1,
        user: m.user,
        stats: {
          matchesPlayed: m.matchesPlayed,
          wins: m.wins,
          losses: m.losses,
          draws: m.draws,
          points: m.points,
          goalsFor: m.goalsFor,
          goalsAgainst: m.goalsAgainst,
          goalDifference: m.goalDifference
        }
      }));

      return res.json(rankings);
    }
  } catch (error) {
    console.error('Error fetching standings:', error);
    res.status(500).json({ error: 'Failed to fetch standings' });
  }
});

// GET /api/leagues/:id/player-rankings - Get player rankings
router.get('/:id/player-rankings', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { seasonId, sortBy = 'performanceScore', page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get all matches for this league/season
    const matchWhere: any = { leagueId: id, status: 'completed' };
    if (seasonId) {
      matchWhere.seasonId = seasonId;
    }

    const matches = await prisma.match.findMany({
      where: matchWhere,
      select: { eventId: true }
    });

    const eventIds = matches
      .filter(m => m.eventId)
      .map(m => m.eventId as string);

    if (eventIds.length === 0) {
      return res.json({
        data: [],
        pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 }
      });
    }

    // Get game participations for these events
    const participations = await prisma.gameParticipation.findMany({
      where: {
        eventId: { in: eventIds }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            currentRating: true
          }
        }
      }
    });

    // Aggregate by player
    const playerStats = new Map();
    
    participations.forEach(p => {
      const playerId = p.userId;
      if (!playerStats.has(playerId)) {
        playerStats.set(playerId, {
          player: p.user,
          matchesPlayed: 0,
          totalGameScore: 0,
          totalVotes: 0
        });
      }
      
      const stats = playerStats.get(playerId);
      stats.matchesPlayed++;
      stats.totalGameScore += p.gameScore;
      stats.totalVotes += p.votesReceived;
    });

    // Calculate rankings
    const rankings = Array.from(playerStats.values()).map(stats => ({
      player: stats.player,
      stats: {
        matchesPlayed: stats.matchesPlayed,
        averageRating: stats.matchesPlayed > 0 ? stats.totalGameScore / stats.matchesPlayed : 0,
        totalVotes: stats.totalVotes,
        performanceScore: stats.matchesPlayed > 0 
          ? (stats.totalGameScore / stats.matchesPlayed) * 0.6 + (stats.totalVotes / stats.matchesPlayed) * 0.4
          : 0
      }
    }));

    // Sort
    const sortField = sortBy === 'averageRating' ? 'averageRating' : 'performanceScore';
    rankings.sort((a, b) => b.stats[sortField] - a.stats[sortField]);

    // Paginate
    const total = rankings.length;
    const paginatedRankings = rankings.slice(skip, skip + limitNum);

    // Add rank
    const rankedData = paginatedRankings.map((r, index) => ({
      rank: skip + index + 1,
      ...r
    }));

    res.json({
      data: rankedData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching player rankings:', error);
    res.status(500).json({ error: 'Failed to fetch player rankings' });
  }
});

// POST /api/leagues/:id/join - Join league (handles both roster joins for team leagues and direct user joins for pickup leagues)
router.post('/:id/join', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rosterId, userId, teamId } = req.body;

    // Fetch the league to determine its type
    const league = await prisma.league.findUnique({
      where: { id }
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Check registration close date
    if (league.registrationCloseDate && new Date() > new Date(league.registrationCloseDate)) {
      return res.status(400).json({ error: 'Registration has closed for this league' });
    }

    if (league.leagueType === 'team') {
      // Team league: roster-based join (pending approval for public team leagues)
      const effectiveRosterId = rosterId || teamId;

      if (!effectiveRosterId) {
        return res.status(400).json({ error: 'Missing required field: rosterId' });
      }

      // Check minimum roster size
      if (league.minimumRosterSize) {
        const playerCount = await prisma.teamMember.count({
          where: { teamId: effectiveRosterId, status: 'active' }
        });
        if (playerCount < league.minimumRosterSize) {
          return res.status(400).json({
            error: `Roster needs at least ${league.minimumRosterSize} players to join this league. Current count: ${playerCount}`
          });
        }
      }

      // Check for existing active/pending membership for this roster
      const existingMembership = await prisma.leagueMembership.findFirst({
        where: {
          leagueId: id,
          memberType: 'roster',
          memberId: effectiveRosterId,
          status: { in: ['active', 'pending'] }
        }
      });

      if (existingMembership) {
        return res.status(409).json({ error: 'Roster is already a member of this league' });
      }

      // Create membership with pending status (needs approval for public team leagues)
      const membership = await prisma.leagueMembership.create({
        data: {
          leagueId: id,
          teamId: effectiveRosterId,
          memberType: 'roster',
          memberId: effectiveRosterId,
          status: 'pending'
        },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              sportType: true
            }
          },
          league: {
            select: {
              id: true,
              name: true,
              sportType: true
            }
          }
        }
      });

      // Notify league owner about the new join request
      NotificationService.notifyJoinRequest(id, effectiveRosterId);

      return res.status(201).json(membership);
    } else {
      // Pickup league: direct user join (immediately active)
      if (!userId) {
        return res.status(400).json({ error: 'Missing required field: userId' });
      }

      // Check for existing active/pending membership for this user
      const existingMembership = await prisma.leagueMembership.findFirst({
        where: {
          leagueId: id,
          memberType: 'user',
          memberId: userId,
          status: { in: ['active', 'pending'] }
        }
      });

      if (existingMembership) {
        return res.status(409).json({ error: 'You are already a participant in this league' });
      }

      // Create membership with active status (immediate for pickup leagues)
      const membership = await prisma.leagueMembership.create({
        data: {
          leagueId: id,
          userId: userId,
          memberType: 'user',
          memberId: userId,
          status: 'active'
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true
            }
          },
          league: {
            select: {
              id: true,
              name: true,
              sportType: true
            }
          }
        }
      });

      return res.status(201).json(membership);
    }
  } catch (error) {
    console.error('Error joining league:', error);
    res.status(500).json({ error: 'Failed to join league' });
  }
});

// GET /api/leagues/:id/join-requests - Get pending join requests (owner/admin only)
router.get('/:id/join-requests', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing required query parameter: userId' });
    }

    // Fetch league and verify it exists
    const league = await prisma.league.findUnique({
      where: { id }
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Verify it's a public team league
    if (league.leagueType !== 'team' || league.visibility !== 'public') {
      return res.status(400).json({ error: 'Join requests are only available for public team leagues' });
    }

    // Verify the requesting user is the league owner
    if (league.organizerId !== userId) {
      return res.status(403).json({ error: 'Only the league owner or admins can perform this action' });
    }

    // Return all pending roster memberships with team relation data
    const joinRequests = await prisma.leagueMembership.findMany({
      where: {
        leagueId: id,
        status: 'pending',
        memberType: 'roster'
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            sportType: true
          }
        }
      },
      orderBy: { joinedAt: 'asc' }
    });

    res.json(joinRequests);
  } catch (error) {
    console.error('Error fetching join requests:', error);
    res.status(500).json({ error: 'Failed to fetch join requests' });
  }
});

// PUT /api/leagues/:id/join-requests/:requestId - Approve or decline a join request
router.put('/:id/join-requests/:requestId', async (req: Request, res: Response) => {
  try {
    const { id, requestId } = req.params;
    const { action, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }

    if (!action || (action !== 'approve' && action !== 'decline')) {
      return res.status(400).json({ error: "action must be 'approve' or 'decline'" });
    }

    // Fetch league
    const league = await prisma.league.findUnique({
      where: { id }
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Verify the requesting user is the league owner
    if (league.organizerId !== userId) {
      return res.status(403).json({ error: 'Only the league owner or admins can perform this action' });
    }

    // Find the join request
    const membership = await prisma.leagueMembership.findFirst({
      where: {
        id: requestId,
        leagueId: id,
        status: 'pending',
        memberType: 'roster'
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            sportType: true,
            balance: true
          }
        }
      }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Join request not found' });
    }

    if (action === 'approve') {
      // Check if league has a membership fee configured
      if (league.membershipFee != null && league.membershipFee > 0) {
        const rosterBalance = membership.team?.balance ?? 0;

        if (rosterBalance < league.membershipFee) {
          return res.status(400).json({
            error: 'Insufficient roster balance',
            required: league.membershipFee,
            available: rosterBalance
          });
        }

        // Use a transaction to deduct fee and activate membership atomically
        const result = await prisma.$transaction(async (tx) => {
          // Deduct fee from roster balance
          await tx.team.update({
            where: { id: membership.team!.id },
            data: {
              balance: { decrement: league.membershipFee! }
            }
          });

          // Update membership status to active
          const updatedMembership = await tx.leagueMembership.update({
            where: { id: requestId },
            data: { status: 'active' },
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                  sportType: true
                }
              }
            }
          });

          return updatedMembership;
        });

        // Notify roster owner about approval
        NotificationService.notifyJoinRequestDecision(id, membership.memberId, 'approve');

        return res.json(result);
      }

      // No fee — just activate
      const updatedMembership = await prisma.leagueMembership.update({
        where: { id: requestId },
        data: { status: 'active' },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              sportType: true
            }
          }
        }
      });

      // Notify roster owner about approval
      NotificationService.notifyJoinRequestDecision(id, membership.memberId, 'approve');

      return res.json(updatedMembership);
    }

    // action === 'decline'
    const updatedMembership = await prisma.leagueMembership.update({
      where: { id: requestId },
      data: { status: 'withdrawn' },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            sportType: true
          }
        }
      }
    });

    // Notify roster owner about decline
    NotificationService.notifyJoinRequestDecision(id, membership.memberId, 'decline');

    return res.json(updatedMembership);
  } catch (error) {
    console.error('Error processing join request:', error);
    res.status(500).json({ error: 'Failed to process join request' });
  }
});

// POST /api/leagues/:id/invite-roster - Invite a roster to a private Team League
router.post('/:id/invite-roster', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rosterId, userId } = req.body;

    if (!rosterId || !userId) {
      return res.status(400).json({ error: 'Missing required fields: rosterId, userId' });
    }

    // Fetch league
    const league = await prisma.league.findUnique({
      where: { id }
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Verify it's a private team league
    if (league.leagueType !== 'team' || league.visibility !== 'private') {
      return res.status(400).json({ error: 'Invitations are only available for private team leagues' });
    }

    // Verify the requesting user is the league owner
    if (league.organizerId !== userId) {
      return res.status(403).json({ error: 'Only the league owner or admins can perform this action' });
    }

    // Check roster exists
    const roster = await prisma.team.findUnique({
      where: { id: rosterId }
    });

    if (!roster) {
      return res.status(404).json({ error: 'Roster not found' });
    }

    // Check for existing active/pending membership for this roster
    const existingMembership = await prisma.leagueMembership.findFirst({
      where: {
        leagueId: id,
        memberType: 'roster',
        memberId: rosterId,
        status: { in: ['active', 'pending'] }
      }
    });

    if (existingMembership) {
      return res.status(409).json({ error: 'Roster is already a member of this league' });
    }

    // Create pending membership as invitation
    const membership = await prisma.leagueMembership.create({
      data: {
        leagueId: id,
        teamId: rosterId,
        memberType: 'roster',
        memberId: rosterId,
        status: 'pending'
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            sportType: true
          }
        }
      }
    });

    // Notify roster owner about the league invitation
    NotificationService.notifyRosterInvitation(id, rosterId);

    return res.status(201).json(membership);
  } catch (error) {
    console.error('Error inviting roster:', error);
    res.status(500).json({ error: 'Failed to invite roster' });
  }
});

// PUT /api/leagues/:id/invitations/:invitationId - Accept or decline a roster invitation
router.put('/:id/invitations/:invitationId', async (req: Request, res: Response) => {
  try {
    const { id, invitationId } = req.params;
    const { accept, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }

    if (typeof accept !== 'boolean') {
      return res.status(400).json({ error: 'accept must be a boolean' });
    }

    // Fetch league
    const league = await prisma.league.findUnique({
      where: { id }
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Find the pending invitation
    const membership = await prisma.leagueMembership.findFirst({
      where: {
        id: invitationId,
        leagueId: id,
        status: 'pending',
        memberType: 'roster'
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            sportType: true,
            balance: true,
            members: {
              where: { role: 'captain', status: 'active' },
              select: { userId: true }
            }
          }
        }
      }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Verify the user is the roster owner (captain)
    const isCaptain = membership.team?.members?.some(m => m.userId === userId);
    if (!isCaptain) {
      return res.status(403).json({ error: 'Only the roster owner can respond to invitations' });
    }

    if (accept) {
      // Check if league has a membership fee configured
      if (league.membershipFee != null && league.membershipFee > 0) {
        const rosterBalance = membership.team?.balance ?? 0;

        if (rosterBalance < league.membershipFee) {
          return res.status(400).json({
            error: 'Insufficient roster balance',
            required: league.membershipFee,
            available: rosterBalance
          });
        }

        // Use a transaction to deduct fee and activate membership atomically
        const result = await prisma.$transaction(async (tx) => {
          // Deduct fee from roster balance
          await tx.team.update({
            where: { id: membership.team!.id },
            data: {
              balance: { decrement: league.membershipFee! }
            }
          });

          // Update membership status to active
          const updatedMembership = await tx.leagueMembership.update({
            where: { id: invitationId },
            data: { status: 'active' },
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                  sportType: true
                }
              }
            }
          });

          return updatedMembership;
        });

        return res.json(result);
      }

      // No fee — just activate
      const updatedMembership = await prisma.leagueMembership.update({
        where: { id: invitationId },
        data: { status: 'active' },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              sportType: true
            }
          }
        }
      });

      return res.json(updatedMembership);
    }

    // accept === false — decline invitation
    const updatedMembership = await prisma.leagueMembership.update({
      where: { id: invitationId },
      data: { status: 'withdrawn' },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            sportType: true
          }
        }
      }
    });

    return res.json(updatedMembership);
  } catch (error) {
    console.error('Error processing invitation:', error);
    res.status(500).json({ error: 'Failed to process invitation' });
  }
});

// POST /api/leagues/:id/leave - Leave league (Step Out)
// Handles both roster leave for team leagues and individual user Step Out for pickup leagues
router.post('/:id/leave', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teamId, userId } = req.body;

    // Fetch the league to determine its type
    const league = await prisma.league.findUnique({
      where: { id }
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    if (league.leagueType === 'pickup') {
      // Pickup league: individual user Step Out
      if (!userId) {
        return res.status(400).json({ error: 'Missing required field: userId' });
      }

      // Find the user's active membership
      const membership = await prisma.leagueMembership.findFirst({
        where: {
          leagueId: id,
          memberType: 'user',
          memberId: userId,
          status: 'active'
        }
      });

      if (!membership) {
        return res.status(404).json({ error: 'No active membership found' });
      }

      // Update membership status to withdrawn and set leftAt
      const updatedMembership = await prisma.leagueMembership.update({
        where: { id: membership.id },
        data: {
          status: 'withdrawn',
          leftAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true
            }
          },
          league: {
            select: {
              id: true,
              name: true,
              sportType: true
            }
          }
        }
      });

      return res.json(updatedMembership);
    }

    // Team league: existing roster leave logic
    if (!teamId || !userId) {
      return res.status(400).json({ error: 'Missing required fields: teamId, userId' });
    }

    // Check if user is team captain/admin
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId
        }
      }
    });

    if (!teamMember || (teamMember.role !== 'captain' && teamMember.role !== 'admin')) {
      return res.status(403).json({ error: 'Only team captains or admins can withdraw from leagues' });
    }

    // Find membership
    const membership = await prisma.leagueMembership.findFirst({
      where: {
        leagueId: id,
        teamId,
        status: 'active'
      }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Team is not a member of this league' });
    }

    // Update membership status
    await prisma.leagueMembership.update({
      where: { id: membership.id },
      data: {
        status: 'withdrawn',
        leftAt: new Date()
      }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error leaving league:', error);
    res.status(500).json({ error: 'Failed to leave league' });
  }
});

// GET /api/leagues/:id/members - Get league members (rosters for team leagues, players for pickup leagues)
router.get('/:id/members', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '50', includePending } = req.query;

    // Fetch league to determine its type
    const league = await prisma.league.findUnique({
      where: { id },
      select: { id: true, leagueType: true }
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Allow fetching pending members alongside active ones (for commissioner view)
    const statusFilter = includePending === 'true'
      ? { status: { in: ['active', 'pending'] as string[] } }
      : { status: 'active' as const };

    const baseWhere = { leagueId: id, ...statusFilter };

    const total = await prisma.leagueMembership.count({ where: baseWhere });

    if (league.leagueType === 'team') {
      // Team league: return rosters with player count and win/loss record
      const memberships = await prisma.leagueMembership.findMany({
        where: { ...baseWhere, memberType: 'roster' },
        skip,
        take: limitNum,
        include: {
          team: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              sportType: true,
              _count: {
                select: { members: true }
              }
            }
          }
        },
        orderBy: { joinedAt: 'asc' }
      });

      const data = memberships.map(m => ({
        id: m.id,
        memberType: m.memberType,
        memberId: m.memberId,
        status: m.status,
        joinedAt: m.joinedAt,
        team: m.team ? {
          id: m.team.id,
          name: m.team.name,
          imageUrl: m.team.imageUrl,
          sportType: m.team.sportType,
          playerCount: m.team._count.members
        } : null,
        stats: {
          matchesPlayed: m.matchesPlayed,
          wins: m.wins,
          losses: m.losses,
          draws: m.draws,
          points: m.points,
          goalsFor: m.goalsFor,
          goalsAgainst: m.goalsAgainst,
          goalDifference: m.goalDifference
        }
      }));

      return res.json({
        leagueType: 'team',
        data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } else {
      // Pickup league: return individual players
      const memberships = await prisma.leagueMembership.findMany({
        where: { ...baseWhere, memberType: 'user' },
        skip,
        take: limitNum,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true
            }
          }
        },
        orderBy: { joinedAt: 'asc' }
      });

      const data = memberships.map(m => ({
        id: m.id,
        memberType: m.memberType,
        memberId: m.memberId,
        status: m.status,
        joinedAt: m.joinedAt,
        user: m.user ? {
          id: m.user.id,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          profileImage: m.user.profileImage
        } : null
      }));

      return res.json({
        leagueType: 'pickup',
        data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    }
  } catch (error) {
    console.error('Error fetching league members:', error);
    res.status(500).json({ error: 'Failed to fetch league members' });
  }
});

// GET /api/leagues/:id/events - Get upcoming league events
router.get('/:id/events', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Fetch league to verify it exists
    const league = await prisma.league.findUnique({
      where: { id },
      select: { id: true, leagueType: true }
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    const now = new Date();

    // Query events associated with this league where startTime > now
    const events = await prisma.event.findMany({
      where: {
        eligibilityRestrictedToLeagues: { has: id },
        startTime: { gt: now },
        status: 'active'
      },
      include: {
        facility: {
          select: {
            id: true,
            name: true,
            street: true,
            city: true,
            state: true
          }
        },
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    // For team leagues, resolve roster names from eligibilityRestrictedToTeams
    if (league.leagueType === 'team') {
      // Collect all unique roster IDs across all events
      const allRosterIds = new Set<string>();
      events.forEach(event => {
        event.eligibilityRestrictedToTeams.forEach(rid => allRosterIds.add(rid));
      });

      // Fetch roster names in one query
      const rosters = allRosterIds.size > 0
        ? await prisma.team.findMany({
            where: { id: { in: Array.from(allRosterIds) } },
            select: { id: true, name: true }
          })
        : [];

      const rosterMap = new Map(rosters.map(r => [r.id, r.name]));

      const eventsWithRosters = events.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        sportType: event.sportType,
        startTime: event.startTime,
        endTime: event.endTime,
        maxParticipants: event.maxParticipants,
        currentParticipants: event.currentParticipants,
        facility: event.facility,
        organizer: event.organizer,
        assignedRosters: event.eligibilityRestrictedToTeams.map(rid => ({
          id: rid,
          name: rosterMap.get(rid) || 'Unknown Roster'
        }))
      }));

      return res.json(eventsWithRosters);
    }

    // Pickup league: return events without roster assignments
    const eventsFormatted = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      sportType: event.sportType,
      startTime: event.startTime,
      endTime: event.endTime,
      maxParticipants: event.maxParticipants,
      currentParticipants: event.currentParticipants,
      facility: event.facility,
      organizer: event.organizer,
      assignedRosters: []
    }));

    return res.json(eventsFormatted);
  } catch (error) {
    console.error('Error fetching league events:', error);
    res.status(500).json({ error: 'Failed to fetch league events' });
  }
});

// POST /api/leagues/:id/events - Create a league event with optional roster assignment
router.post('/:id/events', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, startTime, endTime, facilityId, rosterIds, userId } = req.body;

    // Validate required fields
    if (!title || !startTime || !endTime || !userId) {
      return res.status(400).json({
        error: 'Missing required fields: title, startTime, endTime, userId'
      });
    }

    // Fetch league and verify it exists
    const league = await prisma.league.findUnique({
      where: { id },
      select: { id: true, leagueType: true, sportType: true, organizerId: true }
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Verify user is league owner
    if (league.organizerId !== userId) {
      return res.status(403).json({ error: 'Only the league owner or admins can perform this action' });
    }

    const eventStartTime = new Date(startTime);
    const eventEndTime = new Date(endTime);

    if (league.leagueType === 'team' && rosterIds && rosterIds.length > 0) {
      // Team league with roster assignment

      // Validate minimum 2 rosters
      if (rosterIds.length < 2) {
        return res.status(400).json({ error: 'Team League events require at least 2 rosters' });
      }

      // Check scheduling conflicts for each roster
      // Find existing events in this league that overlap with the new event's time
      const overlappingEvents = await prisma.event.findMany({
        where: {
          eligibilityRestrictedToLeagues: { has: id },
          status: 'active',
          // Time overlap: event1.startTime < event2.endTime AND event2.startTime < event1.endTime
          startTime: { lt: eventEndTime },
          endTime: { gt: eventStartTime }
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          eligibilityRestrictedToTeams: true
        }
      });

      // Check if any of the requested rosters are already assigned to overlapping events
      const conflicts: Array<{
        rosterId: string;
        rosterName: string;
        conflictingEventId: string;
        conflictingEventTitle: string;
        startTime: Date;
        endTime: Date;
      }> = [];

      // Fetch roster names for conflict reporting
      const rosters = await prisma.team.findMany({
        where: { id: { in: rosterIds } },
        select: { id: true, name: true }
      });
      const rosterNameMap = new Map(rosters.map(r => [r.id, r.name]));

      for (const event of overlappingEvents) {
        for (const rosterId of rosterIds) {
          if (event.eligibilityRestrictedToTeams.includes(rosterId)) {
            conflicts.push({
              rosterId,
              rosterName: rosterNameMap.get(rosterId) || 'Unknown Roster',
              conflictingEventId: event.id,
              conflictingEventTitle: event.title,
              startTime: event.startTime,
              endTime: event.endTime
            });
          }
        }
      }

      if (conflicts.length > 0) {
        return res.status(409).json({
          error: 'Scheduling conflict',
          conflicts
        });
      }

      // Create the event with roster assignments
      const event = await prisma.event.create({
        data: {
          title,
          description: description || '',
          sportType: league.sportType,
          skillLevel: 'all',
          eventType: 'league',
          startTime: eventStartTime,
          endTime: eventEndTime,
          maxParticipants: 100,
          organizerId: userId,
          ...(facilityId && { facilityId }),
          eligibilityRestrictedToLeagues: [id],
          eligibilityRestrictedToTeams: rosterIds
        },
        include: {
          facility: {
            select: {
              id: true,
              name: true,
              street: true,
              city: true,
              state: true
            }
          },
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      // Return with resolved roster names
      const responseEvent = {
        id: event.id,
        title: event.title,
        description: event.description,
        sportType: event.sportType,
        startTime: event.startTime,
        endTime: event.endTime,
        maxParticipants: event.maxParticipants,
        currentParticipants: event.currentParticipants,
        facility: event.facility,
        organizer: event.organizer,
        assignedRosters: rosterIds.map((rid: string) => ({
          id: rid,
          name: rosterNameMap.get(rid) || 'Unknown Roster'
        }))
      };

      // Notify all players of assigned rosters about the event
      NotificationService.notifyEventRosterAssignment(id, title, rosterIds);

      return res.status(201).json(responseEvent);
    }

    // Pickup league OR team league without roster assignment
    // Create open event with no roster assignment
    const event = await prisma.event.create({
      data: {
        title,
        description: description || '',
        sportType: league.sportType,
        skillLevel: 'all',
        eventType: 'league',
        startTime: eventStartTime,
        endTime: eventEndTime,
        maxParticipants: 100,
        organizerId: userId,
        ...(facilityId && { facilityId }),
        eligibilityRestrictedToLeagues: [id],
        eligibilityRestrictedToTeams: []
      },
      include: {
        facility: {
          select: {
            id: true,
            name: true,
            street: true,
            city: true,
            state: true
          }
        },
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    const responseEvent = {
      id: event.id,
      title: event.title,
      description: event.description,
      sportType: event.sportType,
      startTime: event.startTime,
      endTime: event.endTime,
      maxParticipants: event.maxParticipants,
      currentParticipants: event.currentParticipants,
      facility: event.facility,
      organizer: event.organizer,
      assignedRosters: []
    };

    return res.status(201).json(responseEvent);
  } catch (error) {
    console.error('Error creating league event:', error);
    res.status(500).json({ error: 'Failed to create league event' });
  }
});

// Document management endpoints
import { upload, generateFileUrl, deleteFile, validateFile } from '../services/DocumentService';

// GET /api/leagues/:id/documents - Get league documents
router.get('/:id/documents', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const documents = await prisma.leagueDocument.findMany({
      where: { leagueId: id },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    });

    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST /api/leagues/:id/documents - Upload document
router.post('/:id/documents', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { documentType, userId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Check if league exists and user is operator
    const league = await prisma.league.findUnique({
      where: { id }
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    if (league.organizerId !== userId) {
      return res.status(403).json({ error: 'Only the league operator can upload documents' });
    }

    // Create document record
    const document = await prisma.leagueDocument.create({
      data: {
        leagueId: id,
        fileName: file.originalname,
        fileUrl: generateFileUrl(file.path),
        fileSize: file.size,
        mimeType: file.mimetype,
        documentType: documentType || 'other',
        uploadedBy: userId
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// DELETE /api/leagues/:id/documents/:documentId - Delete document
router.delete('/:id/documents/:documentId', async (req: Request, res: Response) => {
  try {
    const { id, documentId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Check if league exists and user is operator
    const league = await prisma.league.findUnique({
      where: { id }
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    if (league.organizerId !== userId) {
      return res.status(403).json({ error: 'Only the league operator can delete documents' });
    }

    // Get document
    const document = await prisma.leagueDocument.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file
    await deleteFile(document.fileUrl);

    // Delete database record
    await prisma.leagueDocument.delete({
      where: { id: documentId }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// GET /api/leagues/:id/documents/:documentId/download - Download document
router.get('/:id/documents/:documentId/download', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;

    const document = await prisma.leagueDocument.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Track access (for analytics)
    // Could add a DocumentAccess model to track this

    // Return file URL for download
    res.json({ 
      url: document.fileUrl,
      fileName: document.fileName,
      mimeType: document.mimeType
    });
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// POST /api/leagues/:id/certify - Certify league
router.post('/:id/certify', upload.single('bylaws'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { boardMembers, userId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Bylaws PDF is required' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    if (!boardMembers) {
      return res.status(400).json({ error: 'Board members are required' });
    }

    // Parse board members
    let parsedBoardMembers;
    try {
      parsedBoardMembers = JSON.parse(boardMembers);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid board members format' });
    }

    // Validate board members count
    if (!Array.isArray(parsedBoardMembers) || parsedBoardMembers.length < 3) {
      return res.status(400).json({ error: 'At least 3 board members are required' });
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Check if league exists and user is operator
    const league = await prisma.league.findUnique({
      where: { id }
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    if (league.organizerId !== userId) {
      return res.status(403).json({ error: 'Only the league operator can certify the league' });
    }

    // Create certification documents
    await prisma.certificationDocument.create({
      data: {
        leagueId: id,
        documentType: 'bylaws',
        fileName: file.originalname,
        fileUrl: generateFileUrl(file.path),
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: userId,
        approvedAt: new Date()
      }
    });

    await prisma.certificationDocument.create({
      data: {
        leagueId: id,
        documentType: 'board_of_directors',
        fileName: 'board_of_directors.json',
        fileUrl: '', // Not a file, just JSON data
        fileSize: 0,
        mimeType: 'application/json',
        boardMembers: parsedBoardMembers,
        uploadedBy: userId,
        approvedAt: new Date()
      }
    });

    // Update league certification status
    const updatedLeague = await prisma.league.update({
      where: { id },
      data: {
        isCertified: true,
        certifiedAt: new Date()
      },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true
          }
        }
      }
    });

    // TODO: Send notifications to all league members

    res.json(updatedLeague);
  } catch (error) {
    console.error('Error certifying league:', error);
    res.status(500).json({ error: 'Failed to certify league' });
  }
});

// POST /api/leagues/:id/generate-schedule - Manually trigger schedule generation (commissioner only)
router.post('/:id/generate-schedule', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }

    const league = await prisma.league.findUnique({
      where: { id },
      include: {
        memberships: {
          where: { status: 'active', memberType: 'roster' },
          select: { id: true }
        }
      }
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    if (league.organizerId !== userId) {
      return res.status(403).json({ error: 'Only the league commissioner can generate the schedule' });
    }

    if (league.registrationCloseDate) {
      return res.status(400).json({ error: 'Schedule generation is handled automatically when a registration close date is set' });
    }

    if (league.scheduleGenerated) {
      return res.status(400).json({ error: 'Schedule has already been generated for this league' });
    }

    if (league.memberships.length < 2) {
      return res.status(400).json({ error: 'At least 2 active rosters are required to generate a schedule' });
    }

    if (!league.preferredGameDays?.length || !league.seasonGameCount) {
      return res.status(400).json({ error: 'Schedule configuration incomplete. Set preferredGameDays and seasonGameCount first.' });
    }

    const result = await ScheduleGeneratorService.generateRoundRobin(id);

    res.status(201).json({
      message: `Schedule generated successfully. ${result.eventsCreated} events created.`,
      eventsCreated: result.eventsCreated
    });
  } catch (error) {
    console.error('Error generating schedule:', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate schedule';
    res.status(500).json({ error: msg });
  }
});
