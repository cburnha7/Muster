import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { PlayersTab } from '../../../../src/screens/leagues/tabs/PlayersTab';
import { leagueService } from '../../../../src/services/api/LeagueService';
import { seasonService } from '../../../../src/services/api/SeasonService';
import { PlayerRanking, Season, SportType, SkillLevel } from '../../../../src/types';

// Mock services
jest.mock('../../../../src/services/api/LeagueService');
jest.mock('../../../../src/services/api/SeasonService');

// Mock components
jest.mock('../../../../src/components/league/PlayerRankingsTable', () => ({
  PlayerRankingsTable: ({ rankings, onLoadMore, hasMore, loading }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="player-rankings-table">
        <Text>Rankings Count: {rankings.length}</Text>
        {hasMore && (
          <TouchableOpacity testID="load-more-button" onPress={onLoadMore}>
            <Text>Load More</Text>
          </TouchableOpacity>
        )}
        {loading && <Text>Loading...</Text>}
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
  FormSelect: ({ value, options, onSelect, placeholder }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID={`form-select-${placeholder}`}>
        <Text>Selected: {value}</Text>
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

describe('PlayersTab', () => {
  const mockLeagueId = 'league-123';

  const mockSeasons: Season[] = [
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
    {
      id: 'season-2',
      leagueId: mockLeagueId,
      name: 'Fall 2023',
      startDate: new Date('2023-09-01'),
      endDate: new Date('2023-11-30'),
      isActive: false,
      isCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockRankings: PlayerRanking[] = [
    {
      rank: 1,
      player: {
        id: 'player-1',
        email: 'player1@example.com',
        firstName: 'John',
        lastName: 'Doe',
        preferredSports: [SportType.BASKETBALL],
        notificationPreferences: {
          eventReminders: true,
          eventUpdates: true,
          newEventAlerts: true,
          marketingEmails: false,
          pushNotifications: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      team: {
        id: 'team-1',
        name: 'Team Alpha',
        sportType: SportType.BASKETBALL,
        captainId: 'player-1',
        members: [],
        skillLevel: SkillLevel.INTERMEDIATE,
        maxMembers: 10,
        isPublic: true,
        stats: {
          gamesPlayed: 10,
          gamesWon: 6,
          gamesLost: 4,
          winRate: 0.6,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      stats: {
        matchesPlayed: 10,
        averageRating: 4.5,
        totalVotes: 50,
        performanceScore: 85,
      },
    },
    {
      rank: 2,
      player: {
        id: 'player-2',
        email: 'player2@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        preferredSports: [SportType.BASKETBALL],
        notificationPreferences: {
          eventReminders: true,
          eventUpdates: true,
          newEventAlerts: true,
          marketingEmails: false,
          pushNotifications: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      team: {
        id: 'team-2',
        name: 'Team Beta',
        sportType: SportType.BASKETBALL,
        captainId: 'player-2',
        members: [],
        skillLevel: SkillLevel.INTERMEDIATE,
        maxMembers: 10,
        isPublic: true,
        stats: {
          gamesPlayed: 8,
          gamesWon: 5,
          gamesLost: 3,
          winRate: 0.625,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      stats: {
        matchesPlayed: 8,
        averageRating: 4.2,
        totalVotes: 40,
        performanceScore: 78,
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock season service
    (seasonService.getLeagueSeasons as jest.Mock).mockResolvedValue({
      data: mockSeasons,
      pagination: {
        page: 1,
        limit: 100,
        totalPages: 1,
        totalItems: mockSeasons.length,
      },
    });

    // Mock league service
    (leagueService.getPlayerRankings as jest.Mock).mockResolvedValue({
      data: mockRankings,
      pagination: {
        page: 1,
        limit: 50,
        totalPages: 1,
        totalItems: mockRankings.length,
      },
    });
  });

  it('should render loading spinner initially', () => {
    const { getByTestId } = render(<PlayersTab leagueId={mockLeagueId} />);
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('should load and display player rankings', async () => {
    const { getByTestId, getByText } = render(<PlayersTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByTestId('player-rankings-table')).toBeTruthy();
      expect(getByText('Rankings Count: 2')).toBeTruthy();
    });

    expect(leagueService.getPlayerRankings).toHaveBeenCalledWith(
      mockLeagueId,
      'season-1', // Active season auto-selected
      'performanceScore',
      1,
      50
    );
  });

  it('should load seasons and auto-select active season', async () => {
    const { getByTestId } = render(<PlayersTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByTestId('form-select-Season')).toBeTruthy();
    });

    expect(seasonService.getLeagueSeasons).toHaveBeenCalledWith(mockLeagueId, 1, 100);
    
    // Verify active season is selected
    await waitFor(() => {
      expect(leagueService.getPlayerRankings).toHaveBeenCalledWith(
        mockLeagueId,
        'season-1',
        expect.any(String),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  it('should handle season filter change', async () => {
    const { getByTestId } = render(<PlayersTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByTestId('form-select-Season')).toBeTruthy();
    });

    // Change to Fall 2023 season
    fireEvent.press(getByTestId('option-season-2'));

    await waitFor(() => {
      expect(leagueService.getPlayerRankings).toHaveBeenCalledWith(
        mockLeagueId,
        'season-2',
        'performanceScore',
        1,
        50
      );
    });
  });

  it('should handle sort by change', async () => {
    const { getByTestId } = render(<PlayersTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByTestId('form-select-Sort By')).toBeTruthy();
    });

    // Change sort to average rating
    fireEvent.press(getByTestId('option-averageRating'));

    await waitFor(() => {
      expect(leagueService.getPlayerRankings).toHaveBeenCalledWith(
        mockLeagueId,
        'season-1',
        'averageRating',
        1,
        50
      );
    });
  });

  it('should handle load more', async () => {
    // Override to always return hasMore=true for this test
    (leagueService.getPlayerRankings as jest.Mock).mockResolvedValue({
      data: mockRankings,
      pagination: {
        page: 1,
        limit: 50,
        totalPages: 2,
        totalItems: 100,
      },
    });

    const { getByTestId } = render(<PlayersTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByTestId('load-more-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('load-more-button'));

    await waitFor(() => {
      expect(leagueService.getPlayerRankings).toHaveBeenCalledWith(
        mockLeagueId,
        'season-1',
        'performanceScore',
        2,
        50
      );
    });
  });

  it('should display error message on failure', async () => {
    (leagueService.getPlayerRankings as jest.Mock).mockRejectedValue(
      new Error('Failed to load rankings')
    );

    const { getByTestId, getByText } = render(<PlayersTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByTestId('error-display')).toBeTruthy();
      expect(getByText('Failed to load rankings')).toBeTruthy();
    });
  });

  it('should retry loading on error retry button press', async () => {
    // Reject all calls initially
    (leagueService.getPlayerRankings as jest.Mock).mockRejectedValue(
      new Error('Failed to load rankings')
    );

    const { getByTestId } = render(<PlayersTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByTestId('error-display')).toBeTruthy();
    });

    // Now make it succeed on retry
    (leagueService.getPlayerRankings as jest.Mock).mockResolvedValue({
      data: mockRankings,
      pagination: {
        page: 1,
        limit: 50,
        totalPages: 1,
        totalItems: mockRankings.length,
      },
    });

    fireEvent.press(getByTestId('retry-button'));

    await waitFor(() => {
      expect(getByTestId('player-rankings-table')).toBeTruthy();
    });
  });

  it('should handle "All Seasons" filter', async () => {
    const { getByTestId } = render(<PlayersTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByTestId('form-select-Season')).toBeTruthy();
    });

    // Change to "All Seasons"
    fireEvent.press(getByTestId('option-all'));

    await waitFor(() => {
      expect(leagueService.getPlayerRankings).toHaveBeenCalledWith(
        mockLeagueId,
        undefined, // No season filter
        'performanceScore',
        1,
        50
      );
    });
  });

  it('should reset pagination when filters change', async () => {
    const { getByTestId } = render(<PlayersTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByTestId('form-select-Season')).toBeTruthy();
    });

    // First load
    expect(leagueService.getPlayerRankings).toHaveBeenCalledWith(
      mockLeagueId,
      'season-1',
      'performanceScore',
      1,
      50
    );

    // Change filter
    fireEvent.press(getByTestId('option-season-2'));

    // Should reset to page 1
    await waitFor(() => {
      expect(leagueService.getPlayerRankings).toHaveBeenCalledWith(
        mockLeagueId,
        'season-2',
        'performanceScore',
        1,
        50
      );
    });
  });

  it('should continue without seasons if season loading fails', async () => {
    (seasonService.getLeagueSeasons as jest.Mock).mockRejectedValueOnce(
      new Error('Failed to load seasons')
    );

    const { getByTestId } = render(<PlayersTab leagueId={mockLeagueId} />);

    await waitFor(() => {
      expect(getByTestId('player-rankings-table')).toBeTruthy();
    });

    // Should still load rankings without season filter
    expect(leagueService.getPlayerRankings).toHaveBeenCalledWith(
      mockLeagueId,
      undefined,
      'performanceScore',
      1,
      50
    );
  });
});
