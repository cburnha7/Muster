import { prisma } from '../index';
import { stripe } from '../services/stripe-connect';
import { generateIdempotencyKey, IdempotencyAction } from '../utils/idempotency';

export interface DeletionImpactSummary {
  leagueId: string;
  leagueName: string;
  eventCount: number;
  rentalCount: number;
  stripeRefunds: {
    count: number;
    totalAmount: number; // in cents
  };
  rosterBalanceRefunds: {
    count: number;
    totalAmount: number; // in USD
  };
}

export interface DeletionResult extends DeletionImpactSummary {
  success: true;
}

export class LeagueDeletionService {
  /**
   * Compute the impact of deleting a league without performing any mutations.
   * Used by the preview endpoint.
   */
  async getDeletionPreview(leagueId: string): Promise<DeletionImpactSummary> {
    // 1. Find the league
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league) {
      throw new Error('League not found');
    }

    // 2. Find all seasons for the league
    const seasons = await prisma.season.findMany({
      where: { leagueId },
      select: { id: true },
    });
    const seasonIds = seasons.map((s) => s.id);

    // 3. Find all matches for the league, collecting distinct eventIds and rentalIds
    const matches = await prisma.match.findMany({
      where: { leagueId },
      select: { eventId: true, rentalId: true },
    });

    // 4. Count distinct events linked via Match.eventId (filter out nulls)
    const distinctEventIds = new Set(
      matches.map((m) => m.eventId).filter((id): id is string => id !== null)
    );
    const eventCount = distinctEventIds.size;

    // 5. Count distinct rentals linked via Match.rentalId (filter out nulls)
    const distinctRentalIds = new Set(
      matches.map((m) => m.rentalId).filter((id): id is string => id !== null)
    );
    const rentalCount = distinctRentalIds.size;

    // 6. Find all PlayerDuesPayment records with paymentStatus='succeeded'
    //    and non-null stripePaymentIntentId for the league's seasons — sum their amounts
    let stripeRefundCount = 0;
    let stripeRefundTotal = 0;

    if (seasonIds.length > 0) {
      const succeededPayments = await prisma.playerDuesPayment.findMany({
        where: {
          seasonId: { in: seasonIds },
          paymentStatus: 'succeeded',
          stripePaymentIntentId: { not: null },
        },
        select: { amount: true },
      });

      stripeRefundCount = succeededPayments.length;
      stripeRefundTotal = succeededPayments.reduce((sum, p) => sum + p.amount, 0);
    }

    // 7. If league.membershipFee > 0, count active LeagueMemberships with memberType='roster'
    //    and calculate total refund
    let rosterRefundCount = 0;
    let rosterRefundTotal = 0;

    const membershipFee = league.membershipFee ?? 0;
    if (membershipFee > 0) {
      rosterRefundCount = await prisma.leagueMembership.count({
        where: {
          leagueId,
          memberType: 'roster',
          status: 'active',
        },
      });

      rosterRefundTotal = rosterRefundCount * membershipFee;
    }

    // 8. Return the DeletionImpactSummary
    return {
      leagueId,
      leagueName: league.name,
      eventCount,
      rentalCount,
      stripeRefunds: {
        count: stripeRefundCount,
        totalAmount: stripeRefundTotal,
      },
      rosterBalanceRefunds: {
        count: rosterRefundCount,
        totalAmount: rosterRefundTotal,
      },
    };
  }

  /**
   * Execute the full atomic deletion cascade inside a single Prisma
   * interactive transaction.
   */
  async executeLeagueDeletion(leagueId: string): Promise<DeletionResult> {
    return prisma.$transaction(async (tx) => {
      // 1. Find the league — throw if not found or locked
      const league = await tx.league.findUnique({
        where: { id: leagueId },
      });

      if (!league) {
        throw new Error('League not found');
      }

      if (league.lockedFromDeletion) {
        throw new Error('This league cannot be deleted because matches have been played');
      }

      const leagueName = league.name;
      const membershipFee = league.membershipFee ?? 0;

      // 2. Find all seasons for the league
      const seasons = await tx.season.findMany({
        where: { leagueId },
        select: { id: true },
      });
      const seasonIds = seasons.map((s) => s.id);

      // 3. Find all succeeded PlayerDuesPayments with stripePaymentIntentId
      let stripeRefundCount = 0;
      let stripeRefundTotal = 0;

      if (seasonIds.length > 0) {
        const succeededPayments = await tx.playerDuesPayment.findMany({
          where: {
            seasonId: { in: seasonIds },
            paymentStatus: 'succeeded',
            stripePaymentIntentId: { not: null },
          },
        });

        // 4. Issue Stripe refunds for each payment
        for (const payment of succeededPayments) {
          const idempotencyKey = generateIdempotencyKey(
            payment.id,
            payment.playerId,
            IdempotencyAction.REFUND,
          );

          await stripe.refunds.create(
            { payment_intent: payment.stripePaymentIntentId! },
            { idempotencyKey },
          );

          stripeRefundTotal += payment.amount;
        }

        stripeRefundCount = succeededPayments.length;

        // 5. Update payment statuses to 'refunded'
        if (succeededPayments.length > 0) {
          await tx.playerDuesPayment.updateMany({
            where: {
              id: { in: succeededPayments.map((p) => p.id) },
            },
            data: { paymentStatus: 'refunded' },
          });
        }
      }

      // 6. Find active roster memberships and credit balances
      let rosterRefundCount = 0;
      let rosterRefundTotal = 0;

      if (membershipFee > 0) {
        const rosterMemberships = await tx.leagueMembership.findMany({
          where: {
            leagueId,
            memberType: 'roster',
            status: 'active',
          },
        });

        // 7–8. For each roster, increment balance and create TeamTransaction
        for (const roster of rosterMemberships) {
          const team = await tx.team.findUnique({
            where: { id: roster.memberId },
            select: { balance: true },
          });

          const balanceBefore = team?.balance ?? 0;
          const balanceAfter = balanceBefore + membershipFee;

          await tx.team.update({
            where: { id: roster.memberId },
            data: { balance: balanceAfter },
          });

          await tx.teamTransaction.create({
            data: {
              type: 'refund',
              amount: membershipFee,
              balanceBefore,
              balanceAfter,
              description: `Refund: league "${leagueName}" deleted`,
              teamId: roster.memberId,
              paymentStatus: 'completed',
            },
          });
        }

        rosterRefundCount = rosterMemberships.length;
        rosterRefundTotal = rosterRefundCount * membershipFee;
      }

      // 9. Find all matches with their eventId and rentalId
      const matches = await tx.match.findMany({
        where: { leagueId },
        select: { id: true, eventId: true, rentalId: true },
      });

      // Collect distinct eventIds
      const eventIds = [
        ...new Set(
          matches.map((m) => m.eventId).filter((id): id is string => id !== null),
        ),
      ];

      const rentalCount = new Set(
        matches.map((m) => m.rentalId).filter((id): id is string => id !== null),
      ).size;

      // 10. Nullify Match.rentalId and Match.eventId for all league matches
      await tx.match.updateMany({
        where: { leagueId },
        data: { rentalId: null, eventId: null },
      });

      // 11–12. Detach events from rentals and rentals from events
      if (eventIds.length > 0) {
        await tx.event.updateMany({
          where: { id: { in: eventIds }, rentalId: { not: null } },
          data: { rentalId: null },
        });

        await tx.facilityRental.updateMany({
          where: { usedForEventId: { in: eventIds } },
          data: { usedForEventId: null },
        });

        // 14. Delete all events linked to league matches
        await tx.event.deleteMany({
          where: { id: { in: eventIds } },
        });
      }

      // 15. Delete the league — Prisma cascade handles child records
      await tx.league.delete({
        where: { id: leagueId },
      });

      return {
        success: true as const,
        leagueId,
        leagueName,
        eventCount: eventIds.length,
        rentalCount,
        stripeRefunds: {
          count: stripeRefundCount,
          totalAmount: stripeRefundTotal,
        },
        rosterBalanceRefunds: {
          count: rosterRefundCount,
          totalAmount: rosterRefundTotal,
        },
      };
    });
  }
}
