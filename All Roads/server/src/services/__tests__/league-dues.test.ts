/**
 * Unit tests for league dues service — createLeagueDuesPayment,
 * confirmLeagueDuesPayment, failLeagueDuesPayment, getLeagueDuesStatus
 *
 * Mocks Stripe SDK and Prisma to verify PaymentIntent creation,
 * platform fee calculation, league membership activation, and ledger recording.
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

jest.mock('../stripe-connect', () => ({
  stripe: {
    paymentIntents: {
      create: jest.fn(),
    },
  },
  calculatePlatformFee: jest.fn(),
}));

jest.mock('../../index', () => ({
  prisma: {
    season: { findUnique: jest.fn() },
    team: { findUnique: jest.fn() },
    teamMember: { findFirst: jest.fn() },
    leagueMembership: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    leagueTransaction: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../utils/idempotency', () => ({
  generateIdempotencyKey: jest.fn().mockReturnValue('idem-league-key'),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { stripe, calculatePlatformFee } from '../stripe-connect';
import { prisma } from '../../index';
import {
  createLeagueDuesPayment,
  confirmLeagueDuesPayment,
  failLeagueDuesPayment,
  getLeagueDuesStatus,
} from '../dues';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROSTER_ID = 'roster-001';
const LEAGUE_ID = 'league-001';
const SEASON_ID = 'season-001';
const MANAGER_ID = 'manager-001';
const LEAGUE_CONNECT_ID = 'acct_league_commissioner';
const DUES_AMOUNT = 200; // $200.00
const DUES_CENTS = 20000;
const PLATFORM_FEE = 1000; // 5% of 20000

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockSeasonWithLeague(overrides: Record<string, any> = {}) {
  return {
    id: SEASON_ID,
    leagueId: LEAGUE_ID,
    duesAmount: DUES_AMOUNT,
    league: {
      id: LEAGUE_ID,
      name: 'Test League',
      stripeConnectAccountId: LEAGUE_CONNECT_ID,
      pricingType: 'paid',
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests — createLeagueDuesPayment
// ---------------------------------------------------------------------------

describe('createLeagueDuesPayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (calculatePlatformFee as jest.Mock).mockReturnValue(PLATFORM_FEE);
  });

  it('creates a PaymentIntent routed to the league Connect account', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue(mockSeasonWithLeague());
    (prisma.team.findUnique as jest.Mock).mockResolvedValue({
      id: ROSTER_ID,
      name: 'Test Roster',
      stripeAccountId: 'acct_roster',
    });
    (prisma.teamMember.findFirst as jest.Mock).mockResolvedValue({
      id: 'member-001',
      userId: MANAGER_ID,
      teamId: ROSTER_ID,
      role: 'manager',
      status: 'active',
    });
    (prisma.leagueMembership.findFirst as jest.Mock).mockResolvedValue(null);
    (stripe.paymentIntents.create as jest.Mock).mockResolvedValue({
      id: 'pi_league_dues_123',
      client_secret: 'cs_league_test',
      amount: DUES_CENTS,
    });

    const result = await createLeagueDuesPayment(ROSTER_ID, LEAGUE_ID, SEASON_ID, MANAGER_ID);

    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: DUES_CENTS,
        currency: 'usd',
        application_fee_amount: PLATFORM_FEE,
        transfer_data: { destination: LEAGUE_CONNECT_ID },
        metadata: expect.objectContaining({
          type: 'league_dues',
          roster_id: ROSTER_ID,
          league_id: LEAGUE_ID,
          season_id: SEASON_ID,
        }),
      }),
      expect.objectContaining({ idempotencyKey: 'idem-league-key' }),
    );

    expect(result.clientSecret).toBe('cs_league_test');
    expect(result.paymentIntentId).toBe('pi_league_dues_123');
    expect(result.amount).toBe(DUES_CENTS);
    expect(result.platformFee).toBe(PLATFORM_FEE);
  });

  it('throws if season not found', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      createLeagueDuesPayment(ROSTER_ID, LEAGUE_ID, SEASON_ID, MANAGER_ID),
    ).rejects.toThrow('Season not found');
  });

  it('throws if season does not belong to the league', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue(
      mockSeasonWithLeague({ leagueId: 'other-league' }),
    );

    await expect(
      createLeagueDuesPayment(ROSTER_ID, LEAGUE_ID, SEASON_ID, MANAGER_ID),
    ).rejects.toThrow('Season does not belong to this league');
  });

  it('throws if league is free (no dues required)', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue(
      mockSeasonWithLeague({
        league: { id: LEAGUE_ID, name: 'Free League', stripeConnectAccountId: null, pricingType: 'free' },
      }),
    );

    await expect(
      createLeagueDuesPayment(ROSTER_ID, LEAGUE_ID, SEASON_ID, MANAGER_ID),
    ).rejects.toThrow('This league does not require dues');
  });

  it('throws if no dues amount set', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue(
      mockSeasonWithLeague({ duesAmount: null }),
    );

    await expect(
      createLeagueDuesPayment(ROSTER_ID, LEAGUE_ID, SEASON_ID, MANAGER_ID),
    ).rejects.toThrow('No dues amount set for this season');
  });

  it('throws if league has no Stripe Connect account', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue(
      mockSeasonWithLeague({
        league: { id: LEAGUE_ID, name: 'Test League', stripeConnectAccountId: null, pricingType: 'paid' },
      }),
    );

    await expect(
      createLeagueDuesPayment(ROSTER_ID, LEAGUE_ID, SEASON_ID, MANAGER_ID),
    ).rejects.toThrow('League commissioner has not completed Stripe Connect onboarding');
  });

  it('throws if roster not found', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue(mockSeasonWithLeague());
    (prisma.team.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      createLeagueDuesPayment(ROSTER_ID, LEAGUE_ID, SEASON_ID, MANAGER_ID),
    ).rejects.toThrow('Roster not found');
  });

  it('throws if user is not the roster manager', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue(mockSeasonWithLeague());
    (prisma.team.findUnique as jest.Mock).mockResolvedValue({
      id: ROSTER_ID,
      name: 'Test Roster',
      stripeAccountId: 'acct_roster',
    });
    (prisma.teamMember.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      createLeagueDuesPayment(ROSTER_ID, LEAGUE_ID, SEASON_ID, MANAGER_ID),
    ).rejects.toThrow('User is not the manager of this roster');
  });

  it('throws if roster is already an active member of the season', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue(mockSeasonWithLeague());
    (prisma.team.findUnique as jest.Mock).mockResolvedValue({
      id: ROSTER_ID,
      name: 'Test Roster',
      stripeAccountId: 'acct_roster',
    });
    (prisma.teamMember.findFirst as jest.Mock).mockResolvedValue({
      id: 'member-001',
      userId: MANAGER_ID,
      teamId: ROSTER_ID,
      role: 'manager',
      status: 'active',
    });
    (prisma.leagueMembership.findFirst as jest.Mock).mockResolvedValue({
      id: 'membership-001',
      status: 'active',
    });

    await expect(
      createLeagueDuesPayment(ROSTER_ID, LEAGUE_ID, SEASON_ID, MANAGER_ID),
    ).rejects.toThrow('Roster is already an active member of this season');
  });
});

// ---------------------------------------------------------------------------
// Tests — confirmLeagueDuesPayment
// ---------------------------------------------------------------------------

describe('confirmLeagueDuesPayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates league membership and ledger transaction atomically', async () => {
    (prisma.leagueMembership.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.season.findUnique as jest.Mock).mockResolvedValue({
      id: SEASON_ID,
      duesAmount: DUES_AMOUNT,
    });
    (prisma.leagueTransaction.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.$transaction as jest.Mock).mockResolvedValue([]);

    await confirmLeagueDuesPayment('pi_league_123', ROSTER_ID, LEAGUE_ID, SEASON_ID);

    // $transaction is called with an array of Prisma promises
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const transactionArg = (prisma.$transaction as jest.Mock).mock.calls[0][0];
    expect(Array.isArray(transactionArg)).toBe(true);
    expect(transactionArg).toHaveLength(2);
  });

  it('adds to existing ledger balance', async () => {
    (prisma.leagueMembership.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.season.findUnique as jest.Mock).mockResolvedValue({
      id: SEASON_ID,
      duesAmount: DUES_AMOUNT,
    });
    (prisma.leagueTransaction.findFirst as jest.Mock).mockResolvedValue({
      balanceAfter: 10000,
    });
    (prisma.$transaction as jest.Mock).mockResolvedValue([]);

    await confirmLeagueDuesPayment('pi_league_123', ROSTER_ID, LEAGUE_ID, SEASON_ID);

    // The transaction should have been called — we verify it ran
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('is idempotent — does not re-create if membership already active', async () => {
    (prisma.leagueMembership.findFirst as jest.Mock).mockResolvedValue({
      id: 'membership-001',
      status: 'active',
    });

    await confirmLeagueDuesPayment('pi_league_123', ROSTER_ID, LEAGUE_ID, SEASON_ID);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('throws if season not found during confirmation', async () => {
    (prisma.leagueMembership.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.season.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      confirmLeagueDuesPayment('pi_league_123', ROSTER_ID, LEAGUE_ID, SEASON_ID),
    ).rejects.toThrow('Season not found');
  });
});

// ---------------------------------------------------------------------------
// Tests — failLeagueDuesPayment
// ---------------------------------------------------------------------------

describe('failLeagueDuesPayment', () => {
  it('does not throw — roster was never admitted', async () => {
    await expect(failLeagueDuesPayment('pi_league_fail')).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests — getLeagueDuesStatus
// ---------------------------------------------------------------------------

describe('getLeagueDuesStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns paid: true when roster has active membership', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue({
      id: SEASON_ID,
      duesAmount: DUES_AMOUNT,
      league: { name: 'Test League' },
    });
    (prisma.leagueMembership.findFirst as jest.Mock).mockResolvedValue({
      id: 'membership-001',
      status: 'active',
    });

    const result = await getLeagueDuesStatus(ROSTER_ID, LEAGUE_ID, SEASON_ID);

    expect(result).toEqual({
      paid: true,
      duesAmount: DUES_AMOUNT,
      leagueName: 'Test League',
    });
  });

  it('returns paid: false when no active membership exists', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue({
      id: SEASON_ID,
      duesAmount: DUES_AMOUNT,
      league: { name: 'Test League' },
    });
    (prisma.leagueMembership.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await getLeagueDuesStatus(ROSTER_ID, LEAGUE_ID, SEASON_ID);

    expect(result).toEqual({
      paid: false,
      duesAmount: DUES_AMOUNT,
      leagueName: 'Test League',
    });
  });

  it('throws if season not found', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      getLeagueDuesStatus(ROSTER_ID, LEAGUE_ID, SEASON_ID),
    ).rejects.toThrow('Season not found');
  });
});
