import { useNetworkState } from '../services/network/NetworkService';

export type FeatureCapability = 'online-only' | 'offline-capable' | 'offline-full';

interface FeatureAvailability {
  isAvailable: boolean;
  requiresOnline: boolean;
  message?: string;
}

/**
 * Hook to check if a feature is available based on network status
 */
export function useOfflineCapability(
  feature: string,
  capability: FeatureCapability = 'online-only'
): FeatureAvailability {
  const networkState = useNetworkState();
  const isOnline = networkState.isConnected;

  switch (capability) {
    case 'online-only':
      return {
        isAvailable: isOnline,
        requiresOnline: true,
        message: isOnline
          ? undefined
          : `${feature} requires an internet connection`,
      };

    case 'offline-capable':
      return {
        isAvailable: true,
        requiresOnline: false,
        message: isOnline
          ? undefined
          : `${feature} is available with limited functionality offline`,
      };

    case 'offline-full':
      return {
        isAvailable: true,
        requiresOnline: false,
        message: undefined,
      };

    default:
      return {
        isAvailable: isOnline,
        requiresOnline: true,
        message: undefined,
      };
  }
}

/**
 * Feature capability definitions
 */
export const FEATURE_CAPABILITIES: Record<string, FeatureCapability> = {
  // Online-only features
  CREATE_EVENT: 'online-only',
  UPDATE_EVENT: 'online-only',
  DELETE_EVENT: 'online-only',
  CREATE_FACILITY: 'online-only',
  UPDATE_FACILITY: 'online-only',
  DELETE_FACILITY: 'online-only',
  CREATE_TEAM: 'online-only',
  UPDATE_TEAM: 'online-only',
  JOIN_TEAM: 'online-only',
  INVITE_TEAM_MEMBER: 'online-only',
  BOOK_EVENT: 'online-only',
  CANCEL_BOOKING: 'online-only',
  UPLOAD_IMAGE: 'online-only',
  SEARCH_ONLINE: 'online-only',

  // Offline-capable features (limited functionality)
  VIEW_EVENTS: 'offline-capable',
  VIEW_FACILITIES: 'offline-capable',
  VIEW_TEAMS: 'offline-capable',
  VIEW_BOOKINGS: 'offline-capable',
  SEARCH_CACHED: 'offline-capable',

  // Offline-full features
  VIEW_PROFILE: 'offline-full',
  VIEW_SETTINGS: 'offline-full',
  VIEW_BOOKING_DETAILS: 'offline-full',
};

/**
 * Hook to check specific feature availability
 */
export function useFeatureAvailability(featureName: string): FeatureAvailability {
  const capability = FEATURE_CAPABILITIES[featureName] || 'online-only';
  return useOfflineCapability(featureName, capability);
}
