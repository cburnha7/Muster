import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  Linking,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { OptimizedImage } from '../../components/ui/OptimizedImage';
import { CancellationPolicyDisplay } from '../../components/facilities/CancellationPolicyDisplay';
import { facilityService } from '../../services/api/FacilityService';
import { ImageService } from '../../services/ImageService';
import { OwnerScheduleTab } from '../../components/facilities/OwnerScheduleTab';
import { UserReservationsTab } from '../../components/facilities/UserReservationsTab';
import { EntityHeader } from '../../components/detail';
import {
  setSelectedFacility,
  selectSelectedFacility,
} from '../../store/slices/facilitiesSlice';
import { fonts, Spacing, useTheme } from '../../theme';
import { FacilityPhoto, FacilityWithVerification } from '../../types';
import { selectUser } from '../../store/slices/authSlice';
import { FixedBottomCTA } from '../../components/detail';
import { GetDirectionsButton } from '../../components/ui/GetDirectionsButton';
import { getSportLabel, getSportEmoji } from '../../constants/sports';
import { getSurfaceName } from '../../utils/getSurfaceName';
import { formatSportType } from '../../utils/formatters';

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

const BASE_TABS = ['Location', 'Contact', 'Site Details', 'Courts / Fields'];

interface FacilityDetailsScreenProps {
  route: {
    params: {
      facilityId: string;
    };
  };
}

/* ─── Tab Bar ─────────────────────────────────────────────────────────────── */

function TabBar({
  tabs,
  activeIndex,
  onPress,
}: {
  tabs: string[];
  activeIndex: number;
  onPress: (i: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        s.tabBarOuter,
        { backgroundColor: colors.bgCard, borderBottomColor: colors.border },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabBarContent}
      >
        {tabs.map((tab, i) => {
          const active = i === activeIndex;
          return (
            <TouchableOpacity
              key={tab}
              style={s.tabItem}
              onPress={() => onPress(i)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  s.tabLabel,
                  { color: colors.inkSecondary },
                  active && { color: colors.cobalt },
                ]}
              >
                {tab}
              </Text>
              {active && (
                <View
                  style={[s.tabUnderline, { backgroundColor: colors.cobalt }]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* ─── Main Screen ─────────────────────────────────────────────────────────── */

export function FacilityDetailsScreen({ route }: FacilityDetailsScreenProps) {
  const { colors } = useTheme();
  const { facilityId, ...restParams } = (route.params as any) ?? {};
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { width: screenWidth } = useWindowDimensions();

  const selectedFacility = useSelector(
    selectSelectedFacility
  ) as FacilityWithVerification | null;
  const currentUser = useSelector(selectUser);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullMap, setShowFullMap] = useState(false);
  const [photos, setPhotos] = useState<FacilityPhoto[]>([]);
  const [facilityMapUrl, setFacilityMapUrl] = useState<string | null>(null);
  const [facilityMapThumbnailUrl, setFacilityMapThumbnailUrl] = useState<
    string | null
  >(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState(0);
  const pagerRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (selectedFacility) {
      setPhotos(selectedFacility.photos ?? []);
      setFacilityMapUrl(selectedFacility.facilityMapUrl ?? null);
      setFacilityMapThumbnailUrl(
        selectedFacility.facilityMapThumbnailUrl ?? null
      );
      setCoverImageUrl((selectedFacility as any).coverImageUrl ?? null);
    }
  }, [selectedFacility]);

  useEffect(() => {
    loadFacilityDetails();
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

  const handleEdit = () => {
    (navigation as any).navigate('EditFacility', { facilityId });
  };

  const handleChangeCoverPhoto = async () => {
    try {
      // Delete old cover from R2 if replacing
      if (coverImageUrl && coverImageUrl.includes('r2.dev')) {
        await ImageService.deleteImage(coverImageUrl);
      }
      const result = await ImageService.pickAndUpload('grounds', {
        aspect: [16, 9],
        quality: 0.85,
      });
      if (!result) return; // user cancelled
      setCoverImageUrl(result.publicUrl);
      await facilityService.updateFacility(facilityId, {
        coverImageUrl: result.publicUrl,
      } as any);
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Please try again.');
    }
  };

  const handleTabPress = (index: number) => {
    setActiveTab(index);
    pagerRef.current?.scrollTo({ x: index * screenWidth, animated: true });
  };

  const handlePagerScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    if (index !== activeTab) setActiveTab(index);
  };

  // Compute tabs — must be before early returns to satisfy Rules of Hooks
  const isOwner = currentUser?.id === selectedFacility?.ownerId;
  const tabs = useMemo(
    () => [...BASE_TABS, isOwner ? 'Schedule' : 'Reservations'],
    [isOwner]
  );

  if (isLoading) {
    return (
      <View style={[s.container, { backgroundColor: colors.bgScreen }]}>
        <LoadingSpinner />
      </View>
    );
  }

  if (error || !selectedFacility) {
    return (
      <View style={[s.container, { backgroundColor: colors.bgScreen }]}>
        <ErrorDisplay
          message={error || 'Ground not found'}
          onRetry={loadFacilityDetails}
        />
      </View>
    );
  }

  const facility = selectedFacility;

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

  const courts = (facility as any).courts ?? [];
  const primarySport = facility.sportTypes?.[0] ?? 'other';

  const formatHoursForDay = (dayOfWeek: number) => {
    const slots = (facility.availabilitySlots ?? []).filter(
      (sl: any) =>
        sl.isRecurring && !sl.specificDate && sl.dayOfWeek === dayOfWeek
    );
    if (slots.length === 0) return null;
    const slot = slots[0];
    if (slot.isBlocked) return 'Closed';
    const fmt = (t: string) => {
      const [h, m] = t.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      return `${hour % 12 || 12}:${m} ${ampm}`;
    };
    return `${fmt(slot.startTime)} – ${fmt(slot.endTime)}`;
  };

  const DAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  return (
    <View style={[s.container, { backgroundColor: colors.bgScreen }]}>
      <EntityHeader
        name={facility.name}
        coverUrl={coverImageUrl}
        chips={[
          ...(facility.sportTypes || []).map((s: string) => ({
            label: formatSportType(s),
          })),
          { label: 'Grounds' },
        ]}
        subtitle={`${facility.city}, ${facility.state}`}
        showEdit={isOwner}
        onEdit={handleChangeCoverPhoto}
      />
      <TabBar tabs={tabs} activeIndex={activeTab} onPress={handleTabPress} />

      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handlePagerScroll}
        style={{ flex: 1 }}
      >
        {/* ── TAB 1 — Location ───────────────────────────────────────────── */}
        <View style={{ width: screenWidth }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Photos gallery */}
            {photos.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ paddingVertical: 16 }}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
              >
                {photos.map(photo => (
                  <View
                    key={photo.id}
                    style={{ borderRadius: 8, overflow: 'hidden' }}
                  >
                    <OptimizedImage
                      source={{ uri: photo.imageUrl }}
                      style={{ width: 280, height: 220, borderRadius: 8 }}
                      resizeMode="cover"
                      fallback={
                        <View
                          style={{
                            width: 280,
                            height: 220,
                            borderRadius: 8,
                            backgroundColor: colors.surface,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Ionicons
                            name="camera-outline"
                            size={32}
                            color={colors.inkSoft}
                          />
                        </View>
                      }
                    />
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Description */}
            {facility.description ? (
              <>
                <Text style={[s.sectionLabel, { color: colors.inkSecondary }]}>
                  DESCRIPTION
                </Text>
                <View style={[s.card, { backgroundColor: colors.bgCard }]}>
                  <View style={{ padding: 16 }}>
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 15,
                        lineHeight: 22,
                        color: colors.inkSoft,
                      }}
                    >
                      {facility.description}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}

            <Text style={[s.sectionLabel, { color: colors.inkSecondary }]}>
              ADDRESS
            </Text>
            <View style={[s.card, { backgroundColor: colors.bgCard }]}>
              <View style={{ padding: 16 }}>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 15,
                    color: colors.ink,
                  }}
                >
                  {fullAddressString}
                </Text>
              </View>
            </View>

            <Text style={[s.sectionLabel, { color: colors.inkSecondary }]}>
              MAP
            </Text>
            <View style={[s.card, { backgroundColor: colors.bgCard }]}>
              <View
                style={{ height: 200, borderRadius: 16, overflow: 'hidden' }}
              >
                {Platform.OS === 'web' ? (
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: colors.surface,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons
                      name="location"
                      size={48}
                      color={colors.inkSoft}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.inkSoft,
                        marginTop: 8,
                      }}
                    >
                      Map view not available on web
                    </Text>
                  </View>
                ) : (
                  MapView && (
                    <MapView
                      style={{ width: '100%', height: '100%' }}
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
                  )
                )}
              </View>
            </View>

            {facility.accessInstructions ? (
              <>
                <Text style={[s.sectionLabel, { color: colors.inkSecondary }]}>
                  ACCESS INSTRUCTIONS
                </Text>
                <View style={[s.card, { backgroundColor: colors.bgCard }]}>
                  <View style={{ padding: 16 }}>
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 15,
                        lineHeight: 22,
                        color: colors.inkSoft,
                      }}
                    >
                      {facility.accessInstructions}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}

            {facility.parkingInfo ? (
              <>
                <Text style={[s.sectionLabel, { color: colors.inkSecondary }]}>
                  PARKING
                </Text>
                <View style={[s.card, { backgroundColor: colors.bgCard }]}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 16,
                      gap: 8,
                    }}
                  >
                    <Ionicons
                      name="car-outline"
                      size={16}
                      color={colors.cobalt}
                    />
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 14,
                        color: colors.ink,
                        flex: 1,
                      }}
                    >
                      {facility.parkingInfo}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}

            <View style={{ marginHorizontal: 16, marginTop: 12 }}>
              <GetDirectionsButton
                latitude={facility.latitude}
                longitude={facility.longitude}
                address={fullAddressString}
              />
            </View>
          </ScrollView>
        </View>

        {/* ── TAB 2 — Contact ────────────────────────────────────────────── */}
        <View style={{ width: screenWidth }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {facility.contactName ||
            facility.contactPhone ||
            facility.contactEmail ||
            facility.contactWebsite ? (
              <>
                <Text style={[s.sectionLabel, { color: colors.inkSecondary }]}>
                  CONTACT INFO
                </Text>
                <View style={[s.card, { backgroundColor: colors.bgCard }]}>
                  <View style={{ padding: 16 }}>
                    {facility.contactName ? (
                      <View style={s.contactRow}>
                        <Ionicons
                          name="person-outline"
                          size={16}
                          color={colors.cobalt}
                        />
                        <Text style={[s.contactText, { color: colors.ink }]}>
                          {facility.contactName}
                        </Text>
                      </View>
                    ) : null}
                    {facility.contactPhone ? (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(`tel:${facility.contactPhone}`)
                        }
                        activeOpacity={0.7}
                      >
                        <View style={s.contactRow}>
                          <Ionicons
                            name="call-outline"
                            size={16}
                            color={colors.cobalt}
                          />
                          <Text
                            style={[s.contactText, { color: colors.cobalt }]}
                          >
                            {facility.contactPhone}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}
                    {facility.contactEmail ? (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(`mailto:${facility.contactEmail}`)
                        }
                        activeOpacity={0.7}
                      >
                        <View style={s.contactRow}>
                          <Ionicons
                            name="mail-outline"
                            size={16}
                            color={colors.cobalt}
                          />
                          <Text
                            style={[s.contactText, { color: colors.cobalt }]}
                          >
                            {facility.contactEmail}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}
                    {facility.contactWebsite ? (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(facility.contactWebsite!)
                        }
                        activeOpacity={0.7}
                      >
                        <View style={s.contactRow}>
                          <Ionicons
                            name="globe-outline"
                            size={16}
                            color={colors.cobalt}
                          />
                          <Text
                            style={[s.contactText, { color: colors.cobalt }]}
                          >
                            {facility.contactWebsite}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </>
            ) : (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Ionicons
                  name="call-outline"
                  size={32}
                  color={colors.inkFaint}
                />
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    color: colors.inkFaint,
                    marginTop: 8,
                  }}
                >
                  No contact info provided
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* ── TAB 3 — Site Details ───────────────────────────────────────── */}
        <View style={{ width: screenWidth }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Hours of operation */}
            {facility.availabilitySlots &&
              facility.availabilitySlots.length > 0 && (
                <>
                  <Text
                    style={[s.sectionLabel, { color: colors.inkSecondary }]}
                  >
                    HOURS OF OPERATION
                  </Text>
                  <View style={[s.card, { backgroundColor: colors.bgCard }]}>
                    <View style={{ padding: 16 }}>
                      {DAYS.map((day, idx) => {
                        const hours = formatHoursForDay(idx);
                        return (
                          <View
                            key={idx}
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              paddingVertical: 8,
                              borderBottomWidth:
                                idx < 6 ? StyleSheet.hairlineWidth : 0,
                              borderBottomColor: colors.border,
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: fonts.body,
                                fontSize: 14,
                                color: colors.ink,
                                fontWeight: '600',
                              }}
                            >
                              {day}
                            </Text>
                            <Text
                              style={{
                                fontFamily: fonts.body,
                                fontSize: 14,
                                color:
                                  hours === 'Closed'
                                    ? colors.inkFaint
                                    : colors.inkSoft,
                              }}
                            >
                              {hours ?? '—'}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </>
              )}

            {/* Sports */}
            {facility.sportTypes && facility.sportTypes.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { color: colors.inkSecondary }]}>
                  SPORTS AVAILABLE
                </Text>
                <View style={[s.card, { backgroundColor: colors.bgCard }]}>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      padding: 16,
                      gap: 8,
                    }}
                  >
                    {facility.sportTypes.map((sport: string) => (
                      <View
                        key={sport}
                        style={{
                          backgroundColor: colors.surface,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Text style={{ fontSize: 20 }}>
                          {getSportEmoji(sport)}
                        </Text>
                        <Text
                          style={{
                            fontFamily: fonts.label,
                            fontSize: 13,
                            color: colors.ink,
                          }}
                        >
                          {getSportLabel(sport)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}

            {/* Field map — tap to open fullscreen */}
            {facilityMapUrl ? (
              <>
                <Text style={[s.sectionLabel, { color: colors.inkSecondary }]}>
                  FACILITY MAP
                </Text>
                <TouchableOpacity
                  onPress={() => setShowFullMap(true)}
                  activeOpacity={0.8}
                  style={{ marginHorizontal: 16, marginBottom: 16 }}
                >
                  <OptimizedImage
                    source={{ uri: facilityMapUrl }}
                    style={{ width: '100%', height: 200, borderRadius: 12 }}
                    resizeMode="cover"
                    fallback={
                      <View
                        style={{
                          width: '100%',
                          height: 200,
                          borderRadius: 12,
                          backgroundColor: colors.surface,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons
                          name="map-outline"
                          size={48}
                          color={colors.inkSoft}
                        />
                      </View>
                    }
                  />
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: 'rgba(0,0,0,0.55)',
                      padding: 10,
                      borderBottomLeftRadius: 12,
                      borderBottomRightRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Ionicons name="expand-outline" size={16} color="#FFFFFF" />
                    <Text
                      style={{
                        color: '#FFFFFF',
                        fontFamily: fonts.label,
                        fontSize: 12,
                      }}
                    >
                      View Field Map
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : null}

            {/* Cancellation policy */}
            {showCancellationPolicy && (
              <>
                <Text style={[s.sectionLabel, { color: colors.inkSecondary }]}>
                  CANCELLATION POLICY
                </Text>
                <View style={[s.card, { backgroundColor: colors.bgCard }]}>
                  <View style={{ padding: 16 }}>
                    <CancellationPolicyDisplay
                      noticeWindowHours={facility.noticeWindowHours!}
                      teamPenaltyPct={facility.teamPenaltyPct!}
                      penaltyDestination={facility.penaltyDestination!}
                    />
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </View>

        {/* ── TAB 4 — Courts / Fields ────────────────────────────────────── */}
        <View style={{ width: screenWidth }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Facility map */}
            {facilityMapUrl ? (
              <>
                <Text style={[s.sectionLabel, { color: colors.inkSecondary }]}>
                  FACILITY MAP
                </Text>
                <View style={[s.card, { backgroundColor: colors.bgCard }]}>
                  <TouchableOpacity
                    onPress={() => setShowFullMap(true)}
                    activeOpacity={0.8}
                  >
                    <OptimizedImage
                      source={{ uri: facilityMapUrl }}
                      style={{ width: '100%', height: 200 }}
                      resizeMode="cover"
                      fallback={
                        <View
                          style={{
                            width: '100%',
                            height: 200,
                            backgroundColor: colors.surface,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Ionicons
                            name="map-outline"
                            size={48}
                            color={colors.inkSoft}
                          />
                        </View>
                      }
                    />
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        padding: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <Ionicons
                        name="expand-outline"
                        size={18}
                        color={colors.white}
                      />
                      <Text
                        style={{
                          color: colors.white,
                          fontSize: 13,
                          fontWeight: '600',
                        }}
                      >
                        View Map
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}

            {/* Courts list */}
            {courts.length > 0 ? (
              <>
                <Text style={[s.sectionLabel, { color: colors.inkSecondary }]}>
                  {getSurfaceName(primarySport).toUpperCase()}S
                </Text>
                {courts.map((court: any) => (
                  <View
                    key={court.id}
                    style={[s.card, { backgroundColor: colors.bgCard }]}
                  >
                    <View style={{ padding: 16 }}>
                      <Text
                        style={{
                          fontFamily: fonts.heading,
                          fontSize: 16,
                          color: colors.ink,
                          marginBottom: 4,
                        }}
                      >
                        {court.name}
                      </Text>
                      <Text
                        style={{
                          fontFamily: fonts.body,
                          fontSize: 13,
                          color: colors.inkSoft,
                        }}
                      >
                        {getSportLabel(court.sportType)}{' '}
                        {getSurfaceName(court.sportType)} •
                        {court.isIndoor ? ' Indoor' : ' Outdoor'} • Capacity:{' '}
                        {court.capacity}
                      </Text>
                      {court.pricePerHour ? (
                        <Text
                          style={{
                            fontFamily: fonts.ui,
                            fontSize: 14,
                            color: colors.cobalt,
                            marginTop: 4,
                          }}
                        >
                          ${court.pricePerHour}/hr
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Ionicons
                  name="grid-outline"
                  size={32}
                  color={colors.inkFaint}
                />
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    color: colors.inkFaint,
                    marginTop: 8,
                  }}
                >
                  No {getSurfaceName(primarySport).toLowerCase()}s listed
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* ── TAB 5 — Schedule (owner) / Reservations (non-owner) ────── */}
        <View style={{ width: screenWidth }}>
          {isOwner ? (
            <OwnerScheduleTab facilityId={facility.id} />
          ) : (
            <UserReservationsTab
              facilityId={facility.id}
              facilityName={facility.name}
            />
          )}
        </View>
      </ScrollView>

      {/* Fixed bottom — Edit for owner, Book for non-owner */}
      {isOwner ? (
        <View
          style={[
            s.ownerBottomBar,
            { backgroundColor: colors.bgCard, borderTopColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[s.editBtn, { backgroundColor: colors.pine }]}
            onPress={handleEdit}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={18} color={colors.white} />
            <Text style={[s.editBtnText, { color: colors.white }]}>
              Edit Grounds
            </Text>
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
        transparent
        animationType="fade"
        onRequestClose={() => setShowFullMap(false)}
      >
        <View style={s.modalContainer}>
          <View style={[s.modalContent, { backgroundColor: colors.bgCard }]}>
            <View
              style={[
                s.modalHeader,
                {
                  backgroundColor: colors.bgCard,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Text style={[s.modalTitle, { color: colors.ink }]}>
                Facility Layout
              </Text>
              <TouchableOpacity
                style={{ padding: 4 }}
                onPress={() => setShowFullMap(false)}
              >
                <Ionicons name="close" size={28} color={colors.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 16,
              }}
              maximumZoomScale={3}
              minimumZoomScale={1}
            >
              {facilityMapUrl && (
                <OptimizedImage
                  source={{ uri: facilityMapUrl }}
                  style={{ width: '100%', height: 600 }}
                  resizeMode="contain"
                  fallback={
                    <View
                      style={{
                        width: '100%',
                        height: 200,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: colors.surface,
                      }}
                    >
                      <Ionicons
                        name="map-outline"
                        size={64}
                        color={colors.inkSoft}
                      />
                      <Text
                        style={{
                          fontSize: 14,
                          color: colors.inkSoft,
                          marginTop: 12,
                        }}
                      >
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

const s = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* ── Tab bar ── */
  tabBarOuter: {
    borderBottomWidth: 1,
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  tabItem: {
    height: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontFamily: fonts.ui,
    fontSize: 13,
  },
  tabLabelActive: {},
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 1,
  },

  /* ── Section label ── */
  sectionLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },

  /* ── Card ── */
  card: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },

  /* ── Contact ── */
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  contactText: {
    fontFamily: fonts.body,
    fontSize: 15,
    flex: 1,
  },

  /* ── Owner bottom bar ── */
  ownerBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'column',
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  editBtnText: { fontFamily: fonts.ui, fontSize: 15 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  deleteBtnText: { fontFamily: fonts.ui, fontSize: 15 },

  /* ── Modal ── */
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '95%',
    height: '90%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
});
