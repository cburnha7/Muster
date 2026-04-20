/**
 * Push Token Routes
 *
 * POST /api/push-tokens    — Register a push token for the authenticated user
 * DELETE /api/push-tokens  — Remove a push token (on logout)
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { registerPushToken, removePushToken } from '../services/PushService';

const router = Router();

router.use(authMiddleware);

/**
 * POST /api/push-tokens
 * Body: { token: string, platform: "ios" | "android" | "web" }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { token, platform } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'token is required' });
    }

    const validPlatforms = ['ios', 'android', 'web'];
    if (!platform || !validPlatforms.includes(platform)) {
      return res
        .status(400)
        .json({ error: 'platform must be ios, android, or web' });
    }

    await registerPushToken(userId, token, platform);

    res.json({ success: true });
  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

/**
 * DELETE /api/push-tokens
 * Body: { token: string }
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'token is required' });
    }

    await removePushToken(userId, token);

    res.json({ success: true });
  } catch (error) {
    console.error('Remove push token error:', error);
    res.status(500).json({ error: 'Failed to remove push token' });
  }
});

export default router;
