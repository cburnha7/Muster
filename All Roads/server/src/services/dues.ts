/**
 * Dues Service
 *
 * Handles player season dues payments. Players pay their roster manager's
 * Stripe Connect account directly. The platform collects revenue via
 * `application_fee_amount` on every charge.
 */

import Stripe from 'stripe';
import { prisma } from '../index';
import { stripe, calculatePlatformFee } from './stripe-connect';
import { generateIdempotencyKey } from '../utils/idempotency';
import { recalculateBalanceStatuses } from './balance';

/**
 * Create a Stripe PaymentIntent for a player's season dues payment.
 *
 * - Charges the player directly
 * - Routes funds to the roster manager's Connect account via `transfer_data.destination`
 * - Attaches `application_fee_amount` for the platform fee
 * - Records the payment in the `PlayerDuesPayment` table
 * - Uses an idempotency key to prevent duplicate charges
 *
 * @param playerId  - User ID of the player paying dues
 * @param rosterId  - Roster (Team) ID the player belongs to
 * @param seasonId  - Season ID the dues are for
 * @returns The created PlayerDuesPayment record and Stripe PaymentIntent client secret
 */
export async function createPlayerDuesPayment(
  playerId: string,
  rosterId: string,
  seasonId: string,
): Promise<{ payment: any; clientSecret: string }> {
  // 1. Verify the season exists and has a dues amount
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: {
      league: {
        select: { id: true, name: true },
      },
    },
  });

  if (!season) {
    throw new Error('Season not found');
  }

  if (!season.duesAmount || season.duesAmount <= 0) {
    throw new Error('No dues amount set for this season');
  }

  // 2. Verify the roster exists and has a Stripe Connect account
  const roster = await prisma.team.findUnique({
    where: { id: rosterId },
    select: { id: true, name: true, stripeAccountId: true },
  });

  if (!roster) {
    throw new Error('Roster not found');
  }

  if (!roster.stripeAccountId) {
    throw new Error('Roster manager has not completed Stripe Connect onboarding');
  }

  // 3. Verify the player is a member of the roster
  const membership = await prisma.teamMember.findFirst({
    where: {
      userId: playerId,
      teamId: rosterId,
      status: 'active',
    },
  });

  if (!membership) {
    throw new Error('Player is not an active member of this roster');
  }

  // 4. Check for existing payment for this player + roster + season
  const existingPayment = await prisma.playerDuesPayment.findUnique({
    where: {
      playerId_rosterId_seasonId: {
        playerId,
        rosterId,
        seasonId,
      },
    },
  });

  if (existingPayment && existingPayment.paymentStatus === 'succeeded') {
    throw new Error('Dues already paid for this season');
  }

  // 5. Calculate amounts
  const amountCents = Math.round(season.duesAmount * 100);
  const platformFee = calculatePlatformFee(amountCents);

  // 6. Build idempotency key: playerId:rosterId:seasonId:dues_create
  const idempotencyKey = generateIdempotencyKey(
    `${playerId}:${rosterId}`,
    seasonId,
    'dues_create',
  );

  // 7. Create Stripe PaymentIntent — funds go to roster manager's Connect account
  const intent = await stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency: 'usd',
      application_fee_amount: platformFee,
      transfer_data: {
        destination: roster.stripeAccountId,
      },
      metadata: {
        type: 'player_dues',
        player_id: playerId,
        roster_id: rosterId,
        season_id: seasonId,
      },
    },
    { idempotencyKey },
  );

  // 8. Upsert the PlayerDuesPayment record (handles retry of a previously failed payment)
  const payment = await prisma.playerDuesPayment.upsert({
    where: {
      playerId_rosterId_seasonId: {
        playerId,
        rosterId,
        seasonId,
      },
    },
    update: {
      amount: amountCents,
      platformFee,
      stripePaymentIntentId: intent.id,
      paymentStatus: 'pending',
    },
    create: {
      playerId,
      rosterId,
      seasonId,
      amount: amountCents,
      platformFee,
      stripePaymentIntentId: intent.id,
      paymentStatus: 'pending',
    },
  });

  return {
    payment,
    clientSecret: intent.client_secret!,
  };
}

/**
 * Confirm a player dues payment after Stripe confirms the PaymentIntent succeeded.
 *
 * Called either from the client after payment confirmation or from the
 * `payment_intent.succeeded` webhook handler.
 *
 * @param paymentIntentId - The Stripe PaymentIntent ID
 */
export async function confirmPlayerDuesPayment(
  paymentIntentId: string,
): Promise<void> {
  const payment = await prisma.playerDuesPayment.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
  });

  if (!payment) {
    throw new Error(`No dues payment found for PaymentIntent ${paymentIntentId}`);
  }

  if (payment.paymentStatus === 'succeeded') {
    return; // Already confirmed — idempotent
  }

  await prisma.playerDuesPayment.update({
    where: { id: payment.id },
    data: { paymentStatus: 'succeeded' },
  });
}

/**
 * Mark a player dues payment as failed.
 *
 * Called from the `payment_intent.payment_failed` webhook handler.
 *
 * @param paymentIntentId - The Stripe PaymentIntent ID
 */
export async function failPlayerDuesPayment(
  paymentIntentId: string,
): Promise<void> {
  const payment = await prisma.playerDuesPayment.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
  });

  if (!payment) {
    return; // No matching record — ignore
  }

  await prisma.playerDuesPayment.update({
    where: { id: payment.id },
    data: { paymentStatus: 'failed' },
  });
}

// ---------------------------------------------------------------------------
// Roster-to-League Dues
// ---------------------------------------------------------------------------

/**
 * Create a Stripe PaymentIntent for a roster's league season dues payment.
 *
 * - Charges the roster manager directly
 * - Routes funds to the league commissioner's Connect account via `transfer_data.destination`
 * - Attaches `application_fee_amount` for the platform fee
 * - On success, marks the roster as an active member of the league season
 *   via the `LeagueMembership` record
 * - Uses an idempotency key to prevent duplicate charges
 *
 * @param rosterId  - Roster (Team) ID paying dues
 * @param leagueId  - League ID the roster is joining
 * @param seasonId  - Season ID the dues are for
 * @param managerId - User ID of the roster manager initiating payment
 * @returns The Stripe PaymentIntent client secret and payment metadata
 */
export async function createLeagueDuesPayment(
  rosterId: string,
  leagueId: string,
  seasonId: string,
  managerId: string,
): Promise<{ clientSecret: string; paymentIntentId: string; amount: number; platformFee: number }> {
  // 1. Verify the season exists, belongs to this league, and has a dues amount
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: { league: { select: { id: true, name: true, stripeConnectAccountId: true, pricingType: true } } },
  });

  if (!season) {
    throw new Error('Season not found');
  }

  if (season.leagueId !== leagueId) {
    throw new Error('Season does not belong to this league');
  }

  if (season.league.pricingType !== 'paid') {
    throw new Error('This league does not require dues');
  }

  if (!season.duesAmount || season.duesAmount <= 0) {
    throw new Error('No dues amount set for this season');
  }

  // 2. Verify the league has a Stripe Connect account
  if (!season.league.stripeConnectAccountId) {
    throw new Error('League commissioner has not completed Stripe Connect onboarding');
  }

  // 3. Verify the roster exists and the manager is actually the manager
  const roster = await prisma.team.findUnique({
    where: { id: rosterId },
    select: { id: true, name: true, stripeAccountId: true },
  });

  if (!roster) {
    throw new Error('Roster not found');
  }

  const managerMembership = await prisma.teamMember.findFirst({
    where: {
      userId: managerId,
      teamId: rosterId,
      role: 'manager',
      status: 'active',
    },
  });

  if (!managerMembership) {
    throw new Error('User is not the manager of this roster');
  }

  // 4. Check if roster already has an active membership for this season
  const existingMembership = await prisma.leagueMembership.findFirst({
    where: {
      leagueId,
      teamId: rosterId,
      seasonId,
      memberType: 'roster',
      status: 'active',
    },
  });

  if (existingMembership) {
    throw new Error('Roster is already an active member of this season');
  }

  // 5. Calculate amounts
  const amountCents = Math.round(season.duesAmount * 100);
  const platformFee = calculatePlatformFee(amountCents);

  // 6. Build idempotency key: rosterId:leagueId:seasonId:league_dues_create
  const idempotencyKey = generateIdempotencyKey(
    `${rosterId}:${leagueId}`,
    seasonId,
    'league_dues_create',
  );

  // 7. Create Stripe PaymentIntent — funds go to league commissioner's Connect account
  const intent = await stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency: 'usd',
      application_fee_amount: platformFee,
      transfer_data: {
        destination: season.league.stripeConnectAccountId,
      },
      metadata: {
        type: 'league_dues',
        roster_id: rosterId,
        league_id: leagueId,
        season_id: seasonId,
        league_season_id: seasonId,
      },
    },
    { idempotencyKey },
  );

  return {
    clientSecret: intent.client_secret!,
    paymentIntentId: intent.id,
    amount: amountCents,
    platformFee,
  };
}

/**
 * Confirm a league dues payment after Stripe confirms the PaymentIntent succeeded.
 *
 * - Marks the roster as an active member of the league season
 * - Records the dues payment in the league ledger (LeagueTransaction)
 *
 * @param paymentIntentId - The Stripe PaymentIntent ID
 * @param rosterId        - Roster ID that paid
 * @param leagueId        - League ID
 * @param seasonId        - Season ID
 */
export async function confirmLeagueDuesPayment(
  paymentIntentId: string,
  rosterId: string,
  leagueId: string,
  seasonId: string,
): Promise<void> {
  // Check if already confirmed (idempotent)
  const existingMembership = await prisma.leagueMembership.findFirst({
    where: {
      leagueId,
      teamId: rosterId,
      seasonId,
      memberType: 'roster',
      status: 'active',
    },
  });

  if (existingMembership) {
    return; // Already confirmed — idempotent
  }

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
  });

  if (!season) {
    throw new Error('Season not found');
  }

  const amountCents = Math.round((season.duesAmount ?? 0) * 100);

  // Get current league ledger balance for running total
  const lastTransaction = await prisma.leagueTransaction.findFirst({
    where: { leagueId, seasonId },
    orderBy: { createdAt: 'desc' },
  });

  const currentBalance = lastTransaction?.balanceAfter ?? 0;

  await prisma.$transaction([
    // Upsert league membership — mark roster as active member of season
    prisma.leagueMembership.upsert({
      where: {
        leagueId_memberType_memberId_seasonId: {
          leagueId,
          memberType: 'roster',
          memberId: rosterId,
          seasonId,
        },
      },
      update: {
        status: 'active',
        teamId: rosterId,
      },
      create: {
        leagueId,
        teamId: rosterId,
        seasonId,
        memberType: 'roster',
        memberId: rosterId,
        status: 'active',
      },
    }),
    // Record in league ledger
    prisma.leagueTransaction.create({
      data: {
        leagueId,
        seasonId,
        type: 'dues_received',
        amount: amountCents,
        balanceAfter: currentBalance + amountCents,
        description: `Season dues received from roster`,
        rosterId,
        stripePaymentId: paymentIntentId,
      },
    }),
  ]);

  // Trigger balance status recalculation — dues payment may change roster balances
  recalculateBalanceStatuses(leagueId, seasonId).catch((err) =>
    console.error('Balance recalculation failed after league dues confirmation:', err),
  );
}

/**
 * Handle a failed league dues payment.
 * The roster is NOT admitted to the league season.
 *
 * @param paymentIntentId - The Stripe PaymentIntent ID
 */
export async function failLeagueDuesPayment(
  _paymentIntentId: string,
): Promise<void> {
  // Nothing to clean up — the roster was never admitted.
  // This function exists for webhook handler symmetry and future logging.
}

/**
 * Get the league dues status for a roster in a specific league and season.
 *
 * @param rosterId  - Roster (Team) ID
 * @param leagueId  - League ID
 * @param seasonId  - Season ID
 */
export async function getLeagueDuesStatus(
  rosterId: string,
  leagueId: string,
  seasonId: string,
): Promise<{ paid: boolean; duesAmount: number | null; leagueName: string | null }> {
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: { league: { select: { name: true } } },
  });

  if (!season) {
    throw new Error('Season not found');
  }

  const membership = await prisma.leagueMembership.findFirst({
    where: {
      leagueId,
      teamId: rosterId,
      seasonId,
      memberType: 'roster',
      status: 'active',
    },
  });

  return {
    paid: !!membership,
    duesAmount: season.duesAmount,
    leagueName: season.league.name,
  };
}
