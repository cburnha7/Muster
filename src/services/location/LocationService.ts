import * as Location from 'expo-location';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Default location (New York City) if permission denied
const DEFAULT_LOCATION: Coordinates = {
  latitude: 40.7128,
  longitude: -74.0060,
};

export class LocationService {
  /**
   * Request location permission and get current location
   */
  static async getCurrentLocation(): Promise<Coordinates> {
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Location permission denied, using default location');
        return DEFAULT_LOCATION;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return DEFAULT_LOCATION;
    }
  }

  /**
   * Check if location permission is granted
   */
  static async hasLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }
}

export const locationService = new LocationService();
