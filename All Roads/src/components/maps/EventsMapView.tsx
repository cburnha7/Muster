import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '../../types';
import { LocationService, Coordinates } from '../../services/location/LocationService';
import { EventMapPreview } from './EventMapPreview';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { colors } from '../../theme';

interface EventsMapViewProps {
  events: Event[];
  userBookedEventIds: string[];
  onEventPress: (event: Event) => void;
}

export function EventsMapView({ events, userBookedEventIds, onEventPress }: EventsMapViewProps) {
  // Map view is not supported on web
  if (Platform.OS === 'web') {
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
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserLocation();
  }, []);

  const loadUserLocation = async () => {
    try {
      const location = await LocationService.getCurrentLocation();
      setUserLocation(location);
    } catch (error) {
      console.error('Error loading location:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter events that have location data
  const eventsWithLocation = events.filter(
    event => event.facility?.latitude && event.facility?.longitude
  );

  if (loading || !userLocation) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {eventsWithLocation.map((event) => {
          const isUserBooked = userBookedEventIds.includes(event.id);
          
          return (
            <Marker
              key={event.id}
              coordinate={{
                latitude: event.facility!.latitude!,
                longitude: event.facility!.longitude!,
              }}
              pinColor={isUserBooked ? colors.court : colors.grass}
              onPress={() => setSelectedEvent(event)}
            />
          );
        })}
      </MapView>

      {selectedEvent && (
        <EventMapPreview
          event={selectedEvent}
          onPress={() => {
            onEventPress(selectedEvent);
            setSelectedEvent(null);
          }}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.chalk,
  },
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
