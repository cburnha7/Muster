import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import sharp from 'sharp';

// Configure storage for facility maps
const mapStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const { id } = req.params; // facility ID
    const facilityId = Array.isArray(id) ? id[0] : id;
    const uploadPath = path.join(
      __dirname,
      '../../uploads/facility-maps',
      facilityId || 'temp'
    );

    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `map-${timestamp}${ext}`);
  },
});

// File filter for maps - JPEG, PNG, and PDF
const imageFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
  }
};

// Configure multer for map uploads
export const uploadMap = multer({
  storage: mapStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
});

// Configure storage for facility photos
const photoStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const { id } = req.params; // facility ID
    const facilityId = Array.isArray(id) ? id[0] : id;
    const uploadPath = path.join(
      __dirname,
      '../../uploads/facility-photos',
      facilityId || 'temp'
    );

    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `photo-${timestamp}${ext}`);
  },
});

// File filter for photos - JPEG and PNG only
const photoFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG and PNG images are allowed'));
  }
};

// Configure multer for photo uploads
export const uploadPhoto = multer({
  storage: photoStorage,
  fileFilter: photoFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Validate map/image file (JPEG, PNG, PDF; ≤ 20 MB)
export function validateImageFile(file: Express.Multer.File): {
  valid: boolean;
  error?: string;
} {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
  ];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return { valid: false, error: 'Only JPEG, PNG, and PDF files are allowed' };
  }

  if (file.size > 20 * 1024 * 1024) {
    return { valid: false, error: 'File size must not exceed 20MB' };
  }

  return { valid: true };
}

// Validate photo file (JPEG/PNG only; ≤ 10 MB)
// Returns an error string if invalid, null if valid
export function validatePhotoFile(file: Express.Multer.File): string | null {
  if (!file) {
    return 'No file provided';
  }

  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return 'Only JPEG and PNG images are allowed';
  }

  if (file.size > 10 * 1024 * 1024) {
    return 'File size must not exceed 10MB';
  }

  return null;
}

// Generate image URL
export function generateImageUrl(filePath: string): string {
  // In production, this would return a signed S3 URL or CDN URL
  // For development, return relative path
  const relativePath = filePath.replace(/\\/g, '/').split('/uploads/')[1];
  return `/uploads/${relativePath}`;
}

// Process and optimize image
export async function processMapImage(
  filePath: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<{ optimizedPath: string; thumbnailPath: string }> {
  const { maxWidth = 4000, maxHeight = 4000, quality = 85 } = options;

  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext);

  const optimizedPath = path.join(dir, `${basename}-optimized${ext}`);
  const thumbnailPath = path.join(dir, `${basename}-thumb${ext}`);

  try {
    // Get image metadata
    const metadata = await sharp(filePath).metadata();

    // Validate dimensions
    if (metadata.width && metadata.height) {
      if (metadata.width < 800 || metadata.height < 600) {
        throw new Error('Image dimensions must be at least 800x600px');
      }
    }

    // Create optimized version
    await sharp(filePath)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality })
      .toFile(optimizedPath);

    // Create thumbnail (300x225)
    await sharp(filePath)
      .resize(300, 225, {
        fit: 'cover',
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    // Delete original file
    fs.unlinkSync(filePath);

    return { optimizedPath, thumbnailPath };
  } catch (error) {
    // Clean up on error
    if (fs.existsSync(optimizedPath)) fs.unlinkSync(optimizedPath);
    if (fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath);
    throw error;
  }
}

// Delete image files
export async function deleteImageFiles(
  imageUrl: string,
  thumbnailUrl?: string
): Promise<void> {
  try {
    // Delete main image
    const imagePath = path.join(
      __dirname,
      '../../uploads',
      imageUrl.replace('/uploads/', '')
    );
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Delete thumbnail if provided
    if (thumbnailUrl) {
      const thumbPath = path.join(
        __dirname,
        '../../uploads',
        thumbnailUrl.replace('/uploads/', '')
      );
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }
  } catch (error) {
    console.error('Error deleting image files:', error);
    throw error;
  }
}
