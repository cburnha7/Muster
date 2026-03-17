/**
 * Unit tests for dues service — createPlayerDuesPayment,
 * confirmPlayerDuesPayment, failPlayerDuesPayment
 *
 * Mocks Stripe SDK and Prisma to verify PaymentIntent creation,
 * platform fee calculation, and PlayerDuesPayment record management.
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
    playerDuesPayment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../../utils/idempotency', () => ({
  generateIdempotencyKey: jest.fn().mockReturnValue('idem-key'),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { stripe, calculatePlatformFee } from '../stripe-connect';
import { prisma } from '../../index';
import {
  createPlayerDuesPayment,
  confirmPlayerDuesPayment,
  failPlayerDuesPayment,
} from '../dues';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLAYER_ID = 'player-001';
const ROSTER_ID = 'roster-001';
const SEASON_ID = 'season-001';
const STRIPE_ACCOUNT_ID = 'acct_roster_mgr';
const DUES_AMOUNT = 50; // $50.00
const DUES_CENTS = 5000;
const PLATFORM_FEE = 250; // 5% of 5000

// ---------------------------------------------------------------------------
// Tests — createPlayerDuesPayment
// ---------------------------------------------------------------------------

describe('createPlayerDuesPayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (calculatePlatformFee as jest.Mock).mockReturnValue(PLATFORM_FEE);
  });

  it('creates a PaymentIntent and records the payment', async () => {
    // Arrange
    (prisma.season.findUnique as jest.Mock).mockResolvedValue({
      id: SEASON_ID,
      duesAmount: DUES_AMOUNT,
      league: { id: 'league-001', name: 'Test League' },
    });
    (prisma.team.findUnique as jest.Mock).mockResolvedValue({
      id: ROSTER_ID,
      name: 'Test Roster',
      stripeAccountId: STRIPE_ACCOUNT_ID,
    });
    (prisma.teamMember.findFirst as jest.Mock).mockResolvedValue({
      id: 'member-001',
      userId: PLAYER_ID,
      teamId: ROSTER_ID,
      status: 'active',
    });
    (prisma.playerDuesPayment.findUnique as jest.Mock).mockResolvedValue(null);
    (stripe.paymentIntents.create as jest.Mock).mockResolvedValue({
      id: 'pi_dues_123',
      client_secret: 'cs_test_secret',
      amount: DUES_CENTS,
    });
    (prisma.playerDuesPayment.upsert as jest.Mock).mockResolvedValue({
      id: 'payment-001',
      playerId: PLAYER_ID,
      rosterId: ROSTER_ID,
      seasonId: SEASON_ID,
      amount: DUES_CENTS,
      platformFee: PLATFORM_FEE,
      stripePaymentIntentId: 'pi_dues_123',
      paymentStatus: 'pending',
    });

    // Act
    const result = await createPlayerDuesPayment(PLAYER_ID, ROSTER_ID, SEASON_ID);

    // Assert
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: DUES_CENTS,
        currency: 'usd',
        application_fee_amount: PLATFORM_FEE,
        transfer_data: { destination: STRIPE_ACCOUNT_ID },
        metadata: expect.objectContaining({
          type: 'player_dues',
          player_id: PLAYER_ID,
          roster_id: ROSTER_ID,
          season_id: SEASON_ID,
        }),
      }),
      expect.objectContaining({ idempotencyKey: 'idem-key' }),
    );

    expect(prisma.playerDuesPayment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          playerId_rosterId_seasonId: {
            playerId: PLAYER_ID,
            rosterId: ROSTER_ID,
            seasonId: SEASON_ID,
          },
        },
      }),
    );

    expect(result.clientSecret).toBe('cs_test_secret');
    expect(result.payment.amount).toBe(DUES_CENTS);
  });

  it('throws if season not found', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      createPlayerDuesPayment(PLAYER_ID, ROSTER_ID, SEASON_ID),
    ).rejects.toThrow('Season not found');
  });

  it('throws if no dues amount set', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue({
      id: SEASON_ID,
      duesAmount: null,
      league: { id: 'league-001', name: 'Test League' },
    });

    await expect(
      createPlayerDuesPayment(PLAYER_ID, ROSTER_ID, SEASON_ID),
    ).rejects.toThrow('No dues amount set for this season');
  });

  it('throws if roster has no Stripe Connect account', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue({
      id: SEASON_ID,
      duesAmount: DUES_AMOUNT,
      league: { id: 'league-001', name: 'Test League' },
    });
    (prisma.team.findUnique as jest.Mock).mockResolvedValue({
      id: ROSTER_ID,
      name: 'Test Roster',
      stripeAccountId: null,
    });

    await expect(
      createPlayerDuesPayment(PLAYER_ID, ROSTER_ID, SEASON_ID),
    ).rejects.toThrow('Roster manager has not completed Stripe Connect onboarding');
  });

  it('throws if player is not a roster member', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue({
      id: SEASON_ID,
      duesAmount: DUES_AMOUNT,
      league: { id: 'league-001', name: 'Test League' },
    });
    (prisma.team.findUnique as jest.Mock).mockResolvedValue({
      id: ROSTER_ID,
      name: 'Test Roster',
      stripeAccountId: STRIPE_ACCOUNT_ID,
    });
    (prisma.teamMember.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      createPlayerDuesPayment(PLAYER_ID, ROSTER_ID, SEASON_ID),
    ).rejects.toThrow('Player is not an active member of this roster');
  });

  it('throws if dues already paid', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue({
      id: SEASON_ID,
      duesAmount: DUES_AMOUNT,
      league: { id: 'league-001', name: 'Test League' },
    });
    (prisma.team.findUnique as jest.Mock).mockResolvedValue({
      id: ROSTER_ID,
      name: 'Test Roster',
      stripeAccountId: STRIPE_ACCOUNT_ID,
    });
    (prisma.teamMember.findFirst as jest.Mock).mockResolvedValue({
      id: 'member-001',
      userId: PLAYER_ID,
      teamId: ROSTER_ID,
      status: 'active',
    });
    (prisma.playerDuesPayment.findUnique as jest.Mock).mockResolvedValue({
      id: 'payment-001',
      paymentStatus: 'succeeded',
    });

    await expect(
      createPlayerDuesPayment(PLAYER_ID, ROSTER_ID, SEASON_ID),
    ).rejects.toThrow('Dues already paid for this season');
  });
});

// ---------------------------------------------------------------------------
// Tests — confirmPlayerDuesPayment
// ---------------------------------------------------------------------------

describe('confirmPlayerDuesPayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates payment status to succeeded', async () => {
    (prisma.playerDuesPayment.findFirst as jest.Mock).mockResolvedValue({
      id: 'payment-001',
      stripePaymentIntentId: 'pi_dues_123',
      paymentStatus: 'pending',
    });
    (prisma.playerDuesPayment.update as jest.Mock).mockResolvedValue({
      id: 'payment-001',
      paymentStatus: 'succeeded',
    });

    await confirmPlayerDuesPayment('pi_dues_123');

    expect(prisma.playerDuesPayment.update).toHaveBeenCalledWith({
      where: { id: 'payment-001' },
      data: { paymentStatus: 'succeeded' },
    });
  });

  it('is idempotent — does not update if already succeeded', async () => {
    (prisma.playerDuesPayment.findFirst as jest.Mock).mockResolvedValue({
      id: 'payment-001',
      stripePaymentIntentId: 'pi_dues_123',
      paymentStatus: 'succeeded',
    });

    await confirmPlayerDuesPayment('pi_dues_123');

    expect(prisma.playerDuesPayment.update).not.toHaveBeenCalled();
  });

  it('throws if no payment found for the intent', async () => {
    (prisma.playerDuesPayment.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      confirmPlayerDuesPayment('pi_unknown'),
    ).rejects.toThrow('No dues payment found for PaymentIntent pi_unknown');
  });
});

// ---------------------------------------------------------------------------
// Tests — failPlayerDuesPayment
// ---------------------------------------------------------------------------

describe('failPlayerDuesPayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates payment status to failed', async () => {
    (prisma.playerDuesPayment.findFirst as jest.Mock).mockResolvedValue({
      id: 'payment-001',
      stripePaymentIntentId: 'pi_dues_123',
      paymentStatus: 'pending',
    });
    (prisma.playerDuesPayment.update as jest.Mock).mockResolvedValue({
      id: 'payment-001',
      paymentStatus: 'failed',
    });

    await failPlayerDuesPayment('pi_dues_123');

    expect(prisma.playerDuesPayment.update).toHaveBeenCalledWith({
      where: { id: 'payment-001' },
      data: { paymentStatus: 'failed' },
    });
  });

  it('silently ignores if no payment found', async () => {
    (prisma.playerDuesPayment.findFirst as jest.Mock).mockResolvedValue(null);

    await failPlayerDuesPayment('pi_unknown');

    expect(prisma.playerDuesPayment.update).not.toHaveBeenCalled();
  });
});
