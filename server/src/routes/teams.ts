import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { optionalAuthMiddleware } from '../middleware/auth';
import { requireNonDependent } from '../middleware/require-non-dependent';

const router = Router();

// Get all teams
router.get('/', async (req, res) => {
  try {
    const { sportType, page = '1', limit = '10' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};
    if (sportType) {
      where.OR = [
        { sportType: sportType },
        { sportTypes: { has: sportType as string } },
      ];
    }

    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        skip,
        take,
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
      }),
      prisma.team.count({ where }),
    ]);

    // Map isPrivate to isPublic for frontend and ensure sportTypes
    const mappedTeams = teams.map(({ isPrivate, ...rest }) => ({
      ...rest,
      isPublic: !isPrivate,
      sportTypes:
        rest.sportTypes && rest.sportTypes.length > 0
          ? rest.sportTypes
          : rest.sportType
            ? [rest.sportType]
            : [],
    }));

    res.json({
      data: mappedTeams,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Validate invite code (no auth required — new users need to validate before signing up)
router.get('/validate-invite', async (req, res) => {
  try {
    const { inviteCode } = req.query;

    if (!inviteCode || typeof inviteCode !== 'string') {
      return res
        .status(400)
        .json({ valid: false, error: 'Invite code is required' });
    }

    const inviteLink = await prisma.inviteLink.findFirst({
      where: {
        token: inviteCode.toUpperCase(),
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      include: {
        team: {
          include: {
            members: {
              where: { status: 'active' },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!inviteLink) {
      return res.json({ valid: false });
    }

    // Check max uses
    if (
      inviteLink.maxUses !== null &&
      inviteLink.useCount >= inviteLink.maxUses
    ) {
      return res.json({ valid: false });
    }

    const { team } = inviteLink;
    res.json({
      valid: true,
      team: {
        id: team.id,
        name: team.name,
        sportType: team.sportType,
        skillLevel: team.skillLevel,
        memberCount: team.members.length,
        maxMembers: team.maxMembers,
        imageUrl: team.imageUrl,
      },
      expiresAt: inviteLink.expiresAt,
    });
  } catch (error) {
    console.error('Validate invite code error:', error);
    res
      .status(500)
      .json({ valid: false, error: 'Failed to validate invite code' });
  }
});

// Get team by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Map isPrivate to isPublic for frontend and ensure sportTypes
    const { isPrivate, ...rest } = team;
    res.json({
      ...rest,
      isPublic: !isPrivate,
      sportTypes:
        rest.sportTypes && rest.sportTypes.length > 0
          ? rest.sportTypes
          : rest.sportType
            ? [rest.sportType]
            : [],
    });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// Update team
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      sportType,
      sportTypes,
      skillLevel,
      maxMembers,
      isPublic,
    } = req.body;

    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const team = await prisma.team.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(sportType !== undefined && { sportType }),
        ...(sportTypes !== undefined && { sportTypes }),
        ...(skillLevel !== undefined && { skillLevel }),
        ...(maxMembers !== undefined && { maxMembers }),
        ...(isPublic !== undefined && { isPrivate: !isPublic }),
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });

    const { isPrivate, ...rest } = team;
    res.json({
      ...rest,
      isPublic: !isPrivate,
      sportTypes:
        rest.sportTypes && rest.sportTypes.length > 0
          ? rest.sportTypes
          : rest.sportType
            ? [rest.sportType]
            : [],
    });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// Get leagues for a team
router.get('/:id/leagues', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get all league memberships for this team (active and pending)
    const memberships = await prisma.leagueMembership.findMany({
      where: {
        teamId: id,
        status: { in: ['active', 'pending'] },
      },
      include: {
        league: {
          include: {
            organizer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    // Extract leagues from memberships and add membership info
    const leagues = memberships.map(membership => ({
      ...membership.league,
      membership: {
        id: membership.id,
        status: membership.status,
        joinedAt: membership.joinedAt,
        matchesPlayed: membership.matchesPlayed,
        wins: membership.wins,
        losses: membership.losses,
        draws: membership.draws,
        points: membership.points,
        goalsFor: membership.goalsFor,
        goalsAgainst: membership.goalsAgainst,
        goalDifference: membership.goalDifference,
      },
    }));

    res.json(leagues);
  } catch (error) {
    console.error('Get team leagues error:', error);
    res.status(500).json({ error: 'Failed to fetch team leagues' });
  }
});

// Get upcoming events for a team
router.get('/:id/events', async (req, res) => {
  try {
    const { id } = req.params;

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const now = new Date();

    // Find events where this team is in eligibilityRestrictedToTeams or coveringTeamId
    const events = await prisma.event.findMany({
      where: {
        startTime: { gte: now },
        status: 'active',
        OR: [
          { eligibilityRestrictedToTeams: { has: id } },
          { coveringTeamId: id },
        ],
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
      },
      orderBy: { startTime: 'asc' },
      take: 20,
    });

    res.json(events);
  } catch (error) {
    console.error('Get team events error:', error);
    res.status(500).json({ error: 'Failed to fetch team events' });
  }
});

// Create team
router.post(
  '/',
  optionalAuthMiddleware,
  requireNonDependent,
  async (req, res) => {
    try {
      const { initialMemberIds, isPublic, ...rest } = req.body;
      const creatorId =
        req.user?.userId || (req.headers['x-user-id'] as string | undefined);

      // Plan gate: 2nd+ roster requires 'roster' plan
      if (creatorId) {
        const { userBypassesPlanGate } = require('../middleware/subscription');
        const bypassed = await userBypassesPlanGate(creatorId, 'roster');
        if (!bypassed) {
          const PLAN_HIERARCHY = [
            'free',
            'roster',
            'league',
            'facility_basic',
            'facility_pro',
          ];
          const existingRosterCount = await prisma.teamMember.count({
            where: { userId: creatorId, role: 'captain', status: 'active' },
          });
          if (existingRosterCount >= 1) {
            const sub = await prisma.subscription.findUnique({
              where: { userId: creatorId },
              select: { plan: true, status: true },
            });
            const userPlan = sub?.plan || 'free';
            const isActive =
              !sub || sub.status === 'active' || sub.status === 'trialing';
            if (
              !isActive ||
              PLAN_HIERARCHY.indexOf(userPlan) <
                PLAN_HIERARCHY.indexOf('roster')
            ) {
              return res.status(403).json({
                error: 'Plan upgrade required',
                requiredPlan: 'roster',
                currentPlan: userPlan,
              });
            }
          }
        }
      }

      // Map frontend isPublic to DB isPrivate, and ensure description has a value
      const teamData = {
        ...rest,
        isPrivate: isPublic === undefined ? false : !isPublic,
        description: rest.description || '',
        // Ensure sportTypes array is populated from sportType if not provided
        sportTypes:
          rest.sportTypes && rest.sportTypes.length > 0
            ? rest.sportTypes
            : rest.sportType
              ? [rest.sportType]
              : [],
      };

      // Create the team
      const team = await prisma.team.create({
        data: teamData,
      });

      // Add the creator as captain
      if (creatorId) {
        await prisma.teamMember.create({
          data: {
            teamId: team.id,
            userId: creatorId,
            role: 'captain',
            status: 'active',
            joinedAt: new Date(),
          },
        });
      }

      // Add initial members if provided
      if (
        initialMemberIds &&
        Array.isArray(initialMemberIds) &&
        initialMemberIds.length > 0
      ) {
        console.log(
          `Adding ${initialMemberIds.length} initial members to team ${team.id}`
        );

        // Filter out the creator if they're in the list (already added as captain)
        const memberIds = creatorId
          ? initialMemberIds.filter((id: string) => id !== creatorId)
          : initialMemberIds;

        if (memberIds.length > 0) {
          await prisma.teamMember.createMany({
            data: memberIds.map((userId: string) => ({
              teamId: team.id,
              userId,
              role: 'member',
              status: 'pending',
              joinedAt: new Date(),
            })),
          });
        }

        console.log(
          `Successfully invited ${memberIds.length} players to team ${team.id}`
        );
      }

      // Fetch the complete team with members
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

      // Messaging hook: create team chat
      try {
        const { MessagingService } =
          await import('../services/MessagingService');
        if (creatorId) {
          await MessagingService.createTeamChat(team.id, creatorId, team.name);
        }
      } catch (msgErr) {
        console.error('Failed to create team chat:', msgErr);
      }

      // Map isPrivate to isPublic for frontend
      if (completeTeam) {
        const { isPrivate: priv, ...restTeam } = completeTeam;
        res.status(201).json({
          ...restTeam,
          isPublic: !priv,
          sportTypes:
            restTeam.sportTypes && restTeam.sportTypes.length > 0
              ? restTeam.sportTypes
              : restTeam.sportType
                ? [restTeam.sportType]
                : [],
        });
      } else {
        res.status(201).json(completeTeam);
      }
    } catch (error: any) {
      console.error('Create team error:', error?.message || error);
      console.error(
        'Create team error details:',
        JSON.stringify(error?.meta || error?.code || '')
      );
      res.status(500).json({
        error: 'Failed to create team',
        details: error?.message || 'Unknown error',
      });
    }
  }
);

// Delete team
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check for upcoming events where this roster is an active participant
    const now = new Date();
    const upcomingEvents = await prisma.event.findMany({
      where: {
        startTime: { gt: now },
        status: { not: 'cancelled' },
        eligibilityRestrictedToTeams: { has: id },
      },
      select: { id: true, title: true, startTime: true },
      orderBy: { startTime: 'asc' },
    });

    if (upcomingEvents.length > 0) {
      return res.status(409).json({
        error: 'UPCOMING_EVENTS_CONFLICT',
        message:
          'This roster is registered in upcoming events. Remove it from all upcoming events before deleting.',
        events: upcomingEvents.map(e => ({
          id: e.id,
          title: e.title,
          startTime: e.startTime,
        })),
      });
    }

    await prisma.$transaction(async tx => {
      // Delete conversations linked to this roster
      const conversations = await tx.conversation.findMany({
        where: { entityId: id, type: 'TEAM' },
        select: { id: true },
      });
      const convIds = conversations.map(c => c.id);
      if (convIds.length > 0) {
        await tx.messageReaction.deleteMany({
          where: { message: { conversationId: { in: convIds } } },
        });
        await tx.message.deleteMany({
          where: { conversationId: { in: convIds } },
        });
        await tx.conversationParticipant.deleteMany({
          where: { conversationId: { in: convIds } },
        });
        await tx.conversation.deleteMany({ where: { id: { in: convIds } } });
      }

      // Delete booking participants referencing this roster
      await tx.bookingParticipant.deleteMany({ where: { rosterId: id } });

      // Remove roster from eligibilityRestrictedToTeams arrays
      const eventsWithRestriction = await tx.event.findMany({
        where: { eligibilityRestrictedToTeams: { has: id } },
        select: { id: true, eligibilityRestrictedToTeams: true },
      });
      for (const evt of eventsWithRestriction) {
        await tx.event.update({
          where: { id: evt.id },
          data: {
            eligibilityRestrictedToTeams:
              evt.eligibilityRestrictedToTeams.filter(tid => tid !== id),
          },
        });
      }

      // Delete matches referencing this team
      await tx.match.deleteMany({
        where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] },
      });

      // Delete league memberships (in case cascade doesn't fire before team delete)
      await tx.leagueMembership.deleteMany({ where: { teamId: id } });

      // Delete team members
      await tx.teamMember.deleteMany({ where: { teamId: id } });

      // Delete the team (cascades remaining: transactions, rosterStrikes, duesPayments, inviteLinks)
      await tx.team.delete({ where: { id } });
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// Remove a member from a roster
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;

    const membership = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId: id } },
    });

    if (!membership) {
      return res.status(404).json({ error: 'Player not found in this roster' });
    }

    await prisma.teamMember.delete({
      where: { id: membership.id },
    });

    // Messaging hook: remove from team chat
    try {
      const { MessagingService } = await import('../services/MessagingService');
      const conv = await MessagingService.getConversationForTeam(id);
      if (conv) {
        const removedUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true },
        });
        await MessagingService.removeParticipant(conv.id, userId);
        if (removedUser)
          await MessagingService.postSystemMessage(
            conv.id,
            `${removedUser.firstName} ${removedUser.lastName} left the team`
          );
      }
    } catch (msgErr) {
      console.error('Failed to update team chat on leave:', msgErr);
    }

    res.status(204).send();
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove player from roster' });
  }
});

// Join team
router.post('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string | undefined;
    const { inviteCode } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!team) {
      return res.status(404).json({ error: 'Roster not found' });
    }

    // Check if already a member
    const existingMember = team.members.find(m => m.userId === userId);
    if (existingMember && existingMember.status === 'active') {
      return res
        .status(400)
        .json({ error: 'You are already a member of this roster' });
    }

    // Validate invite code if provided
    let validInviteLink = false;
    if (inviteCode) {
      const link = await prisma.inviteLink.findFirst({
        where: {
          token: inviteCode.toUpperCase(),
          teamId: id,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      });

      if (link && (link.maxUses === null || link.useCount < link.maxUses)) {
        validInviteLink = true;
        // Increment use count
        await prisma.inviteLink.update({
          where: { id: link.id },
          data: { useCount: { increment: 1 } },
        });
      }
    }

    // Private roster: require existing membership record OR valid invite code
    if (team.isPrivate) {
      const wasInvited = team.members.some(m => m.userId === userId);

      if (!wasInvited && !validInviteLink) {
        return res.status(403).json({
          error: 'This is a private roster. You need an invite to join.',
        });
      }
    }

    // Check capacity
    const activeCount = team.members.filter(m => m.status === 'active').length;
    if (activeCount >= team.maxMembers) {
      return res.status(400).json({ error: 'This roster is full' });
    }

    // Create or reactivate membership
    let member;
    if (existingMember) {
      member = await prisma.teamMember.update({
        where: { id: existingMember.id },
        data: { status: 'active', joinedAt: new Date() },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    } else {
      member = await prisma.teamMember.create({
        data: {
          teamId: id,
          userId,
          role: 'member',
          status: 'active',
          joinedAt: new Date(),
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    }

    // Messaging hook: add to team chat
    try {
      const { MessagingService } = await import('../services/MessagingService');
      const conv = await MessagingService.getConversationForTeam(id);
      if (conv) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true },
        });
        await MessagingService.addParticipant(conv.id, userId, 'MEMBER');
        if (user)
          await MessagingService.postSystemMessage(
            conv.id,
            `${user.firstName} ${user.lastName} joined the team`
          );
      }
    } catch (msgErr) {
      console.error('Failed to update team chat on join:', msgErr);
    }

    res.status(201).json(member);
  } catch (error) {
    console.error('Join team error:', error);
    res.status(500).json({ error: 'Failed to join roster' });
  }
});

// Leave team
router.post('/:id/leave', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string | undefined;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const member = await prisma.teamMember.findFirst({
      where: { teamId: id, userId, status: 'active' },
    });

    if (!member) {
      return res
        .status(404)
        .json({ error: 'You are not a member of this roster' });
    }

    if (member.role === 'captain') {
      return res.status(400).json({
        error:
          'Captains cannot leave. Transfer captaincy first or delete the roster.',
      });
    }

    await prisma.teamMember.delete({ where: { id: member.id } });

    // Messaging hook: remove from team chat
    try {
      const { MessagingService } = await import('../services/MessagingService');
      const conv = await MessagingService.getConversationForTeam(id);
      if (conv) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true },
        });
        await MessagingService.removeParticipant(conv.id, userId);
        if (user)
          await MessagingService.postSystemMessage(
            conv.id,
            `${user.firstName} ${user.lastName} left the team`
          );
      }
    } catch (msgErr) {
      console.error('Failed to update team chat on leave:', msgErr);
    }

    res.status(204).send();
  } catch (error) {
    console.error('Leave team error:', error);
    res.status(500).json({ error: 'Failed to leave roster' });
  }
});

// Add member directly (for private rosters)
router.post('/:id/add-member', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!team) {
      return res.status(404).json({ error: 'Roster not found' });
    }

    // Check if already a member
    const existing = team.members.find(m => m.userId === userId);
    if (existing && existing.status === 'active') {
      return res
        .status(400)
        .json({ error: 'User is already a player in this roster' });
    }

    // Check capacity
    const activeCount = team.members.filter(m => m.status === 'active').length;
    if (activeCount >= team.maxMembers) {
      return res.status(400).json({ error: 'This roster is full' });
    }

    let member;
    if (existing) {
      member = await prisma.teamMember.update({
        where: { id: existing.id },
        data: { status: 'pending', joinedAt: new Date() },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });
    } else {
      member = await prisma.teamMember.create({
        data: {
          teamId: id,
          userId,
          role: 'member',
          status: 'pending',
          joinedAt: new Date(),
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });
    }

    res.status(201).json(member);
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Failed to add player to roster' });
  }
});

// Generate invite link for a team (captain/co-captain only)
router.post('/:id/invite-link', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string | undefined;
    const { maxUses } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify team exists and user is captain/co-captain
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          where: { userId, status: 'active' },
          select: { role: true },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: 'Roster not found' });
    }

    const member = team.members[0];
    if (
      !member ||
      (member.role !== 'captain' && member.role !== 'co_captain')
    ) {
      return res.status(403).json({
        error: 'Only captains and co-captains can generate invite links',
      });
    }

    // Check for existing active, non-expired link with >1 day remaining
    const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const existingLink = await prisma.inviteLink.findFirst({
      where: {
        teamId: id,
        isActive: true,
        expiresAt: { gt: oneDayFromNow },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingLink) {
      return res.json({
        link: `https://muster.app/join/${existingLink.token}`,
        code: existingLink.token,
        expiresAt: existingLink.expiresAt,
      });
    }

    // Generate a new 8-char uppercase hex token
    const token = crypto.randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const inviteLink = await prisma.inviteLink.create({
      data: {
        token,
        teamId: id,
        createdBy: userId,
        expiresAt,
        maxUses: maxUses ?? null,
      },
    });

    res.status(201).json({
      link: `https://muster.app/join/${inviteLink.token}`,
      code: inviteLink.token,
      expiresAt: inviteLink.expiresAt,
    });
  } catch (error) {
    console.error('Generate invite link error:', error);
    res.status(500).json({ error: 'Failed to generate invite link' });
  }
});

export default router;
