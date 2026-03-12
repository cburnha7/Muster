import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Facility, SportType } from '../../types';

// Only import MapView on native platforms
let MapView: any = null;
let Marker: any = null;
let Callout: any = null;
let PROVIDER_GOOGLE: any = null;
let Region: any = null;

if (Platform.OS !== 'web') {
  const MapViewModule = require('react-native-maps');
  MapView = MapViewModule.default;
  Marker = MapViewModule.Marker;
  Callout = MapViewModule.Callout;
  PROVIDER_GOOGLE = MapViewModule.PROVIDER_GOOGLE;
  Region = MapViewModule.Region;
}

const { width, height } = Dimensions.get('window');

interface FacilityMapViewProps {
  facilities: Facility[];
  onFacilityPress?: (facility: Facility) => void;
  initialRegion?: Region;
  showUserLocation?: boolean;
  style?: any;
}

export const FacilityMapView: React.FC<FacilityMapViewProps> = ({
  facilities,
  onFacilityPress,
  initialRegion,
  showUserLocation = true,
  style,
}) => {
  // Return placeholder on web
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style, styles.webPlaceholder]}>
        <Ionicons name="map" size={48} color="#666" />
        <Text style={styles.webPlaceholderText}>
          Map view not available on web
        </Text>
        <Text style={styles.webPlaceholderSubtext}>
          {facilities.length} facilities available
        </Text>
      </View>
    );
  }

  const mapRef = useRef<MapView>(null);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

  const defaultRegion: Region = {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  useEffect(() => {
    if (facilities.length > 0 && mapRef.current) {
      // Fit map to show all facilities
      const coordinates = facilities.map((f) => ({
        latitude: f.latitude,
        longitude: f.longitude,
      }));

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [facilities]);

  const getSportIcon = (sportType: SportType): string => {
    switch (sportType) {
      case SportType.BASKETBALL:
        return 'basketball';
      case SportType.SOCCER:
        return 'football';
      case SportType.TENNIS:
        return 'tennisball';
      case SportType.VOLLEYBALL:
        return 'american-football';
      default:
        return 'fitness';
    }
  };

  const getMarkerColor = (facility: Facility): string => {
    // Color based on primary sport type
    const primarySport = facility.sportTypes[0];
    switch (primarySport) {
      case SportType.BASKETBALL:
        return '#FF6B35';
      case SportType.SOCCER:
        return '#4ECDC4';
      case SportType.TENNIS:
        return '#FFD93D';
      case SportType.VOLLEYBALL:
        return '#95E1D3';
      default:
        return '#007AFF';
    }
  };

  const handleMarkerPress = (facility: Facility) => {
    setSelectedFacility(facility);
  };

  const handleCalloutPress = (facility: Facility) => {
    onFacilityPress?.(facility);
  };

  const centerOnFacility = (facility: Facility) => {
    mapRef.current?.animateToRegion(
      {
        latitude: facility.latitude,
        longitude: facility.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      1000
    );
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion || defaultRegion}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
      >
        {facilities.map((facility) => (
          <Marker
            key={facility.id}
            coordinate={{
              latitude: facility.latitude,
              longitude: facility.longitude,
            }}
            pinColor={getMarkerColor(facility)}
            onPress={() => handleMarkerPress(facility)}
          >
            <Callout
              tooltip={false}
              onPress={() => handleCalloutPress(facility)}
              style={styles.callout}
            >
              <View style={styles.calloutContent}>
                <Text style={styles.calloutTitle} numberOfLines={1}>
                  {facility.name}
                </Text>
                <View style={styles.calloutRating}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.calloutRatingText}>
                    {facility.rating.toFixed(1)} ({facility.reviewCount})
                  </Text>
                </View>
                <View style={styles.calloutSports}>
                  {facility.sportTypes.slice(0, 3).map((sport) => (
                    <View key={sport} style={styles.calloutSportBadge}>
                      <Ionicons
                        name={getSportIcon(sport) as any}
                        size={12}
                        color="#007AFF"
                      />
                    </View>
                  ))}
                </View>
                {facility.pricePerHour && (
                  <Text style={styles.calloutPrice}>
                    ${facility.pricePerHour}/hr
                  </Text>
                )}
                <Text style={styles.calloutTap}>Tap for details</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {selectedFacility && (
        <View style={styles.selectedFacilityCard}>
          <TouchableOpacity
            style={styles.cardContent}
            onPress={() => handleCalloutPress(selectedFacility)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {selectedFacility.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedFacility(null)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.cardAddress} numberOfLines={1}>
              {selectedFacility.street}, {selectedFacility.city}
            </Text>
            <View style={styles.cardFooter}>
              <View style={styles.cardRating}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.cardRatingText}>
                  {selectedFacility.rating.toFixed(1)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.directionsButton}
                onPress={() => centerOnFacility(selectedFacility)}
              >
                <Ionicons name="navigate" size={16} color="#007AFF" />
                <Text style={styles.directionsText}>Center</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  webPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  webPlaceholderText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  webPlaceholderSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  callout: {
    width: 200,
  },
  calloutContent: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    minWidth: 180,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  calloutRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  calloutRatingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  calloutSports: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  calloutSportBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  calloutPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  calloutTap: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  selectedFacilityCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  cardAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
  },
  directionsText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 4,
  },
});
