import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { AssignFacilityScreen } from '../../../src/screens/leagues/AssignFacilityScreen';
import { NavigationContainer } from '@react-navigation/native';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
    useRoute: () => ({
      params: { matchId: 'match-1' },
    }),
  };
});

// Mock Redux
const mockUser = { id: 'user-1', username: 'testuser', firstName: 'Test', lastName: 'User' };
jest.mock('react-redux', () => ({
  useSelector: (selector: any) =>
    selector({ auth: { user: mockUser } }),
  useDispatch: () => jest.fn(),
}));

// Mock services
jest.mock('../../../src/services/api/MatchService', () => ({
  matchService: {
    getMatchById: jest.fn(),
    assignRental: jest.fn(),
  },
}));

jest.mock('../../../src/services/api/CourtService', () => ({
  courtService: {
    getMyRentals: jest.fn(),
  },
}));

import { matchService } from '../../../src/services/api/MatchService';
import { courtService } from '../../../src/services/api/CourtService';

const mockMatch = {
  id: 'match-1',
  leagueId: 'league-1',
  homeTeamId: 'team-home',
  awayTeamId: 'team-away',
  homeTeam: { id: 'team-home', name: 'Thunder Roster' },
  awayTeam: { id: 'team-away', name: 'Lightning Roster' },
  scheduledAt: '2025-08-15T18:00:00.000Z',
  status: 'scheduled',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockRentals = [
  {
    id: 'rental-1',
    userId: 'user-1',
    status: 'confirmed',
    totalPrice: 60,
    timeSlot: {
      id: 'slot-1',
      date: '2025-08-15',
      startTime: '18:00',
      endTime: '19:00',
      court: {
        id: 'court-1',
        name: 'Court A',
        sportType: 'Basketball',
        facility: {
          id: 'facility-1',
          name: 'Downtown Arena',
          street: '100 Main St',
          city: 'Springfield',
        },
      },
    },
  },
  {
    id: 'rental-2',
    userId: 'user-1',
    status: 'confirmed',
    totalPrice: 45,
    timeSlot: {
      id: 'slot-2',
      date: '2025-08-20',
      startTime: '10:00',
      endTime: '11:00',
      court: {
        id: 'court-2',
        name: 'Field B',
        sportType: 'Soccer',
        facility: {
          id: 'facility-2',
          name: 'Riverside Park',
          street: '200 River Rd',
          city: 'Shelbyville',
        },
      },
    },
  },
];

const renderScreen = () =>
  render(
    <NavigationContainer>
      <AssignFacilityScreen />
    </NavigationContainer>
  );

describe('AssignFacilityScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (matchService.getMatchById as jest.Mock).mockResolvedValue(mockMatch);
    (courtService.getMyRentals as jest.Mock).mockResolvedValue(mockRentals);
  });

  it('shows loading state initially', () => {
    renderScreen();
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('displays match details after loading', async () => {
    renderScreen();
    await waitFor(() => {
      expect(screen.getByText(/Thunder Roster vs Lightning Roster/)).toBeTruthy();
    });
  });

  it('displays available rentals', async () => {
    renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Downtown Arena')).toBeTruthy();
      expect(screen.getByText('Court A')).toBeTruthy();
      expect(screen.getByText('Riverside Park')).toBeTruthy();
      expect(screen.getByText('Field B')).toBeTruthy();
    });
  });

  it('displays rental prices', async () => {
    renderScreen();
    await waitFor(() => {
      expect(screen.getByText('$60.00')).toBeTruthy();
      expect(screen.getByText('$45.00')).toBeTruthy();
    });
  });

  it('shows empty state when no rentals available', async () => {
    (courtService.getMyRentals as jest.Mock).mockResolvedValue([]);
    renderScreen();
    await waitFor(() => {
      expect(screen.getByText('No available rentals')).toBeTruthy();
    });
  });

  it('allows selecting a rental', async () => {
    renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Downtown Arena')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('rental-card-rental-1'));
    // The confirm button should now be enabled
    expect(screen.getByTestId('confirm-assign')).not.toBeDisabled();
  });

  it('calls assignRental on confirm', async () => {
    (matchService.assignRental as jest.Mock).mockResolvedValue({ ...mockMatch, rentalId: 'rental-1' });
    jest.spyOn(Alert, 'alert');

    renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Downtown Arena')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('rental-card-rental-1'));
    fireEvent.press(screen.getByTestId('confirm-assign'));

    await waitFor(() => {
      expect(matchService.assignRental).toHaveBeenCalledWith('match-1', 'rental-1', 'user-1');
    });
  });

  it('shows error state on data load failure', async () => {
    (matchService.getMatchById as jest.Mock).mockRejectedValue(new Error('Network error'));
    renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Failed to load data. Please try again.')).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
    });
  });

  it('navigates to facilities list when "Rent a new facility" is pressed', async () => {
    renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Rent a new facility')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('book-new-facility'));
    expect(mockNavigate).toHaveBeenCalledWith('Facilities', { screen: 'FacilitiesList' });
  });

  it('navigates back when Cancel is pressed', async () => {
    renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Cancel'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
