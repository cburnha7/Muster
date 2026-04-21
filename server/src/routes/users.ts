import { Router } from 'express';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import * as UserService from '../services/UserService';

const router = Router();

/**
 * Resolve the effective user ID for the request.
 * If the guardian is acting on behalf of a dependent, X-Active-User-Id takes precedence.
 * Falls back to the authenticated user from JWT.
 */
function resolveUserId(req: any): string | undefined {
  const activeId = req.headers['x-active-user-id'] as string | undefined;
  if (activeId) return activeId;
  return req.user?.userId;
}

// ─── Dashboard — single request for home screen ─────────────────────────────
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const activeId = (req.headers['x-active-user-id'] as string) || userId;
    const result = await UserService.getDashboard(userId, activeId);
    res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Search users by name or email
router.get('/search', optionalAuthMiddleware, async (req, res) => {
  try {
    const query = req.query.query as string;
    const result = await UserService.searchUsers(query);
    res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get current user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const result = await UserService.getProfile(userId);
    res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Upload profile image
router.post('/profile/image', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { imageUrl, imageData } = req.body;
    const result = await UserService.uploadProfileImage(
      userId,
      imageData ?? null,
      imageUrl ?? null
    );
    res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Upload profile image error:', error);
    res.status(500).json({ error: 'Failed to upload profile image' });
  }
});

// Delete profile image
router.delete('/profile/image', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const result = await UserService.deleteProfileImage(userId);
    res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Delete profile image error:', error);
    res.status(500).json({ error: 'Failed to delete profile image' });
  }
});

// Get current user stats
router.get('/profile/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const result = await UserService.getProfileStats(userId);
    res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Get profile stats error:', error);
    res.status(500).json({ error: 'Failed to fetch profile stats' });
  }
});

// Get sport ratings for a user (own profile or another user's)
router.get('/sport-ratings/:userId', async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };
    const result = await UserService.getSportRatings(userId);
    res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Get sport ratings error:', error);
    res.status(500).json({ error: 'Failed to fetch sport ratings' });
  }
});

// Get current user bookings
router.get('/bookings', authMiddleware, async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const filters: UserService.GetBookingsFilters = {
      page: req.query.page as string,
      limit: req.query.limit as string,
      status: req.query.status as string,
      includeFamily: req.query.includeFamily as string,
    };
    const result = await UserService.getUserBookings(userId, filters);
    res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Get user bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get current user's pending invitations (roster + league)
router.get('/invitations', authMiddleware, async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const result = await UserService.getUserInvitations(userId);
    res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Get user invitations error:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Get leagues ready to schedule for the current user (Commissioner only)
router.get('/leagues-ready-to-schedule', authMiddleware, async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const result = await UserService.getLeaguesReadyToSchedule(userId);
    res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Get leagues ready to schedule error:', error);
    res
      .status(500)
      .json({ error: 'Failed to fetch leagues ready to schedule' });
  }
});

// Get current user's events (organized + confirmed participant)
router.get('/events', authMiddleware, async (req, res) => {
  try {
    let userId = req.user?.userId;
    if (!userId) {
      userId = req.query.userId as string;
    }
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const filters: UserService.GetEventsFilters = {
      page: req.query.page as string,
      limit: req.query.limit as string,
      status: req.query.status as string,
    };
    const result = await UserService.getUserEvents(userId, filters);
    res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Get user events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get current user's teams (teams the user is an active member of)
router.get('/teams', authMiddleware, async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const result = await UserService.getUserTeams(userId);
    res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Get user teams error:', error);
    res.status(500).json({ error: 'Failed to fetch user teams' });
  }
});

// Get current user's leagues (leagues they organize or are a member of)
router.get('/leagues', authMiddleware, async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const result = await UserService.getUserLeagues(userId);
    res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Get user leagues error:', error);
    res.status(500).json({ error: 'Failed to fetch user leagues' });
  }
});

// Complete onboarding
router.put('/onboarding', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const result = await UserService.completeOnboarding(userId, req.body);
    res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Onboarding error:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

// Update user intents
router.put('/intents', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const result = await UserService.updateIntents(userId, req.body.intents);
    res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Update intents error:', error);
    res.status(500).json({ error: 'Failed to update intents' });
  }
});

// ---------------------------------------------------------------------------
// GET /onboarding — Check user onboarding status
// ---------------------------------------------------------------------------
router.get('/onboarding', authMiddleware, async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.json({ completed: true });
    }
    const result = await UserService.getOnboardingStatus(userId);
    return res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Error checking onboarding status:', error);
    return res.status(500).json({ error: 'Failed to check onboarding status' });
  }
});

// ── Open Ground saved locations ──────────────────────────────────────────────
// Must be defined BEFORE /:id to avoid Express matching "open-ground-locations" as an ID param

// GET /users/open-ground-locations — fetch saved locations for the current user
router.get('/open-ground-locations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId)
      return res.status(401).json({ error: 'Authentication required' });
    const result = await UserService.getOpenGroundLocations(userId);
    res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Get open ground locations error:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// POST /users/open-ground-locations — upsert a location (create or bump lastUsedAt)
router.post('/open-ground-locations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { name, address } = req.body as { name: string; address?: string };
    const result = await UserService.saveOpenGroundLocation(
      userId,
      name,
      address
    );
    res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Save open ground location error:', error);
    res.status(500).json({ error: 'Failed to save location' });
  }
});

// Get user profile by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const result = await UserService.getUserById(id);
    res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update current user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const result = await UserService.updateUserProfile(userId, req.body);
    res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update user by ID
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const result = await UserService.updateUserById(id, req.body);
    res.json(result);
  } catch (error: any) {
    if (error.statusCode)
      return res.status(error.statusCode).json({ error: error.message });
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;
