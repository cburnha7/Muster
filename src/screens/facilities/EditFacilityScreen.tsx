import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Switch,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../context/AuthContext';
import { FormInput } from '../../components/forms/FormInput';
import { FormButton } from '../../components/forms/FormButton';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { PhotoUpload } from '../../components/ui/PhotoUpload';
import { OptimizedImage } from '../../components/ui/OptimizedImage';
import { HoursOfOperationSection } from '../../components/facilities/HoursOfOperationSection';
import { CancellationPolicyPicker } from '../../components/facilities/CancellationPolicyPicker';
import { SportIconGrid } from '../../components/wizard/SportIconGrid';
import { facilityService } from '../../services/api/FacilityService';
import { formatSportType } from '../../utils/formatters';
import { courtService } from '../../services/api/CourtService';
import {
  updateFacility,
  removeFacility,
} from '../../store/slices/facilitiesSlice';
import {
  SportType,
  CreateFacilityData,
  Facility,
  FacilityPhoto,
} from '../../types';
import { colors, fonts, Spacing, TextStyles, useTheme } from '../../theme';
import { loggingService } from '../../services/LoggingService';
import { getSurfaceName } from '../../utils/getSurfaceName';
import { getSportLabel } from '../../constants/sports';

const TABS = [
  'Basics',
  'Location',
  'Contact',
  'Site Details',
  'Courts / Fields',
] as const;

/* ─── Tab Bar ─────────────────────────────────────────────────────────────── */

function TabBar({
  activeIndex,
  onPress,
}: {
  activeIndex: number;
  onPress: (i: number) => void;
}) {
  return (
    <View style={s.tabBarOuter}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabBarContent}
      >
        {TABS.map((tab, i) => {
          const active = i === activeIndex;
          return (
            <TouchableOpacity
              key={tab}
              style={s.tabItem}
              onPress={() => onPress(i)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>
                {tab}
              </Text>
              {active && <View style={s.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface CourtFormData {
  id: string;
  name: string;
  sportType: string;
  capacity: number;
  isIndoor: boolean;
  pricePerHour: number;
  isExisting?: boolean;
}

interface DayHours {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isClosed: boolean;
}

interface EditFacilityScreenProps {
  route: { params: { facilityId: string } };
}

/* ─── Main Screen ─────────────────────────────────────────────────────────── */

export function EditFacilityScreen({
  route,
}: EditFacilityScreenProps): JSX.Element {
  const { colors } = useTheme();
  const { facilityId } = route.params ?? {};
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { width: screenWidth } = useWindowDimensions();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<FacilityPhoto[]>([]);
  const [facilityMapUrl, setFacilityMapUrl] = useState<string | null>(null);
  const [facilityMapThumbnailUrl, setFacilityMapThumbnailUrl] = useState<
    string | null
  >(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [courts, setCourts] = useState<CourtFormData[]>([]);
  const [showAddCourtModal, setShowAddCourtModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingCourtId, setEditingCourtId] = useState<string | null>(null);
  const [originalCourts, setOriginalCourts] = useState<string[]>([]);
  const [hoursOfOperation, setHoursOfOperation] = useState<DayHours[]>([]);
  const [requiresInsurance, setRequiresInsurance] = useState(false);
  const [requiresBookingConfirmation, setRequiresBookingConfirmation] =
    useState(false);
  const [waiverRequired, setWaiverRequired] = useState(false);
  const [waiverText, setWaiverText] = useState('');
  const [originalWaiverText, setOriginalWaiverText] = useState('');

  const [formData, setFormData] = useState<Partial<CreateFacilityData>>({
    name: '',
    description: '',
    address: { street: '', city: '', state: '', zipCode: '', country: 'USA' },
    contactInfo: { name: '', phone: '', email: '', website: '' },
    sportTypes: [],
    amenities: [],
    pricing: { wholeFacilityRate: 0, currency: 'USD' },
    cancellationPolicyHours: null,
  });

  const [newCourt, setNewCourt] = useState<CourtFormData>({
    id: '',
    name: '',
    sportType: '',
    capacity: 10,
    isIndoor: false,
    pricePerHour: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState(0);
  const pagerRef = useRef<ScrollView>(null);

  const handleTabPress = (index: number) => {
    setActiveTab(index);
    pagerRef.current?.scrollTo({ x: index * screenWidth, animated: true });
  };

  const handlePagerScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    if (index !== activeTab) setActiveTab(index);
  };

  /* ─── Data Loading ──────────────────────────────────────────────────────── */

  useEffect(() => {
    loadFacilityData();
  }, [facilityId]);

  useFocusEffect(
    useCallback(() => {
      loadFacilityData(true);
    }, [facilityId])
  );

  const loadFacilityData = async (skipCache: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const facility = await facilityService.getFacility(facilityId, skipCache);
      const facilityCourts = await courtService.getCourts(
        facilityId,
        skipCache
      );

      setFormData({
        name: facility.name,
        description: facility.description,
        address: {
          street: facility.street,
          city: facility.city,
          state: facility.state,
          zipCode: facility.zipCode,
          country: 'USA',
        },
        contactInfo: {
          name: facility.contactName || '',
          phone: facility.contactPhone || '',
          email: facility.contactEmail || '',
          website: facility.contactWebsite || '',
        },
        sportTypes: facility.sportTypes,
        amenities: facility.amenities || [],
        pricing: {
          wholeFacilityRate: facility.pricePerHour || 0,
          currency: 'USD',
        },
        cancellationPolicyHours: facility.cancellationPolicyHours ?? null,
      });

      const loadedCourts = facilityCourts.map(court => ({
        id: court.id,
        name: court.name,
        sportType: court.sportType,
        capacity: court.capacity,
        isIndoor: court.isIndoor,
        pricePerHour: court.pricePerHour || 0,
        isExisting: true,
      }));
      setCourts(loadedCourts);
      setOriginalCourts(facilityCourts.map(c => c.id));
      setRequiresInsurance(facility.requiresInsurance === true);
      setPhotos(facility.photos ?? []);
      setFacilityMapUrl(facility.facilityMapUrl ?? null);
      setFacilityMapThumbnailUrl(facility.facilityMapThumbnailUrl ?? null);
      setCoverImageUrl((facility as any).coverImageUrl ?? null);

      const addr = [
        facility.street,
        facility.city,
        facility.state,
        facility.zipCode,
      ]
        .filter(Boolean)
        .join(', ');
      if (addr) setAddressQuery(addr);
      setRequiresBookingConfirmation(
        facility.requiresBookingConfirmation === true
      );
      setWaiverRequired((facility as any).waiverRequired === true);
      setWaiverText((facility as any).waiverText || '');
      setOriginalWaiverText((facility as any).waiverText || '');

      if (facility.availabilitySlots && facility.availabilitySlots.length > 0) {
        const hours = facility.availabilitySlots
          .filter((slot: any) => slot.isRecurring && !slot.specificDate)
          .map((slot: any) => ({
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isClosed: slot.isBlocked || false,
          }));
        setHoursOfOperation(hours);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load ground');
    } finally {
      setIsLoading(false);
    }
  };

  /* ─── Form Helpers ──────────────────────────────────────────────────────── */

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
    }
  };

  const updateNestedField = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof CreateFacilityData] as any),
        [field]: value,
      },
    }));
  };

  const toggleSportType = (sport: string) => {
    const currentSports = formData.sportTypes || [];
    const sportEnum = sport as SportType;
    const newSports = currentSports.includes(sportEnum)
      ? currentSports.filter(s => s !== sportEnum)
      : [...currentSports, sportEnum];
    updateField('sportTypes', newSports);
  };

  /* ─── Court CRUD ────────────────────────────────────────────────────────── */

  const handleAddCourt = () => {
    if (!newCourt.name.trim()) {
      Alert.alert('Error', 'Court name is required');
      return;
    }
    if (!newCourt.sportType) {
      Alert.alert('Error', 'Sport type is required');
      return;
    }

    if (editingCourtId) {
      setCourts(
        courts.map(c =>
          c.id === editingCourtId
            ? {
                ...newCourt,
                id: editingCourtId,
                isExisting: c.isExisting || false,
              }
            : c
        )
      );
      setEditingCourtId(null);
    } else {
      setCourts([
        ...courts,
        { ...newCourt, id: `new-${Date.now()}`, isExisting: false },
      ]);
    }
    setNewCourt({
      id: '',
      name: '',
      sportType: '',
      capacity: 10,
      isIndoor: false,
      pricePerHour: 0,
    });
    setShowAddCourtModal(false);
  };

  const handleEditCourt = (court: CourtFormData) => {
    setNewCourt({
      id: court.id,
      name: court.name,
      sportType: court.sportType,
      capacity: court.capacity,
      isIndoor: court.isIndoor,
      pricePerHour: court.pricePerHour,
    });
    setEditingCourtId(court.id);
    setShowAddCourtModal(true);
  };

  const handleRemoveCourt = (courtId: string) => {
    setCourts(prev => prev.filter(c => c.id !== courtId));
  };

  /* ─── Photos ────────────────────────────────────────────────────────────── */

  const handleAddPhotos = async () => {
    setPhotoError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ['images'] as ImagePicker.MediaType[],
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
          setPhotoError(err?.message || 'Failed to upload photo.');
        }
      }
    } catch (err: any) {
      setPhotoError(err?.message || 'Failed to open image picker.');
    }
  };

  const handleDeletePhoto = async (photo: FacilityPhoto) => {
    const prev = photos;
    setPhotos(p => p.filter(x => x.id !== photo.id));
    try {
      await facilityService.deleteFacilityPhoto(facilityId, photo.id);
    } catch (err: any) {
      setPhotos(prev);
      setPhotoError(err?.message || 'Failed to delete photo.');
    }
  };

  /* ─── Map ───────────────────────────────────────────────────────────────── */

  const handleUploadMap = async () => {
    setMapError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'application/pdf'],
      });
      if (result.canceled || !result.assets || result.assets.length === 0)
        return;
      const asset = result.assets[0];
      const uploaded = await facilityService.uploadFacilityMap(facilityId, {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'image/jpeg',
      });
      setFacilityMapUrl(uploaded.facilityMapUrl);
      setFacilityMapThumbnailUrl(uploaded.facilityMapThumbnailUrl);
    } catch (err: any) {
      setMapError(err?.message || 'Failed to upload map.');
    }
  };

  const handleDeleteMap = async () => {
    const prevUrl = facilityMapUrl;
    const prevThumb = facilityMapThumbnailUrl;
    setFacilityMapUrl(null);
    setFacilityMapThumbnailUrl(null);
    try {
      await facilityService.deleteFacilityMap(facilityId);
    } catch (err: any) {
      setFacilityMapUrl(prevUrl);
      setFacilityMapThumbnailUrl(prevThumb);
      setMapError(err?.message || 'Failed to remove map.');
    }
  };

  /* ─── Validation & Submit ───────────────────────────────────────────────── */

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) newErrors.name = 'Ground name is required';
    if (!formData.description?.trim())
      newErrors.description = 'Description is required';
    if (!formData.address?.street?.trim())
      newErrors.street = 'Street address is required';
    if (!formData.address?.city?.trim()) newErrors.city = 'City is required';
    if (!formData.address?.state?.trim()) newErrors.state = 'State is required';
    if (!formData.address?.zipCode?.trim())
      newErrors.zipCode = 'ZIP code is required';
    if (!formData.sportTypes || formData.sportTypes.length === 0)
      newErrors.sportTypes = 'Select at least one sport type';

    Object.entries(newErrors).forEach(([field, msg]) => {
      loggingService.logValidation(
        'EditFacilityScreen',
        field,
        'required',
        msg
      );
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }
    loggingService.logButton('Save Changes', 'EditFacilityScreen');

    try {
      setIsSubmitting(true);
      const facilityData = {
        name: (formData.name || '').trim(),
        description: (formData.description || '').trim(),
        sportTypes: formData.sportTypes || [],
        amenities: formData.amenities || [],
        street: (formData.address?.street || '').trim(),
        city: (formData.address?.city || '').trim(),
        state: (formData.address?.state || '').trim(),
        zipCode: (formData.address?.zipCode || '').trim(),
        contactName: (formData.contactInfo?.name || '').trim() || undefined,
        contactPhone: (formData.contactInfo?.phone || '').trim() || undefined,
        contactEmail: (formData.contactInfo?.email || '').trim() || undefined,
        contactWebsite:
          (formData.contactInfo?.website || '').trim() || undefined,
        pricePerHour:
          parseFloat(String(formData.pricing?.wholeFacilityRate)) || 0,
        hoursOfOperation:
          hoursOfOperation.length > 0 ? hoursOfOperation : undefined,
        cancellationPolicyHours: formData.cancellationPolicyHours ?? null,
        requiresInsurance,
        requiresBookingConfirmation,
        waiverRequired,
        waiverText: waiverRequired ? waiverText.trim() : null,
      };

      const updatedFacility = await facilityService.updateFacility(
        facilityId,
        facilityData as any
      );

      const currentCourtIds = courts.map(c => c.id);
      for (const originalId of originalCourts) {
        if (!currentCourtIds.includes(originalId))
          await courtService.deleteCourt(facilityId, originalId);
      }
      for (let i = 0; i < courts.length; i++) {
        const court = courts[i];
        if (!court) continue;
        if (court.isExisting) {
          await courtService.updateCourt(facilityId, court.id, {
            name: court.name,
            sportType: court.sportType,
            capacity: court.capacity,
            isIndoor: court.isIndoor,
            pricePerHour: court.pricePerHour,
            displayOrder: i,
          });
        } else {
          await courtService.createCourt(facilityId, {
            name: court.name,
            sportType: court.sportType,
            capacity: court.capacity,
            isIndoor: court.isIndoor,
            pricePerHour: court.pricePerHour,
            displayOrder: i,
          });
        }
      }

      dispatch(updateFacility(updatedFacility));
      setIsSubmitting(false);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update ground');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ─── Delete ────────────────────────────────────────────────────────────── */

  const handleDelete = () => {
    loggingService.logButton('Delete Ground', 'EditFacilityScreen');
    setShowDeleteModal(true);
  };

  const performDelete = async () => {
    try {
      setIsSubmitting(true);
      await facilityService.deleteFacility(facilityId);
      dispatch(removeFacility(facilityId));
      navigation.navigate(
        'Facilities' as never,
        { screen: 'FacilitiesList', params: { refresh: Date.now() } } as never
      );
    } catch (err: any) {
      setShowDeleteModal(false);
      const details = err.details || {};
      if (details.rentals?.length) {
        const lines = details.rentals.map((r: any) => {
          const date = r.date
            ? new Date(r.date).toLocaleDateString()
            : 'Unknown date';
          return `• ${r.court} — ${date} (${r.user})`;
        });
        Alert.alert(
          'Future Rentals Found',
          `Cancel these rentals before deleting this ground:\n\n${lines.join('\n')}`
        );
      } else if (details.events?.length) {
        const lines = details.events.map((e: any) => {
          const date = e.startTime
            ? new Date(e.startTime).toLocaleDateString()
            : 'Unknown date';
          return `• ${e.title || 'Untitled'} — ${date}`;
        });
        Alert.alert(
          'Future Events Found',
          `Cancel these events before deleting this ground:\n\n${lines.join('\n')}`
        );
      } else {
        Alert.alert('Error', err.message || 'Failed to delete ground');
      }
      setIsSubmitting(false);
    }
  };

  /* ─── Loading / Error ───────────────────────────────────────────────────── */

  if (isLoading)
    return (
      <View style={[s.container, { backgroundColor: colors.bgScreen }]}>
        <LoadingSpinner />
      </View>
    );
  if (error)
    return (
      <View style={[s.container, { backgroundColor: colors.bgScreen }]}>
        <ErrorDisplay message={error} onRetry={loadFacilityData} />
      </View>
    );

  const primarySport = (formData.sportTypes?.[0] ?? 'other') as string;
  const surfaceName = getSurfaceName(primarySport);

  /* ─── Action buttons (rendered at the bottom of every tab) ──────────── */

  const renderActionButtons = () => (
    <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 }}>
      <FormButton
        title="Update Ground"
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={isSubmitting}
      />
      <TouchableOpacity
        style={{
          backgroundColor: colors.heart,
          paddingVertical: 14,
          paddingHorizontal: 24,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 16,
        }}
        onPress={handleDelete}
        disabled={isSubmitting}
        activeOpacity={0.7}
      >
        <Text
          style={{
            color: colors.white,
            fontSize: 16,
            fontWeight: '600',
          }}
        >
          Delete Ground
        </Text>
      </TouchableOpacity>
    </View>
  );

  /* ─── Render ────────────────────────────────────────────────────────────── */

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: colors.bgScreen }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TabBar activeIndex={activeTab} onPress={handleTabPress} />

      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handlePagerScroll}
        style={{ flex: 1 }}
      >
        {/* ── TAB 1 — Basics ─────────────────────────────────────────────── */}
        <View style={{ width: screenWidth }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Cover photo */}
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              <PhotoUpload
                value={coverImageUrl}
                onChange={async url => {
                  setCoverImageUrl(url);
                  try {
                    await facilityService.updateFacility(facilityId, {
                      coverImageUrl: url,
                    } as any);
                  } catch {}
                }}
                context="grounds"
                shape="cover"
                label="Cover photo"
              />
            </View>

            <Text style={s.sectionLabel}>GROUND NAME</Text>
            <View style={s.card}>
              <View style={{ padding: 16 }}>
                <FormInput
                  label="Ground Name *"
                  value={formData.name || ''}
                  onChangeText={value => updateField('name', value)}
                  placeholder="Enter ground name"
                  error={errors.name || ''}
                />
              </View>
            </View>

            <Text style={s.sectionLabel}>DESCRIPTION</Text>
            <View style={s.card}>
              <View style={{ padding: 16 }}>
                <FormInput
                  label="Description *"
                  value={formData.description || ''}
                  onChangeText={value => updateField('description', value)}
                  placeholder="Describe your ground"
                  multiline
                  numberOfLines={4}
                  error={errors.description || ''}
                />
              </View>
            </View>

            <Text style={s.sectionLabel}>PHOTOS</Text>
            <View style={s.card}>
              <View style={{ padding: 16 }}>
                {photos.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 12 }}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {photos.map(photo => (
                      <View
                        key={photo.id}
                        style={{
                          position: 'relative',
                          borderRadius: 8,
                          overflow: 'hidden',
                        }}
                      >
                        <OptimizedImage
                          source={{ uri: photo.imageUrl }}
                          style={{ width: 200, height: 150, borderRadius: 8 }}
                          resizeMode="cover"
                          fallback={
                            <View
                              style={{
                                width: 200,
                                height: 150,
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
                        <TouchableOpacity
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            backgroundColor: 'rgba(255,255,255,0.85)',
                            borderRadius: 12,
                          }}
                          onPress={() => handleDeletePhoto(photo)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="close-circle"
                            size={22}
                            color={colors.heart}
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.cobalt,
                    alignSelf: 'flex-start',
                  }}
                  onPress={handleAddPhotos}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="images-outline"
                    size={16}
                    color={colors.cobalt}
                  />
                  <Text
                    style={{
                      fontFamily: fonts.ui,
                      fontSize: 14,
                      color: colors.cobalt,
                    }}
                  >
                    {photos.length > 0 ? 'Add more photos' : 'Add photos'}
                  </Text>
                </TouchableOpacity>
                {photoError ? (
                  <Text
                    style={{ fontSize: 13, color: colors.heart, marginTop: 6 }}
                  >
                    {photoError}
                  </Text>
                ) : null}
              </View>
            </View>
            {renderActionButtons()}
          </ScrollView>
        </View>

        {/* ── TAB 2 — Location ───────────────────────────────────────────── */}
        <View style={{ width: screenWidth }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={s.sectionLabel}>SEARCH ADDRESS</Text>
            <View style={s.card}>
              <View style={{ padding: 16 }}>
                <TextInput
                  style={s.addressSearchInput}
                  placeholder="Start typing an address..."
                  placeholderTextColor={colors.inkSoft}
                  value={addressQuery}
                  onChangeText={text => {
                    setAddressQuery(text);
                    if (text.length >= 3) {
                      const apiKey =
                        process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
                      if (apiKey) {
                        fetch(
                          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&types=address&key=${apiKey}`
                        )
                          .then(r => r.json())
                          .then(data =>
                            setAddressSuggestions(data.predictions || [])
                          )
                          .catch(() => setAddressSuggestions([]));
                      }
                    } else {
                      setAddressSuggestions([]);
                    }
                  }}
                />
                {addressSuggestions.length > 0 && (
                  <View style={s.suggestionsContainer}>
                    {addressSuggestions
                      .slice(0, 5)
                      .map((suggestion: any, idx: number) => (
                        <TouchableOpacity
                          key={suggestion.place_id || idx}
                          style={[
                            s.suggestionItem,
                            idx < 4 && s.suggestionBorder,
                          ]}
                          onPress={() => {
                            const apiKey =
                              process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
                            if (apiKey && suggestion.place_id) {
                              fetch(
                                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${suggestion.place_id}&fields=address_components&key=${apiKey}`
                              )
                                .then(r => r.json())
                                .then(data => {
                                  const components =
                                    data.result?.address_components || [];
                                  let street = '',
                                    city = '',
                                    st = '',
                                    zip = '';
                                  for (const c of components) {
                                    if (c.types.includes('street_number'))
                                      street = c.long_name + ' ';
                                    if (c.types.includes('route'))
                                      street += c.long_name;
                                    if (c.types.includes('locality'))
                                      city = c.long_name;
                                    if (
                                      c.types.includes(
                                        'administrative_area_level_1'
                                      )
                                    )
                                      st = c.short_name;
                                    if (c.types.includes('postal_code'))
                                      zip = c.long_name;
                                  }
                                  updateNestedField(
                                    'address',
                                    'street',
                                    street.trim()
                                  );
                                  updateNestedField('address', 'city', city);
                                  updateNestedField('address', 'state', st);
                                  updateNestedField('address', 'zipCode', zip);
                                  setAddressQuery(suggestion.description);
                                  setAddressSuggestions([]);
                                })
                                .catch(() => {
                                  setAddressQuery(suggestion.description);
                                  setAddressSuggestions([]);
                                });
                            } else {
                              setAddressQuery(suggestion.description);
                              setAddressSuggestions([]);
                            }
                          }}
                        >
                          <Ionicons
                            name="location-outline"
                            size={16}
                            color={colors.inkSoft}
                            style={{ marginRight: 8 }}
                          />
                          <Text style={s.suggestionText} numberOfLines={1}>
                            {suggestion.description}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                )}
              </View>
            </View>

            <Text style={s.sectionLabel}>ADDRESS DETAILS</Text>
            <View style={s.card}>
              <View style={{ padding: 16 }}>
                <FormInput
                  label="Street Address *"
                  value={formData.address?.street || ''}
                  onChangeText={value =>
                    updateNestedField('address', 'street', value)
                  }
                  placeholder="123 Main St"
                  error={errors.street || ''}
                />
                <FormInput
                  label="City *"
                  value={formData.address?.city || ''}
                  onChangeText={value =>
                    updateNestedField('address', 'city', value)
                  }
                  placeholder="City"
                  error={errors.city || ''}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    marginHorizontal: -Spacing.sm,
                  }}
                >
                  <View style={{ flex: 1, paddingHorizontal: Spacing.sm }}>
                    <FormInput
                      label="State *"
                      value={formData.address?.state || ''}
                      onChangeText={value =>
                        updateNestedField('address', 'state', value)
                      }
                      placeholder="State"
                      error={errors.state || ''}
                    />
                  </View>
                  <View style={{ flex: 1, paddingHorizontal: Spacing.sm }}>
                    <FormInput
                      label="ZIP Code *"
                      value={formData.address?.zipCode || ''}
                      onChangeText={value =>
                        updateNestedField('address', 'zipCode', value)
                      }
                      placeholder="12345"
                      keyboardType="numeric"
                      error={errors.zipCode || ''}
                    />
                  </View>
                </View>
              </View>
            </View>
            {renderActionButtons()}
          </ScrollView>
        </View>

        {/* ── TAB 3 — Contact ────────────────────────────────────────────── */}
        <View style={{ width: screenWidth }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={s.sectionLabel}>CONTACT INFORMATION</Text>
            <View style={s.card}>
              <View style={{ padding: 16 }}>
                <FormInput
                  label="Contact Name"
                  value={formData.contactInfo?.name || ''}
                  onChangeText={value =>
                    updateNestedField('contactInfo', 'name', value)
                  }
                  placeholder="John Doe"
                />
                <FormInput
                  label="Phone"
                  value={formData.contactInfo?.phone || ''}
                  onChangeText={value =>
                    updateNestedField('contactInfo', 'phone', value)
                  }
                  placeholder="(555) 123-4567"
                  keyboardType="phone-pad"
                />
                <FormInput
                  label="Email"
                  value={formData.contactInfo?.email || ''}
                  onChangeText={value =>
                    updateNestedField('contactInfo', 'email', value)
                  }
                  placeholder="contact@ground.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <FormInput
                  label="Website"
                  value={formData.contactInfo?.website || ''}
                  onChangeText={value =>
                    updateNestedField('contactInfo', 'website', value)
                  }
                  placeholder="https://ground.com"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            </View>
            {renderActionButtons()}
          </ScrollView>
        </View>

        {/* ── TAB 4 — Site Details ───────────────────────────────────────── */}
        <View style={{ width: screenWidth }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Hours of Operation */}
            <HoursOfOperationSection
              hours={hoursOfOperation}
              onChange={setHoursOfOperation}
            />

            {/* Sports Available — SportIconGrid */}
            <Text style={s.sectionLabel}>SPORTS AVAILABLE</Text>
            <View style={s.card}>
              <View style={{ padding: 16 }}>
                {errors.sportTypes && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.heart,
                      marginBottom: 8,
                    }}
                  >
                    {errors.sportTypes}
                  </Text>
                )}
                <SportIconGrid
                  selected={formData.sportTypes || []}
                  onSelect={toggleSportType}
                  multiSelect
                />
              </View>
            </View>

            {/* Booking Confirmation Required */}
            <Text style={s.sectionLabel}>REQUIREMENTS</Text>
            <View style={s.card}>
              <View style={{ padding: 16 }}>
                {/* Toggle 1: Booking Confirmation */}
                <View style={s.toggleRow}>
                  <View style={{ flex: 1, marginRight: Spacing.md }}>
                    <Text style={s.toggleLabel}>
                      Requires Booking Confirmation
                    </Text>
                    <Text style={s.toggleDescription}>
                      All reservation requests must be approved before they are
                      confirmed
                    </Text>
                  </View>
                  <Switch
                    value={requiresBookingConfirmation}
                    onValueChange={val => {
                      setRequiresBookingConfirmation(val);
                      if (!val) setRequiresInsurance(false);
                    }}
                    trackColor={{
                      false: colors.white,
                      true: colors.cobaltLight,
                    }}
                    thumbColor={
                      requiresBookingConfirmation
                        ? colors.cobalt
                        : colors.surface
                    }
                  />
                </View>

                {/* Toggle 2: Proof of Insurance (only when booking confirmation is on) */}
                {requiresBookingConfirmation && (
                  <View style={[s.toggleRow, { marginTop: 16 }]}>
                    <View style={{ flex: 1, marginRight: Spacing.md }}>
                      <Text style={s.toggleLabel}>
                        Requires Proof of Insurance
                      </Text>
                      <Text style={s.toggleDescription}>
                        Renters must attach a valid insurance document when
                        reserving a court
                      </Text>
                    </View>
                    <Switch
                      value={requiresInsurance}
                      onValueChange={setRequiresInsurance}
                      trackColor={{
                        false: colors.white,
                        true: colors.cobaltLight,
                      }}
                      thumbColor={
                        requiresInsurance ? colors.cobalt : colors.surface
                      }
                    />
                  </View>
                )}

                {/* Toggle 3: Waiver Required */}
                <View style={[s.toggleRow, { marginTop: 16 }]}>
                  <View style={{ flex: 1, marginRight: Spacing.md }}>
                    <Text style={s.toggleLabel}>Require Waiver</Text>
                    <Text style={s.toggleDescription}>
                      Players must sign a waiver before attending events at this
                      facility.
                    </Text>
                  </View>
                  <Switch
                    value={waiverRequired}
                    onValueChange={setWaiverRequired}
                    trackColor={{
                      false: colors.white,
                      true: colors.cobaltLight,
                    }}
                    thumbColor={waiverRequired ? colors.cobalt : colors.surface}
                  />
                </View>

                {waiverRequired && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={s.toggleLabel}>Waiver Document</Text>
                    <Text style={s.toggleDescription}>
                      Players will be required to read and accept this waiver
                      before joining events. Uploading a new version will
                      require all players to re-sign.
                    </Text>
                    {originalWaiverText &&
                      waiverText !== originalWaiverText && (
                        <View
                          style={{
                            backgroundColor: colors.goldTint,
                            padding: 10,
                            borderRadius: 8,
                            marginTop: 8,
                            marginBottom: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: fonts.body,
                              fontSize: 13,
                              color: colors.gold,
                            }}
                          >
                            Saving a new waiver will invalidate all previously
                            signed waivers. Players will be prompted to re-sign
                            before their next event.
                          </Text>
                        </View>
                      )}
                    <TextInput
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: 10,
                        padding: 12,
                        minHeight: 120,
                        fontFamily: fonts.body,
                        fontSize: 14,
                        color: colors.ink,
                        textAlignVertical: 'top',
                        marginTop: 8,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                      multiline
                      numberOfLines={6}
                      placeholder="Enter your full waiver text here…"
                      placeholderTextColor={colors.inkFaint}
                      value={waiverText}
                      onChangeText={setWaiverText}
                    />
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 12,
                        color: colors.inkFaint,
                        marginTop: 4,
                        textAlign: 'right',
                      }}
                    >
                      {waiverText.length} characters
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Cancellation Policy */}
            <Text style={s.sectionLabel}>CANCELLATION POLICY</Text>
            <View style={s.card}>
              <View style={{ padding: 16 }}>
                <CancellationPolicyPicker
                  value={formData.cancellationPolicyHours ?? null}
                  onChange={val => updateField('cancellationPolicyHours', val)}
                />
              </View>
            </View>
            {renderActionButtons()}
          </ScrollView>
        </View>

        {/* ── TAB 5 — Courts / Fields ────────────────────────────────────── */}
        <View style={{ width: screenWidth }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Facility Map */}
            <Text style={s.sectionLabel}>FACILITY MAP</Text>
            <View style={s.card}>
              <View style={{ padding: 16 }}>
                {facilityMapUrl ? (
                  <OptimizedImage
                    source={{ uri: facilityMapUrl }}
                    style={{
                      width: '100%',
                      height: 160,
                      borderRadius: 8,
                      marginBottom: 12,
                    }}
                    resizeMode="cover"
                    fallback={
                      <View
                        style={{
                          width: '100%',
                          height: 160,
                          backgroundColor: colors.surface,
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderRadius: 8,
                          marginBottom: 12,
                        }}
                      >
                        <Ionicons
                          name="map-outline"
                          size={40}
                          color={colors.inkSoft}
                        />
                      </View>
                    }
                  />
                ) : null}
                <View
                  style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}
                >
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: colors.cobalt,
                    }}
                    onPress={handleUploadMap}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="cloud-upload-outline"
                      size={16}
                      color={colors.cobalt}
                    />
                    <Text
                      style={{
                        fontFamily: fonts.ui,
                        fontSize: 14,
                        color: colors.cobalt,
                      }}
                    >
                      {facilityMapUrl ? 'Replace map' : 'Upload map'}
                    </Text>
                  </TouchableOpacity>
                  {facilityMapUrl ? (
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.heart,
                      }}
                      onPress={handleDeleteMap}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={colors.heart}
                      />
                      <Text
                        style={{
                          fontFamily: fonts.ui,
                          fontSize: 14,
                          color: colors.heart,
                        }}
                      >
                        Remove map
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {mapError ? (
                  <Text
                    style={{ fontSize: 13, color: colors.heart, marginTop: 6 }}
                  >
                    {mapError}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Courts / Fields list */}
            <Text style={s.sectionLabel}>{surfaceName.toUpperCase()}S</Text>
            {courts.length === 0 ? (
              <View style={s.card}>
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 14,
                      color: colors.inkFaint,
                    }}
                  >
                    No {surfaceName.toLowerCase()}s added yet. Add{' '}
                    {surfaceName.toLowerCase()}s to set individual pricing.
                  </Text>
                </View>
              </View>
            ) : (
              courts.map(court => (
                <TouchableOpacity
                  key={court.id}
                  onPress={() => handleEditCourt(court)}
                  activeOpacity={0.7}
                >
                  <View style={s.card}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 16,
                      }}
                    >
                      <View style={{ flex: 1 }}>
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
                      </View>
                      <View
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                        pointerEvents="box-none"
                      >
                        <Ionicons
                          name="create-outline"
                          size={20}
                          color={colors.cobalt}
                          style={{ marginRight: Spacing.sm }}
                        />
                        <TouchableOpacity
                          style={{ padding: Spacing.sm }}
                          activeOpacity={0.7}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          onPress={e => {
                            e.stopPropagation();
                            handleRemoveCourt(court.id);
                          }}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={20}
                            color={colors.heart}
                            pointerEvents="none"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}

            <View style={{ marginHorizontal: 16, marginTop: 8 }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.cobalt,
                }}
                onPress={() => setShowAddCourtModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={20} color={colors.cobalt} />
                <Text
                  style={{
                    fontFamily: fonts.ui,
                    fontSize: 15,
                    color: colors.cobalt,
                  }}
                >
                  Add {surfaceName}
                </Text>
              </TouchableOpacity>
            </View>

            {renderActionButtons()}
          </ScrollView>
        </View>
      </ScrollView>

      {/* ── Add/Edit Court Modal ──────────────────────────────────────────── */}
      <Modal
        visible={showAddCourtModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddCourtModal(false);
          setEditingCourtId(null);
          setNewCourt({
            id: '',
            name: '',
            sportType: '',
            capacity: 10,
            isIndoor: false,
            pricePerHour: 0,
          });
        }}
      >
        <View style={s.modalOverlay}>
          <View style={s.courtModal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {editingCourtId ? `Edit ${surfaceName}` : `Add ${surfaceName}`}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddCourtModal(false);
                  setEditingCourtId(null);
                  setNewCourt({
                    id: '',
                    name: '',
                    sportType: '',
                    capacity: 10,
                    isIndoor: false,
                    pricePerHour: 0,
                  });
                }}
              >
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: Spacing.lg }}>
              <FormInput
                label={`${surfaceName} Name *`}
                value={newCourt.name}
                onChangeText={value =>
                  setNewCourt({ ...newCourt, name: value })
                }
                placeholder={`e.g., ${surfaceName} 1, ${surfaceName} A`}
              />

              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 15,
                  color: colors.ink,
                  fontWeight: '600',
                  marginBottom: Spacing.sm,
                  marginTop: Spacing.md,
                }}
              >
                Sport Type *
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {(formData.sportTypes || []).map(sport => {
                  const isSelected = newCourt.sportType === sport;
                  return (
                    <TouchableOpacity
                      key={sport}
                      style={[s.sportChip, isSelected && s.sportChipSelected]}
                      onPress={() =>
                        setNewCourt({ ...newCourt, sportType: sport })
                      }
                    >
                      <Text
                        style={[
                          s.sportChipText,
                          isSelected && s.sportChipTextSelected,
                        ]}
                      >
                        {formatSportType(sport)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <FormInput
                label="Capacity"
                value={newCourt.capacity.toString()}
                onChangeText={value =>
                  setNewCourt({ ...newCourt, capacity: parseInt(value) || 0 })
                }
                placeholder="10"
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginVertical: Spacing.md,
                }}
                onPress={() =>
                  setNewCourt({ ...newCourt, isIndoor: !newCourt.isIndoor })
                }
              >
                <View
                  style={[s.checkbox, newCourt.isIndoor && s.checkboxChecked]}
                >
                  {newCourt.isIndoor && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={colors.surface}
                    />
                  )}
                </View>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 15,
                    color: colors.ink,
                    marginLeft: Spacing.sm,
                  }}
                >
                  Indoor {surfaceName}
                </Text>
              </TouchableOpacity>

              <FormInput
                label="Price Per Hour ($)"
                value={newCourt.pricePerHour.toString()}
                onChangeText={value =>
                  setNewCourt({
                    ...newCourt,
                    pricePerHour: parseFloat(value) || 0,
                  })
                }
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </ScrollView>

            <View
              style={{
                flexDirection: 'row',
                padding: Spacing.lg,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: Spacing.md,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginHorizontal: Spacing.xs,
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                onPress={() => {
                  setShowAddCourtModal(false);
                  setEditingCourtId(null);
                  setNewCourt({
                    id: '',
                    name: '',
                    sportType: '',
                    capacity: 10,
                    isIndoor: false,
                    pricePerHour: 0,
                  });
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontWeight: '600',
                    color: colors.inkSoft,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: Spacing.md,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginHorizontal: Spacing.xs,
                  backgroundColor: colors.cobalt,
                }}
                onPress={handleAddCourt}
              >
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontWeight: '600',
                    color: colors.white,
                  }}
                >
                  {editingCourtId
                    ? `Update ${surfaceName}`
                    : `Add ${surfaceName}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: Spacing.xl,
          }}
        >
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: 16,
              padding: Spacing.xl,
              width: '100%',
              maxWidth: 400,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.white,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: Spacing.lg,
              }}
            >
              <Ionicons name="warning" size={48} color={colors.heart} />
            </View>
            <Text
              style={{
                fontFamily: fonts.heading,
                fontSize: 24,
                color: colors.ink,
                marginBottom: Spacing.md,
                textAlign: 'center',
              }}
            >
              Delete Ground?
            </Text>
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 15,
                color: colors.inkSoft,
                textAlign: 'center',
                marginBottom: Spacing.xl,
                lineHeight: 22,
              }}
            >
              Are you sure you want to delete this ground? This action cannot be
              undone and will remove all associated courts and data.
            </Text>
            <View
              style={{ flexDirection: 'row', width: '100%', gap: Spacing.md }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: Spacing.md,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: colors.white,
                }}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontWeight: '600',
                    color: colors.ink,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: Spacing.md,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: colors.heart,
                }}
                onPress={() => {
                  setShowDeleteModal(false);
                  performDelete();
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontWeight: '600',
                    color: colors.white,
                  }}
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  /* ── Tab bar ── */
  tabBarOuter: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    color: colors.inkSoft,
  },
  tabLabelActive: {
    color: colors.cobalt,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: colors.cobalt,
    borderRadius: 1,
  },

  /* ── Section label ── */
  sectionLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },

  /* ── Card ── */
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },

  /* ── Unified toggle row ── */
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontFamily: fonts.ui,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
    marginBottom: Spacing.xs,
  },
  toggleDescription: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkFaint,
  },

  /* ── Address search ── */
  addressSearchInput: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 8,
  },
  suggestionsContainer: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    flex: 1,
  },

  /* ── Sport chips (court modal) ── */
  sportChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sportChipSelected: {
    backgroundColor: colors.cobalt,
  },
  sportChipText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkSoft,
  },
  sportChipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },

  /* ── Checkbox ── */
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.cobalt,
    borderColor: colors.cobalt,
  },

  /* ── Modals ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(32, 64, 224, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  courtModal: {
    backgroundColor: colors.white,
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
  },
});
