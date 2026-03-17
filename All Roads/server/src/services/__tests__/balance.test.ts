/**
 * Unit tests for balance service
 *
 * Mocks Prisma and the stripe-connect module to test checkBalance logic.
 */

// Mock Prisma
jest.mock('../../index', () => ({
  prisma: {
    team: { findUnique: jest.fn() },
    facility: { findUnique: jest.fn() },
    league: { findUnique: jest.fn() },
    facilityCourt: { aggregate: jest.fn() },
    season: { findUnique: jest.fn() },
    leagueMembership: { findMany: jest.fn() },
  },
}));

// Mock stripe-connect
jest.mock('../stripe-connect', () => ({
  getConnectAccountBalance: jest.fn(),
}));

// Mock NotificationService
jest.mock('../NotificationService', () => ({
  NotificationService: {
    notifyLowBalance: jest.fn(),
    notifyBlockedBalance: jest.fn(),
  },
}));

import { prisma } from '../../index';
import { getConnectAccountBalance } from '../stripe-connect';
import { checkBalance, calculateAvgCourtCost, getBalanceStatus, recalculateBalanceStatuses } from '../balance';
import { NotificationService } from '../NotificationService';

describe('checkBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Entity resolution
  // -----------------------------------------------------------------------

  it('should resolve a roster stripeAccountId and check balance', async () => {
    (prisma.team.findUnique).mockResolvedValue({ stripeAccountId: 'acct_team_1' });
    (getConnectAccountBalance).mockResolvedValue({ available: 50000, pending: 0 });

    const result = await checkBalance('team-id-1', 30000);

    expect(prisma.team.findUnique).toHaveBeenCalledWith({
      where: { id: 'team-id-1' },
      select: { stripeAccountId: true },
    });
    expect(getConnectAccountBalance).toHaveBeenCalledWith('acct_team_1');
    expect(result).toEqual({ sufficient: true, shortfall: 0 });
  });

  it('should resolve a Facility stripeConnectAccountId when roster has none', async () => {
    (prisma.team.findUnique).mockResolvedValue(null);
    (prisma.facility.findUnique).mockResolvedValue({ stripeConnectAccountId: 'acct_fac_1' });
    (getConnectAccountBalance).mockResolvedValue({ available: 20000, pending: 5000 });

    const result = await checkBalance('facility-id-1', 15000);

    expect(prisma.facility.findUnique).toHaveBeenCalledWith({
      where: { id: 'facility-id-1' },
      select: { stripeConnectAccountId: true },
    });
    expect(getConnectAccountBalance).toHaveBeenCalledWith('acct_fac_1');
    expect(result).toEqual({ sufficient: true, shortfall: 0 });
  });

  it('should resolve a League stripeConnectAccountId when roster and facility have none', async () => {
    (prisma.team.findUnique).mockResolvedValue(null);
    (prisma.facility.findUnique).mockResolvedValue(null);
    (prisma.league.findUnique).mockResolvedValue({ stripeConnectAccountId: 'acct_league_1' });
    (getConnectAccountBalance).mockResolvedValue({ available: 100000, pending: 0 });

    const result = await checkBalance('league-id-1', 80000);

    expect(prisma.league.findUnique).toHaveBeenCalledWith({
      where: { id: 'league-id-1' },
      select: { stripeConnectAccountId: true },
    });
    expect(getConnectAccountBalance).toHaveBeenCalledWith('acct_league_1');
    expect(result).toEqual({ sufficient: true, shortfall: 0 });
  });

  // -----------------------------------------------------------------------
  // Sufficient vs insufficient balance
  // -----------------------------------------------------------------------

  it('should return sufficient: true and shortfall: 0 when balance equals required amount', async () => {
    (prisma.team.findUnique).mockResolvedValue({ stripeAccountId: 'acct_exact' });
    (getConnectAccountBalance).mockResolvedValue({ available: 25000, pending: 0 });

    const result = await checkBalance('team-exact', 25000);

    expect(result).toEqual({ sufficient: true, shortfall: 0 });
  });

  it('should return sufficient: false and correct shortfall when balance is insufficient', async () => {
    (prisma.team.findUnique).mockResolvedValue({ stripeAccountId: 'acct_low' });
    (getConnectAccountBalance).mockResolvedValue({ available: 10000, pending: 0 });

    const result = await checkBalance('team-low', 30000);

    expect(result).toEqual({ sufficient: false, shortfall: 20000 });
  });

  it('should return sufficient: true when balance exceeds required amount', async () => {
    (prisma.team.findUnique).mockResolvedValue({ stripeAccountId: 'acct_rich' });
    (getConnectAccountBalance).mockResolvedValue({ available: 100000, pending: 0 });

    const result = await checkBalance('team-rich', 50000);

    expect(result).toEqual({ sufficient: true, shortfall: 0 });
  });

  // -----------------------------------------------------------------------
  // Error cases
  // -----------------------------------------------------------------------

  it('should throw when no Stripe Connect account is found for the entity', async () => {
    (prisma.team.findUnique).mockResolvedValue(null);
    (prisma.facility.findUnique).mockResolvedValue(null);
    (prisma.league.findUnique).mockResolvedValue(null);

    await expect(checkBalance('unknown-id', 10000)).rejects.toThrow(
      'No Stripe Connect account found for entity unknown-id',
    );
    expect(getConnectAccountBalance).not.toHaveBeenCalled();
  });

  it('should throw when entity exists but has no Connect account ID', async () => {
    (prisma.team.findUnique).mockResolvedValue({ stripeAccountId: null });
    (prisma.facility.findUnique).mockResolvedValue({ stripeConnectAccountId: null });
    (prisma.league.findUnique).mockResolvedValue({ stripeConnectAccountId: null });

    await expect(checkBalance('no-stripe-id', 10000)).rejects.toThrow(
      'No Stripe Connect account found for entity no-stripe-id',
    );
  });

  it('should propagate Stripe API errors', async () => {
    (prisma.team.findUnique).mockResolvedValue({ stripeAccountId: 'acct_err' });
    (getConnectAccountBalance).mockRejectedValue(new Error('Stripe API error'));

    await expect(checkBalance('team-err', 10000)).rejects.toThrow(
      'Stripe API error',
    );
  });
});


describe('calculateAvgCourtCost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the average pricePerHour when multiple courts match', async () => {
    (prisma.facilityCourt.aggregate).mockResolvedValue({
      _avg: { pricePerHour: 7500 },
    });

    const result = await calculateAvgCourtCost('basketball');

    expect(prisma.facilityCourt.aggregate).toHaveBeenCalledWith({
      _avg: { pricePerHour: true },
      where: {
        sportType: 'basketball',
        pricePerHour: { not: null },
        facility: {
          stripeConnectAccountId: { not: null },
        },
      },
    });
    expect(result).toBe(7500);
  });

  it('should return 0 when no courts match the sport type', async () => {
    (prisma.facilityCourt.aggregate).mockResolvedValue({
      _avg: { pricePerHour: null },
    });

    const result = await calculateAvgCourtCost('curling');

    expect(result).toBe(0);
  });

  it('should only include courts from onboarded facilities', async () => {
    (prisma.facilityCourt.aggregate).mockResolvedValue({
      _avg: { pricePerHour: 5000 },
    });

    await calculateAvgCourtCost('tennis');

    // Verify the where clause filters by non-null stripeConnectAccountId
    expect(prisma.facilityCourt.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          facility: {
            stripeConnectAccountId: { not: null },
          },
        }),
      }),
    );
  });
});


describe('getBalanceStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return "funded" when balance >= 2× halfShare', async () => {
    // avgCourtCost = 100, halfShare = 50, funded threshold = 100 dollars = 10000 cents
    (prisma.team.findUnique).mockResolvedValue({ stripeAccountId: 'acct_funded' });
    (getConnectAccountBalance).mockResolvedValue({ available: 10000, pending: 0 });

    const result = await getBalanceStatus('team-funded', 100);
    expect(result).toBe('funded');
  });

  it('should return "funded" when balance equals exactly 2× halfShare', async () => {
    // avgCourtCost = 80, halfShare = 40, funded threshold = 80 dollars = 8000 cents
    (prisma.team.findUnique).mockResolvedValue({ stripeAccountId: 'acct_exact' });
    (getConnectAccountBalance).mockResolvedValue({ available: 8000, pending: 0 });

    const result = await getBalanceStatus('team-exact', 80);
    expect(result).toBe('funded');
  });

  it('should return "low" when balance is between 1× and 2× halfShare', async () => {
    // avgCourtCost = 100, halfShare = 50, low range = 50–99.99 dollars
    // 7500 cents = 75 dollars — between 50 and 100
    (prisma.team.findUnique).mockResolvedValue({ stripeAccountId: 'acct_low' });
    (getConnectAccountBalance).mockResolvedValue({ available: 7500, pending: 0 });

    const result = await getBalanceStatus('team-low', 100);
    expect(result).toBe('low');
  });

  it('should return "low" when balance equals exactly 1× halfShare', async () => {
    // avgCourtCost = 100, halfShare = 50, 5000 cents = 50 dollars
    (prisma.team.findUnique).mockResolvedValue({ stripeAccountId: 'acct_boundary' });
    (getConnectAccountBalance).mockResolvedValue({ available: 5000, pending: 0 });

    const result = await getBalanceStatus('team-boundary', 100);
    expect(result).toBe('low');
  });

  it('should return "blocked" when balance < 1× halfShare', async () => {
    // avgCourtCost = 100, halfShare = 50, blocked < 50 dollars
    // 2000 cents = 20 dollars
    (prisma.team.findUnique).mockResolvedValue({ stripeAccountId: 'acct_blocked' });
    (getConnectAccountBalance).mockResolvedValue({ available: 2000, pending: 0 });

    const result = await getBalanceStatus('team-blocked', 100);
    expect(result).toBe('blocked');
  });

  it('should return "blocked" when balance is 0', async () => {
    (prisma.team.findUnique).mockResolvedValue({ stripeAccountId: 'acct_zero' });
    (getConnectAccountBalance).mockResolvedValue({ available: 0, pending: 0 });

    const result = await getBalanceStatus('team-zero', 100);
    expect(result).toBe('blocked');
  });

  it('should throw when no Stripe Connect account is found', async () => {
    (prisma.team.findUnique).mockResolvedValue(null);
    (prisma.facility.findUnique).mockResolvedValue(null);
    (prisma.league.findUnique).mockResolvedValue(null);

    await expect(getBalanceStatus('unknown-id', 100)).rejects.toThrow(
      'No Stripe Connect account found for entity unknown-id',
    );
  });
});


describe('recalculateBalanceStatuses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should skip recalculation when season has no avgCourtCost', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue({ avgCourtCost: null });

    await recalculateBalanceStatuses('league-1', 'season-1');

    expect(prisma.leagueMembership.findMany).not.toHaveBeenCalled();
  });

  it('should skip recalculation when avgCourtCost is 0', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue({ avgCourtCost: 0 });

    await recalculateBalanceStatuses('league-1', 'season-1');

    expect(prisma.leagueMembership.findMany).not.toHaveBeenCalled();
  });

  it('should send low balance notification when roster status is low', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue({ avgCourtCost: 100 });
    (prisma.leagueMembership.findMany as jest.Mock).mockResolvedValue([
      { memberId: 'roster-1', team: { id: 'roster-1', name: 'Eagles', stripeAccountId: 'acct_1' } },
    ]);
    // 7500 cents = $75, halfShare = $50, low range = $50–$99.99
    (prisma.team.findUnique as jest.Mock).mockResolvedValue({ stripeAccountId: 'acct_1' });
    (getConnectAccountBalance as jest.Mock).mockResolvedValue({ available: 7500, pending: 0 });

    await recalculateBalanceStatuses('league-1', 'season-1');

    expect(NotificationService.notifyLowBalance).toHaveBeenCalledWith('roster-1', 'Eagles');
    expect(NotificationService.notifyBlockedBalance).not.toHaveBeenCalled();
  });

  it('should send blocked notification with top-up amount when roster status is blocked', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue({ avgCourtCost: 100 });
    (prisma.leagueMembership.findMany as jest.Mock).mockResolvedValue([
      { memberId: 'roster-2', team: { id: 'roster-2', name: 'Hawks', stripeAccountId: 'acct_2' } },
    ]);
    // 2000 cents = $20, halfShare = $50, blocked < $50, topUp = $50 - $20 = $30
    (prisma.team.findUnique as jest.Mock).mockResolvedValue({ stripeAccountId: 'acct_2' });
    (getConnectAccountBalance as jest.Mock).mockResolvedValue({ available: 2000, pending: 0 });

    await recalculateBalanceStatuses('league-1', 'season-1');

    expect(NotificationService.notifyBlockedBalance).toHaveBeenCalledWith('roster-2', 'Hawks', 30);
    expect(NotificationService.notifyLowBalance).not.toHaveBeenCalled();
  });

  it('should not send notifications when roster is funded', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue({ avgCourtCost: 100 });
    (prisma.leagueMembership.findMany as jest.Mock).mockResolvedValue([
      { memberId: 'roster-3', team: { id: 'roster-3', name: 'Lions', stripeAccountId: 'acct_3' } },
    ]);
    // 15000 cents = $150, halfShare = $50, funded >= $100
    (prisma.team.findUnique as jest.Mock).mockResolvedValue({ stripeAccountId: 'acct_3' });
    (getConnectAccountBalance as jest.Mock).mockResolvedValue({ available: 15000, pending: 0 });

    await recalculateBalanceStatuses('league-1', 'season-1');

    expect(NotificationService.notifyLowBalance).not.toHaveBeenCalled();
    expect(NotificationService.notifyBlockedBalance).not.toHaveBeenCalled();
  });

  it('should skip rosters without a Stripe account', async () => {
    (prisma.season.findUnique as jest.Mock).mockResolvedValue({ avgCourtCost: 100 });
    (prisma.leagueMembership.findMany as jest.Mock).mockResolvedValue([
      { memberId: 'roster-4', team: { id: 'roster-4', name: 'Bears', stripeAccountId: null } },
    ]);

    await recalculateBalanceStatuses('league-1', 'season-1');

    expect(getConnectAccountBalance).not.toHaveBeenCalled();
    expect(NotificationService.notifyLowBalance).not.toHaveBeenCalled();
    expect(NotificationService.notifyBlockedBalance).not.toHaveBeenCalled();
  });
});
