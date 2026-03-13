import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { EventCard } from '../../components/ui/EventCard';
import { OptimizedImage } from '../../components/ui/OptimizedImage';
import { facilityService } from '../../services/api/FacilityService';
import {
  setSelectedFacility,
  removeFacility,
  selectSelectedFacility,
} from '../../store/slices/facilitiesSlice';
import { colors, Spacing } from '../../theme';
import { Event, SportType, FacilityWithVerification } from '../../types';
import { selectUser } from '../../store/slices/authSlice';

// Only import MapView on native platforms
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== 'web') {
  const MapViewModule = require('react-native-maps');
  MapView = MapViewModule.default;
  Marker = MapViewModule.Marker;
  PROVIDER_GOOGLE = MapViewModule.PROVIDER_GOOGLE;
}

interface FacilityDetailsScreenProps {
  route: {
    params: {
      facilityId: string;
    };
  };
}

export function FacilityDetailsScreen({ route }: FacilityDetailsScreenProps): JSX.Element {
  const { facilityId } = route.params;
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const selectedFacility = useSelector(selectSelectedFacility) as FacilityWithVerification | null;
  const currentUser = useSelector(selectUser);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [showFullMap, setShowFullMap] = useState(false);

  useEffect(() => {
    loadFacilityDetails();
    loadFacilityEvents();
  }, [facilityId]);

  const loadFacilityDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const facility = await facilityService.getFacility(facilityId);
      dispatch(setSelectedFacility(facility));
    } catch (err: any) {
      setError(err.message || 'Failed to load ground details');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFacilityEvents = async () => {
    try {
      const response = await facilityService.getFacilityEvents(facilityId, {
        page: 1,
        limit: 10,
      });
      setEvents(response.data);
    } catch (err: any) {
      console.error('Failed to load ground events:', err);
    }
  };

  const handleEdit = () => {
    navigation.navigate('EditFacility' as never, { facilityId } as never);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Ground',
      'Are you sure you want to delete this ground? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await facilityService.deleteFacility(facilityId);
              dispatch(removeFacility(facilityId));
              // Navigate back with refresh parameter to force list reload
              navigation.navigate('Facilities' as never, { 
                screen: 'FacilitiesList',
                params: { refresh: Date.now() }
              } as never);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete ground');
            }
          },
        },
      ]
    );
  };

  const handleEventPress = (event: Event) => {
    navigation.navigate('EventDetails' as never, { eventId: event.id } as never);
  };

  const getSportIcon = (sportType: SportType) => {
    switch (sportType) {
      case SportType.BASKETBALL:
        return 'basketball-outline';
      case SportType.SOCCER:
        return 'football-outline';
      case SportType.TENNIS:
      case SportType.PICKLEBALL:
        return 'tennisball-outline';
      case SportType.VOLLEYBALL:
        return 'american-football-outline';
      case SportType.SOFTBALL:
      case SportType.BASEBALL:
        return 'baseball-outline';
      case SportType.FLAG_FOOTBALL:
        return 'flag-outline';
      case SportType.KICKBALL:
        return 'football-outline';
      default:
        return 'fitness-outline';
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={20} color="#FFD700" />);
    }

    if (hasHalfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={20} color="#FFD700" />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={20} color="#FFD700" />);
    }

    return stars;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    );
  }

  if (error || !selectedFacility) {
    return (
      <View style={styles.container}>
        <ErrorDisplay message={error || 'Ground not found'} onRetry={loadFacilityDetails} />
      </View>
    );
  }

  const isOwner = currentUser?.id === selectedFacility.ownerId;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Image Gallery */}
      {selectedFacility.imageUrl && (
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: selectedFacility.imageUrl }} 
            style={styles.image} 
            resizeMode="cover" 
          />
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.titleContainer}>
            <Text style={styles.name}>{selectedFacility.name}</Text>
            {selectedFacility.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          {isOwner && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
                <Ionicons name="create-outline" size={24} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.rating}>
          <View style={styles.stars}>{renderStars(selectedFacility.rating)}</View>
          <Text style={styles.ratingText}>
            {selectedFacility.rating.toFixed(1)} ({selectedFacility.reviewCount} reviews)
          </Text>
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>{selectedFacility.description}</Text>
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
            {selectedFacility.street}, {selectedFacility.city},{' '}
            {selectedFacility.state} {selectedFacility.zipCode}
          </Text>
        </View>
        
        {/* Map View */}
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
            <View style={[styles.map, styles.mapPlaceholder]}>
              <Ionicons name="location" size={48} color="#666" />
              <Text style={styles.mapPlaceholderText}>
                Map view not available on web
              </Text>
              <Text style={styles.addressText}>
                {selectedFacility.street}, {selectedFacility.city}
              </Text>
            </View>
          ) : (
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: selectedFacility.latitude,
                longitude: selectedFacility.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: selectedFacility.latitude,
                  longitude: selectedFacility.longitude,
                }}
                title={selectedFacility.name}
                description={selectedFacility.street}
              />
            </MapView>
          )}
        </View>
      </View>

      {/* Facility Map */}
      {selectedFacility.facilityMapUrl && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Facility Layout</Text>
          <Text style={styles.description}>
            View the facility map to see the layout of courts and fields.
          </Text>
          <TouchableOpacity 
            style={styles.facilityMapContainer}
            onPress={() => setShowFullMap(true)}
            activeOpacity={0.8}
          >
            <OptimizedImage
              source={{ uri: selectedFacility.facilityMapUrl }}
              style={styles.facilityMapImage}
              resizeMode="cover"
              fallback={
                <View style={styles.mapFallback}>
                  <Ionicons name="map-outline" size={48} color="#999" />
                  <Text style={styles.mapFallbackText}>Map unavailable</Text>
                </View>
              }
            />
            <View style={styles.mapOverlay}>
              <Ionicons name="expand-outline" size={24} color="#FFF" />
              <Text style={styles.mapOverlayText}>Tap to view full size</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Contact */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        {selectedFacility.contactPhone && (
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#666" />
            <Text style={styles.infoText}>{selectedFacility.contactPhone}</Text>
          </View>
        )}
        {selectedFacility.contactEmail && (
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color="#666" />
            <Text style={styles.infoText}>{selectedFacility.contactEmail}</Text>
          </View>
        )}
        {selectedFacility.contactWebsite && (
          <View style={styles.infoRow}>
            <Ionicons name="globe-outline" size={20} color="#666" />
            <Text style={styles.infoText}>{selectedFacility.contactWebsite}</Text>
          </View>
        )}
        {selectedFacility.owner && (
          <View style={styles.ownerInfo}>
            <Text style={styles.ownerLabel}>Facility Owner:</Text>
            <Text style={styles.ownerName}>
              {selectedFacility.owner.firstName} {selectedFacility.owner.lastName}
            </Text>
          </View>
        )}
      </View>

      {/* Sports */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Sports</Text>
        <View style={styles.sportsContainer}>
          {selectedFacility.sportTypes.map((sport) => (
            <View key={sport} style={styles.sportBadge}>
              <Ionicons name={getSportIcon(sport) as any} size={20} color="#007AFF" />
              <Text style={styles.sportText}>
                {sport.charAt(0).toUpperCase() + sport.slice(1)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Amenities */}
      {selectedFacility.amenities && selectedFacility.amenities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenitiesContainer}>
            {selectedFacility.amenities.map((amenity, index) => (
              <View key={index} style={styles.amenityItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.amenityText}>{typeof amenity === 'string' ? amenity : amenity.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Pricing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pricing</Text>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
            From ${selectedFacility.pricePerHour}/hour
          </Text>
        </View>
        {selectedFacility.rateSchedules && selectedFacility.rateSchedules.length > 1 && (
          <Text style={styles.priceNote}>
            * Prices vary by time and day. See rate calendar for details.
          </Text>
        )}
        {selectedFacility.minimumBookingHours > 1 && (
          <Text style={styles.priceNote}>
            Minimum booking: {selectedFacility.minimumBookingHours} hours
          </Text>
        )}
        
        {/* Book Court Button */}
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => {
            navigation.navigate('CourtAvailability' as never, {
              facilityId: selectedFacility.id,
              facilityName: selectedFacility.name,
            } as never);
          }}
        >
          <Ionicons name="calendar-outline" size={20} color="#FFF" />
          <Text style={styles.bookButtonText}>Book a Court</Text>
        </TouchableOpacity>
      </View>

      {/* Access Instructions */}
      {selectedFacility.accessInstructions && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Access Instructions</Text>
          <Text style={styles.description}>{selectedFacility.accessInstructions}</Text>
          {selectedFacility.parkingInfo && (
            <View style={styles.parkingInfo}>
              <Ionicons name="car-outline" size={20} color="#666" />
              <Text style={styles.infoText}>{selectedFacility.parkingInfo}</Text>
            </View>
          )}
          {selectedFacility.accessImages && selectedFacility.accessImages.length > 0 && (
            <View style={styles.accessImagesContainer}>
              {selectedFacility.accessImages.map((img) => (
                <View key={img.id} style={styles.accessImageWrapper}>
                  <Image source={{ uri: img.imageUrl }} style={styles.accessImage} />
                  {img.caption && <Text style={styles.imageCaption}>{img.caption}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Upcoming Events */}
      {events.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          {events.map((event) => (
            <EventCard key={event.id} event={event} onPress={handleEventPress} />
          ))}
        </View>
      )}

      {/* Full-Size Map Modal */}
      <Modal
        visible={showFullMap}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFullMap(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Facility Layout</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowFullMap(false)}
              >
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              maximumZoomScale={3}
              minimumZoomScale={1}
            >
              {selectedFacility.facilityMapUrl && (
                <OptimizedImage
                  source={{ uri: selectedFacility.facilityMapUrl }}
                  style={styles.fullMapImage}
                  resizeMode="contain"
                  fallback={
                    <View style={styles.mapFallback}>
                      <Ionicons name="map-outline" size={64} color="#999" />
                      <Text style={styles.mapFallbackText}>Map unavailable</Text>
                    </View>
                  }
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chalk,
  },
  content: {
    paddingBottom: Spacing.lg,
  },
  imageContainer: {
    width: '100%',
    height: 250,
  },
  image: {
    width: '100%',
    height: 250,
  },
  header: {
    backgroundColor: colors.chalk,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.soft,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: Spacing.sm,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grass + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  verifiedText: {
    fontSize: 14,
    color: colors.grass,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    marginRight: Spacing.sm,
  },
  ratingText: {
    fontSize: 14,
    color: colors.soft,
  },
  section: {
    backgroundColor: colors.chalk,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: 16,
    color: colors.soft,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: 16,
    color: colors.soft,
    marginLeft: Spacing.md,
    flex: 1,
  },
  sportsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  sportText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 6,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  amenityText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 12,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  addressText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  priceNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.grass,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: 8,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.chalk,
  },
  parkingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
  accessImagesContainer: {
    marginTop: 12,
  },
  accessImageWrapper: {
    marginBottom: 12,
  },
  accessImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  imageCaption: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  ownerInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  ownerLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  facilityMapContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  facilityMapImage: {
    width: '100%',
    height: 250,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapOverlayText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  mapFallback: {
    width: '100%',
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  mapFallbackText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '95%',
    height: '90%',
    backgroundColor: colors.chalk,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.soft,
    backgroundColor: colors.chalk,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
  },
  closeButton: {
    padding: 4,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fullMapImage: {
    width: '100%',
    height: 600,
  },
});