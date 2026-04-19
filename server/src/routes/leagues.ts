import express, { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { NotificationService } from '../services/NotificationService';
import {
  ScheduleGeneratorService,
  LeagueWithRosters,
} from '../services/ScheduleGeneratorService';
import { checkLeagueReady } from '../jobs/league-ready-check';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { requirePlan } from '../middleware/subscription';
import { requireNonDependent } from '../middleware/require-non-dependent';
import {
  uploadCover,
  validateImageFile,
  generateImageUrl,
  processMapImage,
  deleteImageFiles,
} from '../services/ImageUploadService';
import {
  upload,
  generateFileUrl,
  deleteFile,
  validateFile,
} from '../services/DocumentService';

// ─── Service imports ────────────────────────────────────────────────────────
import * as LeagueCrudService from '../services/LeagueCrudService';
import * as LeagueMembershipService from '../services/LeagueMembershipService';

const router = express.Router();

// ─── Error helper ───────────────────────────────────────────────────────────
function sendError(res: Response, error: any) {
  const status = error.statusCode || 500;
  const body: any = { error: error.message || 'Internal error' };
  if (error.extra) Object.assign(body, error.extra);
  res.status(status).json(body);
}

// ============================================================================
// CRUD ROUTES (delegated to LeagueCrudService)
// ============================================================================

// GET /api/leagues
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await LeagueCrudService.getLeagues(
      req.query as LeagueCrudService.GetLeaguesFilters
    );
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching leagues:', error);
    sendError(res, error);
  }
});

// GET /api/leagues/:id/deletion-preview
router.get('/:id/deletion-preview', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const userId =
      (req.query.userId as string) || (req.headers['x-user-id'] as string);
    const preview = await LeagueCrudService.getDeletionPreview(id, userId);
    res.json(preview);
  } catch (error: any) {
    console.error('Error generating deletion preview:', error);
    sendError(res, error);
  }
});

// GET /api/leagues/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const league = await LeagueCrudService.getLeagueById(id);
    res.json(league);
  } catch (error: any) {
    console.error('Error fetching league:', error);
    sendError(res, error);
  }
});

// POST /api/leagues
router.post(
  '/',
  authMiddleware,
  requireNonDependent,
  requirePlan('league'),
  async (req: Request, res: Response) => {
    try {
      const authenticatedUserId =
        req.user?.userId ||
        (req.headers['x-user-id'] as string | undefined) ||
        req.body.organizerId;
      const league = await LeagueCrudService.createLeague(
        req.body,
        authenticatedUserId
      );
      res.status(201).json(league);
    } catch (error: any) {
      console.error('Error creating league:', error);
      sendError(res, error);
    }
  }
);

// PUT /api/leagues/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const league = await LeagueCrudService.updateLeague(id, req.body);
    res.json(league);
  } catch (error: any) {
    console.error('Error updating league:', error);
    sendError(res, error);
  }
});

// DELETE /api/leagues/:id
router.delete(
  '/:id',
  requireNonDependent,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { userId } = req.body;
      const result = await LeagueCrudService.deleteLeague(id, userId);
      res.json(result);
    } catch (error: any) {
      console.error('Error deleting league:', error);
      sendError(res, error);
    }
  }
);

// ============================================================================
// MEMBERSHIP ROUTES (delegated to LeagueMembershipService)
// ============================================================================

// POST /api/leagues/:id/join
router.post('/:id/join', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const effectiveRosterId = req.body.rosterId || req.body.teamId;
    const membership = await LeagueMembershipService.joinLeague(
      id,
      effectiveRosterId
    );
    res.status(201).json(membership);
  } catch (error: any) {
    console.error('Error joining league:', error);
    sendError(res, error);
  }
});

// GET /api/leagues/:id/join-requests
router.get('/:id/join-requests', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const userId = req.query.userId as string;
    const joinRequests = await LeagueMembershipService.getJoinRequests(
      id,
      userId
    );
    res.json(joinRequests);
  } catch (error: any) {
    console.error('Error fetching join requests:', error);
    sendError(res, error);
  }
});

// PUT /api/leagues/:id/join-requests/:requestId
router.put(
  '/:id/join-requests/:requestId',
  async (req: Request, res: Response) => {
    try {
      const { id, requestId } = req.params as {
        id: string;
        requestId: string;
      };
      const { action, userId } = req.body;
      const result = await LeagueMembershipService.processJoinRequest(
        id,
        requestId,
        action,
        userId
      );
      res.json(result);
    } catch (error: any) {
      console.error('Error processing join request:', error);
      sendError(res, error);
    }
  }
);

// POST /api/leagues/:id/invite-roster
router.post('/:id/invite-roster', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { rosterId, userId } = req.body;
    const membership = await LeagueMembershipService.inviteRoster(
      id,
      rosterId,
      userId
    );
    res.status(201).json(membership);
  } catch (error: any) {
    console.error('Error inviting roster:', error);
    sendError(res, error);
  }
});

// PUT /api/leagues/:id/invitations/:invitationId
router.put(
  '/:id/invitations/:invitationId',
  async (req: Request, res: Response) => {
    try {
      const { id, invitationId } = req.params as {
        id: string;
        invitationId: string;
      };
      const { accept, userId } = req.body;
      const result = await LeagueMembershipService.respondToInvitation(
        id,
        invitationId,
        accept,
        userId
      );
      res.json(result);
    } catch (error: any) {
      console.error('Error processing invitation:', error);
      sendError(res, error);
    }
  }
);

// POST /api/leagues/:id/leave
router.post('/:id/leave', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { teamId, userId } = req.body;
    await LeagueMembershipService.leaveLeague(id, teamId, userId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error leaving league:', error);
    sendError(res, error);
  }
});

// GET /api/leagues/:id/members
router.get('/:id/members', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const result = await LeagueMembershipService.getMembers(id, {
      page: req.query.page as string,
      limit: req.query.limit as string,
      includePending: req.query.includePending as string,
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching league members:', error);
    sendError(res, error);
  }
});

// DELETE /api/leagues/:leagueId/memberships/:membershipId
router.delete(
  '/:leagueId/memberships/:membershipId',
  async (req: Request, res: Response) => {
    try {
      const { leagueId, membershipId } = req.params as {
        leagueId: string;
        membershipId: string;
      };
      const { userId } = req.body;
      const result = await LeagueMembershipService.removeMembership(
        leagueId,
        membershipId,
        userId
      );
      res.json(result);
    } catch (error: any) {
      console.error('Error removing roster from league:', error);
      sendError(res, error);
    }
  }
);

// ============================================================================
// STANDINGS & RANKINGS (kept inline — read-only queries)
// ============================================================================

// GET /api/leagues/:id/standings
router.get('/:id/standings', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { seasonId } = req.query;

    const league = await prisma.league.findUnique({
      where: { id },
      select: { id: true, pointsConfig: true },
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    const baseWhere: any = { leagueId: id, status: 'active' };
    if (seasonId) baseWhere.seasonId = seasonId;

    const memberships = await prisma.leagueMembership.findMany({
      where: { ...baseWhere, memberType: 'roster' },
      include: {
        team: { select: { id: true, name: true, imageUrl: true } },
      },
    });

    const pointsConfig = (league.pointsConfig as {
      win: number;
      draw: number;
      loss: number;
    }) || { win: 3, draw: 1, loss: 0 };

    const ranked = memberships
      .map(m => {
        const calculatedPoints =
          m.wins * pointsConfig.win +
          m.draws * pointsConfig.draw +
          m.losses * pointsConfig.loss;
        return { membership: m, calculatedPoints };
      })
      .sort((a, b) => {
        if (b.calculatedPoints !== a.calculatedPoints)
          return b.calculatedPoints - a.calculatedPoints;
        if (b.membership.goalDifference !== a.membership.goalDifference)
          return b.membership.goalDifference - a.membership.goalDifference;
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
        goalDifference: entry.membership.goalDifference,
      },
    }));

    return res.json(standings);
  } catch (error) {
    console.error('Error fetching standings:', error);
    res.status(500).json({ error: 'Failed to fetch standings' });
  }
});

// GET /api/leagues/:id/player-rankings
router.get('/:id/player-rankings', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const {
      seasonId,
      sortBy = 'performanceScore',
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const matchWhere: any = { leagueId: id, status: 'completed' };
    if (seasonId) matchWhere.seasonId = seasonId;

    const matches = await prisma.match.findMany({
      where: matchWhere,
      select: { eventId: true },
    });

    const eventIds = matches
      .filter(m => m.eventId)
      .map(m => m.eventId as string);

    if (eventIds.length === 0) {
      return res.json({
        data: [],
        pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
      });
    }

    const participations = await prisma.gameParticipation.findMany({
      where: { eventId: { in: eventIds } },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            currentRating: true,
          },
        },
      },
    });

    const playerStats = new Map();
    participations.forEach(p => {
      const playerId = p.userId;
      if (!playerStats.has(playerId)) {
        playerStats.set(playerId, {
          player: p.user,
          matchesPlayed: 0,
          totalGameScore: 0,
          totalVotes: 0,
        });
      }
      const stats = playerStats.get(playerId);
      stats.matchesPlayed++;
      stats.totalGameScore += p.gameScore;
      stats.totalVotes += p.votesReceived;
    });

    const rankings = Array.from(playerStats.values()).map(stats => ({
      player: stats.player,
      stats: {
        matchesPlayed: stats.matchesPlayed,
        averageRating:
          stats.matchesPlayed > 0
            ? stats.totalGameScore / stats.matchesPlayed
            : 0,
        totalVotes: stats.totalVotes,
        performanceScore:
          stats.matchesPlayed > 0
            ? (stats.totalGameScore / stats.matchesPlayed) * 0.6 +
              (stats.totalVotes / stats.matchesPlayed) * 0.4
            : 0,
      },
    }));

    const sortField =
      sortBy === 'averageRating' ? 'averageRating' : 'performanceScore';
    rankings.sort((a, b) => b.stats[sortField] - a.stats[sortField]);

    const total = rankings.length;
    const paginatedRankings = rankings.slice(skip, skip + limitNum);
    const rankedData = paginatedRankings.map((r, index) => ({
      rank: skip + index + 1,
      ...r,
    }));

    res.json({
      data: rankedData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching player rankings:', error);
    res.status(500).json({ error: 'Failed to fetch player rankings' });
  }
});

// ============================================================================
// EVENTS (kept inline — league-specific event management)
// ============================================================================

// GET /api/leagues/:id/events
router.get('/:id/events', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const league = await prisma.league.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    const now = new Date();

    const events = await prisma.event.findMany({
      where: {
        eligibilityRestrictedToLeagues: { has: id },
        startTime: { gt: now },
        status: 'active',
      },
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
        organizer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const allRosterIds = new Set<string>();
    events.forEach(event => {
      event.eligibilityRestrictedToTeams.forEach(rid => allRosterIds.add(rid));
    });

    const rosters =
      allRosterIds.size > 0
        ? await prisma.team.findMany({
            where: { id: { in: Array.from(allRosterIds) } },
            select: { id: true, name: true },
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
        name: rosterMap.get(rid) || 'Unknown Roster',
      })),
    }));

    return res.json(eventsWithRosters);
  } catch (error) {
    console.error('Error fetching league events:', error);
    res.status(500).json({ error: 'Failed to fetch league events' });
  }
});

// POST /api/leagues/:id/events
router.post('/:id/events', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const {
      title,
      description,
      startTime,
      endTime,
      facilityId,
      rosterIds,
      userId,
    } = req.body;

    if (!title || !startTime || !endTime || !userId) {
      return res.status(400).json({
        error: 'Missing required fields: title, startTime, endTime, userId',
      });
    }

    const league = await prisma.league.findUnique({
      where: { id },
      select: { id: true, sportType: true, organizerId: true },
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    if (league.organizerId !== userId) {
      return res.status(403).json({
        error: 'Only the league owner or admins can perform this action',
      });
    }

    const eventStartTime = new Date(startTime);
    const eventEndTime = new Date(endTime);

    if (rosterIds && rosterIds.length > 0) {
      if (rosterIds.length < 2) {
        return res
          .status(400)
          .json({ error: 'League events require at least 2 rosters' });
      }

      const overlappingEvents = await prisma.event.findMany({
        where: {
          eligibilityRestrictedToLeagues: { has: id },
          status: 'active',
          startTime: { lt: eventEndTime },
          endTime: { gt: eventStartTime },
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          eligibilityRestrictedToTeams: true,
        },
      });

      const conflicts: Array<{
        rosterId: string;
        rosterName: string;
        conflictingEventId: string;
        conflictingEventTitle: string;
        startTime: Date;
        endTime: Date;
      }> = [];

      const fetchedRosters = await prisma.team.findMany({
        where: { id: { in: rosterIds } },
        select: { id: true, name: true },
      });
      const rosterNameMap = new Map(fetchedRosters.map(r => [r.id, r.name]));

      for (const event of overlappingEvents) {
        for (const rosterId of rosterIds) {
          if (event.eligibilityRestrictedToTeams.includes(rosterId)) {
            conflicts.push({
              rosterId,
              rosterName: rosterNameMap.get(rosterId) || 'Unknown Roster',
              conflictingEventId: event.id,
              conflictingEventTitle: event.title,
              startTime: event.startTime,
              endTime: event.endTime,
            });
          }
        }
      }

      if (conflicts.length > 0) {
        return res
          .status(409)
          .json({ error: 'Scheduling conflict', conflicts });
      }

      const event = await prisma.event.create({
        data: {
          title,
          description: description || '',
          sportType: league.sportType,
          skillLevel: 'all',
          eventType: 'game',
          startTime: eventStartTime,
          endTime: eventEndTime,
          maxParticipants: 100,
          organizerId: userId,
          ...(facilityId && { facilityId }),
          eligibilityRestrictedToLeagues: [id],
          eligibilityRestrictedToTeams: rosterIds,
        },
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
          organizer: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
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
        assignedRosters: rosterIds.map((rid: string) => ({
          id: rid,
          name: rosterNameMap.get(rid) || 'Unknown Roster',
        })),
      };

      NotificationService.notifyEventRosterAssignment(id, title, rosterIds);

      return res.status(201).json(responseEvent);
    }

    // No roster assignment — create open event
    const event = await prisma.event.create({
      data: {
        title,
        description: description || '',
        sportType: league.sportType,
        skillLevel: 'all',
        eventType: 'game',
        startTime: eventStartTime,
        endTime: eventEndTime,
        maxParticipants: 100,
        organizerId: userId,
        ...(facilityId && { facilityId }),
        eligibilityRestrictedToLeagues: [id],
        eligibilityRestrictedToTeams: [],
      },
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
        organizer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
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
      assignedRosters: [],
    };

    return res.status(201).json(responseEvent);
  } catch (error) {
    console.error('Error creating league event:', error);
    res.status(500).json({ error: 'Failed to create league event' });
  }
});

// ============================================================================
// COMMISSIONER TEAM MANAGEMENT (kept inline)
// ============================================================================

// POST /api/leagues/:id/teams
router.post(
  '/:id/teams',
  authMiddleware,
  requireNonDependent,
  async (req: Request, res: Response) => {
    try {
      const { id: leagueId } = req.params as { id: string };
      const userId =
        req.user?.userId || (req.headers['x-user-id'] as string | undefined);

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: {
          id: true,
          organizerId: true,
          sportType: true,
          suggestedRosterSize: true,
          name: true,
        },
      });

      if (!league) {
        return res.status(404).json({ error: 'League not found' });
      }
      if (league.organizerId !== userId) {
        return res
          .status(403)
          .json({ error: 'Only the league commissioner can create teams' });
      }

      const {
        name,
        sportType,
        maxMembers,
        skillLevel,
        genderRestriction,
        coachEmail,
        coachUserId,
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Team name is required' });
      }

      const team = await prisma.team.create({
        data: {
          name: name.trim(),
          description: '',
          sportType: sportType || league.sportType || '',
          sportTypes: sportType
            ? [sportType]
            : league.sportType
              ? [league.sportType]
              : [],
          skillLevel: skillLevel || '',
          maxMembers: maxMembers || league.suggestedRosterSize || 15,
          isPrivate: true,
          genderRestriction: genderRestriction || null,
        },
      });

      await prisma.leagueMembership.create({
        data: {
          leagueId,
          memberId: team.id,
          teamId: team.id,
          memberType: 'roster',
          status: 'active',
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          points: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
        },
      });

      try {
        const { MessagingService } =
          await import('../services/MessagingService');
        await MessagingService.createTeamChat(team.id, userId, team.name);
      } catch (msgErr) {
        console.error('Failed to create team chat:', msgErr);
      }

      let coachAssignment: {
        assigned: boolean;
        method: string;
        userId?: string;
      } = { assigned: false, method: 'none' };

      const targetCoachId = coachUserId || null;
      const targetCoachEmail = coachEmail?.trim() || null;

      if (targetCoachId) {
        const coachUser = await prisma.user.findUnique({
          where: { id: targetCoachId },
          select: { id: true },
        });
        if (coachUser) {
          await prisma.teamMember.create({
            data: {
              teamId: team.id,
              userId: targetCoachId,
              role: 'coach',
              status: 'active',
              joinedAt: new Date(),
            },
          });
          coachAssignment = {
            assigned: true,
            method: 'direct',
            userId: targetCoachId,
          };
        }
      } else if (targetCoachEmail) {
        const coachUser = await prisma.user.findUnique({
          where: { email: targetCoachEmail.toLowerCase() },
          select: { id: true, firstName: true, lastName: true },
        });

        if (coachUser) {
          await prisma.teamMember.create({
            data: {
              teamId: team.id,
              userId: coachUser.id,
              role: 'coach',
              status: 'active',
              joinedAt: new Date(),
            },
          });
          coachAssignment = {
            assigned: true,
            method: 'email_found',
            userId: coachUser.id,
          };
        } else {
          coachAssignment = { assigned: false, method: 'user_not_found' };
        }
      }

      const completeTeam = await prisma.team.findUnique({
        where: { id: team.id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  profileImage: true,
                },
              },
            },
          },
        },
      });

      res.status(201).json({
        team: completeTeam,
        coachAssignment,
        leagueMembership: { leagueId, teamId: team.id, status: 'active' },
      });
    } catch (error: any) {
      console.error('Commissioner create team error:', error);
      res
        .status(500)
        .json({ error: 'Failed to create team', details: error?.message });
    }
  }
);

// POST /api/leagues/:id/teams/:teamId/assign-coach
router.post(
  '/:id/teams/:teamId/assign-coach',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { id: leagueId, teamId } = req.params as {
        id: string;
        teamId: string;
      };
      const userId =
        req.user?.userId || (req.headers['x-user-id'] as string | undefined);

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { id: true, organizerId: true, name: true },
      });
      if (!league) return res.status(404).json({ error: 'League not found' });
      if (league.organizerId !== userId) {
        return res
          .status(403)
          .json({ error: 'Only the league commissioner can assign coaches' });
      }

      const membership = await prisma.leagueMembership.findFirst({
        where: { leagueId, teamId, memberType: 'roster' },
      });
      if (!membership) {
        return res.status(404).json({ error: 'Team is not in this league' });
      }

      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { id: true, name: true },
      });
      if (!team) return res.status(404).json({ error: 'Team not found' });

      const { coachUserId: targetUserId, email } = req.body;

      if (!targetUserId && !email) {
        return res
          .status(400)
          .json({ error: 'Provide either coachUserId or email' });
      }

      let coachId: string | null = targetUserId || null;

      if (!coachId && email) {
        const foundUser = await prisma.user.findUnique({
          where: { email: email.trim().toLowerCase() },
          select: { id: true },
        });
        if (foundUser) {
          coachId = foundUser.id;
        } else {
          return res.status(404).json({
            error:
              'No user found with that email. They need to create a Muster account first.',
          });
        }
      }

      if (!coachId) {
        return res.status(400).json({ error: 'Could not resolve coach user' });
      }

      const existing = await prisma.teamMember.findFirst({
        where: { teamId, userId: coachId },
      });

      if (existing) {
        await prisma.teamMember.update({
          where: { id: existing.id },
          data: { role: 'coach', status: 'active' },
        });
      } else {
        await prisma.teamMember.create({
          data: {
            teamId,
            userId: coachId,
            role: 'coach',
            status: 'active',
            joinedAt: new Date(),
          },
        });
      }

      const updatedTeam = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          members: {
            where: { status: 'active' },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  profileImage: true,
                },
              },
            },
          },
        },
      });

      res.json({ success: true, team: updatedTeam });
    } catch (error: any) {
      console.error('Assign coach error:', error);
      res
        .status(500)
        .json({ error: 'Failed to assign coach', details: error?.message });
    }
  }
);

// POST /api/leagues/:id/teams/bulk
router.post(
  '/:id/teams/bulk',
  authMiddleware,
  requireNonDependent,
  async (req: Request, res: Response) => {
    try {
      const { id: leagueId } = req.params as { id: string };
      const userId =
        req.user?.userId || (req.headers['x-user-id'] as string | undefined);

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: {
          id: true,
          organizerId: true,
          sportType: true,
          suggestedRosterSize: true,
          name: true,
        },
      });
      if (!league) return res.status(404).json({ error: 'League not found' });
      if (league.organizerId !== userId) {
        return res
          .status(403)
          .json({ error: 'Only the league commissioner can create teams' });
      }

      const { teams } = req.body;
      if (!Array.isArray(teams) || teams.length === 0) {
        return res.status(400).json({ error: 'Provide an array of teams' });
      }
      if (teams.length > 20) {
        return res
          .status(400)
          .json({ error: 'Maximum 20 teams per bulk create' });
      }

      const results: any[] = [];

      for (const teamInput of teams) {
        if (!teamInput.name?.trim()) {
          results.push({ name: teamInput.name, error: 'Name is required' });
          continue;
        }

        try {
          const team = await prisma.team.create({
            data: {
              name: teamInput.name.trim(),
              description: '',
              sportType: league.sportType || '',
              sportTypes: league.sportType ? [league.sportType] : [],
              skillLevel: '',
              maxMembers:
                teamInput.maxMembers || league.suggestedRosterSize || 15,
              isPrivate: true,
            },
          });

          await prisma.leagueMembership.create({
            data: {
              leagueId,
              memberId: team.id,
              teamId: team.id,
              memberType: 'roster',
              status: 'active',
              matchesPlayed: 0,
              wins: 0,
              losses: 0,
              draws: 0,
              points: 0,
              goalsFor: 0,
              goalsAgainst: 0,
              goalDifference: 0,
            },
          });

          try {
            const { MessagingService } =
              await import('../services/MessagingService');
            await MessagingService.createTeamChat(team.id, userId, team.name);
          } catch (e) {
            /* non-critical */
          }

          results.push({ name: team.name, teamId: team.id, status: 'created' });
        } catch (e: any) {
          results.push({ name: teamInput.name, error: e?.message || 'Failed' });
        }
      }

      res.status(201).json({
        created: results.filter(r => r.status === 'created').length,
        failed: results.filter(r => r.error).length,
        results,
      });
    } catch (error: any) {
      console.error('Bulk create teams error:', error);
      res
        .status(500)
        .json({ error: 'Failed to create teams', details: error?.message });
    }
  }
);

// ============================================================================
// DOCUMENT MANAGEMENT (kept inline — uses DocumentService)
// ============================================================================

// GET /api/leagues/:id/documents
router.get('/:id/documents', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const documents = await prisma.leagueDocument.findMany({
      where: { leagueId: id },
      include: {
        uploader: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST /api/leagues/:id/documents
router.post(
  '/:id/documents',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { documentType, userId } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
      }

      const validation = validateFile(file);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      const league = await prisma.league.findUnique({ where: { id } });

      if (!league) {
        return res.status(404).json({ error: 'League not found' });
      }

      if (league.organizerId !== userId) {
        return res
          .status(403)
          .json({ error: 'Only the league operator can upload documents' });
      }

      const document = await prisma.leagueDocument.create({
        data: {
          leagueId: id,
          fileName: file.originalname,
          fileUrl: generateFileUrl(file.path),
          fileSize: file.size,
          mimeType: file.mimetype,
          documentType: documentType || 'other',
          uploadedBy: userId,
        },
        include: {
          uploader: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      res.status(201).json(document);
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }
);

// DELETE /api/leagues/:id/documents/:documentId
router.delete(
  '/:id/documents/:documentId',
  async (req: Request, res: Response) => {
    try {
      const { id, documentId } = req.params as {
        id: string;
        documentId: string;
      };
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
      }

      const league = await prisma.league.findUnique({ where: { id } });

      if (!league) {
        return res.status(404).json({ error: 'League not found' });
      }

      if (league.organizerId !== userId) {
        return res
          .status(403)
          .json({ error: 'Only the league operator can delete documents' });
      }

      const document = await prisma.leagueDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      await deleteFile(document.fileUrl);

      await prisma.leagueDocument.delete({ where: { id: documentId } });

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }
);

// GET /api/leagues/:id/documents/:documentId/download
router.get(
  '/:id/documents/:documentId/download',
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params as { documentId: string };

      const document = await prisma.leagueDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      res.json({
        url: document.fileUrl,
        fileName: document.fileName,
        mimeType: document.mimeType,
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      res.status(500).json({ error: 'Failed to download document' });
    }
  }
);

// ============================================================================
// CERTIFICATION
// ============================================================================

// POST /api/leagues/:id/certify
router.post(
  '/:id/certify',
  upload.single('bylaws'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
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

      let parsedBoardMembers;
      try {
        parsedBoardMembers = JSON.parse(boardMembers);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid board members format' });
      }

      if (!Array.isArray(parsedBoardMembers) || parsedBoardMembers.length < 3) {
        return res
          .status(400)
          .json({ error: 'At least 3 board members are required' });
      }

      const validation = validateFile(file);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      const league = await prisma.league.findUnique({ where: { id } });

      if (!league) {
        return res.status(404).json({ error: 'League not found' });
      }

      if (league.organizerId !== userId) {
        return res
          .status(403)
          .json({ error: 'Only the league operator can certify the league' });
      }

      await prisma.certificationDocument.create({
        data: {
          leagueId: id,
          documentType: 'bylaws',
          fileName: file.originalname,
          fileUrl: generateFileUrl(file.path),
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedBy: userId,
          approvedAt: new Date(),
        },
      });

      await prisma.certificationDocument.create({
        data: {
          leagueId: id,
          documentType: 'board_of_directors',
          fileName: 'board_of_directors.json',
          fileUrl: '',
          fileSize: 0,
          mimeType: 'application/json',
          boardMembers: parsedBoardMembers,
          uploadedBy: userId,
          approvedAt: new Date(),
        },
      });

      const updatedLeague = await prisma.league.update({
        where: { id },
        data: { isCertified: true, certifiedAt: new Date() },
        include: {
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
            },
          },
        },
      });

      res.json(updatedLeague);
    } catch (error) {
      console.error('Error certifying league:', error);
      res.status(500).json({ error: 'Failed to certify league' });
    }
  }
);

// ============================================================================
// SCHEDULE MANAGEMENT (delegates to ScheduleGeneratorService)
// ============================================================================

// POST /api/leagues/:id/generate-schedule
router.post(
  '/:id/generate-schedule',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const userId = req.user?.userId || req.body.userId;

      if (!userId) {
        return res
          .status(400)
          .json({ error: 'Missing required field: userId' });
      }

      const league = await prisma.league.findUnique({
        where: { id },
        include: {
          memberships: {
            where: { status: 'active', memberType: 'roster' },
            include: {
              team: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!league) {
        return res.status(404).json({ error: 'League not found' });
      }

      if (league.organizerId !== userId) {
        return res.status(403).json({
          error: 'Only the league Commissioner can manage the schedule',
        });
      }

      const rosters = league.memberships
        .filter((m: any) => m.team)
        .map((m: any) => ({ id: m.team!.id, name: m.team!.name }));

      if (rosters.length < 2) {
        return res.status(400).json({
          error:
            'At least 2 registered rosters are required to generate a schedule',
        });
      }

      const leagueWithRosters: LeagueWithRosters = {
        id: league.id,
        leagueFormat: league.leagueFormat || 'season',
        gameFrequency: league.gameFrequency,
        preferredGameDays: league.preferredGameDays,
        preferredTimeWindowStart: league.preferredTimeWindowStart,
        preferredTimeWindowEnd: league.preferredTimeWindowEnd,
        seasonGameCount: league.seasonGameCount,
        startDate: league.startDate,
        endDate: league.endDate,
        playoffTeamCount: league.playoffTeamCount,
        eliminationFormat: league.eliminationFormat,
        rosters,
      };

      const preview =
        ScheduleGeneratorService.generateSchedulePreview(leagueWithRosters);

      return res.json({ events: preview.events });
    } catch (error: any) {
      console.error('Error generating schedule preview:', error);

      if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      const msg =
        error instanceof Error ? error.message : 'Failed to generate schedule';
      res.status(500).json({ error: msg });
    }
  }
);

// POST /api/leagues/:id/confirm-schedule
router.post(
  '/:id/confirm-schedule',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const userId = req.user?.userId || req.body.userId;

      if (!userId) {
        return res
          .status(400)
          .json({ error: 'Missing required field: userId' });
      }

      const league = await prisma.league.findUnique({ where: { id } });

      if (!league) {
        return res.status(404).json({ error: 'League not found' });
      }

      if (league.organizerId !== userId) {
        return res.status(403).json({
          error: 'Only the league Commissioner can manage the schedule',
        });
      }

      if (league.scheduleGenerated) {
        return res.status(409).json({
          error: 'Schedule has already been generated for this league',
        });
      }

      const { events } = req.body;
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ error: 'No events provided' });
      }

      const result = await ScheduleGeneratorService.confirmSchedule(
        id,
        userId,
        events
      );

      return res.json({ eventsCreated: result.eventsCreated });
    } catch (error: any) {
      console.error('Error confirming schedule:', error?.message, error?.stack);
      const statusCode = error?.statusCode || 500;
      const message =
        error?.message || 'Failed to save schedule. Please try again.';
      res
        .status(statusCode)
        .json({ error: message, detail: error?.meta || undefined });
    }
  }
);

// POST /api/leagues/:id/check-ready
router.post(
  '/:id/check-ready',
  optionalAuthMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };

      const league = await prisma.league.findUnique({
        where: { id },
        include: {
          memberships: { where: { memberType: 'roster' } },
        },
      });

      if (!league) {
        return res.status(404).json({ error: 'League not found' });
      }

      if (league.scheduleGenerated) {
        return res.json({ ready: false, reason: 'Schedule already generated' });
      }

      if (league.readyNotificationSent) {
        return res.json({
          ready: true,
          notified: false,
          reason: 'Notification already sent',
        });
      }

      const activeRosters = league.memberships.filter(
        (m: any) => m.status === 'active'
      );
      const activeRosterCount = activeRosters.length;

      if (activeRosterCount === 0) {
        return res.json({ ready: false, reason: 'No registered rosters' });
      }

      const now = new Date();
      const registrationClosed = league.registrationCloseDate
        ? new Date(league.registrationCloseDate) <= now
        : false;

      const pendingRosters = league.memberships.filter(
        (m: any) => m.status === 'pending'
      );
      const allRostersConfirmed = pendingRosters.length === 0;

      if (registrationClosed || allRostersConfirmed) {
        const notification = {
          title: 'League Ready',
          body: `${league.name} is ready to schedule.`,
          data: {
            type: 'league_ready_to_schedule',
            leagueId: league.id,
          },
        };

        try {
          console.log(
            `[check-ready] Sending ready notification to Commissioner ${league.organizerId}`
          );
          console.log('[check-ready] Notification:', notification);
        } catch {
          // Non-critical
        }

        await prisma.league.update({
          where: { id },
          data: { readyNotificationSent: true },
        });

        return res.json({ ready: true, notified: true });
      }

      return res.json({ ready: false });
    } catch (error) {
      console.error('Error checking league readiness:', error);
      res.status(500).json({ error: 'Failed to check league readiness' });
    }
  }
);

// ============================================================================
// STRIKES
// ============================================================================

// GET /api/leagues/:leagueId/seasons/:seasonId/strikes
router.get(
  '/:leagueId/seasons/:seasonId/strikes',
  async (req: Request, res: Response) => {
    try {
      const { leagueId, seasonId } = req.params as {
        leagueId: string;
        seasonId: string;
      };
      const { userId } = req.query;

      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { id: true, organizerId: true },
      });

      if (!league) {
        return res.status(404).json({ error: 'League not found' });
      }

      if (userId && league.organizerId !== userId) {
        return res
          .status(403)
          .json({ error: 'Only the league commissioner can view strike data' });
      }

      const season = await prisma.season.findFirst({
        where: { id: seasonId, leagueId },
      });

      if (!season) {
        return res
          .status(404)
          .json({ error: 'Season not found for this league' });
      }

      const strikes = await prisma.rosterStrike.findMany({
        where: { seasonId },
        orderBy: { createdAt: 'desc' },
        include: {
          roster: {
            select: { id: true, name: true, imageUrl: true },
          },
        },
      });

      const rosterStrikeMap = new Map<
        string,
        {
          rosterId: string;
          rosterName: string;
          rosterImageUrl: string | null;
          strikeCount: number;
          strikes: typeof strikes;
        }
      >();

      for (const strike of strikes) {
        const existing = rosterStrikeMap.get(strike.rosterId);
        if (!existing || strike.count > existing.strikeCount) {
          rosterStrikeMap.set(strike.rosterId, {
            rosterId: strike.rosterId,
            rosterName: strike.roster.name,
            rosterImageUrl: strike.roster.imageUrl,
            strikeCount: strike.count,
            strikes: [],
          });
        }
        rosterStrikeMap.get(strike.rosterId)!.strikes.push(strike);
      }

      const result = Array.from(rosterStrikeMap.values()).sort(
        (a, b) => b.strikeCount - a.strikeCount
      );

      res.json(result);
    } catch (error) {
      console.error('Error fetching strikes:', error);
      res.status(500).json({ error: 'Failed to fetch strike data' });
    }
  }
);

// ============================================================================
// LEDGER
// ============================================================================

// GET /api/leagues/:id/ledger
router.get('/:id/ledger', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { seasonId } = req.query;

    if (!seasonId || typeof seasonId !== 'string') {
      return res
        .status(400)
        .json({ error: 'Missing required query parameter: seasonId' });
    }

    const league = await prisma.league.findUnique({
      where: { id },
      select: { id: true, organizerId: true },
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    const season = await prisma.season.findFirst({
      where: { id: seasonId as string, leagueId: id },
      select: { id: true },
    });

    if (!season) {
      return res
        .status(404)
        .json({ error: 'Season not found for this league' });
    }

    const { getLeagueLedger } = require('../services/league-ledger');
    const transactions = await getLeagueLedger(id, seasonId as string);

    res.json({ transactions });
  } catch (error) {
    console.error('Error fetching league ledger:', error);
    res.status(500).json({ error: 'Failed to fetch league ledger' });
  }
});

// ============================================================================
// COVER IMAGE ROUTES (kept inline — multer + image processing)
// ============================================================================

// Upload league cover image
router.post(
  '/:id/cover',
  uploadCover.single('image'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const file = req.file;
      const userId = req.user?.userId || (req.headers['x-user-id'] as string);

      if (!userId) {
        if (file?.path) {
          const fs = require('fs');
          fs.unlinkSync(file.path);
        }
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validation = validateImageFile(file as Express.Multer.File);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      if (!file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const league = await prisma.league.findUnique({
        where: { id },
        select: { id: true, organizerId: true, imageUrl: true },
      });

      if (!league) {
        if (file.path) {
          const fs = require('fs');
          fs.unlinkSync(file.path);
        }
        return res.status(404).json({ error: 'League not found' });
      }

      if (league.organizerId !== userId) {
        if (file.path) {
          const fs = require('fs');
          fs.unlinkSync(file.path);
        }
        return res.status(403).json({
          error: 'Only the league organizer can upload a cover image',
        });
      }

      const { optimizedPath } = await processMapImage(file.path, {
        maxWidth: 1600,
        maxHeight: 600,
        quality: 85,
      });

      const imageUrl = generateImageUrl(optimizedPath);

      if (league.imageUrl) {
        try {
          await deleteImageFiles(league.imageUrl);
        } catch (error) {
          console.error('Error deleting old league cover image:', error);
        }
      }

      const updatedLeague = await prisma.league.update({
        where: { id },
        data: { imageUrl },
        select: { id: true, imageUrl: true },
      });

      res.status(200).json({ imageUrl: updatedLeague.imageUrl });
    } catch (error: any) {
      console.error('Upload league cover image error:', error);

      if (req.file?.path) {
        try {
          const fs = require('fs');
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }

      res.status(500).json({
        error: error.message || 'Failed to upload cover image',
      });
    }
  }
);

// Delete league cover image
router.delete('/:id/cover', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user?.userId || (req.headers['x-user-id'] as string);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const league = await prisma.league.findUnique({
      where: { id },
      select: { id: true, organizerId: true, imageUrl: true },
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    if (league.organizerId !== userId) {
      return res.status(403).json({
        error: 'Only the league organizer can delete the cover image',
      });
    }

    if (!league.imageUrl) {
      return res.status(404).json({ error: 'No cover image to delete' });
    }

    await deleteImageFiles(league.imageUrl);

    await prisma.league.update({
      where: { id },
      data: { imageUrl: null },
    });

    res.status(200).json({ message: 'Cover image deleted' });
  } catch (error: any) {
    console.error('Delete league cover image error:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete cover image',
    });
  }
});

export default router;
