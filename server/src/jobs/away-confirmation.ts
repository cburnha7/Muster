/**
 * Away Confirmation Expiry Job
 *
 * Runs every hour. Finds matches past their confirmationDeadline that are
 * still in 'pending_away_confirm' status, lapses them, records a RosterStrike
 * against the away roster, and notifies the commissioner and home manager.
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { NotificationService } from '../services/NotificationService';

export interface AwayConfirmationMetrics {
  executionDate: Date;
  matchesChecked: number;
  matchesLapsed: number;
  strikesRecorded: number;
  notificationsSent: number;
  duration: number;
  errors: Array<{ matchId: string; error: string }>;
}

export async function processExpiredConfirmations(
  db: PrismaClient = prisma
): Promise<AwayConfirmationMetrics> {
  const startTime = Date.now();
  const metrics: AwayConfirmationMetrics = {
    executionDate: new Date(),
    matchesChecked: 0,
    matchesLapsed: 0,
    strikesRecorded: 0,
    notificationsSent: 0,
    duration: 0,
    errors: [],
  };

  try {
    const now = new Date();

    // Find all matches that are pending away confirmation and past their deadline
    const expiredMatches = await db.match.findMany({
      where: {
        status: 'pending_away_confirm',
        confirmationDeadline: { lt: now },
      },
      include: {
        league: {
          select: { id: true, name: true, organizerId: true },
        },
        homeTeam: {
          select: {
            id: true,
            name: true,
            members: {
              where: { role: 'captain', status: 'active' },
              select: { userId: true },
            },
          },
        },
        awayTeam: {
          select: { id: true, name: true },
        },
        season: {
          select: { id: true },
        },
      },
    });

    metrics.matchesChecked = expiredMatches.length;

    for (const match of expiredMatches) {
      try {
        const seasonId = match.seasonId ?? match.season?.id;
        if (!seasonId) {
          metrics.errors.push({
            matchId: match.id,
            error: 'Match has no associated season — cannot record strike',
          });
          continue;
        }

        if (!match.awayTeam) {
          metrics.errors.push({
            matchId: match.id,
            error: 'Match has no away team',
          });
          continue;
        }

        if (!match.homeTeam) {
          metrics.errors.push({
            matchId: match.id,
            error: 'Match has no home team',
          });
          continue;
        }

        let newCount = 0;

        const awayTeamId = match.awayTeam.id;

        await db.$transaction(async tx => {
          // 1. Lapse the match
          await tx.match.update({
            where: { id: match.id },
            data: { status: 'lapsed' },
          });

          // 2. Calculate running strike count for this roster in this season
          const existingStrikes = await tx.rosterStrike.count({
            where: {
              rosterId: awayTeamId,
              seasonId,
            },
          });
          newCount = existingStrikes + 1;

          // 3. Record a RosterStrike
          await tx.rosterStrike.create({
            data: {
              rosterId: awayTeamId,
              seasonId,
              reason: 'failed_away_confirmation',
              matchId: match.id,
              count: newCount,
            },
          });

          metrics.strikesRecorded++;
        });

        metrics.matchesLapsed++;

        // 4. Notify commissioner (outside transaction — non-critical)
        console.log(
          `[away-confirmation] Notifying commissioner ${match.league.organizerId}: ` +
            `${match.awayTeam.name} failed to confirm game ${match.id} in ${match.league.name}`
        );
        metrics.notificationsSent++;

        // 5. Notify home roster manager (outside transaction — non-critical)
        const homeManagerIds = match.homeTeam.members.map(m => m.userId);
        if (homeManagerIds.length > 0) {
          console.log(
            `[away-confirmation] Notifying home manager(s) ${homeManagerIds.join(', ')}: ` +
              `game ${match.id} lapsed — ${match.awayTeam.name} did not confirm`
          );
          metrics.notificationsSent++;
        }

        // 6. If strike threshold reached (3+), notify commissioner with removal option
        if (newCount >= 3) {
          console.log(
            `[away-confirmation] Roster ${match.awayTeam.name} reached ${newCount} strikes in season ${seasonId}`
          );
          NotificationService.notifyCommissionerStrikeThreshold(
            match.awayTeam.id,
            seasonId,
            newCount
          );
          metrics.notificationsSent++;
        }
      } catch (err: any) {
        console.error(
          `[away-confirmation] Failed to process match ${match.id}:`,
          err
        );
        metrics.errors.push({ matchId: match.id, error: err.message });
      }
    }
  } catch (err: any) {
    console.error('[away-confirmation] Job failed:', err);
    throw err;
  } finally {
    metrics.duration = Date.now() - startTime;
  }

  return metrics;
}
