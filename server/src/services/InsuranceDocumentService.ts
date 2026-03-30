/**
 * Insurance Document Service
 *
 * Manages user insurance document uploads, validation, retrieval, deletion,
 * and nightly expiry processing with 30-day warning notifications.
 */

import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { NotificationService } from './NotificationService';

// Allowed MIME types for insurance documents
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

// Maximum file size: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 30 days in milliseconds
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export class InsuranceDocumentService {
  /**
   * Create a new insurance document record.
   *
   * Validates file type (PDF/JPEG/PNG), size (≤10 MB), non-empty policy name,
   * and future expiry date. Stores the file on disk and creates a DB record
   * with status "active".
   */
  static async create(
    userId: string,
    file: Express.Multer.File,
    policyName: string,
    expiryDate: Date,
  ): Promise<any> {
    // Validate file exists
    if (!file) {
      throw new ValidationError('Document file is required');
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new ValidationError(
        'Unsupported file type. Only PDF, JPEG, and PNG files are accepted',
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError('File size must not exceed 10 MB');
    }

    // Validate policy name
    if (!policyName || policyName.trim().length === 0) {
      throw new ValidationError('Policy name is required');
    }

    // Validate expiry date is in the future
    if (!(expiryDate instanceof Date) || isNaN(expiryDate.getTime())) {
      throw new ValidationError('Expiry date must be a valid date');
    }
    if (expiryDate <= new Date()) {
      throw new ValidationError('Expiry date must be in the future');
    }

    // Store file on disk following existing DocumentService pattern
    const uploadDir = path.join(
      __dirname,
      '../../uploads/insurance-documents',
      userId,
    );
    fs.mkdirSync(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${sanitizedName}`;
    const filePath = path.join(uploadDir, filename);

    // Write file to disk (multer may have already stored it, but if using memoryStorage we write manually)
    if (file.buffer) {
      fs.writeFileSync(filePath, file.buffer);
    } else if (file.path) {
      // File already on disk via multer diskStorage — move to our directory
      fs.copyFileSync(file.path, filePath);
      fs.unlinkSync(file.path);
    }

    // Generate URL (relative path for dev, would be S3 URL in production)
    const relativePath = `insurance-documents/${userId}/${filename}`;
    const documentUrl = `/uploads/${relativePath}`;

    // Create DB record
    const document = await prisma.insuranceDocument.create({
      data: {
        userId,
        documentUrl,
        policyName: policyName.trim(),
        expiryDate,
        status: 'active',
      },
    });

    return document;
  }

  /**
   * List insurance documents for a user, ordered by createdAt desc.
   * Optionally filtered by status ("active" or "expired").
   */
  static async listByUser(
    userId: string,
    status?: string,
  ): Promise<any[]> {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    return prisma.insuranceDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single insurance document by ID.
   */
  static async getById(id: string): Promise<any | null> {
    return prisma.insuranceDocument.findUnique({
      where: { id },
    });
  }

  /**
   * Delete an insurance document. Checks ownership, removes the file
   * from storage, and deletes the DB record.
   */
  static async delete(id: string, userId: string): Promise<void> {
    const document = await prisma.insuranceDocument.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundError('Insurance document not found');
    }

    if (document.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this document');
    }

    // Remove file from storage
    try {
      const filePath = path.join(
        __dirname,
        '../../uploads',
        document.documentUrl.replace('/uploads/', ''),
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error deleting insurance document file:', error);
      // Continue with DB deletion even if file removal fails
    }

    await prisma.insuranceDocument.delete({
      where: { id },
    });
  }

  /**
   * Validate that a document exists and has status "active".
   * Used when attaching a document to a reservation.
   */
  static async validateForAttachment(documentId: string): Promise<boolean> {
    const document = await prisma.insuranceDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return false;
    }

    return document.status === 'active';
  }

  /**
   * Process expired insurance documents (called by nightly cron job).
   *
   * 1. Batch-update all active documents whose expiryDate has passed → status "expired"
   * 2. Find active documents within 30 days of expiry that haven't been notified
   * 3. Send warning notification for each, set expiryNotificationSent = true
   *
   * Returns counts of expired and notified documents.
   */
  static async processExpiry(): Promise<{ expired: number; notified: number }> {
    const now = new Date();

    // 1. Expire all active documents whose expiryDate has passed
    const expireResult = await prisma.insuranceDocument.updateMany({
      where: {
        status: 'active',
        expiryDate: { lt: now },
      },
      data: {
        status: 'expired',
      },
    });

    // 2. Find active documents within 30 days of expiry, not yet notified
    const thirtyDaysFromNow = new Date(now.getTime() + THIRTY_DAYS_MS);

    const documentsToNotify = await prisma.insuranceDocument.findMany({
      where: {
        status: 'active',
        expiryNotificationSent: false,
        expiryDate: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
      },
      include: {
        user: { select: { id: true, firstName: true } },
      },
    });

    // 3. Send notifications and mark as notified
    let notifiedCount = 0;
    for (const doc of documentsToNotify) {
      try {
        await NotificationService.notifyInsuranceDocumentExpiring(
          doc.userId,
          doc.policyName,
          doc.expiryDate,
        );

        await prisma.insuranceDocument.update({
          where: { id: doc.id },
          data: { expiryNotificationSent: true },
        });

        notifiedCount++;
      } catch (error) {
        // Process each document independently — partial progress is committed
        console.error(`Failed to send expiry notification for document ${doc.id}:`, error);
      }
    }

    return { expired: expireResult.count, notified: notifiedCount };
  }
}

// Custom error classes for structured error handling
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}
