import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
} from 'react-native-maps';
import { Facility } from '../../types';
import {
  LocationService,
  Coordinates,
} from '../../services/location/LocationService';
import { GroundMapPreview } from './GroundMapPreview';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { colors } from '../../theme';

interface GroundsMapViewProps {
  grounds: Facility[];
  onGroundPress: (ground: Facility) => void;
}

export function GroundsMapView({
  grounds,
  onGroundPress,
}: GroundsMapViewProps) {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [selectedGround, setSelectedGround] = useState<Facility | null>(null);
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

  // Filter grounds that have valid location data (not null/undefined, but 0 is valid)
  const groundsWithLocation = grounds.filter(
    ground =>
      ground.latitude != null &&
      ground.longitude != null &&
      (ground.latitude !== 0 || ground.longitude !== 0)
  );

  if (loading || !userLocation) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  // Calculate region that fits user location and all grounds
  const allPoints = [
    ...(userLocation ? [userLocation] : []),
    ...groundsWithLocation.map(g => ({
      latitude: g.latitude!,
      longitude: g.longitude!,
    })),
  ];

  let region = {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  };

  if (allPoints.length > 1) {
    const lats = allPoints.map(p => p.latitude);
    const lngs = allPoints.map(p => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latDelta = Math.max((maxLat - minLat) * 1.4, 0.05);
    const lngDelta = Math.max((maxLng - minLng) * 1.4, 0.05);
    region = {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={
          Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
        }
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {groundsWithLocation.map((ground, index) => {
          return (
            <Marker
              key={ground.id}
              coordinate={{
                latitude: ground.latitude!,
                longitude: ground.longitude!,
              }}
              onPress={() => setSelectedGround(ground)}
            >
              <View
                style={[
                  markerStyles.pin,
                  selectedGround?.id === ground.id && markerStyles.pinSelected,
                ]}
              >
                <Text style={markerStyles.pinText}>{index + 1}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {selectedGround && (
        <GroundMapPreview
          ground={selectedGround}
          onPress={() => {
            onGroundPress(selectedGround);
            setSelectedGround(null);
          }}
          onClose={() => setSelectedGround(null)}
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
    backgroundColor: colors.surface,
  },
});

const markerStyles = StyleSheet.create({
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cobalt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  pinSelected: {
    backgroundColor: colors.pine,
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  pinText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
