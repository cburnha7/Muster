import { Router } from 'express';
const router = Router();

// GET /api/availability/:userId — get availability blocks
router.get('/:userId', async (req, res) => {
  res.json({ blocks: [] });
});

// POST /api/availability/:userId — add availability block
router.post('/:userId', async (req, res) => {
  res.status(201).json({ id: 'stub', ...req.body });
});

export default router;
