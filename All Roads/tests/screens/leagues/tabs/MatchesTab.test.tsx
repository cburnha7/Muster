import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MatchesTab } from '../../../../src/screens/leagues/tabs/MatchesTab';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock services
jest.mock('../../../../src/services/api/MatchService');
jest.mock('../../../../src/services/api/SeasonService');

// Mock components
jest.mock('../../../../src/components/league/MatchCard', () => ({
  MatchCard: ({ match, onPress }: any) => {
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity testID={`match-card-${match.id}`} onPress={() => onPress(match)}>
        <Text>{match.homeTeam?.name} vs {match.awayTeam?.name}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../../../../src/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => {
    const { Text } = require('react-native');
    return <Text testID="loading-spinner">Loading...</Text>;
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
  FormSelect: ({ value, options, onSelect, placeholder }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID={`form-select-${placeholder}`}>
        {options.map((option: any) => (
          <TouchableOpacity
            key={option.value}
            testID={`select-option-${option.value}`}
            onPress={() => onSelect(option)}
          >
            <Text>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  },
}));

describe('MatchesTab', () => {
  const mockLeagueId = 'league-1';
  
  const mockMatches = [
    {
      id: 'match-1',
      leagueId: mockLeagueId,
      homeTeamId: 'team-1',
      awayTeamId: 'team-2',
      homeTeam: { id: 'team-1', name: 'Team A' },
      awayTeam: { id: 'team-2', name: 'Team B' },
      scheduledAt: new Date('2024-03-15T10:00:00Z'),
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'match-2',
      leagueId: mockLeagueId,
      homeTeamId: 'team-3',
      awayTeamId: 'team-4',
      homeTeam: { id: 'team-3', name: 'Team C' },
      awayTeam: { id: 'team-4', name: 'Team D' },
      scheduledAt: new Date('2024-03-20T14:00:00Z'),
      status: 'completed',
      homeScore: 3,
      awayScore: 2,
      outcome: 'home_win',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockSeasons = [
    {
      id: 'season-1',
      leagueId: mockLeagueId,
      name: 'Spring 2024',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-05-31'),
      isActive: true,
      isCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { matchService } = require('../../../../src/services/api/MatchService');
    const { seasonService } = require('../../../../src/services/api/SeasonService');

    matchService.getMatches = jest.fn().mockResolvedValue({
      data: mockMatches,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      },
    });

    seasonService.getLeagueSeasons = jest.fn().mockResolvedValue({
      data: mockSeasons,
      pagination: {
        page: 1,
        limit: 100,
        total: 1,
        totalPages: 1,
      },
    });
  });

  describe('Rendering', () => {
    it('should render loading spinner initially', () => {
      const { getByTestId } = render(
        <MatchesTab leagueId={mockLeagueId} isOperator={false} />
      );

      expect(getByTestId('loading-spinner')).toBeTruthy();
    });

    it('should render matches list after loading', async () => {
      const { getByTestId } = render(
        <MatchesTab leagueId={mockLeagueId} isOperator={false} />
      );

      await waitFor(() => {
        expect(getByTestId('match-card-match-1')).toBeTruthy();
        expect(getByTestId('match-card-match-2')).toBeTruthy();
      });
    });

    it('should render empty state when no matches', async () => {
      const { matchService } = require('../../../../src/services/api/MatchService');
      matchService.getMatches = jest.fn().mockResolvedValue({
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      });

      const { getByText } = render(
        <MatchesTab leagueId={mockLeagueId} isOperator={false} />
      );

      await waitFor(() => {
        expect(getByText('No matches found')).toBeTruthy();
      });
    });

    it('should render error display on failure', async () => {
      const { matchService } = require('../../../../src/services/api/MatchService');
      matchService.getMatches = jest.fn().mockRejectedValue(
        new Error('Failed to load matches')
      );

      const { getByTestId, getByText } = render(
        <MatchesTab leagueId={mockLeagueId} isOperator={false} />
      );

      await waitFor(() => {
        expect(getByTestId('error-display')).toBeTruthy();
        expect(getByText('Failed to load matches')).toBeTruthy();
      });
    });
  });

  describe('Filtering', () => {
    it('should filter matches by status', async () => {
      const { getByTestId } = render(
        <MatchesTab leagueId={mockLeagueId} isOperator={false} />
      );

      await waitFor(() => {
        expect(getByTestId('match-card-match-1')).toBeTruthy();
      });

      const { matchService } = require('../../../../src/services/api/MatchService');
      
      // Select "Scheduled" filter
      fireEvent.press(getByTestId('select-option-scheduled'));

      await waitFor(() => {
        expect(matchService.getMatches).toHaveBeenCalledWith(
          expect.objectContaining({
            leagueId: mockLeagueId,
            status: 'scheduled',
          }),
          1,
          20
        );
      });
    });

    it('should filter matches by season', async () => {
      const { getByTestId } = render(
        <MatchesTab leagueId={mockLeagueId} isOperator={false} />
      );

      await waitFor(() => {
        expect(getByTestId('match-card-match-1')).toBeTruthy();
      });

      const { matchService } = require('../../../../src/services/api/MatchService');

      // Season should be auto-selected (active season)
      expect(matchService.getMatches).toHaveBeenCalledWith(
        expect.objectContaining({
          leagueId: mockLeagueId,
          seasonId: 'season-1',
        }),
        1,
        20
      );
    });

    it('should show all seasons when "All Seasons" selected', async () => {
      const { getByTestId } = render(
        <MatchesTab leagueId={mockLeagueId} isOperator={false} />
      );

      await waitFor(() => {
        expect(getByTestId('match-card-match-1')).toBeTruthy();
      });

      const { matchService } = require('../../../../src/services/api/MatchService');

      // Select "All Seasons"
      fireEvent.press(getByTestId('select-option-all'));

      await waitFor(() => {
        expect(matchService.getMatches).toHaveBeenCalledWith(
          expect.objectContaining({
            leagueId: mockLeagueId,
          }),
          1,
          20
        );
      });
    });
  });

  describe('Sorting', () => {
    it('should sort matches by date ascending by default', async () => {
      const { getAllByTestId } = render(
        <MatchesTab leagueId={mockLeagueId} isOperator={false} />
      );

      await waitFor(() => {
        const matchCards = getAllByTestId(/match-card-/);
        expect(matchCards[0]).toHaveProperty('props.testID', 'match-card-match-1');
        expect(matchCards[1]).toHaveProperty('props.testID', 'match-card-match-2');
      });
    });

    it('should toggle sort order when sort button pressed', async () => {
      const { getByText, getAllByTestId } = render(
        <MatchesTab leagueId={mockLeagueId} isOperator={false} />
      );

      await waitFor(() => {
        expect(getByText('Oldest First')).toBeTruthy();
      });

      // Toggle to descending
      fireEvent.press(getByText('Oldest First'));

      await waitFor(() => {
        expect(getByText('Newest First')).toBeTruthy();
        const matchCards = getAllByTestId(/match-card-/);
        expect(matchCards[0]).toHaveProperty('props.testID', 'match-card-match-2');
        expect(matchCards[1]).toHaveProperty('props.testID', 'match-card-match-1');
      });
    });
  });

  describe('Operator Actions', () => {
    it('should show Create Match button for operators', async () => {
      const { getByText } = render(
        <MatchesTab leagueId={mockLeagueId} isOperator={true} />
      );

      await waitFor(() => {
        expect(getByText('Create Match')).toBeTruthy();
      });
    });

    it('should not show Create Match button for non-operators', async () => {
      const { queryByText } = render(
        <MatchesTab leagueId={mockLeagueId} isOperator={false} />
      );

      await waitFor(() => {
        expect(queryByText('Create Match')).toBeNull();
      });
    });

    it('should navigate to CreateMatch screen when button pressed', async () => {
      const { getByText } = render(
        <MatchesTab leagueId={mockLeagueId} isOperator={true} />
      );

      await waitFor(() => {
        expect(getByText('Create Match')).toBeTruthy();
      });

      fireEvent.press(getByText('Create Match'));

      expect(mockNavigate).toHaveBeenCalledWith('CreateMatch', {
        leagueId: mockLeagueId,
        seasonId: 'season-1',
      });
    });

    it('should show create button in empty state for operators', async () => {
      const { matchService } = require('../../../../src/services/api/MatchService');
      matchService.getMatches = jest.fn().mockResolvedValue({
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      });

      const { getByText } = render(
        <MatchesTab leagueId={mockLeagueId} isOperator={true} />
      );

      await waitFor(() => {
        expect(getByText('Create First Match')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should retry loading matches when retry button pressed', async () => {
      const { matchService } = require('../../../../src/services/api/MatchService');
      matchService.getMatches = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: mockMatches,
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1,
          },
        });

      const { getByTestId } = render(
        <MatchesTab leagueId={mockLeagueId} isOperator={false} />
      );

      await waitFor(() => {
        expect(getByTestId('error-display')).toBeTruthy();
      });

      fireEvent.press(getByTestId('retry-button'));

      await waitFor(() => {
        expect(getByTestId('match-card-match-1')).toBeTruthy();
      });
    });

    it('should handle season loading failure gracefully', async () => {
      const { seasonService } = require('../../../../src/services/api/SeasonService');
      seasonService.getLeagueSeasons = jest.fn().mockRejectedValue(
        new Error('Failed to load seasons')
      );

      const { getByTestId } = render(
        <MatchesTab leagueId={mockLeagueId} isOperator={false} />
      );

      // Should still load matches even if seasons fail
      await waitFor(() => {
        expect(getByTestId('match-card-match-1')).toBeTruthy();
      });
    });
  });
});
