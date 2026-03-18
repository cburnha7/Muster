/**
 * Trial Expiry Job
 *
 * Runs daily at 04:00 UTC. Handles three responsibilities:
 * 1. Expires trials that are past due — reverts the user's tier to their
 *    subscription plan (if active) or "standard", and clears trial state.
 * 2. Sends 7-day advance notifications for trials expiring in exactly 7 days.
 * 3. Sends 1-day advance notifications for trials expiring in exactly 1 day.
 *
 * Each user operation is wrapped in try/catch so a single failure does not
 * block processing of remaining users.
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '../index';
import { NotificationService } from '../services/NotificationService';

export interface TrialExpiryMetrics {
  executionDate: Date;
  usersChecked: number;
  trialsExpired: number;
  notificationsSent7d: number;
  notificationsSent1d: number;
  duration: number;
  errors: Array<{ userId: string; error: string }>;
}

export async function processTrialExpiry(
  db: PrismaClient = prisma,
): Promise<TrialExpiryMetrics> {
  const startTime = Date.now();
  const metrics: TrialExpiryMetrics = {
    executionDate: new Date(),
    usersChecked: 0,
    trialsExpired: 0,
    notificationsSent7d: 0,
    notificationsSent1d: 0,
    duration: 0,
    errors: [],
  };

  try {
    const now = new Date();

    // ---------------------------------------------------------------
    // 1. Expire trials that are past due
    // ---------------------------------------------------------------
    const expiredUsers = await db.user.findMany({
      where: {
        trialTier: { not: null },
        trialExpiry: { lt: now },
      },
      include: {
        subscription: {
          select: { id: true, plan: true, status: true },
        },
      },
    });

    metrics.usersChecked += expiredUsers.length;

    for (const user of expiredUsers) {
      try {
        const hasActiveSubscription =
          user.subscription && user.subscription.status === 'active';

        const newMembershipTier = hasActiveSubscription
          ? user.subscription!.plan
          : 'standard';

        await db.user.update({
          where: { id: user.id },
          data: {
            membershipTier: newMembershipTier,
            trialTier: null,
            trialExpiry: null,
            trialNotified7d: false,
            trialNotified1d: false,
          },
        });

        metrics.trialsExpired++;
        console.log(
          `[trial-expiry] Expired trial for user ${user.id}: ` +
            `reverted to "${newMembershipTier}" (had subscription: ${!!hasActiveSubscription})`,
        );
      } catch (err: any) {
        console.error(`[trial-expiry] Failed to expire trial for user ${user.id}:`, err);
        metrics.errors.push({ userId: user.id, error: err.message });
      }
    }

    // ---------------------------------------------------------------
    // 2. Send 7-day advance notifications
    // ---------------------------------------------------------------
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setUTCDate(sevenDaysFromNow.getUTCDate() + 7);

    const startOf7d = new Date(Date.UTC(
      sevenDaysFromNow.getUTCFullYear(),
      sevenDaysFromNow.getUTCMonth(),
      sevenDaysFromNow.getUTCDate(),
      0, 0, 0, 0,
    ));
    const endOf7d = new Date(Date.UTC(
      sevenDaysFromNow.getUTCFullYear(),
      sevenDaysFromNow.getUTCMonth(),
      sevenDaysFromNow.getUTCDate(),
      23, 59, 59, 999,
    ));

    const users7d = await db.user.findMany({
      where: {
        trialTier: { not: null },
        trialExpiry: { gte: startOf7d, lte: endOf7d },
        trialNotified7d: false,
      },
    });

    metrics.usersChecked += users7d.length;

    for (const user of users7d) {
      try {
        await NotificationService.notifyTrialExpiring7d(
          user.id,
          user.trialTier!,
          user.trialExpiry!,
        );

        await db.user.update({
          where: { id: user.id },
          data: { trialNotified7d: true },
        });

        metrics.notificationsSent7d++;
        console.log(
          `[trial-expiry] Sent 7-day notification for user ${user.id} ` +
            `(tier: ${user.trialTier}, expires: ${user.trialExpiry!.toISOString()})`,
        );
      } catch (err: any) {
        console.error(`[trial-expiry] Failed to send 7d notification for user ${user.id}:`, err);
        metrics.errors.push({ userId: user.id, error: err.message });
      }
    }

    // ---------------------------------------------------------------
    // 3. Send 1-day advance notifications
    // ---------------------------------------------------------------
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setUTCDate(oneDayFromNow.getUTCDate() + 1);

    const startOf1d = new Date(Date.UTC(
      oneDayFromNow.getUTCFullYear(),
      oneDayFromNow.getUTCMonth(),
      oneDayFromNow.getUTCDate(),
      0, 0, 0, 0,
    ));
    const endOf1d = new Date(Date.UTC(
      oneDayFromNow.getUTCFullYear(),
      oneDayFromNow.getUTCMonth(),
      oneDayFromNow.getUTCDate(),
      23, 59, 59, 999,
    ));

    const users1d = await db.user.findMany({
      where: {
        trialTier: { not: null },
        trialExpiry: { gte: startOf1d, lte: endOf1d },
        trialNotified1d: false,
      },
    });

    metrics.usersChecked += users1d.length;

    for (const user of users1d) {
      try {
        await NotificationService.notifyTrialExpiring1d(
          user.id,
          user.trialTier!,
          user.trialExpiry!,
        );

        await db.user.update({
          where: { id: user.id },
          data: { trialNotified1d: true },
        });

        metrics.notificationsSent1d++;
        console.log(
          `[trial-expiry] Sent 1-day notification for user ${user.id} ` +
            `(tier: ${user.trialTier}, expires: ${user.trialExpiry!.toISOString()})`,
        );
      } catch (err: any) {
        console.error(`[trial-expiry] Failed to send 1d notification for user ${user.id}:`, err);
        metrics.errors.push({ userId: user.id, error: err.message });
      }
    }
  } catch (err: any) {
    console.error('[trial-expiry] Job failed:', err);
    throw err;
  } finally {
    metrics.duration = Date.now() - startTime;
  }

  console.log('[trial-expiry] Job completed', {
    usersChecked: metrics.usersChecked,
    trialsExpired: metrics.trialsExpired,
    notificationsSent7d: metrics.notificationsSent7d,
    notificationsSent1d: metrics.notificationsSent1d,
    errors: metrics.errors.length,
    duration: `${metrics.duration}ms`,
  });

  return metrics;
}
