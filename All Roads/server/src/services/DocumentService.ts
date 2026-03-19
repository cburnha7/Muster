import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Configure storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const { leagueId, documentType } = req.body;
    const uploadPath = path.join(
      __dirname,
      '../../uploads/league-documents',
      leagueId || 'temp',
      documentType || 'other'
    );

    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${sanitizedName}`);
  }
});

// File filter - only PDFs
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'));
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Generate secure file URL
export function generateFileUrl(filePath: string): string {
  // In production, this would return a signed S3 URL
  // For development, return relative path
  const relativePath = filePath.replace(/\\/g, '/').split('/uploads/')[1];
  return `/uploads/${relativePath}`;
}

// Delete file
export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    // Extract file path from URL
    const filePath = path.join(__dirname, '../../uploads', fileUrl.replace('/uploads/', ''));
    
    // Check if file exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

// Validate file
export function validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.mimetype !== 'application/pdf') {
    return { valid: false, error: 'File must be a PDF' };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File size must not exceed 10MB' };
  }

  return { valid: true };
}
