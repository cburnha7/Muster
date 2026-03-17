/**
 * Unit tests for the league-ledger service.
 *
 * Covers:
 * - First transaction (no previous balance) → balanceAfter = amount
 * - Subsequent transaction → running balance calculated from last transaction
 * - Court cost recorded with correct negative amount
 */

const mockFindFirst = jest.fn();
const mockCreate = jest.fn();
const mockFindMany = jest.fn();

jest.mock('../../index', () => ({
  prisma: {
    leagueTransaction: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
      create: (...args: any[]) => mockCreate(...args),
      findMany: (...args: any[]) => mockFindMany(...args),
    },
  },
}));

import { recordLeagueTransaction, getLeagueLedger } from '../league-ledger';

describe('recordLeagueTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets balanceAfter to the amount when no previous transactions exist', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockImplementation(({ data }: any) => Promise.resolve({ id: 'txn-1', ...data }));

    const result = await recordLeagueTransaction({
      leagueId: 'league-1',
      seasonId: 'season-1',
      type: 'dues_received',
      amount: 5000,
      description: 'Season dues from Court Kings',
      rosterId: 'roster-1',
    });

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { leagueId: 'league-1', seasonId: 'season-1' },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        leagueId: 'league-1',
        seasonId: 'season-1',
        type: 'dues_received',
        amount: 5000,
        balanceAfter: 5000,
        description: 'Season dues from Court Kings',
        rosterId: 'roster-1',
      }),
    });

    expect(result.balanceAfter).toBe(5000);
  });

  it('calculates running balance from the last transaction', async () => {
    mockFindFirst.mockResolvedValue({ balanceAfter: 10000 });
    mockCreate.mockImplementation(({ data }: any) => Promise.resolve({ id: 'txn-2', ...data }));

    const result = await recordLeagueTransaction({
      leagueId: 'league-1',
      seasonId: 'season-1',
      type: 'court_cost',
      amount: -8000,
      description: 'Court cost for Court Kings vs Hoop Dreams',
      facilityId: 'facility-1',
      rentalId: 'rental-1',
      matchId: 'match-1',
    });

    expect(result.balanceAfter).toBe(2000);

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: -8000,
        balanceAfter: 2000,
        type: 'court_cost',
        facilityId: 'facility-1',
        rentalId: 'rental-1',
        matchId: 'match-1',
      }),
    });
  });

  it('records a court cost with negative amount and all optional fields', async () => {
    mockFindFirst.mockResolvedValue({ balanceAfter: 15000 });
    mockCreate.mockImplementation(({ data }: any) => Promise.resolve({ id: 'txn-3', ...data }));

    const result = await recordLeagueTransaction({
      leagueId: 'league-2',
      seasonId: 'season-2',
      type: 'court_cost',
      amount: -6500,
      description: 'Court cost for Slam Squad vs Net Setters',
      facilityId: 'facility-2',
      rentalId: 'rental-2',
      matchId: 'match-2',
      stripePaymentId: 'pi_abc123',
    });

    expect(result.amount).toBe(-6500);
    expect(result.balanceAfter).toBe(8500);
    expect(result.stripePaymentId).toBe('pi_abc123');
  });

  it('handles balance going negative for court costs exceeding balance', async () => {
    mockFindFirst.mockResolvedValue({ balanceAfter: 3000 });
    mockCreate.mockImplementation(({ data }: any) => Promise.resolve({ id: 'txn-4', ...data }));

    const result = await recordLeagueTransaction({
      leagueId: 'league-1',
      seasonId: 'season-1',
      type: 'court_cost',
      amount: -8000,
      description: 'Court cost for Court Kings vs Hoop Dreams',
    });

    expect(result.balanceAfter).toBe(-5000);
  });
});


describe('getLeagueLedger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns transactions ordered by createdAt ascending', async () => {
    const mockTransactions = [
      {
        id: 'txn-1', leagueId: 'league-1', seasonId: 'season-1',
        type: 'dues_received', amount: 5000, balanceAfter: 5000,
        description: 'Season dues from Court Kings', rosterId: 'roster-1',
        createdAt: new Date('2025-01-15T10:00:00Z'),
      },
      {
        id: 'txn-2', leagueId: 'league-1', seasonId: 'season-1',
        type: 'court_cost', amount: -3000, balanceAfter: 2000,
        description: 'Court cost for match', facilityId: 'facility-1',
        createdAt: new Date('2025-01-20T14:00:00Z'),
      },
    ];
    mockFindMany.mockResolvedValue(mockTransactions);

    const result = await getLeagueLedger('league-1', 'season-1');

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { leagueId: 'league-1', seasonId: 'season-1' },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toEqual(mockTransactions);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no transactions exist', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await getLeagueLedger('league-1', 'season-1');

    expect(result).toEqual([]);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { leagueId: 'league-1', seasonId: 'season-1' },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('filters by both leagueId and seasonId', async () => {
    mockFindMany.mockResolvedValue([]);

    await getLeagueLedger('league-X', 'season-Y');

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { leagueId: 'league-X', seasonId: 'season-Y' },
      orderBy: { createdAt: 'asc' },
    });
  });
});
