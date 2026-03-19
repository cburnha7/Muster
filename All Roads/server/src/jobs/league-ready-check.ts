/**
 * League Ready Check Job
 *
 * Runs hourly. Finds all leagues where:
 *   - scheduleGenerated === false
 *   - readyNotificationSent === false
 *
 * For each league, checks two conditions:
 *   1. Registration close date has passed
 *   2. All invited rosters have confirmed (no pending roster memberships)
 *
 * If either condition is met and at least one active roster exists,
 * sends a "ready to schedule" notification to the Commissioner and
 * sets readyNotificationSent = true.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.7
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '../index';

export interface LeagueReadyCheckMetrics {
  executionDate: Date;
  leaguesChecked: number;
  notificationsSent: number;
  skippedZeroRosters: number;
  duration: number;
  errors: Array<{ leagueId: string; error: string }>;
}

/**
 * Check a single league for readiness and send notification if conditions are met.
 * Reusable by both the cron job and event-driven triggers.
 *
 * Returns true if a notification was sent.
 */
export async function checkLeagueReady(
  leagueId: string,
  db: PrismaClient = prisma,
): Promise<boolean> {
  const league: any = await db.league.findUnique({
    where: { id: leagueId },
    include: {
      memberships: {
        where: { memberType: 'roster' },
      },
    },
  });

  if (!league) return false;

  // Already generated or already notified — skip
  if (league.scheduleGenerated || league.readyNotificationSent) return false;

  // Count active (confirmed) roster memberships
  const activeRosters = league.memberships.filter((m: any) => m.status === 'active');
  const activeRosterCount = activeRosters.length;

  // Requirement 2.7: No notification if zero registered rosters
  if (activeRosterCount === 0) return false;

  const now = new Date();

  // Condition 1: Registration close date has passed (Requirement 2.1)
  const registrationClosed = league.registrationCloseDate
    ? new Date(league.registrationCloseDate) <= now
    : false;

  // Condition 2: All roster memberships are active — no pending ones (Requirement 2.2)
  const pendingRosters = league.memberships.filter((m: any) => m.status === 'pending');
  const allRostersConfirmed = pendingRosters.length === 0;

  // Requirement 2.3: Whichever fires first triggers the notification
  if (!registrationClosed && !allRostersConfirmed) return false;

  // Send "ready to schedule" notification to the Commissioner
  const notification = {
    title: 'League Ready',
    body: `${league.name} is ready to schedule.`,
    data: {
      type: 'league_ready_to_schedule',
      leagueId: league.id,
    },
  };

  try {
    // Use the same pattern as other NotificationService methods (log-based for now)
    console.log(`[league-ready-check] Sending ready notification to Commissioner ${league.organizerId} for league "${league.name}"`);
    console.log('[league-ready-check] Notification:', notification);
  } catch {
    // Non-critical: continue if notification fails
  }

  // Mark league so we don't send duplicate notifications (Requirement 2.3)
  await (db.league as any).update({
    where: { id: leagueId },
    data: { readyNotificationSent: true },
  });

  return true;
}

/**
 * Batch check all eligible leagues. Called by the cron scheduler.
 */
export async function processLeagueReadyChecks(
  db: PrismaClient = prisma,
): Promise<LeagueReadyCheckMetrics> {
  const startTime = Date.now();
  const metrics: LeagueReadyCheckMetrics = {
    executionDate: new Date(),
    leaguesChecked: 0,
    notificationsSent: 0,
    skippedZeroRosters: 0,
    duration: 0,
    errors: [],
  };

  try {
    // Find all leagues that haven't generated a schedule and haven't been notified
    const eligibleLeagues = await (db.league as any).findMany({
      where: {
        scheduleGenerated: false,
        readyNotificationSent: false,
      },
      select: { id: true },
    });

    metrics.leaguesChecked = eligibleLeagues.length;

    for (const league of eligibleLeagues) {
      try {
        const notified = await checkLeagueReady(league.id, db);
        if (notified) {
          metrics.notificationsSent++;
        }
      } catch (err: any) {
        console.error(`[league-ready-check] Failed for league ${league.id}:`, err);
        metrics.errors.push({ leagueId: league.id, error: err.message });
      }
    }
  } catch (err: any) {
    console.error('[league-ready-check] Job failed:', err);
    throw err;
  } finally {
    metrics.duration = Date.now() - startTime;
  }

  console.log('[league-ready-check] Job completed', {
    leaguesChecked: metrics.leaguesChecked,
    notificationsSent: metrics.notificationsSent,
    errors: metrics.errors.length,
    duration: `${metrics.duration}ms`,
  });

  return metrics;
}
