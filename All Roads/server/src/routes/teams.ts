import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// Get all teams
router.get('/', async (req, res) => {
  try {
    const { sportType, page = '1', limit = '10' } = req.query;
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};
    if (sportType) where.sportType = sportType;

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

    // Map isPrivate to isPublic for frontend
    const mappedTeams = teams.map(({ isPrivate, ...rest }) => ({
      ...rest,
      isPublic: !isPrivate,
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

    // Map isPrivate to isPublic for frontend
    const { isPrivate, ...rest } = team;
    res.json({ ...rest, isPublic: !isPrivate });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// Update team
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, sportType, skillLevel, maxMembers, isPublic } = req.body;

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
        ...(skillLevel !== undefined && { skillLevel }),
        ...(maxMembers !== undefined && { maxMembers }),
        ...(isPublic !== undefined && { isPrivate: !isPublic }),
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, profileImage: true },
            },
          },
        },
      },
    });

    const { isPrivate, ...rest } = team;
    res.json({ ...rest, isPublic: !isPrivate });
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

    // Get all league memberships for this team
    const memberships = await prisma.leagueMembership.findMany({
      where: {
        teamId: id,
        status: 'active',
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
          select: { id: true, name: true, street: true, city: true, state: true },
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
router.post('/', async (req, res) => {
  try {
    const { initialMemberIds, isPublic, ...rest } = req.body;
    const creatorId = req.headers['x-user-id'] as string | undefined;

    // Map frontend isPublic to DB isPrivate, and ensure description has a value
    const teamData = {
      ...rest,
      isPrivate: isPublic === undefined ? false : !isPublic,
      description: rest.description || '',
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
    if (initialMemberIds && Array.isArray(initialMemberIds) && initialMemberIds.length > 0) {
      console.log(`Adding ${initialMemberIds.length} initial members to team ${team.id}`);
      
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
            status: 'active',
            joinedAt: new Date(),
          })),
        });
      }

      console.log(`Successfully added ${initialMemberIds.length} members to team ${team.id}`);
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

    // Map isPrivate to isPublic for frontend
    if (completeTeam) {
      const { isPrivate: priv, ...restTeam } = completeTeam;
      res.status(201).json({ ...restTeam, isPublic: !priv });
    } else {
      res.status(201).json(completeTeam);
    }
  } catch (error: any) {
    console.error('Create team error:', error?.message || error);
    console.error('Create team error details:', JSON.stringify(error?.meta || error?.code || ''));
    res.status(500).json({ 
      error: 'Failed to create team',
      details: error?.message || 'Unknown error',
    });
  }
});

// Delete team
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Delete related records first, then the team
    // Note: LeagueMembership and TeamTransaction have onDelete: Cascade
    // so they are automatically removed when the team is deleted.
    await prisma.$transaction(async (tx) => {
      // Delete team members (no cascade)
      await tx.teamMember.deleteMany({ where: { teamId: id } });

      // Delete matches referencing this team (no cascade)
      await tx.match.deleteMany({ 
        where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] } 
      });

      // Delete the team (cascades: leagueMemberships, transactions)
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
      return res.status(400).json({ error: 'You are already a member of this roster' });
    }

    // Private roster: require existing membership record (added by captain)
    if (team.isPrivate) {
      const wasInvited = team.members.some(m => m.userId === userId);

      if (!wasInvited) {
        return res.status(403).json({ error: 'This is a private roster. You need an invite to join.' });
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
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
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
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      });
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
      return res.status(404).json({ error: 'You are not a member of this roster' });
    }

    if (member.role === 'captain') {
      return res.status(400).json({ error: 'Captains cannot leave. Transfer captaincy first or delete the roster.' });
    }

    await prisma.teamMember.delete({ where: { id: member.id } });

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
      return res.status(400).json({ error: 'User is already a player in this roster' });
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
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
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
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      });
    }

    res.status(201).json(member);
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Failed to add player to roster' });
  }
});

export default router;
