/**
 * Age Check Job
 *
 * Runs nightly. Scans dependent accounts for users who have turned 18
 * and sends a one-time Transfer Notification to the guardian.
 *
 * For each dependent where:
 *   - isDependent = true
 *   - dateOfBirth yields age ≥ 18
 *   - transferNotificationSent = false
 *
 * The job sends a notification to the guardian and sets
 * transferNotificationSent = true to prevent duplicates.
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { isUnder18 } from '../utils/age-validation';
import { NotificationService } from '../services/NotificationService';

export interface AgeCheckMetrics {
  /** Total dependents checked (eligible candidates from DB query) */
  processed: number;
  /** Dependents for whom a notification was sent */
  notified: number;
}

/**
 * Find dependents who have turned 18 and haven't been notified yet,
 * send a Transfer Notification to each guardian, and mark them as notified.
 */
export async function processAgeCheck(
  db: PrismaClient = prisma,
): Promise<AgeCheckMetrics> {
  const metrics: AgeCheckMetrics = {
    processed: 0,
    notified: 0,
  };

  // Query dependents who are candidates for notification:
  // isDependent = true AND transferNotificationSent = false
  // We filter age in application code using the shared isUnder18 utility
  // to keep the age boundary logic in one place.
  const candidates = await db.user.findMany({
    where: {
      isDependent: true,
      transferNotificationSent: false,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      guardianId: true,
    },
  });

  metrics.processed = candidates.length;

  for (const dependent of candidates) {
    // Skip dependents still under 18
    if (isUnder18(dependent.dateOfBirth)) {
      continue;
    }

    // Skip dependents with no guardian (shouldn't happen, but be safe)
    if (!dependent.guardianId) {
      continue;
    }

    try {
      // Send transfer notification to the guardian
      await NotificationService.notifyDependentTurned18(
        dependent.guardianId,
        dependent.id,
        `${dependent.firstName} ${dependent.lastName}`,
      );

      // Mark as notified to prevent duplicate notifications
      await db.user.update({
        where: { id: dependent.id },
        data: { transferNotificationSent: true },
      });

      metrics.notified++;
    } catch (error) {
      console.error(
        `[age-check] Failed to process dependent ${dependent.id}:`,
        error,
      );
      // Continue processing remaining dependents
    }
  }

  return metrics;
}
