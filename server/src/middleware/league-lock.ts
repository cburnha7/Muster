import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Registers a Prisma middleware that automatically sets
 * `League.lockedFromDeletion = true` when any Match transitions
 * to `in_progress` or `completed`.
 */
export function registerLeagueLockMiddleware(prisma: PrismaClient): void {
  prisma.$use(async (params: Prisma.MiddlewareParams, next) => {
    const result = await next(params);

    if (params.model === 'Match' && params.action === 'update') {
      const newStatus = params.args?.data?.status;
      if (newStatus === 'in_progress' || newStatus === 'completed') {
        try {
          await prisma.league.update({
            where: { id: result.leagueId },
            data: { lockedFromDeletion: true },
          });
        } catch (err) {
          // Log but don't break the match update
          console.error('Failed to lock league from deletion:', err);
        }
      }
    }

    return result;
  });
}
