import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '../../types';
import { useTheme } from '../../theme';

interface EventsMapViewWrapperProps {
  events: Event[];
  userBookedEventIds: string[];
  onEventPress: (event: Event) => void;
}

// Web fallback component
function WebFallback() {
  const { colors } = useTheme();
  return (
    <View style={[styles.webFallback, { backgroundColor: colors.surface }]}>
      <Ionicons name="map-outline" size={64} color={colors.inkFaint} />
      <Text style={[styles.webFallbackTitle, { color: colors.ink }]}>Map View Not Available</Text>
      <Text style={[styles.webFallbackText, { color: colors.inkFaint }]}>
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
    paddingHorizontal: 32,
  },
  webFallbackTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  webFallbackText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});