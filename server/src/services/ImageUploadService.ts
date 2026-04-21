import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2, R2_BUCKET, R2_PUBLIC_URL, R2_CONFIGURED } from '../lib/r2';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export type ImageContext =
  | 'profiles'
  | 'grounds'
  | 'rosters'
  | 'events'
  | 'dependents'
  | 'leagues';

export class ImageUploadService {
  /**
   * Generate a presigned URL for direct client-to-R2 upload.
   * The image never passes through the backend server.
   */
  static async getPresignedUploadUrl(
    context: ImageContext,
    fileName: string,
    contentType: string,
    userId: string
  ): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
    if (!r2 || !R2_CONFIGURED) {
      throw new Error('R2 storage is not configured');
    }

    const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
    const key = `${context}/${userId}/${uuid()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    return { uploadUrl, publicUrl, key };
  }

  /**
   * Delete an image from R2 by its key or full public URL.
   * Best-effort — logs but doesn't throw.
   */
  static async deleteImage(keyOrUrl: string): Promise<void> {
    if (!r2 || !R2_CONFIGURED) return;

    try {
      const key = keyOrUrl.startsWith('http')
        ? keyOrUrl.replace(`${R2_PUBLIC_URL}/`, '')
        : keyOrUrl;

      await r2.send(
        new DeleteObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
        })
      );
    } catch (err) {
      console.error('R2 delete failed:', err);
    }
  }
}

// ── Legacy multer helpers (kept for backward compat during migration) ────────

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const coverStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `cover-${uuid()}${ext}`);
  },
});

export const uploadCover = multer({
  storage: coverStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const mapStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `map-${uuid()}${ext}`);
  },
});

export const uploadMap = multer({
  storage: mapStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `photo-${uuid()}${ext}`);
  },
});

export const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    cb(null, allowed.includes(file.mimetype));
  },
});

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `doc-${uuid()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export function validateImageFile(file: Express.Multer.File): {
  valid: boolean;
  error?: string;
} {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  if (!allowed.includes(file.mimetype)) {
    return { valid: false, error: 'Invalid file type' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File too large (max 10MB)' };
  }
  return { valid: true };
}

export function generateImageUrl(reqOrPath: any, filename?: string): string {
  if (filename) return `/uploads/${filename}`;
  // If called with just a path
  if (typeof reqOrPath === 'string')
    return reqOrPath.startsWith('/uploads/')
      ? reqOrPath
      : `/uploads/${path.basename(reqOrPath)}`;
  return '/uploads/unknown';
}

export function validatePhotoFile(file: Express.Multer.File): string | null {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  if (!allowed.includes(file.mimetype)) {
    return 'Invalid file type. Must be JPEG, PNG, WebP, or HEIC.';
  }
  if (file.size > 10 * 1024 * 1024) {
    return 'File too large (max 10MB)';
  }
  return null;
}

export function generateFileUrl(req: any, filename: string): string {
  return `/uploads/${filename}`;
}

export function deleteFile(filePath: string): void {
  try {
    const fullPath = filePath.startsWith('/uploads/')
      ? path.join(UPLOAD_DIR, filePath.replace('/uploads/', ''))
      : filePath;
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch {
    // best-effort
  }
}

export function deleteImageFiles(
  ...args: (string | string[] | undefined | null)[]
): void {
  const urls: string[] = [];
  for (const arg of args) {
    if (Array.isArray(arg)) urls.push(...arg);
    else if (typeof arg === 'string') urls.push(arg);
  }
  urls.forEach(deleteFile);
}

export function processMapImage(
  filePath: string,
  _options?: { maxWidth?: number; maxHeight?: number; quality?: number }
): { optimizedPath: string; thumbnailPath: string } {
  return {
    optimizedPath: `/uploads/${path.basename(filePath)}`,
    thumbnailPath: `/uploads/${path.basename(filePath)}`,
  };
}
