import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../../context/AuthContext';
import { FormInput } from '../../components/forms/FormInput';
import { HoursOfOperationSection } from '../../components/facilities/HoursOfOperationSection';
import { CancellationPolicyPicker } from '../../components/facilities/CancellationPolicyPicker';
import { UpsellModal } from '../../components/paywall/UpsellModal';
import { CreationWizard, WizardStep } from '../../components/wizard/CreationWizard';
import { SportIconGrid } from '../../components/wizard/SportIconGrid';
import { WizardSuccessScreen } from '../../components/wizard/WizardSuccessScreen';
import { getSportEmoji } from '../../constants/sports';
import { facilityService } from '../../services/api/FacilityService';
import { courtService } from '../../services/api/CourtService';
import { addFacility, selectFacilities } from '../../store/slices/facilitiesSlice';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import { SportType, CreateFacilityData, Facility } from '../../types';
import { SubscriptionPlan } from '../../types/subscription';
import { colors, Spacing, fonts } from '../../theme';
import { loggingService } from '../../services/LoggingService';

// Global flag to prevent multiple submissions
let isCreatingFacility = false;

interface CourtFormData {
  id: string;
  name: string;
  sportType: string;
  capacity: number;
  isIndoor: boolean;
  pricePerHour: number;
}

interface DayHours {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isClosed: boolean;
}

export function CreateFacilityScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const allFacilities = useSelector(selectFacilities);
  const userFacilityCount = allFacilities.filter(f => f.ownerId === user?.id).length;
  const { allowed: basicAllowed, requiredPlan: basicPlan } = useFeatureGate('facility_basic');
  const { allowed: proAllowed, requiredPlan: proPlan } = useFeatureGate('facility_pro');
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellPlan, setUpsellPlan] = useState<SubscriptionPlan>('facility_basic');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = React.useRef(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdFacilityId, setCreatedFacilityId] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Facility[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [courts, setCourts] = useState<CourtFormData[]>([]);
  const [showAddCourtModal, setShowAddCourtModal] = useState(false);
  const [showEditCourtModal, setShowEditCourtModal] = useState(false);
  const [editingCourtId, setEditingCourtId] = useState<string | null>(null);
  const [hoursOfOperation, setHoursOfOperation] = useState<DayHours[]>([]);

  const [formData, setFormData] = useState<Partial<CreateFacilityData>>({
    name: '',
    description: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
    },
    contactInfo: {
      name: '',
      phone: '',
      email: '',
      website: '',
    },
    sportTypes: [],
    amenities: [],
    pricing: {
      wholeFacilityRate: 0,
      currency: 'USD',
    },
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

  const [requiresInsurance, setRequiresInsurance] = useState(false);
  const [requiresBookingConfirmation, setRequiresBookingConfirmation] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const updateNestedField = (parent: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof CreateFacilityData] as any),
        [field]: value,
      },
    }));
  };

  const toggleSportType = (sport: SportType) => {
    const currentSports = formData.sportTypes || [];
    const newSports = currentSports.includes(sport)
      ? currentSports.filter((s) => s !== sport)
      : [...currentSports, sport];
    updateField('sportTypes', newSports);
  };

  const handleAddCourt = () => {
    if (!newCourt.name.trim()) {
      Alert.alert('Error', 'Court name is required');
      return;
    }
    if (!newCourt.sportType) {
      Alert.alert('Error', 'Sport type is required');
      return;
    }

    const court: CourtFormData = {
      ...newCourt,
      id: Date.now().toString(),
    };

    setCourts([...courts, court]);
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

  const handleEditCourt = (courtId: string) => {
    const court = courts.find(c => c.id === courtId);
    if (court) {
      setNewCourt(court);
      setEditingCourtId(courtId);
      setShowEditCourtModal(true);
    }
  };

  const handleUpdateCourt = () => {
    if (!newCourt.name.trim()) {
      Alert.alert('Error', 'Court name is required');
      return;
    }
    if (!newCourt.sportType) {
      Alert.alert('Error', 'Sport type is required');
      return;
    }

    setCourts(courts.map(c => c.id === editingCourtId ? newCourt : c));
    setNewCourt({
      id: '',
      name: '',
      sportType: '',
      capacity: 10,
      isIndoor: false,
      pricePerHour: 0,
    });
    setEditingCourtId(null);
    setShowEditCourtModal(false);
  };

  const handleRemoveCourt = (courtId: string) => {
    console.log('handleRemoveCourt called with:', courtId);
    setCourts(prevCourts => {
      const filtered = prevCourts.filter((c) => c.id !== courtId);
      console.log('Filtered courts:', filtered.length, 'from', prevCourts.length);
      return filtered;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Ground name is required';
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.address?.street?.trim()) {
      newErrors.street = 'Street address is required';
    }

    if (!formData.address?.city?.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.address?.state?.trim()) {
      newErrors.state = 'State is required';
    }

    if (!formData.address?.zipCode?.trim()) {
      newErrors.zipCode = 'ZIP code is required';
    }

    if (!formData.sportTypes || formData.sportTypes.length === 0) {
      newErrors.sportTypes = 'Select at least one sport type';
    }

    // Log each validation failure
    Object.entries(newErrors).forEach(([field, msg]) => {
      loggingService.logValidation('CreateFacilityScreen', field, 'required', msg);
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createFacility = useCallback(async () => {
    try {
      console.log('Creating facility...');
      const facilityData = {
        name: formData.name || '',
        description: formData.description || '',
        sportTypes: formData.sportTypes || [],
        amenities: formData.amenities || [],
        street: formData.address?.street || '',
        city: formData.address?.city || '',
        state: formData.address?.state || '',
        zipCode: formData.address?.zipCode || '',
        latitude: 0,
        longitude: 0,
        contactName: formData.contactInfo?.name || '',
        contactPhone: formData.contactInfo?.phone || '',
        contactEmail: formData.contactInfo?.email || '',
        contactWebsite: formData.contactInfo?.website || '',
        pricePerHour: formData.pricing?.hourlyRate || 0,
        rating: 0,
        isVerified: false,
        verificationStatus: 'pending' as const,
        minimumBookingHours: 1,
        bufferTimeMins: 0,
        ownerId: user?.id, // Set the current user as owner
        hoursOfOperation: hoursOfOperation.length > 0 ? hoursOfOperation : undefined,
        cancellationPolicyHours: formData.cancellationPolicyHours ?? null,
        requiresInsurance,
        requiresBookingConfirmation,
      };

      console.log('Sending facility creation request...');
      const newFacility = await facilityService.createFacility(facilityData as any);
      console.log('Facility created:', newFacility.id);

      // Create courts if any were added
      const createdCourts = [];
      if (courts.length > 0) {
        console.log(`Creating ${courts.length} courts...`);
        for (let i = 0; i < courts.length; i++) {
          const court = courts[i];
          if (court) {
            const createdCourt = await courtService.createCourt(newFacility.id, {
              name: court.name,
              sportType: court.sportType,
              capacity: court.capacity,
              isIndoor: court.isIndoor,
              pricePerHour: court.pricePerHour,
              displayOrder: i,
            });
            createdCourts.push(createdCourt);
            console.log(`Court ${i + 1} created:`, createdCourt.id);
          }
        }
      }

      // Add facility to Redux with courts included
      const facilityWithCourts = {
        ...newFacility,
        courts: createdCourts,
      };
      dispatch(addFacility(facilityWithCourts));
      console.log('Facility added to Redux with', createdCourts.length, 'courts');

      // Reset submitting state and show success
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      isCreatingFacility = false;
      setCreatedFacilityId(newFacility.id);
      setShowSuccess(true);

    } catch (err: any) {
      console.error('Create facility error:', err);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      isCreatingFacility = false;
      throw err;
    }
  }, [formData, courts, hoursOfOperation, dispatch, navigation]);

  const handleSubmit = useCallback(async () => {
    const timestamp = Date.now();
    console.log(`[${timestamp}] handleSubmit called, isSubmitting:`, isSubmitting, 'ref:', isSubmittingRef.current, 'global:', isCreatingFacility);

    // Triple check - state, ref, AND global flag
    if (isSubmitting || isSubmittingRef.current || isCreatingFacility) {
      console.log(`[${timestamp}] Already submitting, ignoring duplicate call`);
      return;
    }

    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    // Gate: creating any facility requires facility_basic plan
    // 4th+ facility requires facility_pro plan
    if (userFacilityCount >= 3 && !proAllowed) {
      setUpsellPlan(proPlan);
      setShowUpsell(true);
      return;
    } else if (!basicAllowed) {
      setUpsellPlan(basicPlan);
      setShowUpsell(true);
      return;
    }

    try {
      console.log(`[${timestamp}] Setting all flags to true`);
      loggingService.logButton('Create Ground', 'CreateFacilityScreen');
      setIsSubmitting(true);
      isSubmittingRef.current = true;
      isCreatingFacility = true;

      const duplicateCheck = await facilityService.checkDuplicates({
        street: formData.address?.street || '',
        city: formData.address?.city || '',
        state: formData.address?.state || '',
        zipCode: formData.address?.zipCode || '',
      });

      if (duplicateCheck.length > 0) {
        console.log(`[${timestamp}] Duplicates found, showing modal`);
        setDuplicates(duplicateCheck);
        setShowDuplicateModal(true);
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        isCreatingFacility = false;
        return;
      }

      await createFacility();
    } catch (err: any) {
      console.error(`[${timestamp}] handleSubmit error:`, err);
      Alert.alert('Error', err.message || 'Failed to create ground');
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      isCreatingFacility = false;
    }
  }, [isSubmitting, formData, createFacility]);

  const handleContinueAnyway = async () => {
    setShowDuplicateModal(false);
    // Don't reset flags here - they're already true from handleSubmit
    try {
      await createFacility();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create ground');
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      isCreatingFacility = false;
    }
  };

  // ── Wizard Steps ──────────────────────────────────────────────

  const wizardSteps: WizardStep[] = useMemo(() => [
    // Step 1: Name your facility
    {
      key: 'name',
      headline: 'Name your facility',
      subtitle: 'Give your ground a name and pick which sports it supports.',
      content: (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.textInput}
            value={formData.name || ''}
            onChangeText={(value) => updateField('name', value)}
            placeholder="Facility name"
            placeholderTextColor={colors.outline}
          />
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={formData.description || ''}
            onChangeText={(value) => updateField('description', value)}
            placeholder="Describe your facility"
            placeholderTextColor={colors.outline}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.fieldLabel}>Sport types</Text>
          <SportIconGrid
            selected={formData.sportTypes || []}
            onSelect={(sport) => toggleSportType(sport as SportType)}
            multiSelect
          />
        </ScrollView>
      ),
      validate: () =>
        !!(formData.name?.trim()) &&
        !!(formData.description?.trim()) &&
        (formData.sportTypes || []).length > 0,
    },

    // Step 2: Where is it?
    {
      key: 'location',
      headline: 'Where is it?',
      subtitle: 'Enter the street address so players can find you.',
      content: (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.textInput}
            value={formData.address?.street || ''}
            onChangeText={(value) => updateNestedField('address', 'street', value)}
            placeholder="Street address"
            placeholderTextColor={colors.outline}
          />
          <TextInput
            style={styles.textInput}
            value={formData.address?.city || ''}
            onChangeText={(value) => updateNestedField('address', 'city', value)}
            placeholder="City"
            placeholderTextColor={colors.outline}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.textInput, styles.halfInput]}
              value={formData.address?.state || ''}
              onChangeText={(value) => updateNestedField('address', 'state', value)}
              placeholder="State"
              placeholderTextColor={colors.outline}
            />
            <TextInput
              style={[styles.textInput, styles.halfInput]}
              value={formData.address?.zipCode || ''}
              onChangeText={(value) => updateNestedField('address', 'zipCode', value)}
              placeholder="ZIP code"
              placeholderTextColor={colors.outline}
              keyboardType="numeric"
            />
          </View>
        </ScrollView>
      ),
      validate: () =>
        !!(formData.address?.street?.trim()) &&
        !!(formData.address?.city?.trim()) &&
        !!(formData.address?.state?.trim()) &&
        !!(formData.address?.zipCode?.trim()),
    },

    // Step 3: Contact info
    {
      key: 'contact',
      headline: 'Contact info',
      subtitle: 'Optional details so players can reach you.',
      content: (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.textInput}
            value={formData.contactInfo?.name || ''}
            onChangeText={(value) => updateNestedField('contactInfo', 'name', value)}
            placeholder="Contact name"
            placeholderTextColor={colors.outline}
          />
          <TextInput
            style={styles.textInput}
            value={formData.contactInfo?.phone || ''}
            onChangeText={(value) => updateNestedField('contactInfo', 'phone', value)}
            placeholder="Phone number"
            placeholderTextColor={colors.outline}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.textInput}
            value={formData.contactInfo?.email || ''}
            onChangeText={(value) => updateNestedField('contactInfo', 'email', value)}
            placeholder="Email address"
            placeholderTextColor={colors.outline}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.textInput}
            value={formData.contactInfo?.website || ''}
            onChangeText={(value) => updateNestedField('contactInfo', 'website', value)}
            placeholder="Website URL"
            placeholderTextColor={colors.outline}
            keyboardType="url"
            autoCapitalize="none"
          />
        </ScrollView>
      ),
      validate: () => true,
    },

    // Step 4: Courts and settings
    {
      key: 'settings',
      headline: 'Courts and settings',
      subtitle: 'Add courts, set hours, and configure policies.',
      content: (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Courts/Fields */}
          <View style={styles.settingsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Courts / Fields</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddCourtModal(true)}
              >
                <Ionicons name="add-circle" size={24} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.addButtonText}>Add Court</Text>
              </TouchableOpacity>
            </View>

            {courts.length === 0 ? (
              <Text style={styles.emptyText}>
                No courts added yet. Add courts to set individual pricing.
              </Text>
            ) : (
              <>
                {courts.map((court) => (
                  <View key={court.id} style={styles.courtCard}>
                    <View style={styles.courtInfo}>
                      <Text style={styles.courtName}>{court.name}</Text>
                      <Text style={styles.courtDetails}>
                        {court.sportType.charAt(0).toUpperCase() + court.sportType.slice(1)} •
                        {court.isIndoor ? ' Indoor' : ' Outdoor'} •
                        Capacity: {court.capacity}
                      </Text>
                      <Text style={styles.courtPrice}>${court.pricePerHour}/hour</Text>
                    </View>
                    <View style={styles.courtActions}>
                      <TouchableOpacity
                        style={styles.removeButton}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        onPress={() => {
                          console.log('TRASH BUTTON CLICKED!', court.id);
                          alert('Delete button clicked for: ' + court.name);
                          handleRemoveCourt(court.id);
                        }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color={colors.error}
                          pointerEvents="none"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.editButton}
                        activeOpacity={0.7}
                        onPress={() => {
                          console.log('Edit button pressed for court:', court.id);
                          handleEditCourt(court.id);
                        }}
                      >
                        <Ionicons name="pencil-outline" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>

          {/* Hours of Operation */}
          <HoursOfOperationSection
            hours={hoursOfOperation}
            onChange={setHoursOfOperation}
          />

          {/* Cancellation Policy */}
          <View style={styles.settingsSection}>
            <CancellationPolicyPicker
              value={formData.cancellationPolicyHours ?? null}
              onChange={(val) => updateField('cancellationPolicyHours', val)}
            />
          </View>

          {/* Booking Confirmation Requirement */}
          <View style={styles.settingsSection}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Requires Booking Confirmation</Text>
                <Text style={styles.toggleDescription}>
                  All reservation requests must be approved before they are confirmed
                </Text>
              </View>
              <Switch
                value={requiresBookingConfirmation}
                onValueChange={(val) => {
                  setRequiresBookingConfirmation(val);
                  if (!val) setRequiresInsurance(false);
                }}
                trackColor={{ false: colors.surfaceContainerLowest, true: colors.primaryFixed }}
                thumbColor={requiresBookingConfirmation ? colors.primary : colors.outline}
              />
            </View>
          </View>

          {/* Insurance Requirement -- only visible when confirmation is on */}
          {requiresBookingConfirmation && (
          <View style={styles.settingsSection}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Requires Proof of Insurance</Text>
                <Text style={styles.toggleDescription}>
                  Renters must attach a valid insurance document when reserving a court
                </Text>
              </View>
              <Switch
                value={requiresInsurance}
                onValueChange={setRequiresInsurance}
                trackColor={{ false: colors.surfaceContainerLowest, true: colors.primaryFixed }}
                thumbColor={requiresInsurance ? colors.primary : colors.outline}
              />
            </View>
          </View>
          )}

          {/* Spacer for scroll */}
          <View style={{ height: 40 }} />
        </ScrollView>
      ),
      validate: () => true,
    },

    // Step 5: Review and list
    {
      key: 'review',
      headline: 'Review and list',
      subtitle: 'Double-check your details before going live.',
      content: (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewName}>{formData.name}</Text>

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Address</Text>
              <Text style={styles.reviewValue}>
                {formData.address?.street}, {formData.address?.city}, {formData.address?.state} {formData.address?.zipCode}
              </Text>
            </View>

            <View style={styles.reviewDivider} />

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Sports</Text>
              <Text style={styles.reviewValue}>
                {(formData.sportTypes || []).map((s) => getSportEmoji(s)).join('  ')}
              </Text>
            </View>

            <View style={styles.reviewDivider} />

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Courts</Text>
              <Text style={styles.reviewValue}>
                {courts.length === 0 ? 'None' : `${courts.length} court${courts.length === 1 ? '' : 's'}`}
              </Text>
            </View>

            {formData.contactInfo?.name || formData.contactInfo?.phone || formData.contactInfo?.email ? (
              <>
                <View style={styles.reviewDivider} />
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Contact</Text>
                  <Text style={styles.reviewValue}>
                    {[formData.contactInfo?.name, formData.contactInfo?.phone, formData.contactInfo?.email]
                      .filter(Boolean)
                      .join(' / ')}
                  </Text>
                </View>
              </>
            ) : null}

            {requiresBookingConfirmation && (
              <>
                <View style={styles.reviewDivider} />
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Confirmation</Text>
                  <Text style={styles.reviewValue}>Required</Text>
                </View>
              </>
            )}

            {requiresInsurance && (
              <>
                <View style={styles.reviewDivider} />
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Insurance</Text>
                  <Text style={styles.reviewValue}>Required</Text>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      ),
      validate: () => true,
    },
  ], [formData, courts, hoursOfOperation, requiresBookingConfirmation, requiresInsurance]);

  // ── Success screen ────────────────────────────────────────────

  const successEmoji = (formData.sportTypes && formData.sportTypes.length > 0)
    ? getSportEmoji(formData.sportTypes[0] as string)
    : '\u{1F3DF}\u{FE0F}';

  const successScreen = (
    <WizardSuccessScreen
      emoji={successEmoji}
      title={`${formData.name} is live!`}
      summaryRows={[
        { label: 'Address', value: `${formData.address?.city}, ${formData.address?.state}` },
        { label: 'Sports', value: (formData.sportTypes || []).map((s) => getSportEmoji(s)).join('  ') },
        { label: 'Courts', value: courts.length === 0 ? 'None' : `${courts.length}` },
      ]}
      actions={[
        {
          label: 'Go to facility',
          icon: 'arrow-forward',
          onPress: () => {
            if (createdFacilityId) {
              (navigation as any).navigate('FacilityDetail', { facilityId: createdFacilityId });
            } else {
              (navigation as any).navigate('Facilities', { screen: 'FacilitiesList', params: { refresh: Date.now() } });
            }
          },
          variant: 'primary' as const,
        },
        {
          label: 'Back to grounds',
          icon: 'grid-outline',
          onPress: () => {
            (navigation as any).navigate('Facilities', { screen: 'FacilitiesList', params: { refresh: Date.now() } });
          },
          variant: 'secondary' as const,
        },
      ]}
    />
  );

  // ── Render ────────────────────────────────────────────────────

  return (
    <>
      <CreationWizard
        steps={wizardSteps}
        onComplete={handleSubmit}
        onBack={() => navigation.goBack()}
        isSubmitting={isSubmitting}
        submitLabel="Create Ground"
        showSuccess={showSuccess}
        successScreen={successScreen}
      />

      {/* Add Court Modal */}
      <Modal
        visible={showAddCourtModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddCourtModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addCourtModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Court/Field</Text>
              <TouchableOpacity onPress={() => setShowAddCourtModal(false)}>
                <Ionicons name="close" size={24} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent}>
              <FormInput
                label="Court Name *"
                value={newCourt.name}
                onChangeText={(value) => setNewCourt({ ...newCourt, name: value })}
                placeholder="e.g., Court 1, Field A"
              />

              <Text style={styles.inputLabel}>Sport Type *</Text>
              <View style={styles.sportTypeContainer}>
                {Object.values(SportType).map((sport) => {
                  const isSelected = newCourt.sportType === sport;
                  return (
                    <TouchableOpacity
                      key={sport}
                      style={[styles.sportChip, isSelected && styles.sportChipSelected]}
                      onPress={() => setNewCourt({ ...newCourt, sportType: sport })}
                    >
                      <Text style={[styles.sportChipText, isSelected && styles.sportChipTextSelected]}>
                        {sport.charAt(0).toUpperCase() + sport.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <FormInput
                label="Capacity"
                value={newCourt.capacity.toString()}
                onChangeText={(value) =>
                  setNewCourt({ ...newCourt, capacity: parseInt(value) || 0 })
                }
                placeholder="10"
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setNewCourt({ ...newCourt, isIndoor: !newCourt.isIndoor })}
              >
                <View style={[styles.checkbox, newCourt.isIndoor && styles.checkboxChecked]}>
                  {newCourt.isIndoor && <Ionicons name="checkmark" size={16} color={colors.surfaceContainerLowest} />}
                </View>
                <Text style={styles.checkboxLabel}>Indoor Court</Text>
              </TouchableOpacity>

              <FormInput
                label="Price Per Hour ($)"
                value={newCourt.pricePerHour.toString()}
                onChangeText={(value) =>
                  setNewCourt({ ...newCourt, pricePerHour: parseFloat(value) || 0 })
                }
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddCourtModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.addCourtButton]}
                onPress={handleAddCourt}
              >
                <Text style={styles.addCourtButtonText}>Add Court</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Court Modal */}
      <Modal
        visible={showEditCourtModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowEditCourtModal(false);
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
        <View style={styles.modalOverlay}>
          <View style={styles.addCourtModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Court/Field</Text>
              <TouchableOpacity onPress={() => {
                setShowEditCourtModal(false);
                setEditingCourtId(null);
                setNewCourt({
                  id: '',
                  name: '',
                  sportType: '',
                  capacity: 10,
                  isIndoor: false,
                  pricePerHour: 0,
                });
              }}>
                <Ionicons name="close" size={24} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent}>
              <FormInput
                label="Court Name *"
                value={newCourt.name}
                onChangeText={(value) => setNewCourt({ ...newCourt, name: value })}
                placeholder="e.g., Court 1, Field A"
              />

              <Text style={styles.inputLabel}>Sport Type *</Text>
              <View style={styles.sportTypeContainer}>
                {Object.values(SportType).map((sport) => {
                  const isSelected = newCourt.sportType === sport;
                  return (
                    <TouchableOpacity
                      key={sport}
                      style={[styles.sportChip, isSelected && styles.sportChipSelected]}
                      onPress={() => setNewCourt({ ...newCourt, sportType: sport })}
                    >
                      <Text style={[styles.sportChipText, isSelected && styles.sportChipTextSelected]}>
                        {sport.charAt(0).toUpperCase() + sport.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <FormInput
                label="Capacity"
                value={newCourt.capacity.toString()}
                onChangeText={(value) =>
                  setNewCourt({ ...newCourt, capacity: parseInt(value) || 0 })
                }
                placeholder="10"
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setNewCourt({ ...newCourt, isIndoor: !newCourt.isIndoor })}
              >
                <View style={[styles.checkbox, newCourt.isIndoor && styles.checkboxChecked]}>
                  {newCourt.isIndoor && <Ionicons name="checkmark" size={16} color={colors.surfaceContainerLowest} />}
                </View>
                <Text style={styles.checkboxLabel}>Indoor Court</Text>
              </TouchableOpacity>

              <FormInput
                label="Price Per Hour ($)"
                value={newCourt.pricePerHour.toString()}
                onChangeText={(value) =>
                  setNewCourt({ ...newCourt, pricePerHour: parseFloat(value) || 0 })
                }
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditCourtModal(false);
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
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.addCourtButton]}
                onPress={handleUpdateCourt}
              >
                <Text style={styles.addCourtButtonText}>Update Court</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Duplicate Warning Modal */}
      <Modal
        visible={showDuplicateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDuplicateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.duplicateModalContent}>
            <View style={styles.duplicateModalHeader}>
              <Ionicons name="warning" size={32} color={colors.gold} />
              <Text style={styles.modalTitle}>Grounds Already Exist</Text>
            </View>

            <Text style={styles.modalDescription}>
              We found {duplicates.length} existing {duplicates.length === 1 ? 'ground' : 'grounds'} at this address:
            </Text>

            <ScrollView style={styles.duplicateList}>
              {duplicates.map((facility) => (
                <View key={facility.id} style={styles.duplicateCard}>
                  <Text style={styles.duplicateName}>{facility.name}</Text>
                  <Text style={styles.duplicateAddress}>
                    {facility.street}, {facility.city}, {facility.state} {facility.zipCode}
                  </Text>
                  <View style={styles.sportTypeRow}>
                    {facility.sportTypes.map((sport) => (
                      <View key={sport} style={styles.sportBadge}>
                        <Text style={styles.sportBadgeText}>{sport}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>

            <Text style={styles.modalQuestion}>
              Are you sure you want to create another ground at this location?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDuplicateModal(false);
                  setIsSubmitting(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.continueButton]}
                onPress={handleContinueAnyway}
              >
                <Text style={styles.continueButtonText}>Create Anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <UpsellModal
        visible={showUpsell}
        requiredPlan={upsellPlan}
        onClose={() => setShowUpsell(false)}
        onUpgrade={() => {
          setShowUpsell(false);
          // TODO: Navigate to subscription/checkout screen
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // ── Wizard step inputs ─────────────────────────────
  textInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  fieldLabel: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },

  // ── Step 4: Settings ──────────────────────────────
  settingsSection: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: colors.onSurface,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: 16,
  },
  courtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  courtInfo: {
    flex: 1,
  },
  courtName: {
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.onSurface,
    marginBottom: 2,
  },
  courtDetails: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  courtPrice: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.primary,
  },
  courtActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    marginRight: 2,
  },
  removeButton: {
    padding: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontFamily: fonts.label,
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurface,
    marginBottom: 2,
  },
  toggleDescription: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },

  // ── Step 5: Review ─────────────────────────────────
  reviewCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewName: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.onSurface,
    marginBottom: 16,
  },
  reviewRow: {
    paddingVertical: 10,
  },
  reviewLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  reviewValue: {
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.onSurface,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
  },

  // ── Modals ─────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  addCourtModal: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalScrollContent: {
    padding: Spacing.lg,
  },
  duplicateModalContent: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  duplicateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.onSurface,
  },
  inputLabel: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.onSurface,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  sportTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sportChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.background,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  sportChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sportChipText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  sportChipTextSelected: {
    color: colors.surfaceContainerLowest,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.outline,
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurface,
  },
  modalActions: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },
  cancelButton: {
    backgroundColor: colors.surfaceContainerLowest,
  },
  cancelButtonText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  addCourtButton: {
    backgroundColor: colors.primary,
  },
  addCourtButtonText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    fontWeight: '600',
    color: colors.surfaceContainerLowest,
  },
  modalDescription: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  duplicateList: {
    maxHeight: 200,
    marginBottom: Spacing.lg,
  },
  duplicateCard: {
    backgroundColor: colors.background,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  duplicateName: {
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.onSurface,
    marginBottom: Spacing.xs,
  },
  duplicateAddress: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginBottom: Spacing.sm,
  },
  sportTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sportBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  sportBadgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.surfaceContainerLowest,
    fontWeight: '600',
  },
  modalQuestion: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
  },
  continueButton: {
    backgroundColor: colors.primary,
  },
  continueButtonText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    fontWeight: '600',
    color: colors.surfaceContainerLowest,
  },
});
