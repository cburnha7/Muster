import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { StandingsTab } from '../../../../src/screens/leagues/tabs/StandingsTab';

// Mock the services
jest.mock('../../../../src/services/api/LeagueService');
jest.mock('../../../../src/services/api/SeasonService');

// Mock the components
jest.mock('../../../../src/components/league/StandingsTable', () => ({
  StandingsTable: ({ standings, onTeamPress }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="standings-table">
        {standings.map((standing: any) => (
          <TouchableOpacity
            key={standing.team.id}
            testID={`team-${standing.team.id}`}
            onPress={() => onTeamPress(standing.team.id)}
          >
            <Text>{standing.team.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  },
}));

jest.mock('../../../../src/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => {
    const { View, Text } = require('react-native');
    return (
      <View testID="loading-spinner">
        <Text>Loading...</Text>
      </View>
    );
  },
}));

jest.mock('../../../../src/components/ui/ErrorDisplay', () => ({
  ErrorDisplay: ({ message, onRetry }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="error-display">
        <Text>{message}</Text>
        <TouchableOpacity testID="retry-button" onPress={onRetry}>
          <Text>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

jest.mock('../../../../src/components/forms/FormSelect', () => ({
  FormSelect: ({ value, options, onSelect }: any) => {
    const { View, TouchableOpacity, Text } = require('react-native');
    return (
      <View testID="form-select">
        {options.map((option: any) => (
          <TouchableOpacity
            key={option.value}
            testID={`option-${option.value}`}
            onPress={() => onSelect(option)}
          >
            <Text>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  },
}));

describe('StandingsTab', () => {
  const mockLeagueId = 'league-123';
  const mockStandings = [
    {
      rank: 1,
      team: { id: 'team-1', name: 'Team Alpha' },
      membership: { id: 'mem-1', points: 15 },
      stats: {
        matchesPlayed: 5,
        wins: 5,
        losses: 0,
        draws: 0,
        points: 15,
        goalsFor: 12,
        goalsAgainst: 2,
        goalDifference: 10,
        form: [],
      },
    },
    {
      rank: 2,
      team: { id: 'team-2', name: 'Team Beta' },
      membership: { id: 'mem-2', points: 10 },
      stats: {
        matchesPlayed: 5,
        wins: 3,
        losses: 1,
        draws: 1,
        points: 10,
        goalsFor: 8,
        goalsAgainst: 5,
        goalDifference: 3,
        form: [],
      },
    },
  ];

  const mockSeasons = [
    {
      id: 'season-1',
      name: 'Spring 2024',
      leagueId: mockLeagueId,
      isActive: true,
      isCompleted: false,
      startDate: '2024-03-01',
      endDate: '2024-06-01',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'season-2',
      name: 'Fall 2023',
      leagueId: mockLeagueId,
      isActive: false,
      isCompleted: true,
      startDate: '2023-09-01',
      endDate: '2023-12-01',
      createdAt: '2023-08-01',
      updatedAt: '2023-12-01',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    const { LeagueService } = require('../../../../src/services/api/LeagueService');
    const { seasonService } = require('../../../../src/services/api/SeasonService');

    // Mock LeagueService
    LeagueService.mockImplementation(() => ({
      getStandings: jest.fn().mockResolvedValue(mockStandings),
    }));

    // Mock seasonService
    seasonService.getLeagueSeasons = jest.fn().mockResolvedValue({
      data: mockSeasons,
      total: mockSeasons.length,
      page: 1,
      limit: 100,
      totalPages: 1,
    });
  });

  it('should render loading spinner initially', () => {
    const { getByTestId } = render(<StandingsTab leagueId={mockLeagueId} />);
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('should load and display standings', async () => {
    const { getByTestId, getByText } = render(<StandingsTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByTestId('standings-table')).toBeTruthy();
    });

    expect(getByText('Team Alpha')).toBeTruthy();
    expect(getByText('Team Beta')).toBeTruthy();
  });

  it('should load seasons and display season selector', async () => {
    const { getByTestId } = render(<StandingsTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByTestId('form-select')).toBeTruthy();
    });

    const { seasonService } = require('../../../../src/services/api/SeasonService');
    expect(seasonService.getLeagueSeasons).toHaveBeenCalledWith(mockLeagueId, 1, 100);
  });

  it('should auto-select active season', async () => {
    const { getByTestId } = render(<StandingsTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByTestId('standings-table')).toBeTruthy();
    });

    // Verify getStandings was called with active season ID
    const { LeagueService } = require('../../../../src/services/api/LeagueService');
    const leagueServiceInstance = LeagueService.mock.results[0].value;
    await waitFor(() => {
      expect(leagueServiceInstance.getStandings).toHaveBeenCalledWith(
        mockLeagueId,
        'season-1'
      );
    });
  });

  it('should handle season change', async () => {
    const { getByTestId } = render(<StandingsTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByTestId('form-select')).toBeTruthy();
    });

    // Change to Fall 2023 season
    const fallSeasonOption = getByTestId('option-season-2');
    fireEvent.press(fallSeasonOption);

    await waitFor(() => {
      const { LeagueService } = require('../../../../src/services/api/LeagueService');
      const leagueServiceInstance = LeagueService.mock.results[0].value;
      expect(leagueServiceInstance.getStandings).toHaveBeenCalledWith(
        mockLeagueId,
        'season-2'
      );
    });
  });

  it('should handle refresh button press', async () => {
    const { getByText } = render(<StandingsTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByText('Refresh')).toBeTruthy();
    });

    const refreshButton = getByText('Refresh');
    fireEvent.press(refreshButton);

    await waitFor(() => {
      const { LeagueService } = require('../../../../src/services/api/LeagueService');
      const leagueServiceInstance = LeagueService.mock.results[0].value;
      // Should be called at least twice (initial load + refresh)
      expect(leagueServiceInstance.getStandings).toHaveBeenCalledTimes(2);
    });
  });

  it('should display error message on failure', async () => {
    const errorMessage = 'Failed to load standings';
    const { LeagueService } = require('../../../../src/services/api/LeagueService');
    LeagueService.mockImplementation(() => ({
      getStandings: jest.fn().mockRejectedValue(new Error(errorMessage)),
    }));

    const { getByTestId, getByText } = render(<StandingsTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByTestId('error-display')).toBeTruthy();
    });

    expect(getByText(errorMessage)).toBeTruthy();
  });

  it('should retry loading on error retry button press', async () => {
    const errorMessage = 'Failed to load standings';
    const mockGetStandings = jest
      .fn()
      .mockRejectedValueOnce(new Error(errorMessage))
      .mockResolvedValueOnce(mockStandings);

    const { LeagueService } = require('../../../../src/services/api/LeagueService');
    LeagueService.mockImplementation(() => ({
      getStandings: mockGetStandings,
    }));

    const { getByTestId, getByText } = render(<StandingsTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByTestId('error-display')).toBeTruthy();
    });

    const retryButton = getByTestId('retry-button');
    fireEvent.press(retryButton);

    await waitFor(() => {
      expect(getByTestId('standings-table')).toBeTruthy();
    });
  });

  it('should display empty state when no standings available', async () => {
    const { LeagueService } = require('../../../../src/services/api/LeagueService');
    LeagueService.mockImplementation(() => ({
      getStandings: jest.fn().mockResolvedValue([]),
    }));

    const { getByText } = render(<StandingsTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByText('No standings available')).toBeTruthy();
    });

    expect(getByText('Standings will appear once matches are recorded')).toBeTruthy();
  });

  it('should handle team press', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const { getByTestId } = render(<StandingsTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByTestId('standings-table')).toBeTruthy();
    });

    const teamButton = getByTestId('team-team-1');
    fireEvent.press(teamButton);

    expect(consoleSpy).toHaveBeenCalledWith('Team pressed:', 'team-1');

    consoleSpy.mockRestore();
  });

  it('should show "All Seasons" option when seasons are available', async () => {
    const { getByTestId } = render(<StandingsTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByTestId('form-select')).toBeTruthy();
    });

    expect(getByTestId('option-all')).toBeTruthy();
  });

  it('should load all-time standings when "All Seasons" is selected', async () => {
    const { getByTestId } = render(<StandingsTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByTestId('form-select')).toBeTruthy();
    });

    // Select "All Seasons"
    const allSeasonsOption = getByTestId('option-all');
    fireEvent.press(allSeasonsOption);

    await waitFor(() => {
      const { LeagueService } = require('../../../../src/services/api/LeagueService');
      const leagueServiceInstance = LeagueService.mock.results[0].value;
      expect(leagueServiceInstance.getStandings).toHaveBeenCalledWith(
        mockLeagueId,
        undefined
      );
    });
  });
});
