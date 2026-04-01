import { PrismaClient } from '@prisma/client';

/**
 * Locks a league from deletion when a match transitions to in_progress or completed.
 * Call this after updating a match status.
 */
export async function lockLeagueIfMatchPlayed(prisma: PrismaClient, leagueId: string | null, matchStatus: string): Promise<void> {
  if (!leagueId) return;
  if (matchStatus !== 'in_progress' && matchStatus !== 'completed') return;
  try {
    await prisma.league.update({
      where: { id: leagueId },
      data: { lockedFromDeletion: true },
    });
  } catch (err) {
    console.error('Failed to lock league from deletion:', err);
  }
}

/**
 * @deprecated No longer uses prisma.$use middleware. Kept as no-op for backward compatibility.
 */
export function registerLeagueLockMiddleware(_prisma: PrismaClient): void {
  // No-op — league locking is now handled inline in match update routes
}
