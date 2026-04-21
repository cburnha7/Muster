import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  ImageUploadService,
  ImageContext,
} from '../services/ImageUploadService';

const router = Router();

const VALID_CONTEXTS: ImageContext[] = [
  'profiles',
  'grounds',
  'rosters',
  'events',
  'dependents',
  'leagues',
];

const VALID_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
];

// POST /api/uploads/presign
router.post('/presign', authMiddleware, async (req, res) => {
  try {
    const { context, fileName, contentType } = req.body as {
      context: string;
      fileName: string;
      contentType: string;
    };
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!VALID_CONTEXTS.includes(context as ImageContext)) {
      return res.status(400).json({
        error: `Invalid context. Must be one of: ${VALID_CONTEXTS.join(', ')}`,
      });
    }

    if (!VALID_TYPES.includes(contentType)) {
      return res.status(400).json({
        error: 'Invalid file type. Must be JPEG, PNG, WebP, or HEIC.',
      });
    }

    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({ error: 'fileName is required' });
    }

    const result = await ImageUploadService.getPresignedUploadUrl(
      context as ImageContext,
      fileName,
      contentType,
      userId
    );

    res.json(result);
  } catch (error: any) {
    console.error('Presign error:', error);
    res
      .status(500)
      .json({ error: error.message || 'Failed to generate upload URL' });
  }
});

// DELETE /api/uploads/delete
router.delete('/delete', authMiddleware, async (req, res) => {
  try {
    const { url } = req.body as { url: string };
    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }
    await ImageUploadService.deleteImage(url);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

export default router;
