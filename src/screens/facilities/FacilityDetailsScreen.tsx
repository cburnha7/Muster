import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { EventCard } from '../../components/ui/EventCard';
import { OptimizedImage } from '../../components/ui/OptimizedImage';
import { CancellationPolicyDisplay } from '../../components/facilities/CancellationPolicyDisplay';
import { facilityService } from '../../services/api/FacilityService';
import { OwnerReservationsSection } from '../../components/facilities/OwnerReservationsSection';
import { ContextualReturnButton } from '../../components/navigation/ContextualReturnButton';
import {
  setSelectedFacility,
  selectSelectedFacility,
} from '../../store/slices/facilitiesSlice';
import { colors, fonts, Spacing } from '../../theme';
import { Event, FacilityPhoto, FacilityWithVerification } from '../../types';
import { selectUser } from '../../store/slices/authSlice';
import {
  HeroSection,
  PersonRow,
  DetailCard,
  FixedBottomCTA,
} from '../../components/detail';
import { GetDirectionsButton } from '../../components/ui/GetDirectionsButton';
import { getSportColor } from '../../constants/sportColors';
import { getSportLabel } from '../../constants/sports';

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

export function FacilityDetailsScreen({ route }: FacilityDetailsScreenProps) {
  const { facilityId, ...restParams } = route.params as any;
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const selectedFacility = useSelector(
    selectSelectedFacility
  ) as FacilityWithVerification | null;
  const currentUser = useSelector(selectUser);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [showFullMap, setShowFullMap] = useState(false);

  // Task 5.1 — local photo/map state
  const [photos, setPhotos] = useState<FacilityPhoto[]>([]);
  const [facilityMapUrl, setFacilityMapUrl] = useState<string | null>(null);
  const [facilityMapThumbnailUrl, setFacilityMapThumbnailUrl] = useState<
    string | null
  >(null);

  // Task 5.9 — inline error state
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Sync local state when Redux store updates
  useEffect(() => {
    if (selectedFacility) {
      setPhotos(selectedFacility.photos ?? []);
      setFacilityMapUrl(selectedFacility.facilityMapUrl ?? null);
      setFacilityMapThumbnailUrl(
        selectedFacility.facilityMapThumbnailUrl ?? null
      );
    }
  }, [selectedFacility]);

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
        limit: 20,
      });
      const now = Date.now();
      const upcoming = (response.data || []).filter(e =>
        e.endTime
          ? new Date(e.endTime).getTime() > now
          : new Date(e.startTime).getTime() > now
      );
      setEvents(upcoming);
    } catch (err: any) {
      console.error('Failed to load ground events:', err);
    }
  };

  // Task 5.3 / 5.4 — pick and upload photos
  const handleAddPhotos = async () => {
    setPhotoError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });
      if (result.canceled) return;
      for (const asset of result.assets) {
        try {
          const uploaded = await facilityService.uploadFacilityPhoto(
            facilityId,
            {
              uri: asset.uri,
              name: asset.fileName || 'photo.jpg',
              type: asset.mimeType || 'image/jpeg',
            }
          );
          setPhotos(prev => [...prev, uploaded]);
        } catch (err: any) {
          const msg: string = err?.message || '';
          if (
            msg.toLowerCase().includes('type') ||
            msg.toLowerCase().includes('jpeg') ||
            msg.toLowerCase().includes('png')
          ) {
            setPhotoError('Only JPEG and PNG images are allowed.');
          } else if (
            msg.toLowerCase().includes('size') ||
            msg.toLowerCase().includes('10')
          ) {
            setPhotoError('Photos must be under 10 MB.');
          } else {
            setPhotoError(msg || 'Failed to upload photo.');
          }
        }
      }
    } catch (err: any) {
      setPhotoError(err?.message || 'Failed to open image picker.');
    }
  };

  // Task 5.5 — delete a photo
  const handleDeletePhoto = async (photo: FacilityPhoto) => {
    try {
      await facilityService.deleteFacilityPhoto(facilityId, photo.id);
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
    } catch (err: any) {
      setPhotoError(err?.message || 'Failed to delete photo.');
    }
  };

  // Task 5.7 — upload map
  const handleUploadMap = async () => {
    setMapError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'application/pdf'],
      });
      if (result.canceled || !result.assets || result.assets.length === 0)
        return;
      const asset = result.assets[0];
      try {
        const uploaded = await facilityService.uploadFacilityMap(facilityId, {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'image/jpeg',
        });
        setFacilityMapUrl(uploaded.facilityMapUrl);
        setFacilityMapThumbnailUrl(uploaded.facilityMapThumbnailUrl);
      } catch (err: any) {
        const msg: string = err?.message || '';
        if (
          msg.toLowerCase().includes('type') ||
          msg.toLowerCase().includes('jpeg') ||
          msg.toLowerCase().includes('png') ||
          msg.toLowerCase().includes('pdf')
        ) {
          setMapError('Only JPEG, PNG, and PDF files are allowed.');
        } else if (
          msg.toLowerCase().includes('size') ||
          msg.toLowerCase().includes('20')
        ) {
          setMapError('Map file must be under 20 MB.');
        } else {
          setMapError(msg || 'Failed to upload map.');
        }
      }
    } catch (err: any) {
      setMapError(err?.message || 'Failed to open file picker.');
    }
  };

  // Task 5.8 — delete map
  const handleDeleteMap = async () => {
    setMapError(null);
    try {
      await facilityService.deleteFacilityMap(facilityId);
      setFacilityMapUrl(null);
      setFacilityMapThumbnailUrl(null);
    } catch (err: any) {
      setMapError(err?.message || 'Failed to remove map.');
    }
  };

  const handleEdit = () => {
    (navigation as any).navigate('EditFacility', { facilityId });
  };

  const handleDeleteGround = () => {
    if (!selectedFacility) return;
    if (Platform.OS === 'web') {
      if (
        window.confirm(
          `Are you sure you want to delete "${selectedFacility.name}"? This cannot be undone.`
        )
      ) {
        doDeleteGround();
      }
    } else {
      Alert.alert(
        'Delete Ground',
        `Are you sure you want to delete "${selectedFacility.name}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDeleteGround },
        ]
      );
    }
  };

  const doDeleteGround = async () => {
    try {
      await facilityService.deleteFacility(facilityId);
      navigation.goBack();
    } catch (err: any) {
      const msg =
        err instanceof Error ? err.message : 'Failed to delete ground';
      Alert.alert('Error', msg);
    }
  };

  const handleEventPress = (event: Event) => {
    (navigation as any).navigate('EventDetails', { eventId: event.id });
  };

  const openMapsDirections = () => {
    if (!selectedFacility) return;
    const address = encodeURIComponent(
      `${selectedFacility.street}, ${selectedFacility.city}, ${selectedFacility.state} ${selectedFacility.zipCode}`
    );
    const url =
      Platform.OS === 'ios' ? `maps://?q=${address}` : `geo:0,0?q=${address}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${address}`);
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={20} color="#FFD700" />);
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={20} color="#FFD700" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons
          key={`empty-${i}`}
          name="star-outline"
          size={20}
          color="#FFD700"
        />
      );
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
        <ErrorDisplay
          message={error || 'Ground not found'}
          onRetry={loadFacilityDetails}
        />
      </View>
    );
  }

  const facility = selectedFacility;
  const isOwner = currentUser?.id === facility.ownerId;

  const fullAddressString = [
    facility.street,
    facility.city,
    facility.state,
    facility.zipCode,
  ]
    .filter(Boolean)
    .join(', ');

  const showCancellationPolicy =
    facility.noticeWindowHours != null &&
    facility.teamPenaltyPct != null &&
    facility.penaltyDestination != null;

  return (
    <View style={styles.container}>
      <ContextualReturnButton />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Task 5.2 — Photo strip (all users, when photos exist) */}
        {photos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.photoStrip}
            contentContainerStyle={styles.photoStripContent}
          >
            {photos.map(photo => (
              <View key={photo.id} style={styles.photoItem}>
                <OptimizedImage
                  source={{ uri: photo.imageUrl }}
                  style={styles.photoImg}
                  resizeMode="cover"
                  fallback={
                    <View style={styles.photoFallback}>
                      <Ionicons
                        name="camera-outline"
                        size={32}
                        color={colors.onSurfaceVariant}
                      />
                    </View>
                  }
                />
                {/* Task 5.5 — delete overlay for owner */}
                {isOwner && (
                  <TouchableOpacity
                    style={styles.photoDeleteBtn}
                    onPress={() => handleDeletePhoto(photo)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="close-circle"
                      size={24}
                      color={colors.heart}
                    />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
        )}

        {/* Task 5.3 — "Add photos" button for owner */}
        {isOwner && (
          <View style={styles.addPhotosRow}>
            <TouchableOpacity
              style={styles.addPhotosBtn}
              onPress={handleAddPhotos}
              activeOpacity={0.7}
            >
              <Ionicons name="images-outline" size={18} color={colors.cobalt} />
              <Text style={styles.addPhotosBtnText}>
                {photos.length > 0 ? 'Add more photos' : 'Add photos'}
              </Text>
            </TouchableOpacity>
            {/* Task 5.9 — inline photo error */}
            {photoError ? (
              <Text style={styles.inlineError}>{photoError}</Text>
            ) : null}
          </View>
        )}

        {/* Hero image */}
        {facility.imageUrl && (
          <Image
            source={{ uri: facility.imageUrl }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        )}

        {/* HeroSection */}
        <HeroSection
          title={facility.name}
          sportColor={getSportColor(facility.sportTypes?.[0])}
          badges={
            [
              ...facility.sportTypes.map(s => ({ label: getSportLabel(s) })),
              facility.isVerified
                ? {
                    label: '✓ Verified',
                    bgColor: colors.secondaryContainer,
                    textColor: colors.secondary,
                  }
                : null,
            ].filter(Boolean) as any
          }
          {...(facility.pricePerHour
            ? { headline: `From $${facility.pricePerHour}/hr` }
            : {})}
          subline={[facility.city, facility.state].filter(Boolean).join(', ')}
          onSublinePress={openMapsDirections}
        >
          {/* Rating */}
          <View style={styles.ratingRow}>
            <View style={styles.stars}>{renderStars(facility.rating)}</View>
            <Text style={styles.ratingText}>
              {facility.rating.toFixed(1)} ({facility.reviewCount} reviews)
            </Text>
          </View>
        </HeroSection>

        {/* About card */}
        {facility.description ? (
          <DetailCard title="About" delay={0}>
            <Text style={styles.bodyText}>{facility.description}</Text>
            {facility.amenities?.length > 0 ? (
              <View style={styles.amenitiesGrid}>
                {facility.amenities.map((a, i) => (
                  <View key={i} style={styles.amenityRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={colors.secondary}
                    />
                    <Text style={styles.amenityText}>
                      {typeof a === 'string' ? a : (a as any).name}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </DetailCard>
        ) : null}

        {/* Location card */}
        <DetailCard title="Location" delay={50}>
          <Text style={styles.address}>{fullAddressString}</Text>
          <View style={styles.mapContainer}>
            {Platform.OS === 'web' ? (
              <View style={[styles.map, styles.mapPlaceholder]}>
                <Ionicons
                  name="location"
                  size={48}
                  color={colors.onSurfaceVariant}
                />
                <Text style={styles.mapPlaceholderText}>
                  Map view not available on web
                </Text>
                <Text style={styles.addressSubText}>
                  {facility.street}, {facility.city}
                </Text>
              </View>
            ) : (
              <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: facility.latitude,
                  longitude: facility.longitude,
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
                    latitude: facility.latitude,
                    longitude: facility.longitude,
                  }}
                  title={facility.name}
                  description={facility.street}
                />
              </MapView>
            )}
          </View>
          {facility.accessInstructions ? (
            <Text style={[styles.bodyText, { marginTop: 12 }]}>
              {facility.accessInstructions}
            </Text>
          ) : null}
          {facility.parkingInfo ? (
            <View style={styles.parkingBox}>
              <Ionicons name="car-outline" size={16} color={colors.primary} />
              <Text style={styles.parkingText}>{facility.parkingInfo}</Text>
            </View>
          ) : null}
          <View style={{ marginTop: 12 }}>
            <GetDirectionsButton
              latitude={facility.latitude}
              longitude={facility.longitude}
              address={fullAddressString}
            />
          </View>
        </DetailCard>

        {/* Facility map image */}
        {facilityMapUrl || isOwner ? (
          <DetailCard title="Facility map" delay={100}>
            {facilityMapUrl ? (
              <TouchableOpacity
                onPress={() => setShowFullMap(true)}
                style={styles.facilityMapThumb}
                activeOpacity={0.8}
              >
                <OptimizedImage
                  source={{ uri: facilityMapUrl }}
                  style={styles.facilityMapImg}
                  resizeMode="cover"
                  fallback={
                    <View style={styles.mapFallback}>
                      <Ionicons
                        name="map-outline"
                        size={48}
                        color={colors.onSurfaceVariant}
                      />
                      <Text style={styles.mapFallbackText}>
                        Map unavailable
                      </Text>
                    </View>
                  }
                />
                <View style={styles.facilityMapOverlay}>
                  <Ionicons name="expand-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.facilityMapOverlayText}>
                    Tap to view full size
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {/* Task 5.6 — Map upload controls for owner */}
            {isOwner && (
              <View style={styles.mapOwnerControls}>
                <TouchableOpacity
                  style={styles.mapUploadBtn}
                  onPress={handleUploadMap}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={16}
                    color={colors.cobalt}
                  />
                  <Text style={styles.mapUploadBtnText}>
                    {facilityMapUrl ? 'Replace map' : 'Upload map'}
                  </Text>
                </TouchableOpacity>
                {facilityMapUrl ? (
                  <TouchableOpacity
                    style={styles.mapRemoveBtn}
                    onPress={handleDeleteMap}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={colors.heart}
                    />
                    <Text style={styles.mapRemoveBtnText}>Remove map</Text>
                  </TouchableOpacity>
                ) : null}
                {/* Task 5.9 — inline map error */}
                {mapError ? (
                  <Text style={styles.inlineError}>{mapError}</Text>
                ) : null}
              </View>
            )}
          </DetailCard>
        ) : null}

        {/* Contact card */}
        <DetailCard title="Contact" delay={200}>
          {facility.owner && (
            <PersonRow
              name={`${facility.owner.firstName} ${facility.owner.lastName}`}
              role="Facility Owner"
            />
          )}
          {facility.contactPhone ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${facility.contactPhone}`)}
              activeOpacity={0.7}
            >
              <View style={styles.contactRow}>
                <Ionicons
                  name="call-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.contactText}>{facility.contactPhone}</Text>
              </View>
            </TouchableOpacity>
          ) : null}
          {facility.contactEmail ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(`mailto:${facility.contactEmail}`)}
              activeOpacity={0.7}
            >
              <View style={styles.contactRow}>
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.contactText}>{facility.contactEmail}</Text>
              </View>
            </TouchableOpacity>
          ) : null}
          {facility.contactWebsite ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(facility.contactWebsite!)}
              activeOpacity={0.7}
            >
              <View style={styles.contactRow}>
                <Ionicons
                  name="globe-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.contactText}>
                  {facility.contactWebsite}
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </DetailCard>

        {/* Cancellation policy */}
        {showCancellationPolicy && (
          <DetailCard title="Cancellation policy" delay={250}>
            <CancellationPolicyDisplay
              noticeWindowHours={facility.noticeWindowHours!}
              teamPenaltyPct={facility.teamPenaltyPct!}
              penaltyDestination={facility.penaltyDestination!}
            />
          </DetailCard>
        )}

        {/* Upcoming events */}
        {events.length > 0 && (
          <DetailCard title="Upcoming events" delay={300}>
            {events.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onPress={handleEventPress}
              />
            ))}
          </DetailCard>
        )}

        {/* Owner reservations */}
        {isOwner && (
          <DetailCard title="Your reservations" delay={350}>
            <OwnerReservationsSection facilityId={facility.id} />
          </DetailCard>
        )}

        {/* Spacer for fixed bottom button */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Fixed bottom — Edit for owner, Book for non-owner */}
      {isOwner ? (
        <View style={styles.ownerBottomBar}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={handleEdit}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={18} color={colors.white} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteGround}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color={colors.heart} />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FixedBottomCTA
          label="Book a court"
          onPress={() =>
            (navigation as any).navigate('CourtAvailability', {
              facilityId: facility.id,
              facilityName: facility.name,
              ...(restParams.returnTo
                ? {
                    returnTo: restParams.returnTo,
                    returnParams: restParams.returnParams,
                  }
                : {}),
            })
          }
          variant="primary"
        />
      )}

      {/* Full-size map modal */}
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
                <Ionicons name="close" size={28} color={colors.onSurface} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              maximumZoomScale={3}
              minimumZoomScale={1}
            >
              {facilityMapUrl && (
                <OptimizedImage
                  source={{ uri: facilityMapUrl }}
                  style={styles.fullMapImage}
                  resizeMode="contain"
                  fallback={
                    <View style={styles.mapFallback}>
                      <Ionicons
                        name="map-outline"
                        size={64}
                        color={colors.onSurfaceVariant}
                      />
                      <Text style={styles.mapFallbackText}>
                        Map unavailable
                      </Text>
                    </View>
                  }
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroImage: {
    width: '100%',
    height: 250,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  stars: {
    flexDirection: 'row',
    marginRight: Spacing.sm,
  },
  ratingText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  bodyText: {
    fontSize: 15,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  amenityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
    gap: 6,
  },
  amenityText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  address: {
    fontSize: 15,
    color: colors.onSurface,
    marginBottom: 12,
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 8,
  },
  addressSubText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    textAlign: 'center',
  },
  parkingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.primaryFixed,
    borderRadius: 8,
    gap: 8,
  },
  parkingText: {
    flex: 1,
    fontSize: 14,
    color: colors.onPrimaryFixed,
  },
  facilityMapThumb: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  facilityMapImg: {
    width: '100%',
    height: 200,
  },
  facilityMapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  facilityMapOverlayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  mapFallback: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  mapFallbackText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  contactText: {
    fontSize: 15,
    color: colors.onSurface,
    flex: 1,
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
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
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
  // Owner edit/delete actions
  ownerActions: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
  },
  ownerEditBtn: {
    backgroundColor: colors.cobalt,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center' as const,
  },
  ownerEditBtnText: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: '#FFFFFF',
  },
  ownerDeleteBtn: {
    borderWidth: 2,
    borderColor: colors.heart,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center' as const,
  },
  ownerDeleteBtnText: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: colors.heart,
  },
  ownerBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'column',
    gap: 10,
    padding: 20,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.pine,
  },
  editBtnText: { fontFamily: fonts.ui, fontSize: 15, color: colors.white },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.heart,
  },
  deleteBtnText: { fontFamily: fonts.ui, fontSize: 15, color: colors.heart },

  // Photo strip styles (tasks 5.2, 5.3, 5.5)
  photoStrip: {
    paddingVertical: 16,
  },
  photoStripContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  photoItem: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoImg: {
    width: 280,
    height: 220,
    borderRadius: 8,
  },
  photoFallback: {
    width: 280,
    height: 220,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
  },
  addPhotosRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  addPhotosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cobalt,
    alignSelf: 'flex-start' as const,
  },
  addPhotosBtnText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.cobalt,
  },

  // Map owner controls (tasks 5.6, 5.7, 5.8)
  mapOwnerControls: {
    marginTop: 12,
    gap: 8,
  },
  mapUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cobalt,
    alignSelf: 'flex-start' as const,
  },
  mapUploadBtnText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.cobalt,
  },
  mapRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.heart,
    alignSelf: 'flex-start' as const,
  },
  mapRemoveBtnText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.heart,
  },

  // Inline error (task 5.9)
  inlineError: {
    fontSize: 13,
    color: colors.heart,
    marginTop: 6,
  },
});
