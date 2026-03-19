/**
 * Tests for SuggestedDuesCalculator component
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import {
  SuggestedDuesCalculator,
  calculateSuggestedDuesLocal,
} from '../../../src/components/league/SuggestedDuesCalculator';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('calculateSuggestedDuesLocal', () => {
  it('should return ceiled result for valid inputs', () => {
    expect(calculateSuggestedDuesLocal(10, 100, 3)).toBe(334);
  });

  it('should return exact result when evenly divisible', () => {
    expect(calculateSuggestedDuesLocal(10, 75, 5)).toBe(150);
  });

  it('should return 0 for zero rosterCount', () => {
    expect(calculateSuggestedDuesLocal(10, 75, 0)).toBe(0);
  });

  it('should return 0 for zero gamesPerTeam', () => {
    expect(calculateSuggestedDuesLocal(0, 75, 5)).toBe(0);
  });

  it('should return 0 for zero avgCourtCost', () => {
    expect(calculateSuggestedDuesLocal(10, 0, 5)).toBe(0);
  });

  it('should return 0 for negative inputs', () => {
    expect(calculateSuggestedDuesLocal(-1, 75, 5)).toBe(0);
    expect(calculateSuggestedDuesLocal(10, -1, 5)).toBe(0);
    expect(calculateSuggestedDuesLocal(10, 75, -1)).toBe(0);
  });
});

describe('SuggestedDuesCalculator', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should render nothing when gamesPerTeam is 0', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        avgCourtCost: 100,
        gamesPerTeam: 1,
        rosterCount: 1,
        suggestedMinDues: 100,
      }),
    });

    const { toJSON } = render(
      <SuggestedDuesCalculator
        gamesPerTeam={0}
        rosterCount={5}
        sportType="basketball"
        apiBaseUrl="http://test-api"
      />,
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    expect(toJSON()).toBeNull();
  });

  it('should render nothing when rosterCount is 0', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        avgCourtCost: 100,
        gamesPerTeam: 1,
        rosterCount: 1,
        suggestedMinDues: 100,
      }),
    });

    const { toJSON } = render(
      <SuggestedDuesCalculator
        gamesPerTeam={10}
        rosterCount={0}
        sportType="basketball"
        apiBaseUrl="http://test-api"
      />,
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    expect(toJSON()).toBeNull();
  });

  it('should display suggested dues after fetching avg court cost', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        avgCourtCost: 100,
        gamesPerTeam: 1,
        rosterCount: 1,
        suggestedMinDues: 100,
      }),
    });

    // 10 games × $100 / 4 rosters = $250
    const { getByText } = render(
      <SuggestedDuesCalculator
        gamesPerTeam={10}
        rosterCount={4}
        sportType="basketball"
        apiBaseUrl="http://test-api"
      />,
    );

    await waitFor(() => {
      expect(getByText('$250')).toBeTruthy();
    });

    expect(getByText('Suggested Minimum Dues')).toBeTruthy();
  });

  it('should display error message when fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { getByText } = render(
      <SuggestedDuesCalculator
        gamesPerTeam={10}
        rosterCount={4}
        sportType="basketball"
        apiBaseUrl="http://test-api"
      />,
    );

    await waitFor(() => {
      expect(getByText('Unable to calculate — try again later')).toBeTruthy();
    });
  });

  it('should display the formula breakdown', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        avgCourtCost: 75,
        gamesPerTeam: 1,
        rosterCount: 1,
        suggestedMinDues: 75,
      }),
    });

    const { getByText } = render(
      <SuggestedDuesCalculator
        gamesPerTeam={10}
        rosterCount={5}
        sportType="tennis"
        apiBaseUrl="http://test-api"
      />,
    );

    await waitFor(() => {
      expect(getByText('$150')).toBeTruthy();
    });

    expect(getByText(/10 games × \$75 avg court cost ÷ 5 rosters/)).toBeTruthy();
  });

  it('should display advisory text', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        avgCourtCost: 50,
        gamesPerTeam: 1,
        rosterCount: 1,
        suggestedMinDues: 50,
      }),
    });

    const { getByText } = render(
      <SuggestedDuesCalculator
        gamesPerTeam={8}
        rosterCount={4}
        sportType="soccer"
        apiBaseUrl="http://test-api"
      />,
    );

    await waitFor(() => {
      expect(
        getByText(/minimum to cover court costs/),
      ).toBeTruthy();
    });
  });

  it('should use singular "roster" when rosterCount is 1', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        avgCourtCost: 100,
        gamesPerTeam: 1,
        rosterCount: 1,
        suggestedMinDues: 100,
      }),
    });

    const { getByText } = render(
      <SuggestedDuesCalculator
        gamesPerTeam={5}
        rosterCount={1}
        sportType="basketball"
        apiBaseUrl="http://test-api"
      />,
    );

    await waitFor(() => {
      expect(getByText(/÷ 1 roster$/)).toBeTruthy();
    });
  });
});
