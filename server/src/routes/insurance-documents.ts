/**
 * Insurance Document Routes
 *
 * CRUD endpoints for user insurance document management:
 * - Upload (multipart), list, get, and delete insurance documents.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import {
  InsuranceDocumentService,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from '../services/InsuranceDocumentService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Configure multer for insurance document uploads (memory storage — service handles persistence)
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Unsupported file type. Only PDF, JPEG, and PNG files are accepted'
        )
      );
    }
  },
  limits: { fileSize: MAX_FILE_SIZE },
});

/**
 * Extract the authenticated user's ID from the request.
 */
function getUserId(req: Request): string | undefined {
  return req.user?.userId;
}

/**
 * POST /api/insurance-documents
 *
 * Upload a new insurance document (multipart form).
 * Fields: file (PDF/JPEG/PNG ≤10 MB), policyName (string), expiryDate (ISO date string)
 */
router.post(
  '/',
  authMiddleware,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const file = req.file;
      const { policyName, expiryDate } = req.body;

      const parsedExpiry = expiryDate ? new Date(expiryDate) : undefined;

      const document = await InsuranceDocumentService.create(
        userId,
        file as Express.Multer.File,
        policyName,
        parsedExpiry as Date
      );

      res.status(201).json(document);
    } catch (error: any) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res
            .status(413)
            .json({ error: 'File size must not exceed 10 MB' });
        }
        return res.status(400).json({ error: error.message });
      }
      // Multer file filter errors are plain Error instances with our message
      if (error.message?.includes('Unsupported file type')) {
        return res.status(400).json({ error: error.message });
      }
      console.error('Error uploading insurance document:', error);
      res.status(500).json({ error: 'Failed to upload insurance document' });
    }
  }
);

/**
 * GET /api/insurance-documents
 *
 * List insurance documents for a user.
 * Query params: userId (required), status (optional: "active" | "expired")
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const status = req.query.status as string | undefined;

    const documents = await InsuranceDocumentService.listByUser(userId, status);
    res.json(documents);
  } catch (error) {
    console.error('Error listing insurance documents:', error);
    res.status(500).json({ error: 'Failed to list insurance documents' });
  }
});

/**
 * GET /api/insurance-documents/:id
 *
 * Get a single insurance document by ID.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const document = await InsuranceDocumentService.getById(id);

    if (!document) {
      return res.status(404).json({ error: 'Insurance document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Error getting insurance document:', error);
    res.status(500).json({ error: 'Failed to get insurance document' });
  }
});

/**
 * DELETE /api/insurance-documents/:id
 *
 * Delete an insurance document. Only the owning user can delete.
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const id = req.params.id as string;
    await InsuranceDocumentService.delete(id, userId);

    res.json({ message: 'Insurance document deleted' });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof ForbiddenError) {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error deleting insurance document:', error);
    res.status(500).json({ error: 'Failed to delete insurance document' });
  }
});

export default router;
