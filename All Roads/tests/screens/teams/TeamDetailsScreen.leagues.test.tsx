import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import { TeamDetailsScreen } from '../../../src/screens/teams/TeamDetailsScreen';
import { teamService } from '../../../src/services/api/TeamService';
import authSlice from '../../../src/store/slices/authSlice';
import teamsSlice from '../../../src/store/slices/teamsSlice';

// Mock the services
jest.mock('../../../src/services/api/TeamService');
jest.mock('../../../src/services/api/LeagueService');

// Create a test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      teams: teamsSlice,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          preferredSports: [],
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
        isAuthenticated: true,
        isLoading: false,
        error: null,
        token: 'mock-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
      },
      teams: {
        teams: [],
        userTeams: [],
        selectedTeam: null,
        filters: {},
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        isLoading: false,
        isLoadingMore: false,
        error: null,
        lastUpdated: null,
      },
      ...initialState,
    },
  });
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode; store?: any }> = ({ 
  children, 
  store = createTestStore() 
}) => (
  <Provider store={store}>
    <NavigationContainer>
      {children}
    </NavigationContainer>
  </Provider>
);

describe('TeamDetailsScreen - Leagues Section', () => {
  const mockTeam = {
    id: 'team-1',
    name: 'Test Team',
    sportType: 'basketball',
    skillLevel: 'intermediate',
    maxMembers: 10,
    members: [
      {
        userId: 'user-1',
        role: 'captain',
        status: 'active',
        user: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
        },
      },
    ],
  };

  const mockLeagues = [
    {
      id: 'league-1',
      name: 'Summer Basketball League',
      sportType: 'basketball',
      seasonName: 'Summer 2024',
      startDate: '2024-06-01',
      endDate: '2024-08-31',
      isActive: true,
      isCertified: true,
      pointsConfig: { win: 3, draw: 1, loss: 0 },
      organizerId: 'org-1',
      memberCount: 8,
      matchCount: 24,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'league-2',
      name: 'City Championship',
      sportType: 'basketball',
      seasonName: 'Fall 2024',
      startDate: '2024-09-01',
      endDate: '2024-11-30',
      isActive: false,
      isCertified: false,
      pointsConfig: { win: 3, draw: 1, loss: 0 },
      organizerId: 'org-2',
      memberCount: 12,
      matchCount: 36,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (teamService.getTeam as jest.Mock).mockResolvedValue(mockTeam);
    (teamService.getTeamLeagues as jest.Mock).mockResolvedValue(mockLeagues);
  });

  it('should display leagues section', async () => {
    const { getByText } = render(
      <TestWrapper>
        <TeamDetailsScreen route={{ params: { teamId: 'team-1' } }} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText(/Leagues/i)).toBeTruthy();
    });
  });

  it('should display league count when leagues exist', async () => {
    const { getByText } = render(
      <TestWrapper>
        <TeamDetailsScreen route={{ params: { teamId: 'team-1' } }} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText(/Leagues \(2\)/i)).toBeTruthy();
    });
  });

  it('should display league cards with correct information', async () => {
    const { getByText } = render(
      <TestWrapper>
        <TeamDetailsScreen route={{ params: { teamId: 'team-1' } }} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('Summer Basketball League')).toBeTruthy();
      expect(getByText('City Championship')).toBeTruthy();
      expect(getByText('Summer 2024')).toBeTruthy();
      expect(getByText('Fall 2024')).toBeTruthy();
    });
  });

  it('should show certified badge for certified leagues', async () => {
    const { getAllByText } = render(
      <TestWrapper>
        <TeamDetailsScreen route={{ params: { teamId: 'team-1' } }} />
      </TestWrapper>
    );

    await waitFor(() => {
      const badges = getAllByText('✓');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it('should show active/inactive status for leagues', async () => {
    const { getByText } = render(
      <TestWrapper>
        <TeamDetailsScreen route={{ params: { teamId: 'team-1' } }} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('Active')).toBeTruthy();
      expect(getByText('Inactive')).toBeTruthy();
    });
  });

  it('should show empty state when team has no leagues', async () => {
    (teamService.getTeamLeagues as jest.Mock).mockResolvedValue([]);

    const { getByText } = render(
      <TestWrapper>
        <TeamDetailsScreen route={{ params: { teamId: 'team-1' } }} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText(/not participating in any leagues/i)).toBeTruthy();
    });
  });

  it('should show loading state while fetching leagues', async () => {
    (teamService.getTeamLeagues as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockLeagues), 100))
    );

    const { getByText } = render(
      <TestWrapper>
        <TeamDetailsScreen route={{ params: { teamId: 'team-1' } }} />
      </TestWrapper>
    );

    expect(getByText(/Loading leagues/i)).toBeTruthy();

    await waitFor(() => {
      expect(getByText('Summer Basketball League')).toBeTruthy();
    });
  });

  it('should handle league fetch errors gracefully', async () => {
    (teamService.getTeamLeagues as jest.Mock).mockRejectedValue(
      new Error('Failed to fetch leagues')
    );

    const { getByText } = render(
      <TestWrapper>
        <TeamDetailsScreen route={{ params: { teamId: 'team-1' } }} />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should show empty state instead of error
      expect(getByText(/not participating in any leagues/i)).toBeTruthy();
    });
  });

  it('should call getTeamLeagues with correct team ID', async () => {
    render(
      <TestWrapper>
        <TeamDetailsScreen route={{ params: { teamId: 'team-1' } }} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(teamService.getTeamLeagues).toHaveBeenCalledWith('team-1');
    });
  });
});
