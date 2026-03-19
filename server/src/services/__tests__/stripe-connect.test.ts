/**
 * Unit tests for stripe-connect service module
 *
 * Mocks the Stripe SDK to test Connect account helpers and fee calculations.
 */

// Mock Stripe before importing the module
jest.mock('stripe', () => {
  const mockAccounts = {
    create: jest.fn(),
  };
  const mockAccountLinks = {
    create: jest.fn(),
  };
  const mockBalance = {
    retrieve: jest.fn(),
  };
  const MockStripe = jest.fn(() => ({
    accounts: { ...mockAccounts, retrieve: jest.fn() },
    accountLinks: mockAccountLinks,
    balance: mockBalance,
  }));
  // Expose mocks for assertions
  (MockStripe as any).__mockAccounts = mockAccounts;
  (MockStripe as any).__mockAccountLinks = mockAccountLinks;
  (MockStripe as any).__mockBalance = mockBalance;
  return { __esModule: true, default: MockStripe };
});

import {
  stripe,
  getPlatformFeeRate,
  calculatePlatformFee,
  createConnectAccount,
  createConnectAccountLink,
  getConnectAccountStatus,
  getConnectAccountBalance,
} from '../stripe-connect';

describe('stripe-connect', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // -----------------------------------------------------------------------
  // Shared Stripe instance
  // -----------------------------------------------------------------------

  describe('stripe instance', () => {
    it('should export a Stripe client object', () => {
      expect(stripe).toBeDefined();
      expect(stripe.accounts).toBeDefined();
      expect(stripe.accountLinks).toBeDefined();
      expect(stripe.balance).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // getPlatformFeeRate
  // -----------------------------------------------------------------------

  describe('getPlatformFeeRate', () => {
    it('should return the rate from PLATFORM_FEE_RATE env var', () => {
      process.env.PLATFORM_FEE_RATE = '0.05';
      expect(getPlatformFeeRate()).toBe(0.05);
    });

    it('should return 0 when env var is missing', () => {
      delete process.env.PLATFORM_FEE_RATE;
      expect(getPlatformFeeRate()).toBe(0);
    });

    it('should return 0 for invalid values', () => {
      process.env.PLATFORM_FEE_RATE = 'abc';
      expect(getPlatformFeeRate()).toBe(0);
    });

    it('should return 0 for negative values', () => {
      process.env.PLATFORM_FEE_RATE = '-0.1';
      expect(getPlatformFeeRate()).toBe(0);
    });

    it('should return 0 for values greater than 1', () => {
      process.env.PLATFORM_FEE_RATE = '1.5';
      expect(getPlatformFeeRate()).toBe(0);
    });

    it('should accept boundary value 0', () => {
      process.env.PLATFORM_FEE_RATE = '0';
      expect(getPlatformFeeRate()).toBe(0);
    });

    it('should accept boundary value 1', () => {
      process.env.PLATFORM_FEE_RATE = '1';
      expect(getPlatformFeeRate()).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // calculatePlatformFee
  // -----------------------------------------------------------------------

  describe('calculatePlatformFee', () => {
    it('should calculate fee in cents using the env rate', () => {
      process.env.PLATFORM_FEE_RATE = '0.05';
      // 10000 cents * 0.05 = 500 cents
      expect(calculatePlatformFee(10000)).toBe(500);
    });

    it('should floor the result to avoid overcharging', () => {
      process.env.PLATFORM_FEE_RATE = '0.05';
      // 1001 * 0.05 = 50.05 → 50
      expect(calculatePlatformFee(1001)).toBe(50);
    });

    it('should return 0 when rate is missing', () => {
      delete process.env.PLATFORM_FEE_RATE;
      expect(calculatePlatformFee(10000)).toBe(0);
    });

    it('should return 0 for zero amount', () => {
      process.env.PLATFORM_FEE_RATE = '0.05';
      expect(calculatePlatformFee(0)).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // createConnectAccount
  // -----------------------------------------------------------------------

  describe('createConnectAccount', () => {
    it('should create an Express account with email and capabilities', async () => {
      const mockAccount = { id: 'acct_123', type: 'express' };
      (stripe.accounts.create as jest.Mock).mockResolvedValue(mockAccount);

      const result = await createConnectAccount('coach@example.com');

      expect(stripe.accounts.create).toHaveBeenCalledWith({
        type: 'express',
        email: 'coach@example.com',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      expect(result).toEqual(mockAccount);
    });

    it('should pass businessType when provided', async () => {
      const mockAccount = { id: 'acct_456', type: 'express' };
      (stripe.accounts.create as jest.Mock).mockResolvedValue(mockAccount);

      await createConnectAccount('facility@example.com', 'company');

      expect(stripe.accounts.create).toHaveBeenCalledWith(
        expect.objectContaining({ business_type: 'company' }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // createConnectAccountLink
  // -----------------------------------------------------------------------

  describe('createConnectAccountLink', () => {
    it('should create an onboarding account link', async () => {
      const mockLink = { url: 'https://connect.stripe.com/setup/abc' };
      (stripe.accountLinks.create as jest.Mock).mockResolvedValue(mockLink);

      const result = await createConnectAccountLink(
        'acct_123',
        'https://app.muster.com/refresh',
        'https://app.muster.com/return',
      );

      expect(stripe.accountLinks.create).toHaveBeenCalledWith({
        account: 'acct_123',
        refresh_url: 'https://app.muster.com/refresh',
        return_url: 'https://app.muster.com/return',
        type: 'account_onboarding',
      });
      expect(result).toEqual(mockLink);
    });
  });

  // -----------------------------------------------------------------------
  // getConnectAccountStatus
  // -----------------------------------------------------------------------

  describe('getConnectAccountStatus', () => {
    it('should return status flags from the account', async () => {
      (stripe.accounts.retrieve as jest.Mock).mockResolvedValue({
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      });

      const status = await getConnectAccountStatus('acct_123');

      expect(stripe.accounts.retrieve).toHaveBeenCalledWith('acct_123');
      expect(status).toEqual({
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
      });
    });

    it('should default to false when flags are undefined', async () => {
      (stripe.accounts.retrieve as jest.Mock).mockResolvedValue({});

      const status = await getConnectAccountStatus('acct_456');

      expect(status).toEqual({
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      });
    });
  });

  // -----------------------------------------------------------------------
  // getConnectAccountBalance
  // -----------------------------------------------------------------------

  describe('getConnectAccountBalance', () => {
    it('should return available and pending USD amounts in cents', async () => {
      (stripe.balance.retrieve as jest.Mock).mockResolvedValue({
        available: [{ currency: 'usd', amount: 50000 }],
        pending: [{ currency: 'usd', amount: 12000 }],
      });

      const balance = await getConnectAccountBalance('acct_123');

      expect(stripe.balance.retrieve).toHaveBeenCalledWith({
        stripeAccount: 'acct_123',
      });
      expect(balance).toEqual({ available: 50000, pending: 12000 });
    });

    it('should sum multiple USD balance objects', async () => {
      (stripe.balance.retrieve as jest.Mock).mockResolvedValue({
        available: [
          { currency: 'usd', amount: 30000 },
          { currency: 'usd', amount: 20000 },
        ],
        pending: [{ currency: 'usd', amount: 5000 }],
      });

      const balance = await getConnectAccountBalance('acct_789');
      expect(balance).toEqual({ available: 50000, pending: 5000 });
    });

    it('should ignore non-USD balances', async () => {
      (stripe.balance.retrieve as jest.Mock).mockResolvedValue({
        available: [
          { currency: 'usd', amount: 10000 },
          { currency: 'eur', amount: 99999 },
        ],
        pending: [{ currency: 'gbp', amount: 88888 }],
      });

      const balance = await getConnectAccountBalance('acct_multi');
      expect(balance).toEqual({ available: 10000, pending: 0 });
    });

    it('should return zeros when no USD balances exist', async () => {
      (stripe.balance.retrieve as jest.Mock).mockResolvedValue({
        available: [],
        pending: [],
      });

      const balance = await getConnectAccountBalance('acct_empty');
      expect(balance).toEqual({ available: 0, pending: 0 });
    });
  });
});
