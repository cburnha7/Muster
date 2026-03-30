import { prisma } from '../lib/prisma';

export interface RecordLeagueTransactionInput {
  leagueId: string;
  seasonId: string;
  type: 'dues_received' | 'court_cost' | 'refund';
  amount: number;
  description: string;
  rosterId?: string;
  facilityId?: string;
  rentalId?: string;
  matchId?: string;
  stripePaymentId?: string;
}

/**
 * Records a transaction in the league financial ledger.
 *
 * Calculates a running balance by querying the most recent transaction
 * for the same league+season, then creates a new LeagueTransaction record.
 *
 * @returns The created LeagueTransaction record
 */
export async function recordLeagueTransaction(input: RecordLeagueTransactionInput) {
  const {
    leagueId,
    seasonId,
    type,
    amount,
    description,
    rosterId,
    facilityId,
    rentalId,
    matchId,
    stripePaymentId,
  } = input;

  // Query the last transaction for this league+season to get the previous running balance
  const lastTransaction = await prisma.leagueTransaction.findFirst({
    where: { leagueId, seasonId },
    orderBy: { createdAt: 'desc' },
    select: { balanceAfter: true },
  });

  const previousBalance = lastTransaction?.balanceAfter ?? 0;
  const balanceAfter = previousBalance + amount;

  const transaction = await prisma.leagueTransaction.create({
    data: {
      leagueId,
      seasonId,
      type,
      amount,
      balanceAfter,
      description,
      rosterId,
      facilityId,
      rentalId,
      matchId,
      stripePaymentId,
    },
  });

  return transaction;
}

/**
 * Returns all transactions for a league season, ordered by date ascending.
 * Each transaction includes the running balance (balanceAfter).
 */
export async function getLeagueLedger(leagueId: string, seasonId: string) {
  return prisma.leagueTransaction.findMany({
    where: { leagueId, seasonId },
    orderBy: { createdAt: 'asc' },
  });
}
