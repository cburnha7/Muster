/**
 * Unit tests for the away-confirmation background job.
 *
 * Mocks Prisma to verify:
 * - Expired matches are found and lapsed
 * - RosterStrike records are created with correct running count
 * - Matches without a season are skipped with an error
 * - Transaction failures are captured per-match without crashing the job
 */

// ---------------------------------------------------------------------------
// Mock Prisma — the module import is mocked so the default param resolves,
// but we also pass the mock explicitly via the db parameter for clarity.
// ---------------------------------------------------------------------------
const mockMatchFindMany = jest.fn();
const mockMatchUpdate = jest.fn();
const mockRosterStrikeCount = jest.fn();
const mockRosterStrikeCreate = jest.fn();

const txClient = {
  match: { update: mockMatchUpdate },
  rosterStrike: { count: mockRosterStrikeCount, create: mockRosterStrikeCreate },
};

const mockTransaction = jest.fn((cb: (tx: any) => Promise<any>) => cb(txClient));

const mockPrisma: any = {
  match: { findMany: mockMatchFindMany },
  $transaction: mockTransaction,
};

jest.mock('../../index', () => ({
  prisma: {
    match: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

// Mock NotificationService
const mockNotifyCommissionerStrikeThreshold = jest.fn();
jest.mock('../../services/NotificationService', () => ({
  NotificationService: {
    notifyCommissionerStrikeThreshold: (...args: any[]) => mockNotifyCommissionerStrikeThreshold(...args),
  },
}));

import { processExpiredConfirmations } from '../away-confirmation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildExpiredMatch(overrides: Record<string, any> = {}) {
  return {
    id: 'match-1',
    seasonId: 'season-1',
    league: { id: 'league-1', name: 'Sunday League', organizerId: 'commissioner-1' },
    homeTeam: {
      id: 'roster-home',
      name: 'Court Kings',
      members: [{ userId: 'home-manager-1' }],
    },
    awayTeam: { id: 'roster-away', name: 'Net Ninjas' },
    season: { id: 'season-1' },
    confirmationDeadline: new Date(Date.now() - 60_000),
    status: 'pending_away_confirm',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
  // Reset the transaction mock to default behaviour
  mockTransaction.mockImplementation((cb: any) => cb(txClient));
});

describe('processExpiredConfirmations', () => {
  it('returns zero counts when no expired matches exist', async () => {
    mockMatchFindMany.mockResolvedValue([]);

    const metrics = await processExpiredConfirmations(mockPrisma);

    expect(metrics.matchesChecked).toBe(0);
    expect(metrics.matchesLapsed).toBe(0);
    expect(metrics.strikesRecorded).toBe(0);
    expect(metrics.errors).toHaveLength(0);
  });

  it('lapses an expired match, records a strike, and reports notifications', async () => {
    const match = buildExpiredMatch();
    mockMatchFindMany.mockResolvedValue([match]);
    mockMatchUpdate.mockResolvedValue({});
    mockRosterStrikeCount.mockResolvedValue(0);
    mockRosterStrikeCreate.mockResolvedValue({});

    const metrics = await processExpiredConfirmations(mockPrisma);

    expect(metrics.matchesChecked).toBe(1);
    expect(metrics.matchesLapsed).toBe(1);
    expect(metrics.strikesRecorded).toBe(1);
    // Commissioner + home manager
    expect(metrics.notificationsSent).toBe(2);
    expect(metrics.errors).toHaveLength(0);

    // Verify match was lapsed
    expect(mockMatchUpdate).toHaveBeenCalledWith({
      where: { id: 'match-1' },
      data: { status: 'lapsed' },
    });

    // Verify strike was created with running count = 1
    expect(mockRosterStrikeCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        rosterId: 'roster-away',
        seasonId: 'season-1',
        reason: 'failed_away_confirmation',
        matchId: 'match-1',
        count: 1,
      }),
    });
  });

  it('calculates running strike count correctly for repeat offenders', async () => {
    const match = buildExpiredMatch();
    mockMatchFindMany.mockResolvedValue([match]);
    mockMatchUpdate.mockResolvedValue({});
    mockRosterStrikeCount.mockResolvedValue(2); // already 2 strikes
    mockRosterStrikeCreate.mockResolvedValue({});

    const metrics = await processExpiredConfirmations(mockPrisma);

    expect(metrics.strikesRecorded).toBe(1);
    expect(mockRosterStrikeCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ count: 3 }),
    });
  });

  it('skips a match with no season and records an error', async () => {
    const match = buildExpiredMatch({ seasonId: null, season: null });
    mockMatchFindMany.mockResolvedValue([match]);

    const metrics = await processExpiredConfirmations(mockPrisma);

    expect(metrics.matchesChecked).toBe(1);
    expect(metrics.matchesLapsed).toBe(0);
    expect(metrics.strikesRecorded).toBe(0);
    expect(metrics.errors).toHaveLength(1);
    expect(metrics.errors[0].matchId).toBe('match-1');
    expect(metrics.errors[0].error).toMatch(/no associated season/i);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('captures per-match transaction errors without crashing the job', async () => {
    const match1 = buildExpiredMatch({ id: 'match-1' });
    const match2 = buildExpiredMatch({ id: 'match-2' });
    mockMatchFindMany.mockResolvedValue([match1, match2]);

    // First match transaction fails, second succeeds
    mockTransaction
      .mockRejectedValueOnce(new Error('DB write failed'))
      .mockImplementationOnce((cb: any) => cb(txClient));
    mockMatchUpdate.mockResolvedValue({});
    mockRosterStrikeCount.mockResolvedValue(0);
    mockRosterStrikeCreate.mockResolvedValue({});

    const metrics = await processExpiredConfirmations(mockPrisma);

    expect(metrics.matchesChecked).toBe(2);
    expect(metrics.matchesLapsed).toBe(1);
    expect(metrics.errors).toHaveLength(1);
    expect(metrics.errors[0].matchId).toBe('match-1');
  });

  it('processes multiple expired matches independently', async () => {
    const matches = [
      buildExpiredMatch({ id: 'match-a', awayTeam: { id: 'roster-a', name: 'Alpha' } }),
      buildExpiredMatch({ id: 'match-b', awayTeam: { id: 'roster-b', name: 'Bravo' } }),
    ];
    mockMatchFindMany.mockResolvedValue(matches);
    mockMatchUpdate.mockResolvedValue({});
    mockRosterStrikeCount.mockResolvedValue(0);
    mockRosterStrikeCreate.mockResolvedValue({});

    const metrics = await processExpiredConfirmations(mockPrisma);

    expect(metrics.matchesChecked).toBe(2);
    expect(metrics.matchesLapsed).toBe(2);
    expect(metrics.strikesRecorded).toBe(2);
  });

  it('uses seasonId from match when season relation is not included', async () => {
    const match = buildExpiredMatch({ seasonId: 'season-direct', season: null });
    mockMatchFindMany.mockResolvedValue([match]);
    mockMatchUpdate.mockResolvedValue({});
    mockRosterStrikeCount.mockResolvedValue(0);
    mockRosterStrikeCreate.mockResolvedValue({});

    await processExpiredConfirmations(mockPrisma);

    expect(mockRosterStrikeCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ seasonId: 'season-direct' }),
    });
  });

  it('still notifies commissioner when home team has no manager', async () => {
    const match = buildExpiredMatch({
      homeTeam: { id: 'roster-home', name: 'Court Kings', members: [] },
    });
    mockMatchFindMany.mockResolvedValue([match]);
    mockMatchUpdate.mockResolvedValue({});
    mockRosterStrikeCount.mockResolvedValue(0);
    mockRosterStrikeCreate.mockResolvedValue({});

    const metrics = await processExpiredConfirmations(mockPrisma);

    // Only commissioner notification (home manager has no members)
    expect(metrics.notificationsSent).toBe(1);
    expect(metrics.matchesLapsed).toBe(1);
  });

  it('sends strike threshold notification when roster reaches 3 strikes', async () => {
    const match = buildExpiredMatch();
    mockMatchFindMany.mockResolvedValue([match]);
    mockMatchUpdate.mockResolvedValue({});
    mockRosterStrikeCount.mockResolvedValue(2); // already 2 strikes → newCount = 3
    mockRosterStrikeCreate.mockResolvedValue({});

    const metrics = await processExpiredConfirmations(mockPrisma);

    expect(mockNotifyCommissionerStrikeThreshold).toHaveBeenCalledWith(
      'roster-away',
      'season-1',
      3,
    );
    // Commissioner + home manager + strike threshold = 3
    expect(metrics.notificationsSent).toBe(3);
  });

  it('sends strike threshold notification when roster exceeds 3 strikes', async () => {
    const match = buildExpiredMatch();
    mockMatchFindMany.mockResolvedValue([match]);
    mockMatchUpdate.mockResolvedValue({});
    mockRosterStrikeCount.mockResolvedValue(4); // already 4 strikes → newCount = 5
    mockRosterStrikeCreate.mockResolvedValue({});

    const metrics = await processExpiredConfirmations(mockPrisma);

    expect(mockNotifyCommissionerStrikeThreshold).toHaveBeenCalledWith(
      'roster-away',
      'season-1',
      5,
    );
    expect(metrics.notificationsSent).toBe(3);
  });

  it('does not send strike threshold notification when below 3 strikes', async () => {
    const match = buildExpiredMatch();
    mockMatchFindMany.mockResolvedValue([match]);
    mockMatchUpdate.mockResolvedValue({});
    mockRosterStrikeCount.mockResolvedValue(0); // 0 strikes → newCount = 1
    mockRosterStrikeCreate.mockResolvedValue({});

    await processExpiredConfirmations(mockPrisma);

    expect(mockNotifyCommissionerStrikeThreshold).not.toHaveBeenCalled();
  });
});
