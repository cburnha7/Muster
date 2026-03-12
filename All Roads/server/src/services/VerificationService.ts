import { prisma } from '../index';

export interface VerificationDocument {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
}

export class VerificationService {
  /**
   * Submit a verification request with documents
   */
  async submitVerification(
    facilityId: string,
    documents: VerificationDocument[]
  ) {
    // Check if verification already exists
    const existing = await prisma.facilityVerification.findUnique({
      where: { facilityId },
    });

    if (existing && existing.status === 'approved') {
      throw new Error('Facility is already verified');
    }

    // Create or update verification
    const verification = await prisma.facilityVerification.upsert({
      where: { facilityId },
      create: {
        facilityId,
        status: 'pending',
        submittedAt: new Date(),
      },
      update: {
        status: 'pending',
        submittedAt: new Date(),
        rejectionReason: null,
        reviewerNotes: null,
      },
    });

    // Delete old documents if re-submitting
    if (existing) {
      await prisma.verificationDocument.deleteMany({
        where: { verificationId: verification.id },
      });
    }

    // Create document records
    await prisma.verificationDocument.createMany({
      data: documents.map(doc => ({
        verificationId: verification.id,
        ...doc,
        uploadedAt: new Date(),
      })),
    });

    // Update facility status
    await prisma.facility.update({
      where: { id: facilityId },
      data: {
        verificationStatus: 'pending',
        isVerified: false,
      },
    });

    return await this.getVerification(facilityId);
  }

  /**
   * Get verification status for a facility
   */
  async getVerification(facilityId: string) {
    return await prisma.facilityVerification.findUnique({
      where: { facilityId },
      include: {
        documents: true,
      },
    });
  }

  /**
   * Review a verification request (admin only)
   */
  async reviewVerification(
    verificationId: string,
    status: 'approved' | 'rejected',
    reviewerId: string,
    notes?: string,
    rejectionReason?: string
  ) {
    const verification = await prisma.facilityVerification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new Error('Verification not found');
    }

    const now = new Date();
    const expiresAt = status === 'approved' 
      ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // 12 months
      : null;

    // Update verification
    await prisma.facilityVerification.update({
      where: { id: verificationId },
      data: {
        status,
        reviewedAt: now,
        reviewedBy: reviewerId,
        reviewerNotes: notes,
        rejectionReason: status === 'rejected' ? rejectionReason : null,
        expiresAt,
      },
    });

    // Update facility
    await prisma.facility.update({
      where: { id: verification.facilityId },
      data: {
        verificationStatus: status,
        isVerified: status === 'approved',
      },
    });

    return await this.getVerification(verification.facilityId);
  }

  /**
   * Check for expired verifications (cron job)
   */
  async checkExpiration() {
    const now = new Date();

    const expired = await prisma.facilityVerification.findMany({
      where: {
        status: 'approved',
        expiresAt: { lte: now },
      },
    });

    for (const verification of expired) {
      await prisma.facilityVerification.update({
        where: { id: verification.id },
        data: { status: 'expired' },
      });

      await prisma.facility.update({
        where: { id: verification.facilityId },
        data: {
          verificationStatus: 'expired',
          isVerified: false,
        },
      });
    }

    return expired.length;
  }

  /**
   * Send expiration reminders (cron job)
   */
  async sendExpirationReminders() {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find verifications expiring in 30 days
    const expiringSoon = await prisma.facilityVerification.findMany({
      where: {
        status: 'approved',
        expiresAt: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
      },
      include: {
        facility: {
          include: {
            owner: true,
          },
        },
      },
    });

    // Find verifications expiring in 7 days
    const expiringVerySoon = await prisma.facilityVerification.findMany({
      where: {
        status: 'approved',
        expiresAt: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        facility: {
          include: {
            owner: true,
          },
        },
      },
    });

    // TODO: Send email notifications
    // For now, just return counts
    return {
      thirtyDayReminders: expiringSoon.length,
      sevenDayReminders: expiringVerySoon.length,
    };
  }

  /**
   * Get all pending verifications (admin)
   */
  async getPendingVerifications() {
    return await prisma.facilityVerification.findMany({
      where: { status: 'pending' },
      include: {
        facility: {
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        documents: true,
      },
      orderBy: {
        submittedAt: 'asc',
      },
    });
  }
}

export const verificationService = new VerificationService();
