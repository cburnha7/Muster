import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  ImageUploadService,
  ImageContext,
} from '../services/ImageUploadService';
import { validate, PresignUploadSchema } from '../validation/schemas';

const router = Router();

// POST /api/uploads/presign — validated by Zod schema
router.post(
  '/presign',
  authMiddleware,
  validate(PresignUploadSchema),
  async (req, res) => {
    try {
      const { context, fileName, contentType } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
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
  }
);

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
