import React from 'react';
import { View } from 'react-native';

interface OfflineIndicatorProps {
  style?: any;
  showSyncButton?: boolean;
}

/**
 * OfflineIndicator - Disabled for better UX
 * The app handles offline mode gracefully without needing a banner
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = () => {
  // Return null to hide the banner completely
  // The app will still work offline with cached data and queue sync
  return null;
};