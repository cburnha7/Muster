import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Facility, SportType } from '../../types';
import { tokenColors, tokenSport } from '../../theme/tokens';

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
        <Ionicons name="map" size={48} color={tokenColors.inkSecondary} />
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
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(
    null
  );

  const defaultRegion: Region = {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  useEffect(() => {
    if (facilities.length > 0 && mapRef.current) {
      // Fit map to show all facilities
      const coordinates = facilities.map(f => ({
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
      case SportType.PICKLEBALL:
        return 'tennisball';
      case SportType.VOLLEYBALL:
        return 'american-football';
      case SportType.SOFTBALL:
      case SportType.BASEBALL:
        return 'baseball';
      case SportType.FLAG_FOOTBALL:
        return 'flag';
      case SportType.KICKBALL:
        return 'football';
      default:
        return 'fitness';
    }
  };

  const getMarkerColor = (facility: Facility): string => {
    // Color based on primary sport type
    const primarySport = facility.sportTypes[0];
    switch (primarySport) {
      case SportType.BASKETBALL:
        return tokenSport.basketball.solid;
      case SportType.SOCCER:
      case SportType.KICKBALL:
        return tokenSport.soccer.solid;
      case SportType.TENNIS:
      case SportType.PICKLEBALL:
        return tokenSport.tennis.solid;
      case SportType.VOLLEYBALL:
        return tokenSport.volleyball.solid;
      case SportType.SOFTBALL:
      case SportType.BASEBALL:
        return tokenColors.warning;
      case SportType.FLAG_FOOTBALL:
        return tokenSport.flag_football.solid;
      default:
        return tokenColors.cobalt;
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
        {facilities.map(facility => (
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
                  <Ionicons name="star" size={14} color={tokenColors.gold} />
                  <Text style={styles.calloutRatingText}>
                    {facility.rating.toFixed(1)} ({facility.reviewCount})
                  </Text>
                </View>
                <View style={styles.calloutSports}>
                  {facility.sportTypes.slice(0, 3).map(sport => (
                    <View key={sport} style={styles.calloutSportBadge}>
                      <Ionicons
                        name={getSportIcon(sport) as any}
                        size={12}
                        color={tokenColors.cobalt}
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
            activeOpacity={0.75}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {selectedFacility.name}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedFacility(null)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={tokenColors.inkSecondary}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.cardAddress} numberOfLines={1}>
              {selectedFacility.street}, {selectedFacility.city}
            </Text>
            <View style={styles.cardFooter}>
              <View style={styles.cardRating}>
                <Ionicons name="star" size={16} color={tokenColors.gold} />
                <Text style={styles.cardRatingText}>
                  {selectedFacility.rating.toFixed(1)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.directionsButton}
                onPress={() => centerOnFacility(selectedFacility)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="navigate"
                  size={16}
                  color={tokenColors.cobalt}
                />
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
    backgroundColor: tokenColors.background,
  },
  webPlaceholderText: {
    fontSize: 16,
    color: tokenColors.inkSecondary,
    marginTop: 12,
  },
  webPlaceholderSubtext: {
    fontSize: 14,
    color: tokenColors.inkMuted,
    marginTop: 4,
  },
  callout: {
    width: 200,
  },
  calloutContent: {
    backgroundColor: tokenColors.white,
    borderRadius: 8,
    padding: 12,
    minWidth: 180,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: tokenColors.ink,
    marginBottom: 4,
  },
  calloutRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  calloutRatingText: {
    fontSize: 12,
    color: tokenColors.inkSecondary,
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
    backgroundColor: tokenColors.cobaltLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  calloutPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: tokenColors.cobalt,
    marginBottom: 4,
  },
  calloutTap: {
    fontSize: 11,
    color: tokenColors.inkMuted,
    fontStyle: 'italic',
  },
  selectedFacilityCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: tokenColors.white,
    borderRadius: 12,
    shadowColor: tokenColors.black,
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
    color: tokenColors.ink,
    flex: 1,
    marginRight: 8,
  },
  cardAddress: {
    fontSize: 14,
    color: tokenColors.inkSecondary,
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
    color: tokenColors.ink,
    marginLeft: 4,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: tokenColors.cobaltLight,
    borderRadius: 16,
  },
  directionsText: {
    fontSize: 14,
    color: tokenColors.cobalt,
    fontWeight: '500',
    marginLeft: 4,
  },
});
