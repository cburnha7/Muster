import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { requireNonDependent } from '../middleware/require-non-dependent';
import {
  uploadCover,
  validateImageFile,
  generateImageUrl,
  processMapImage,
  deleteImageFiles,
} from '../services/ImageUploadService';
import { validate, CreateTeamSchema } from '../validation/schemas';
import { ServiceError } from '../utils/ServiceError';
import * as TeamService from '../services/TeamService';

const router = Router();

// Get all teams
router.get('/', async (req, res) => {
  try {
    const result = await TeamService.getTeams({
      sportType: req.query.sportType as string | undefined,
      page: (req.query.page as string) || '1',
      limit: (req.query.limit as string) || '10',
    });
    res.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res
        .status(error.statusCode)
        .json({ error: error.message, ...error.extra });
    }
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Validate invite code (no auth required — new users need to validate before signing up)
router.get('/validate-invite', async (req, res) => {
  try {
    const result = await TeamService.validateInviteCode(
      req.query.inviteCode as string
    );
    res.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res
        .status(error.statusCode)
        .json({ valid: false, error: error.message });
    }
    console.error('Validate invite code error:', error);
    res
      .status(500)
      .json({ valid: false, error: 'Failed to validate invite code' });
  }
});

// Get team by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const team = await TeamService.getTeamById(id);
    res.json(team);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// Update team
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const team = await TeamService.updateTeam(id, req.body);
    res.json(team);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// Get leagues for a team
router.get('/:id/leagues', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const leagues = await TeamService.getTeamLeagues(id);
    res.json(leagues);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get team leagues error:', error);
    res.status(500).json({ error: 'Failed to fetch team leagues' });
  }
});

// Get upcoming events for a team
router.get('/:id/events', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const events = await TeamService.getTeamEvents(id);
    res.json(events);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get team events error:', error);
    res.status(500).json({ error: 'Failed to fetch team events' });
  }
});

// Create team
router.post(
  '/',
  authMiddleware,
  requireNonDependent,
  validate(CreateTeamSchema),
  async (req, res) => {
    try {
      const team = await TeamService.createTeam(req.body, req.user!.userId);
      res.status(201).json(team);
    } catch (error: any) {
      if (error instanceof ServiceError) {
        return res
          .status(error.statusCode)
          .json({ error: error.message, ...error.extra });
      }
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
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    await TeamService.deleteTeam(id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof ServiceError) {
      if (error.extra?.error === 'UPCOMING_EVENTS_CONFLICT') {
        return res.status(error.statusCode).json({
          error: error.extra.error,
          message: error.message,
          events: error.extra.events,
        });
      }
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// Remove a member from a roster
router.delete('/:id/members/:userId', authMiddleware, async (req, res) => {
  try {
    const { id, userId } = req.params as { id: string; userId: string };
    await TeamService.removeMember(id, userId);
    res.status(204).send();
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove player from roster' });
  }
});

// Join team
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const member = await TeamService.joinTeam(
      id,
      req.user!.userId,
      req.body.inviteCode
    );
    res.status(201).json(member);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Join team error:', error);
    res.status(500).json({ error: 'Failed to join roster' });
  }
});

// Leave team
router.post('/:id/leave', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    await TeamService.leaveTeam(id, req.user!.userId);
    res.status(204).send();
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Leave team error:', error);
    res.status(500).json({ error: 'Failed to leave roster' });
  }
});

// Add member directly (for private rosters)
router.post('/:id/add-member', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const member = await TeamService.addMember(id, req.body.userId);
    res.status(201).json(member);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Failed to add player to roster' });
  }
});

// Generate invite link for a team (captain/co-captain only)
router.post('/:id/invite-link', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const result = await TeamService.generateInviteLink(
      id,
      req.user!.userId,
      req.body.maxUses
    );
    // If it was an existing link, return 200; new link returns 201
    // We can't easily distinguish here, so match original: existing returns 200, new returns 201
    // The service returns the same shape either way — use 201 for consistency with original POST
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Generate invite link error:', error);
    res.status(500).json({ error: 'Failed to generate invite link' });
  }
});

// ============================================================================
// COVER IMAGE ROUTES
// ============================================================================

// Upload team cover image
router.post(
  '/:id/cover',
  authMiddleware,
  uploadCover.single('image'),
  async (req, res) => {
    try {
      const { id } = req.params as { id: string };
      const file = req.file;
      const userId = req.user!.userId;

      if (!userId) {
        if (file?.path) {
          const fs = require('fs');
          fs.unlinkSync(file.path);
        }
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Validate file
      const validation = validateImageFile(file as Express.Multer.File);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      if (!file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // Check if team exists
      const team = await prisma.team.findUnique({
        where: { id },
        select: {
          id: true,
          imageUrl: true,
        },
      });

      if (!team) {
        if (file.path) {
          const fs = require('fs');
          fs.unlinkSync(file.path);
        }
        return res.status(404).json({ error: 'Roster not found' });
      }

      // Authorization: must be captain or manager of the team
      const membership = await prisma.teamMember.findFirst({
        where: {
          teamId: id,
          userId,
          status: 'active',
          role: { in: ['captain', 'co_captain', 'manager'] },
        },
      });

      if (!membership) {
        if (file.path) {
          const fs = require('fs');
          fs.unlinkSync(file.path);
        }
        return res.status(403).json({
          error: 'Only captains and managers can upload a cover image',
        });
      }

      // Process and optimize image
      const { optimizedPath } = await processMapImage(file.path, {
        maxWidth: 1600,
        maxHeight: 600,
        quality: 85,
      });

      // Generate URL
      const imageUrl = generateImageUrl(optimizedPath);

      // Delete old image if it exists
      if (team.imageUrl) {
        try {
          await deleteImageFiles(team.imageUrl);
        } catch (error) {
          console.error('Error deleting old team cover image:', error);
        }
      }

      // Update team with new cover URL
      const updatedTeam = await prisma.team.update({
        where: { id },
        data: { imageUrl },
        select: { id: true, imageUrl: true },
      });

      res.status(200).json({
        imageUrl: updatedTeam.imageUrl,
      });
    } catch (error: any) {
      console.error('Upload team cover image error:', error);

      // Clean up uploaded file on error
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

// Delete team cover image
router.delete('/:id/cover', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user!.userId;

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id },
      select: {
        id: true,
        imageUrl: true,
      },
    });

    if (!team) {
      return res.status(404).json({ error: 'Roster not found' });
    }

    // Authorization: must be captain or manager of the team
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId: id,
        userId,
        status: 'active',
        role: { in: ['captain', 'co_captain', 'manager'] },
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Only captains and managers can delete the cover image',
      });
    }

    if (!team.imageUrl) {
      return res.status(404).json({ error: 'No cover image to delete' });
    }

    // Delete image file
    await deleteImageFiles(team.imageUrl);

    // Update team to remove cover URL
    await prisma.team.update({
      where: { id },
      data: { imageUrl: null },
    });

    res.status(200).json({ message: 'Cover image deleted' });
  } catch (error: any) {
    console.error('Delete team cover image error:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete cover image',
    });
  }
});

export default router;
