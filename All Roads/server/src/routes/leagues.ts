import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

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
          where: { status: 'active' },
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
      organizerId
    } = req.body;

    // Validate required fields
    if (!name || !sportType || !skillLevel || !organizerId) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, sportType, skillLevel, organizerId' 
      });
    }

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
        organizerId
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
      userId // For authorization check
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

    // Update league
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
        ...(isActive !== undefined && { isActive })
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

// GET /api/leagues/:id/standings - Get league standings
router.get('/:id/standings', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { seasonId } = req.query;

    const where: any = { leagueId: id, status: 'active' };
    if (seasonId) {
      where.seasonId = seasonId;
    }

    const memberships = await prisma.leagueMembership.findMany({
      where,
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
      orderBy: [
        { points: 'desc' },
        { goalDifference: 'desc' },
        { goalsFor: 'desc' }
      ]
    });

    // Add rank
    const standings = memberships.map((membership, index) => ({
      rank: index + 1,
      team: membership.team,
      stats: {
        matchesPlayed: membership.matchesPlayed,
        wins: membership.wins,
        losses: membership.losses,
        draws: membership.draws,
        points: membership.points,
        goalsFor: membership.goalsFor,
        goalsAgainst: membership.goalsAgainst,
        goalDifference: membership.goalDifference
      }
    }));

    res.json(standings);
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

// POST /api/leagues/:id/join - Join league
router.post('/:id/join', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teamId, userId } = req.body;

    if (!teamId || !userId) {
      return res.status(400).json({ error: 'Missing required fields: teamId, userId' });
    }

    // Check if league exists
    const league = await prisma.league.findUnique({
      where: { id }
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
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
      return res.status(403).json({ error: 'Only team captains or admins can join leagues' });
    }

    // Check if team is already a member
    const existingMembership = await prisma.leagueMembership.findFirst({
      where: {
        leagueId: id,
        teamId,
        status: { in: ['active', 'pending'] }
      }
    });

    if (existingMembership) {
      return res.status(409).json({ error: 'Team is already a member of this league' });
    }

    // Create membership (always active for now - can add approval logic later)
    const membership = await prisma.leagueMembership.create({
      data: {
        leagueId: id,
        teamId,
        status: 'active'
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

    res.status(201).json(membership);
  } catch (error) {
    console.error('Error joining league:', error);
    res.status(500).json({ error: 'Failed to join league' });
  }
});

// POST /api/leagues/:id/leave - Leave league
router.post('/:id/leave', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teamId, userId } = req.body;

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

// GET /api/leagues/:id/members - Get league members
router.get('/:id/members', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const total = await prisma.leagueMembership.count({
      where: { leagueId: id, status: 'active' }
    });

    const memberships = await prisma.leagueMembership.findMany({
      where: { leagueId: id, status: 'active' },
      skip,
      take: limitNum,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            sportType: true,
            members: {
              select: {
                id: true
              }
            }
          }
        }
      },
      orderBy: { joinedAt: 'asc' }
    });

    const membersWithCounts = memberships.map(m => ({
      ...m,
      team: {
        ...m.team,
        memberCount: m.team.members.length,
        members: undefined
      }
    }));

    res.json({
      data: membersWithCounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching league members:', error);
    res.status(500).json({ error: 'Failed to fetch league members' });
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
