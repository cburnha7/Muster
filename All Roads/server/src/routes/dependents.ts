/**
 * Dependent Account Routes
 *
 * CRUD endpoints for guardian-managed dependent accounts, plus account
 * transfer when a dependent turns 18.
 *
 * Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 8.1
 */

import { Router, Request, Response } from 'express';
import {
  createDependent,
  listDependents,
  getDependentProfile,
  updateDependent,
} from '../services/dependent';
import { transferAccount } from '../services/transfer';

const router = Router();

/**
 * Extract the authenticated user's ID from the request.
 * Checks JWT-decoded user first, then falls back to X-User-Id header.
 */
function getUserId(req: Request): string | undefined {
  return req.user?.userId || (req.headers['x-user-id'] as string | undefined);
}

/**
 * POST /api/dependents
 *
 * Create a new dependent for the authenticated guardian.
 *
 * Body: { firstName, lastName, dateOfBirth, sportPreferences?, profileImage? }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const guardianId = getUserId(req);
    if (!guardianId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { firstName, lastName, dateOfBirth } = req.body;

    if (!firstName || !lastName || !dateOfBirth) {
      return res.status(400).json({
        error: 'Missing required fields: firstName, lastName, dateOfBirth',
      });
    }

    const dependent = await createDependent(guardianId, req.body);
    res.status(201).json(dependent);
  } catch (error: any) {
    if (error.message === 'Dependent must be under 18') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error creating dependent:', error);
    res.status(500).json({ error: 'Failed to create dependent' });
  }
});

/**
 * GET /api/dependents
 *
 * List all dependents for the authenticated guardian.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const guardianId = getUserId(req);
    if (!guardianId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const dependents = await listDependents(guardianId);
    res.json(dependents);
  } catch (error) {
    console.error('Error listing dependents:', error);
    res.status(500).json({ error: 'Failed to list dependents' });
  }
});

/**
 * GET /api/dependents/:id
 *
 * Get a single dependent's full profile.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const guardianId = getUserId(req);
    if (!guardianId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const profile = await getDependentProfile(guardianId, req.params.id);
    res.json(profile);
  } catch (error: any) {
    if (error.message === 'Dependent not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Not authorized') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error fetching dependent profile:', error);
    res.status(500).json({ error: 'Failed to fetch dependent profile' });
  }
});

/**
 * PUT /api/dependents/:id
 *
 * Update a dependent's profile fields.
 *
 * Body: { firstName?, lastName?, dateOfBirth?, sportPreferences?, profileImage? }
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const guardianId = getUserId(req);
    if (!guardianId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const updated = await updateDependent(guardianId, req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    if (error.message === 'Dependent not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Not authorized') {
      return res.status(403).json({ error: error.message });
    }
    if (error.message === 'Dependent must be under 18') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error updating dependent:', error);
    res.status(500).json({ error: 'Failed to update dependent' });
  }
});

/**
 * POST /api/dependents/:id/transfer
 *
 * Transfer a dependent account to an independent account.
 *
 * Body: { email, password }
 */
router.post('/:id/transfer', async (req: Request, res: Response) => {
  try {
    const guardianId = getUserId(req);
    if (!guardianId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields: email, password',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters',
      });
    }

    const transferred = await transferAccount(guardianId, req.params.id, {
      email,
      password,
    });
    res.json(transferred);
  } catch (error: any) {
    if (error.message === 'Dependent not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Not authorized') {
      return res.status(403).json({ error: error.message });
    }
    if (error.message === 'Dependent must be 18 or older to transfer') {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'Email address is already in use') {
      return res.status(409).json({ error: error.message });
    }
    console.error('Error transferring dependent account:', error);
    res.status(500).json({ error: 'Failed to transfer dependent account' });
  }
});

export default router;
