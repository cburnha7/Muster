import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '../../types';
import { colors } from '../../theme';

interface EventsMapViewWrapperProps {
  events: Event[];
  userBookedEventIds: string[];
  onEventPress: (event: Event) => void;
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
export function EventsMapViewWrapper(props: EventsMapViewWrapperProps) {
  if (Platform.OS === 'web') {
    return <WebFallback />;
  }

  // Dynamic import for native platforms only
  const { EventsMapView } = require('./EventsMapView');
  return <EventsMapView {...props} />;
}

const styles = StyleSheet.create({
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
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
