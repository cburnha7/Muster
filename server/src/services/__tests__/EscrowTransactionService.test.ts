/**
 * Unit tests for EscrowTransactionService.
 *
 * Covers:
 * - logTransaction creates a record with correct fields
 * - logTransaction handles optional stripePaymentIntentId
 * - getByRental returns transactions ordered by createdAt desc
 * - getByRental returns empty array when no transactions exist
 */

const mockCreate = jest.fn();
const mockFindMany = jest.fn();

jest.mock('../../index', () => ({
  prisma: {
    escrowTransaction: {
      create: (...args: any[]) => mockCreate(...args),
      findMany: (...args: any[]) => mockFindMany(...args),
    },
  },
}));

import { EscrowTransactionService } from '../EscrowTransactionService';

describe('EscrowTransactionService.logTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a transaction record with all fields', async () => {
    const input = {
      rentalId: 'rental-1',
      type: 'authorization' as const,
      amount: 5000,
      stripePaymentIntentId: 'pi_abc123',
      status: 'completed' as const,
    };
    mockCreate.mockResolvedValue({ id: 'txn-1', ...input, createdAt: new Date() });

    const result = await EscrowTransactionService.logTransaction(input);

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        rentalId: 'rental-1',
        type: 'authorization',
        amount: 5000,
        stripePaymentIntentId: 'pi_abc123',
        status: 'completed',
      },
    });
    expect(result.rentalId).toBe('rental-1');
    expect(result.type).toBe('authorization');
    expect(result.amount).toBe(5000);
  });

  it('creates a transaction without stripePaymentIntentId', async () => {
    const input = {
      rentalId: 'rental-2',
      type: 'surplus_payout' as const,
      amount: 1200,
      status: 'pending' as const,
    };
    mockCreate.mockResolvedValue({ id: 'txn-2', ...input, stripePaymentIntentId: undefined, createdAt: new Date() });

    const result = await EscrowTransactionService.logTransaction(input);

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        rentalId: 'rental-2',
        type: 'surplus_payout',
        amount: 1200,
        stripePaymentIntentId: undefined,
        status: 'pending',
      },
    });
    expect(result.stripePaymentIntentId).toBeUndefined();
  });

  it('handles failed status transactions', async () => {
    const input = {
      rentalId: 'rental-3',
      type: 'capture' as const,
      amount: 8000,
      stripePaymentIntentId: 'pi_fail',
      status: 'failed' as const,
    };
    mockCreate.mockResolvedValue({ id: 'txn-3', ...input, createdAt: new Date() });

    const result = await EscrowTransactionService.logTransaction(input);

    expect(result.status).toBe('failed');
  });
});

describe('EscrowTransactionService.getByRental', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns transactions ordered by createdAt desc', async () => {
    const mockTransactions = [
      { id: 'txn-2', rentalId: 'rental-1', type: 'capture', amount: 5000, status: 'completed', createdAt: new Date('2025-01-20') },
      { id: 'txn-1', rentalId: 'rental-1', type: 'authorization', amount: 5000, status: 'completed', createdAt: new Date('2025-01-15') },
    ];
    mockFindMany.mockResolvedValue(mockTransactions);

    const result = await EscrowTransactionService.getByRental('rental-1');

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { rentalId: 'rental-1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(mockTransactions);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no transactions exist', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await EscrowTransactionService.getByRental('rental-nonexistent');

    expect(result).toEqual([]);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { rentalId: 'rental-nonexistent' },
      orderBy: { createdAt: 'desc' },
    });
  });
});
