/**
 * Unit tests for Connect Express onboarding service.
 *
 * Tests the business logic directly — resolveEntity, startOnboarding,
 * checkOnboardingStatus, listConnectAccounts — with mocked Prisma and Stripe.
 */

const mockCreateConnectAccount = jest.fn();
const mockCreateConnectAccountLink = jest.fn();
const mockGetConnectAccountStatus = jest.fn();

jest.mock('../stripe-connect', () => ({
  createConnectAccount: (...args: any[]) => mockCreateConnectAccount(...args),
  createConnectAccountLink: (...args: any[]) => mockCreateConnectAccountLink(...args),
  getConnectAccountStatus: (...args: any[]) => mockGetConnectAccountStatus(...args),
}));

import {
  resolveEntity,
  storeConnectAccountId,
  startOnboarding,
  checkOnboardingStatus,
  listConnectAccounts,
} from '../connect-onboarding';

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------

function buildMockPrisma() {
  return {
    teamMember: { findFirst: jest.fn(), findMany: jest.fn() },
    team: { findUnique: jest.fn(), update: jest.fn() },
    facility: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    league: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
  } as any;
}

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// resolveEntity
// ---------------------------------------------------------------------------

describe('resolveEntity', () => {
  it('returns error when user is not a roster manager or captain', async () => {
    const prisma = buildMockPrisma();
    prisma.teamMember.findFirst.mockResolvedValue(null);

    const result = await resolveEntity(prisma, 'roster', 'team-1', 'user-1');
    expect(result.error).toMatch(/manager or captain/);
    expect(result.entity).toBeNull();
  });

  it('returns error when roster is not found', async () => {
    const prisma = buildMockPrisma();
    prisma.teamMember.findFirst.mockResolvedValue({ id: 'tm-1', role: 'manager' });
    prisma.team.findUnique.mockResolvedValue(null);

    const result = await resolveEntity(prisma, 'roster', 'team-1', 'user-1');
    expect(result.error).toMatch(/Roster not found/);
  });

  it('returns roster entity when user is a manager', async () => {
    const prisma = buildMockPrisma();
    prisma.teamMember.findFirst.mockResolvedValue({ id: 'tm-1', role: 'manager' });
    prisma.team.findUnique.mockResolvedValue({ id: 'team-1', name: 'FC Muster', stripeAccountId: 'acct_1' });

    const result = await resolveEntity(prisma, 'roster', 'team-1', 'user-1');
    expect(result.error).toBeNull();
    expect(result.entity).toEqual({ id: 'team-1', name: 'FC Muster', connectAccountId: 'acct_1' });
  });

  it('returns error when user does not own the facility', async () => {
    const prisma = buildMockPrisma();
    prisma.facility.findUnique.mockResolvedValue({ id: 'f-1', name: 'Court A', ownerId: 'other', stripeConnectAccountId: null });

    const result = await resolveEntity(prisma, 'facility', 'f-1', 'user-1');
    expect(result.error).toMatch(/owner/);
  });

  it('returns facility entity when user is the owner', async () => {
    const prisma = buildMockPrisma();
    prisma.facility.findUnique.mockResolvedValue({ id: 'f-1', name: 'Court A', ownerId: 'user-1', stripeConnectAccountId: 'acct_f' });

    const result = await resolveEntity(prisma, 'facility', 'f-1', 'user-1');
    expect(result.entity).toEqual({ id: 'f-1', name: 'Court A', connectAccountId: 'acct_f' });
  });

  it('returns error when user is not the league organiser', async () => {
    const prisma = buildMockPrisma();
    prisma.league.findUnique.mockResolvedValue({ id: 'l-1', name: 'Spring', organizerId: 'other', stripeConnectAccountId: null });

    const result = await resolveEntity(prisma, 'league', 'l-1', 'user-1');
    expect(result.error).toMatch(/organiser/);
  });

  it('returns league entity when user is the organiser', async () => {
    const prisma = buildMockPrisma();
    prisma.league.findUnique.mockResolvedValue({ id: 'l-1', name: 'Spring', organizerId: 'user-1', stripeConnectAccountId: 'acct_l' });

    const result = await resolveEntity(prisma, 'league', 'l-1', 'user-1');
    expect(result.entity).toEqual({ id: 'l-1', name: 'Spring', connectAccountId: 'acct_l' });
  });

  it('returns error for invalid entity type', async () => {
    const prisma = buildMockPrisma();
    const result = await resolveEntity(prisma, 'club' as any, 'x', 'user-1');
    expect(result.error).toMatch(/Invalid entity type/);
  });
});

// ---------------------------------------------------------------------------
// storeConnectAccountId
// ---------------------------------------------------------------------------

describe('storeConnectAccountId', () => {
  it('updates Team.stripeAccountId for roster', async () => {
    const prisma = buildMockPrisma();
    prisma.team.update.mockResolvedValue({});

    await storeConnectAccountId(prisma, 'roster', 'team-1', 'acct_new');
    expect(prisma.team.update).toHaveBeenCalledWith({
      where: { id: 'team-1' },
      data: { stripeAccountId: 'acct_new' },
    });
  });

  it('updates Facility.stripeConnectAccountId for facility', async () => {
    const prisma = buildMockPrisma();
    prisma.facility.update.mockResolvedValue({});

    await storeConnectAccountId(prisma, 'facility', 'f-1', 'acct_fac');
    expect(prisma.facility.update).toHaveBeenCalledWith({
      where: { id: 'f-1' },
      data: { stripeConnectAccountId: 'acct_fac' },
    });
  });

  it('updates League.stripeConnectAccountId for league', async () => {
    const prisma = buildMockPrisma();
    prisma.league.update.mockResolvedValue({});

    await storeConnectAccountId(prisma, 'league', 'l-1', 'acct_league');
    expect(prisma.league.update).toHaveBeenCalledWith({
      where: { id: 'l-1' },
      data: { stripeConnectAccountId: 'acct_league' },
    });
  });
});

// ---------------------------------------------------------------------------
// startOnboarding
// ---------------------------------------------------------------------------

describe('startOnboarding', () => {
  it('returns 403 when user is not authorised', async () => {
    const prisma = buildMockPrisma();
    prisma.teamMember.findFirst.mockResolvedValue(null);

    const result = await startOnboarding(prisma, 'user-1', 'roster', 'team-1', 'http://r', 'http://t');
    expect(result.status).toBe(403);
    expect(result.error).toMatch(/manager or captain/);
  });

  it('creates a new Connect account when none exists', async () => {
    const prisma = buildMockPrisma();
    prisma.teamMember.findFirst.mockResolvedValue({ id: 'tm-1', role: 'manager' });
    prisma.team.findUnique.mockResolvedValue({ id: 'team-1', name: 'FC Muster', stripeAccountId: null });
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'coach@example.com' });
    prisma.team.update.mockResolvedValue({});
    mockCreateConnectAccount.mockResolvedValue({ id: 'acct_new' });
    mockCreateConnectAccountLink.mockResolvedValue({ url: 'https://connect.stripe.com/setup/abc' });

    const result = await startOnboarding(prisma, 'user-1', 'roster', 'team-1', 'http://r', 'http://t');

    expect(result.url).toBe('https://connect.stripe.com/setup/abc');
    expect(mockCreateConnectAccount).toHaveBeenCalledWith('coach@example.com');
    expect(prisma.team.update).toHaveBeenCalledWith({
      where: { id: 'team-1' },
      data: { stripeAccountId: 'acct_new' },
    });
  });

  it('re-uses existing Connect account for re-onboarding', async () => {
    const prisma = buildMockPrisma();
    prisma.teamMember.findFirst.mockResolvedValue({ id: 'tm-1', role: 'captain' });
    prisma.team.findUnique.mockResolvedValue({ id: 'team-1', name: 'FC Muster', stripeAccountId: 'acct_existing' });
    mockCreateConnectAccountLink.mockResolvedValue({ url: 'https://connect.stripe.com/setup/xyz' });

    const result = await startOnboarding(prisma, 'user-1', 'roster', 'team-1', 'http://r', 'http://t');

    expect(result.url).toBe('https://connect.stripe.com/setup/xyz');
    expect(mockCreateConnectAccount).not.toHaveBeenCalled();
  });

  it('creates a Connect account for a facility', async () => {
    const prisma = buildMockPrisma();
    prisma.facility.findUnique.mockResolvedValue({ id: 'f-1', name: 'Court A', ownerId: 'user-1', stripeConnectAccountId: null });
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'owner@example.com' });
    prisma.facility.update.mockResolvedValue({});
    mockCreateConnectAccount.mockResolvedValue({ id: 'acct_fac' });
    mockCreateConnectAccountLink.mockResolvedValue({ url: 'https://connect.stripe.com/setup/fac' });

    const result = await startOnboarding(prisma, 'user-1', 'facility', 'f-1', 'http://r', 'http://t');

    expect(result.url).toBe('https://connect.stripe.com/setup/fac');
    expect(prisma.facility.update).toHaveBeenCalledWith({
      where: { id: 'f-1' },
      data: { stripeConnectAccountId: 'acct_fac' },
    });
  });

  it('creates a Connect account for a league', async () => {
    const prisma = buildMockPrisma();
    prisma.league.findUnique.mockResolvedValue({ id: 'l-1', name: 'Spring', organizerId: 'user-1', stripeConnectAccountId: null });
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'commish@example.com' });
    prisma.league.update.mockResolvedValue({});
    mockCreateConnectAccount.mockResolvedValue({ id: 'acct_league' });
    mockCreateConnectAccountLink.mockResolvedValue({ url: 'https://connect.stripe.com/setup/league' });

    const result = await startOnboarding(prisma, 'user-1', 'league', 'l-1', 'http://r', 'http://t');

    expect(result.url).toBe('https://connect.stripe.com/setup/league');
    expect(prisma.league.update).toHaveBeenCalledWith({
      where: { id: 'l-1' },
      data: { stripeConnectAccountId: 'acct_league' },
    });
  });

  it('returns 404 when user is not found', async () => {
    const prisma = buildMockPrisma();
    prisma.facility.findUnique.mockResolvedValue({ id: 'f-1', name: 'Court A', ownerId: 'user-1', stripeConnectAccountId: null });
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await startOnboarding(prisma, 'user-1', 'facility', 'f-1', 'http://r', 'http://t');
    expect(result.status).toBe(404);
    expect(result.error).toMatch(/User not found/);
  });
});

// ---------------------------------------------------------------------------
// checkOnboardingStatus
// ---------------------------------------------------------------------------

describe('checkOnboardingStatus', () => {
  it('returns 403 when user is not authorised', async () => {
    const prisma = buildMockPrisma();
    prisma.teamMember.findFirst.mockResolvedValue(null);

    const result = await checkOnboardingStatus(prisma, 'user-1', 'roster', 'team-1');
    expect(result.status).toBe(403);
  });

  it('returns onboarded: false when no Connect account exists', async () => {
    const prisma = buildMockPrisma();
    prisma.facility.findUnique.mockResolvedValue({ id: 'f-1', name: 'Court A', ownerId: 'user-1', stripeConnectAccountId: null });

    const result = await checkOnboardingStatus(prisma, 'user-1', 'facility', 'f-1');
    expect(result.data).toEqual({ onboarded: false });
  });

  it('returns onboarded: true with status flags when account exists', async () => {
    const prisma = buildMockPrisma();
    prisma.facility.findUnique.mockResolvedValue({ id: 'f-1', name: 'Court A', ownerId: 'user-1', stripeConnectAccountId: 'acct_123' });
    mockGetConnectAccountStatus.mockResolvedValue({
      chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true,
    });

    const result = await checkOnboardingStatus(prisma, 'user-1', 'facility', 'f-1');
    expect(result.data).toEqual({
      onboarded: true, chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true,
    });
  });
});

// ---------------------------------------------------------------------------
// listConnectAccounts
// ---------------------------------------------------------------------------

describe('listConnectAccounts', () => {
  it('returns empty array when user manages nothing', async () => {
    const prisma = buildMockPrisma();
    prisma.teamMember.findMany.mockResolvedValue([]);
    prisma.facility.findMany.mockResolvedValue([]);
    prisma.league.findMany.mockResolvedValue([]);

    const accounts = await listConnectAccounts(prisma, 'user-1');
    expect(accounts).toEqual([]);
  });

  it('returns all managed entities with their Connect status', async () => {
    const prisma = buildMockPrisma();
    prisma.teamMember.findMany.mockResolvedValue([
      { team: { id: 'team-1', name: 'FC Muster', stripeAccountId: 'acct_t1' } },
    ]);
    prisma.facility.findMany.mockResolvedValue([
      { id: 'f-1', name: 'Court A', stripeConnectAccountId: null },
    ]);
    prisma.league.findMany.mockResolvedValue([
      { id: 'l-1', name: 'Spring League', stripeConnectAccountId: 'acct_l1' },
    ]);

    mockGetConnectAccountStatus
      .mockResolvedValueOnce({ chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true })
      .mockResolvedValueOnce({ chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: true });

    const accounts = await listConnectAccounts(prisma, 'user-1');
    expect(accounts).toHaveLength(3);

    expect(accounts[0]).toEqual({
      entityType: 'roster', entityId: 'team-1', entityName: 'FC Muster',
      accountId: 'acct_t1',
      status: { chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true },
    });

    expect(accounts[1]).toEqual({
      entityType: 'facility', entityId: 'f-1', entityName: 'Court A',
      accountId: null, status: null,
    });

    expect(accounts[2]).toEqual({
      entityType: 'league', entityId: 'l-1', entityName: 'Spring League',
      accountId: 'acct_l1',
      status: { chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: true },
    });
  });

  it('gracefully handles Stripe API errors for individual accounts', async () => {
    const prisma = buildMockPrisma();
    prisma.teamMember.findMany.mockResolvedValue([
      { team: { id: 'team-1', name: 'FC Muster', stripeAccountId: 'acct_bad' } },
    ]);
    prisma.facility.findMany.mockResolvedValue([]);
    prisma.league.findMany.mockResolvedValue([]);
    mockGetConnectAccountStatus.mockRejectedValue(new Error('Stripe error'));

    const accounts = await listConnectAccounts(prisma, 'user-1');
    expect(accounts).toHaveLength(1);
    expect(accounts[0].status).toBeNull();
  });
});
