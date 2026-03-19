import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

// Mock navigation
const focusCallbacks: Array<() => void> = [];
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => (() => void) | void) => {
    // Use React.useEffect to run the callback once on mount
    const React = require('react');
    React.useEffect(() => { return cb(); }, []);
  },
}));

// Mock the league service
const mockGetLedger = jest.fn();
jest.mock('../../../src/services/api/LeagueService', () => ({
  leagueService: { getLedger: (...args: any[]) => mockGetLedger(...args) },
}));

import { LeagueLedger } from '../../../src/components/league/LeagueLedger';

describe('LeagueLedger', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows loading indicator initially', () => {
    mockGetLedger.mockReturnValue(new Promise(() => {})); // never resolves
    const { getByTestId, queryByText } = render(
      <LeagueLedger leagueId="lg-1" seasonId="s-1" />
    );
    // ActivityIndicator renders — no transactions text visible
    expect(queryByText('No transactions yet')).toBeNull();
  });

  it('shows empty state when no transactions', async () => {
    mockGetLedger.mockResolvedValue({ transactions: [] });
    const { getByText } = render(
      <LeagueLedger leagueId="lg-1" seasonId="s-1" />
    );
    await waitFor(() => {
      expect(getByText('No transactions yet')).toBeTruthy();
    });
  });

  it('renders transactions with correct labels and amounts', async () => {
    mockGetLedger.mockResolvedValue({
      transactions: [
        {
          id: 't1', leagueId: 'lg-1', seasonId: 's-1',
          type: 'dues_received', amount: 20000, balanceAfter: 20000,
          description: 'Season dues from Court Kings',
          createdAt: '2025-01-15T10:00:00Z',
        },
        {
          id: 't2', leagueId: 'lg-1', seasonId: 's-1',
          type: 'court_cost', amount: -8000, balanceAfter: 12000,
          description: 'Court cost for match',
          createdAt: '2025-01-20T14:00:00Z',
        },
        {
          id: 't3', leagueId: 'lg-1', seasonId: 's-1',
          type: 'refund', amount: 3000, balanceAfter: 15000,
          description: 'Cancellation refund',
          createdAt: '2025-01-22T09:00:00Z',
        },
      ],
    });

    const { getByText, getAllByText } = render(
      <LeagueLedger leagueId="lg-1" seasonId="s-1" />
    );

    await waitFor(() => {
      expect(getByText('Season Ledger')).toBeTruthy();
    });

    // Type labels
    expect(getByText('Dues Received')).toBeTruthy();
    expect(getByText('Court Cost')).toBeTruthy();
    expect(getByText('Refund')).toBeTruthy();

    // Descriptions
    expect(getByText('Season dues from Court Kings')).toBeTruthy();
    expect(getByText('Court cost for match')).toBeTruthy();
    expect(getByText('Cancellation refund')).toBeTruthy();

    // Amounts
    expect(getByText('$200.00')).toBeTruthy();
    expect(getByText('-$80.00')).toBeTruthy();
    expect(getByText('$30.00')).toBeTruthy();

    // Current balance header (last transaction's balanceAfter)
    // The balance badge shows $150.00
    expect(getAllByText('$150.00').length).toBeGreaterThanOrEqual(1);
  });

  it('shows error state on API failure', async () => {
    mockGetLedger.mockRejectedValue(new Error('Network error'));
    const { getByText } = render(
      <LeagueLedger leagueId="lg-1" seasonId="s-1" />
    );
    await waitFor(() => {
      expect(getByText('Network error')).toBeTruthy();
    });
  });

  it('calls getLedger with correct params', async () => {
    mockGetLedger.mockResolvedValue({ transactions: [] });
    render(<LeagueLedger leagueId="my-league" seasonId="my-season" />);
    await waitFor(() => {
      expect(mockGetLedger).toHaveBeenCalledWith('my-league', 'my-season');
    });
  });
});
