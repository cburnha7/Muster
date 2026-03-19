import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Facility } from '../../types';
import { colors } from '../../theme';

interface GroundsMapViewWrapperProps {
  grounds: Facility[];
  onGroundPress: (ground: Facility) => void;
}

// Web fallback component
function WebFallback() {
  return (
    <View style={styles.webFallback}>
      <Ionicons name="map-outline" size={64} color={colors.inkFaint} />
      <Text style={styles.webFallbackTitle}>Map View Not Available</Text>
      <Text style={styles.webFallbackText}>
        Map view is only available on iOS and Android. Please use the list view.
      </Text>
    </View>
  );
}

// Conditionally import and render the actual map component only on native platforms
export function GroundsMapViewWrapper(props: GroundsMapViewWrapperProps) {
  if (Platform.OS === 'web') {
    return <WebFallback />;
  }

  // Dynamic import for native platforms only
  const { GroundsMapView } = require('./GroundsMapView');
  return <GroundsMapView {...props} />;
}

const styles = StyleSheet.create({
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.chalk,
    paddingHorizontal: 32,
  },
  webFallbackTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink,
    marginTop: 16,
    marginBottom: 8,
  },
  webFallbackText: {
    fontSize: 16,
    color: colors.inkFaint,
    textAlign: 'center',
    lineHeight: 24,
  },
});
