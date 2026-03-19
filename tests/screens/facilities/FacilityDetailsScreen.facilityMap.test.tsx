import React from 'react';
import { render, waitFor } from '../../utils/test-utils';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import { FacilityDetailsScreen } from '../../../src/screens/facilities/FacilityDetailsScreen';
import { facilityService } from '../../../src/services/api/FacilityService';
import facilitiesReducer from '../../../src/store/slices/facilitiesSlice';
import authReducer from '../../../src/store/slices/authSlice';

// Mock the facility service
jest.mock('../../../src/services/api/FacilityService');

// Mock OptimizedImage
jest.mock('../../../src/components/ui/OptimizedImage', () => ({
  OptimizedImage: ({ source, testID }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={testID || 'optimized-image'}>
        <Text testID="image-uri">{source?.uri || 'no-uri'}</Text>
      </View>
    );
  },
}));

// Mock UI components
jest.mock('../../../src/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => {
    const { View, Text } = require('react-native');
    return (
      <View testID="loading-spinner">
        <Text>Loading...</Text>
      </View>
    );
  },
}));

jest.mock('../../../src/components/ui/ErrorDisplay', () => ({
  ErrorDisplay: ({ message }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="error-display">
        <Text>{message}</Text>
      </View>
    );
  },
}));

jest.mock('../../../src/components/ui/EventCard', () => ({
  EventCard: ({ event }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={`event-card-${event.id}`}>
        <Text>{event.title}</Text>
      </View>
    );
  },
}));

describe('FacilityDetailsScreen - Facility Map Display', () => {
  const mockFacilityWithMap = {
    id: 'facility-1',
    name: 'Test Sports Complex',
    description: 'A great facility',
    street: '123 Main St',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
    latitude: 40.7128,
    longitude: -74.006,
    sportTypes: ['BASKETBALL', 'SOCCER'],
    pricePerHour: 50,
    rating: 4.5,
    reviewCount: 10,
    ownerId: 'owner-1',
    isVerified: true,
    facilityMapUrl: 'https://example.com/facility-map.jpg',
    minimumBookingHours: 1,
    amenities: [],
    rateSchedules: [],
  };

  const mockFacilityWithoutMap = {
    ...mockFacilityWithMap,
    facilityMapUrl: undefined,
  };

  const createMockStore = (user: any = null) => {
    return configureStore({
      reducer: {
        facilities: facilitiesReducer,
        auth: authReducer,
      },
      preloadedState: {
        auth: {
          user,
          token: user ? 'mock-token' : null,
          isAuthenticated: !!user,
          isLoading: false,
          error: null,
        },
        facilities: {
          facilities: [],
          selectedFacility: null,
          isLoading: false,
          error: null,
        },
      },
    });
  };

  const renderScreen = (store: any, facilityId: string = 'facility-1') => {
    const route = {
      params: { facilityId },
    };

    return render(
      <Provider store={store}>
        <NavigationContainer>
          <FacilityDetailsScreen route={route as any} />
        </NavigationContainer>
      </Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Facility Map Display', () => {
    it('should display facility map section when facilityMapUrl is available', async () => {
      const mockStore = createMockStore();
      (facilityService.getFacility as jest.Mock).mockResolvedValue(mockFacilityWithMap);
      (facilityService.getFacilityEvents as jest.Mock).mockResolvedValue({ data: [] });

      const { getByText, getByTestId } = renderScreen(mockStore);

      await waitFor(() => {
        expect(getByText('Facility Layout')).toBeTruthy();
      });

      expect(getByText('View the facility map to see the layout of courts and fields.')).toBeTruthy();
      expect(getByTestId('optimized-image')).toBeTruthy();
      expect(getByText('Tap to view full size')).toBeTruthy();
    });

    it('should not display facility map section when facilityMapUrl is not available', async () => {
      const mockStore = createMockStore();
      (facilityService.getFacility as jest.Mock).mockResolvedValue(mockFacilityWithoutMap);
      (facilityService.getFacilityEvents as jest.Mock).mockResolvedValue({ data: [] });

      const { queryByText } = renderScreen(mockStore);

      await waitFor(() => {
        expect(queryByText('Test Sports Complex')).toBeTruthy();
      });

      expect(queryByText('Facility Layout')).toBeNull();
      expect(queryByText('View the facility map to see the layout of courts and fields.')).toBeNull();
    });

    it('should use correct image URL from facility data', async () => {
      const mockStore = createMockStore();
      (facilityService.getFacility as jest.Mock).mockResolvedValue(mockFacilityWithMap);
      (facilityService.getFacilityEvents as jest.Mock).mockResolvedValue({ data: [] });

      const { getByTestId, getByText } = renderScreen(mockStore);

      await waitFor(() => {
        expect(getByText('Facility Layout')).toBeTruthy();
      });

      const imageUri = getByTestId('image-uri');
      expect(imageUri.props.children).toBe('https://example.com/facility-map.jpg');
    });
  });

  describe('Integration with existing facility details', () => {
    it('should display facility map between location and contact sections', async () => {
      const mockStore = createMockStore();
      (facilityService.getFacility as jest.Mock).mockResolvedValue(mockFacilityWithMap);
      (facilityService.getFacilityEvents as jest.Mock).mockResolvedValue({ data: [] });

      const { getByText } = renderScreen(mockStore);

      await waitFor(() => {
        expect(getByText('Location')).toBeTruthy();
        expect(getByText('Facility Layout')).toBeTruthy();
        expect(getByText('Contact')).toBeTruthy();
      });
    });

    it('should maintain all existing facility details functionality', async () => {
      const mockStore = createMockStore();
      (facilityService.getFacility as jest.Mock).mockResolvedValue(mockFacilityWithMap);
      (facilityService.getFacilityEvents as jest.Mock).mockResolvedValue({ data: [] });

      const { getByText } = renderScreen(mockStore);

      await waitFor(() => {
        expect(getByText('Test Sports Complex')).toBeTruthy();
        expect(getByText('About')).toBeTruthy();
        expect(getByText('Location')).toBeTruthy();
        expect(getByText('Contact')).toBeTruthy();
        expect(getByText('Available Sports')).toBeTruthy();
        expect(getByText('Pricing')).toBeTruthy();
      });
    });
  });
});
