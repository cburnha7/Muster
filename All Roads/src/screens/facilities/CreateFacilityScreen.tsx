import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../../context/AuthContext';
import { FormInput } from '../../components/forms/FormInput';
import { FormButton } from '../../components/forms/FormButton';
import { HoursOfOperationSection } from '../../components/facilities/HoursOfOperationSection';
import { CancellationPolicyPicker } from '../../components/facilities/CancellationPolicyPicker';
import { UpsellModal } from '../../components/paywall/UpsellModal';
import { facilityService } from '../../services/api/FacilityService';
import { courtService } from '../../services/api/CourtService';
import { addFacility, selectFacilities } from '../../store/slices/facilitiesSlice';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import { SportType, CreateFacilityData, Facility } from '../../types';
import { SubscriptionPlan } from '../../types/subscription';
import { colors, Spacing, TextStyles } from '../../theme';
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

export function CreateFacilityScreen(): JSX.Element {
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
    console.log('🗑️ handleRemoveCourt called with:', courtId);
    setCourts(prevCourts => {
      const filtered = prevCourts.filter((c) => c.id !== courtId);
      console.log('🗑️ Filtered courts:', filtered.length, 'from', prevCourts.length);
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
      console.log('🏗️ Creating facility...');
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
      };

      console.log('📤 Sending facility creation request...');
      const newFacility = await facilityService.createFacility(facilityData as any);
      console.log('✅ Facility created:', newFacility.id);

      // Create courts if any were added
      const createdCourts = [];
      if (courts.length > 0) {
        console.log(`🏟️ Creating ${courts.length} courts...`);
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
            console.log(`✅ Court ${i + 1} created:`, createdCourt.id);
          }
        }
      }

      // Add facility to Redux with courts included
      const facilityWithCourts = {
        ...newFacility,
        courts: createdCourts,
      };
      dispatch(addFacility(facilityWithCourts));
      console.log('✅ Facility added to Redux with', createdCourts.length, 'courts');

      // Reset submitting state before navigation
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      isCreatingFacility = false;

      // Navigate back with refresh parameter to force list reload
      console.log('🧭 Navigating back...');
      navigation.navigate('Facilities' as never, { 
        screen: 'FacilitiesList',
        params: { refresh: Date.now() }
      } as never);
      
    } catch (err: any) {
      console.error('❌ Create facility error:', err);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      isCreatingFacility = false;
      throw err;
    }
  }, [formData, courts, hoursOfOperation, dispatch, navigation]);

  const handleSubmit = useCallback(async () => {
    const timestamp = Date.now();
    console.log(`🔘 [${timestamp}] handleSubmit called, isSubmitting:`, isSubmitting, 'ref:', isSubmittingRef.current, 'global:', isCreatingFacility);
    
    // Triple check - state, ref, AND global flag
    if (isSubmitting || isSubmittingRef.current || isCreatingFacility) {
      console.log(`⚠️ [${timestamp}] Already submitting, ignoring duplicate call`);
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
      console.log(`🔒 [${timestamp}] Setting all flags to true`);
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
        console.log(`⚠️ [${timestamp}] Duplicates found, showing modal`);
        setDuplicates(duplicateCheck);
        setShowDuplicateModal(true);
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        isCreatingFacility = false;
        return;
      }

      await createFacility();
    } catch (err: any) {
      console.error(`❌ [${timestamp}] handleSubmit error:`, err);
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

  return (
    <>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <FormInput
            label="Ground Name *"
            value={formData.name || ''}
            onChangeText={(value) => updateField('name', value)}
            placeholder="Enter ground name"
            error={errors.name || ''}
          />

          <FormInput
            label="Description *"
            value={formData.description || ''}
            onChangeText={(value) => updateField('description', value)}
            placeholder="Describe your ground"
            multiline
            numberOfLines={4}
            error={errors.description || ""}
          />
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>

          <FormInput
            label="Street Address *"
            value={formData.address?.street || ''}
            onChangeText={(value) => updateNestedField('address', 'street', value)}
            placeholder="123 Main St"
            error={errors.street || ""}
          />

          <FormInput
            label="City *"
            value={formData.address?.city || ''}
            onChangeText={(value) => updateNestedField('address', 'city', value)}
            placeholder="City"
            error={errors.city || ""}
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <FormInput
                label="State *"
                value={formData.address?.state || ''}
                onChangeText={(value) => updateNestedField('address', 'state', value)}
                placeholder="State"
                error={errors.state || ""}
              />
            </View>
            <View style={styles.halfWidth}>
              <FormInput
                label="ZIP Code *"
                value={formData.address?.zipCode || ''}
                onChangeText={(value) => updateNestedField('address', 'zipCode', value)}
                placeholder="12345"
                keyboardType="numeric"
                error={errors.zipCode || ""}
              />
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <FormInput
            label="Name"
            value={formData.contactInfo?.name || ''}
            onChangeText={(value) => updateNestedField('contactInfo', 'name', value)}
            placeholder="John Doe"
          />

          <FormInput
            label="Phone"
            value={formData.contactInfo?.phone || ''}
            onChangeText={(value) => updateNestedField('contactInfo', 'phone', value)}
            placeholder="(555) 123-4567"
            keyboardType="phone-pad"
          />

          <FormInput
            label="Email"
            value={formData.contactInfo?.email || ''}
            onChangeText={(value) => updateNestedField('contactInfo', 'email', value)}
            placeholder="contact@ground.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <FormInput
            label="Website"
            value={formData.contactInfo?.website || ''}
            onChangeText={(value) => updateNestedField('contactInfo', 'website', value)}
            placeholder="https://ground.com"
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>

        {/* Sport Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sport Types *</Text>
          {errors.sportTypes && <Text style={styles.errorText}>{errors.sportTypes}</Text>}
          <View style={styles.sportTypeContainer}>
            {Object.values(SportType).map((sport) => {
              const isSelected = formData.sportTypes?.includes(sport);
              return (
                <TouchableOpacity
                  key={sport}
                  style={[styles.sportChip, isSelected && styles.sportChipSelected]}
                  onPress={() => toggleSportType(sport)}
                >
                  <Text style={[styles.sportChipText, isSelected && styles.sportChipTextSelected]}>
                    {sport.charAt(0).toUpperCase() + sport.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Hours of Operation */}
        <HoursOfOperationSection
          hours={hoursOfOperation}
          onChange={setHoursOfOperation}
        />

        {/* Courts/Fields */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Courts/Fields</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddCourtModal(true)}
            >
              <Ionicons name="add-circle" size={24} color={colors.grass} style={{ marginRight: Spacing.xs }} />
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
                        console.log('🗑️ TRASH BUTTON CLICKED!', court.id);
                        alert('Delete button clicked for: ' + court.name);
                        handleRemoveCourt(court.id);
                      }}
                    >
                      <Ionicons 
                        name="trash-outline" 
                        size={20} 
                        color={colors.track}
                        pointerEvents="none"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editButton}
                      activeOpacity={0.7}
                      onPress={() => {
                        console.log('✏️ Edit button pressed for court:', court.id);
                        handleEditCourt(court.id);
                      }}
                    >
                      <Ionicons name="pencil-outline" size={20} color={colors.grass} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Cancellation Policy */}
        <View style={styles.section}>
          <CancellationPolicyPicker
            value={formData.cancellationPolicyHours ?? null}
            onChange={(val) => updateField('cancellationPolicyHours', val)}
          />
        </View>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <FormButton
            title="Create Ground"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
          />
          <FormButton
            title="Cancel"
            variant="secondary"
            onPress={() => navigation.goBack()}
            disabled={isSubmitting}
          />
        </View>
      </ScrollView>

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
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
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
                  {newCourt.isIndoor && <Ionicons name="checkmark" size={16} color={colors.textInverse} />}
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
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
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
                  {newCourt.isIndoor && <Ionicons name="checkmark" size={16} color={colors.textInverse} />}
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={32} color={colors.court} />
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
    </KeyboardAvoidingView>

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
  container: {
    flex: 1,
    backgroundColor: colors.chalkWarm,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.lg,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: 12,
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...TextStyles.h3,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    ...TextStyles.caption,
    color: colors.textSecondary,
    marginBottom: Spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    ...TextStyles.body,
    color: colors.grass,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -Spacing.sm,
  },
  halfWidth: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  sportTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sportChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sportChipSelected: {
    backgroundColor: colors.grass,
  },
  sportChipText: {
    ...TextStyles.body,
    color: colors.textSecondary,
  },
  sportChipTextSelected: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  errorText: {
    ...TextStyles.caption,
    color: colors.track,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...TextStyles.body,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  courtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.chalkWarm,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  courtInfo: {
    flex: 1,
  },
  courtName: {
    ...TextStyles.h4,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  courtDetails: {
    ...TextStyles.caption,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  courtPrice: {
    ...TextStyles.body,
    color: colors.grass,
    fontWeight: '600',
  },
  courtActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: Spacing.md,
    marginRight: Spacing.xs,
  },
  removeButton: {
    padding: Spacing.md,
  },
  helperText: {
    ...TextStyles.caption,
    color: colors.textTertiary,
    marginTop: -Spacing.sm,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  addCourtModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    ...TextStyles.h3,
    color: colors.textPrimary,
  },
  inputLabel: {
    ...TextStyles.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
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
    borderColor: colors.border,
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.grass,
    borderColor: colors.grass,
  },
  checkboxLabel: {
    ...TextStyles.body,
    color: colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },
  cancelButton: {
    backgroundColor: colors.chalkWarm,
  },
  cancelButtonText: {
    ...TextStyles.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  addCourtButton: {
    backgroundColor: colors.grass,
  },
  addCourtButtonText: {
    ...TextStyles.body,
    fontWeight: '600',
    color: colors.textInverse,
  },
  modalDescription: {
    ...TextStyles.body,
    color: colors.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  duplicateList: {
    maxHeight: 200,
    marginBottom: Spacing.lg,
  },
  duplicateCard: {
    backgroundColor: colors.chalkWarm,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  duplicateName: {
    ...TextStyles.h4,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  duplicateAddress: {
    ...TextStyles.caption,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  sportTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sportBadge: {
    backgroundColor: colors.grass,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  sportBadgeText: {
    ...TextStyles.caption,
    color: colors.textInverse,
    fontWeight: '600',
    fontSize: 11,
  },
  modalQuestion: {
    ...TextStyles.body,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
  },
  continueButton: {
    backgroundColor: colors.grass,
  },
  continueButtonText: {
    ...TextStyles.body,
    fontWeight: '600',
    color: colors.textInverse,
  },
});
