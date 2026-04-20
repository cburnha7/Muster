import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

interface GameRow {
  gameNumber: string | null;
  date: string;
  time: string | null;
  homeTeam: string;
  awayTeam: string;
  location: string | null;
  division: string | null;
}

// POST /api/schedule/parse-pdf
router.post(
  '/parse-pdf',
  authMiddleware,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file)
        return res
          .status(400)
          .json({ success: false, gameRows: [], errors: ['No file uploaded'] });
      if (req.file.mimetype !== 'application/pdf') {
        return res
          .status(400)
          .json({
            success: false,
            gameRows: [],
            errors: ['File must be a PDF'],
          });
      }

      const pdfParse = require('pdf-parse');
      const data = await pdfParse(req.file.buffer);
      const text: string = data.text || '';
      const lines = text
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean);

      const gameRows: GameRow[] = [];
      // Pattern: game# date time homeTeam vs awayTeam location division
      const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4})/;
      const timePattern = /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/;

      for (const line of lines) {
        const dateMatch = line.match(datePattern);
        if (!dateMatch) continue;

        const [m, d, y] = dateMatch[1].split('/');
        const date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

        const timeMatch = line.match(timePattern);
        let time: string | null = null;
        if (timeMatch) {
          const raw = timeMatch[1].trim();
          const m12 = raw.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
          if (m12) {
            let h = parseInt(m12[1], 10);
            if (m12[3].toLowerCase() === 'pm' && h !== 12) h += 12;
            if (m12[3].toLowerCase() === 'am' && h === 12) h = 0;
            time = `${String(h).padStart(2, '0')}:${m12[2]}`;
          } else {
            const m24 = raw.match(/^(\d{1,2}):(\d{2})$/);
            if (m24) time = `${m24[1].padStart(2, '0')}:${m24[2]}`;
          }
        }

        // Try to extract teams from "vs" or "at" separator
        const vsMatch = line.match(/(.+?)\s+(?:vs\.?|at|@)\s+(.+)/i);
        if (!vsMatch) continue;

        // Extract game number (leading digits)
        const gameNumMatch = line.match(/^(\d+)\s/);
        const gameNumber = gameNumMatch ? gameNumMatch[1] : null;

        // Clean team names by removing date/time/game number
        let leftPart = vsMatch[1]
          .replace(datePattern, '')
          .replace(timePattern, '')
          .trim();
        let rightPart = vsMatch[2].trim();
        if (gameNumber)
          leftPart = leftPart
            .replace(new RegExp(`^${gameNumber}\\s*`), '')
            .trim();

        // Try to extract location and division from the end of rightPart
        let location: string | null = null;
        let division: string | null = null;

        // Simple heuristic: if there are extra words after the team name, treat last segment as location
        const parts = rightPart.split(/\s{2,}/);
        const awayTeam = parts[0]?.trim() || rightPart;
        if (parts.length > 1) location = parts[1]?.trim() || null;
        if (parts.length > 2) division = parts[2]?.trim() || null;

        if (leftPart && awayTeam) {
          gameRows.push({
            gameNumber,
            date,
            time,
            homeTeam: leftPart,
            awayTeam,
            location,
            division,
          });
        }
      }

      if (gameRows.length === 0) {
        return res.json({
          success: false,
          gameRows: [],
          errors: ['Could not extract any games from this PDF.'],
        });
      }

      res.json({ success: true, gameRows, errors: [] });
    } catch (error: any) {
      console.error('PDF parse error:', error);
      res.status(500).json({
        success: false,
        gameRows: [],
        errors: [error.message || 'Failed to parse PDF'],
      });
    }
  }
);

export default router;
