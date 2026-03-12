import React, { useState, useCallback, useEffect } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useAuth } from '../../context/AuthContext';
import { FormInput } from '../../components/forms/FormInput';
import { FormButton } from '../../components/forms/FormButton';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { HoursOfOperationSection } from '../../components/facilities/HoursOfOperationSection';
import { facilityService } from '../../services/api/FacilityService';
import { courtService } from '../../services/api/CourtService';
import { updateFacility, removeFacility } from '../../store/slices/facilitiesSlice';
import { SportType, CreateFacilityData, Facility } from '../../types';
import { colors, Spacing, TextStyles } from '../../theme';

interface CourtFormData {
  id: string;
  name: string;
  sportType: string;
  capacity: number;
  isIndoor: boolean;
  pricePerHour: number;
  isExisting?: boolean; // Track if this is an existing court or new
}

interface DayHours {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isClosed: boolean;
}

interface EditFacilityScreenProps {
  route: {
    params: {
      facilityId: string;
    };
  };
}

export function EditFacilityScreen({ route }: EditFacilityScreenProps): JSX.Element {
  const { facilityId } = route.params;
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courts, setCourts] = useState<CourtFormData[]>([]);
  const [showAddCourtModal, setShowAddCourtModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingCourtId, setEditingCourtId] = useState<string | null>(null); // Track which court is being edited
  const [originalCourts, setOriginalCourts] = useState<string[]>([]); // Track original court IDs
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

  useEffect(() => {
    loadFacilityData();
  }, [facilityId]);

  // Reload facility data when screen comes into focus
  // This ensures we always have fresh data when returning to this screen
  useFocusEffect(
    useCallback(() => {
      console.log('📍 EditFacilityScreen focused, reloading data with skipCache');
      loadFacilityData(true); // Skip cache when screen comes into focus
    }, [facilityId])
  );

  const loadFacilityData = async (skipCache: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const facility = await facilityService.getFacility(facilityId, skipCache);
      const facilityCourts = await courtService.getCourts(facilityId, skipCache);
      
      // Prepopulate form data
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
      });
      
      // Prepopulate courts
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
      
      // Load hours of operation from availabilitySlots
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

    if (editingCourtId) {
      // Update existing court
      setCourts(courts.map(c => 
        c.id === editingCourtId 
          ? { 
              ...newCourt, 
              id: editingCourtId, 
              isExisting: c.isExisting || false 
            }
          : c
      ));
      setEditingCourtId(null);
    } else {
      // Add new court
      const court: CourtFormData = {
        ...newCourt,
        id: `new-${Date.now()}`,
        isExisting: false,
      };
      setCourts([...courts, court]);
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
    console.log('🗑️ handleRemoveCourt called with courtId:', courtId);
    console.log('Current courts:', courts.map(c => ({ id: c.id, name: c.name })));
    
    setCourts(prevCourts => {
      const filtered = prevCourts.filter((c) => c.id !== courtId);
      console.log('🗑️ New courts list:', filtered.map(c => ({ id: c.id, name: c.name })));
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Update facility
      const facilityData = {
        name: formData.name || '',
        description: formData.description || '',
        sportTypes: formData.sportTypes || [],
        amenities: formData.amenities || [],
        street: formData.address?.street || '',
        city: formData.address?.city || '',
        state: formData.address?.state || '',
        zipCode: formData.address?.zipCode || '',
        contactName: formData.contactInfo?.name || '',
        contactPhone: formData.contactInfo?.phone || '',
        contactEmail: formData.contactInfo?.email || '',
        contactWebsite: formData.contactInfo?.website || '',
        pricePerHour: formData.pricing?.wholeFacilityRate || 0,
        hoursOfOperation: hoursOfOperation.length > 0 ? hoursOfOperation : undefined,
      };

      const updatedFacility = await facilityService.updateFacility(facilityId, facilityData as any);
      
      // Handle courts
      const currentCourtIds = courts.map(c => c.id);
      
      // Delete removed courts
      for (const originalId of originalCourts) {
        if (!currentCourtIds.includes(originalId)) {
          await courtService.deleteCourt(facilityId, originalId);
        }
      }
      
      // Create new courts or update existing ones
      for (let i = 0; i < courts.length; i++) {
        const court = courts[i];
        if (!court) continue;
        
        if (court.isExisting) {
          // Update existing court
          await courtService.updateCourt(facilityId, court.id, {
            name: court.name,
            sportType: court.sportType,
            capacity: court.capacity,
            isIndoor: court.isIndoor,
            pricePerHour: court.pricePerHour,
            displayOrder: i,
          });
        } else {
          // Create new court
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
      
      // Navigate back immediately - the list will reload with fresh data
      setIsSubmitting(false);
      navigation.navigate('Facilities' as never, { 
        screen: 'FacilitiesList',
        params: { refresh: Date.now() } // Force refresh
      } as never);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update ground');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const performDelete = async () => {
    console.log('🗑️ Delete confirmed, starting deletion...');
    try {
      setIsSubmitting(true);
      console.log('🗑️ Calling deleteFacility API...');
      await facilityService.deleteFacility(facilityId);
      console.log('🗑️ Facility deleted, updating Redux...');
      dispatch(removeFacility(facilityId));
      console.log('🗑️ Navigating back...');
      
      // Navigate immediately without showing success alert
      navigation.navigate('Facilities' as never, { screen: 'FacilitiesList' } as never);
    } catch (err: any) {
      console.error('❌ Delete error:', err);
      Alert.alert('Error', err.message || 'Failed to delete ground');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorDisplay message={error} onRetry={loadFacilityData} />
      </View>
    );
  }

  return (
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
            courts.map((court) => (
              <TouchableOpacity
                key={court.id}
                style={styles.courtCard}
                onPress={() => handleEditCourt(court)}
                activeOpacity={0.7}
              >
                <View style={styles.courtInfo}>
                  <Text style={styles.courtName}>{court.name}</Text>
                  <Text style={styles.courtDetails}>
                    {court.sportType.charAt(0).toUpperCase() + court.sportType.slice(1)} • 
                    {court.isIndoor ? ' Indoor' : ' Outdoor'} • 
                    Capacity: {court.capacity}
                  </Text>
                  <Text style={styles.courtPrice}>${court.pricePerHour}/hour</Text>
                </View>
                <View style={styles.courtActions} pointerEvents="box-none">
                  <Ionicons name="create-outline" size={20} color={colors.grass} style={{ marginRight: Spacing.sm }} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={(e) => {
                      e.stopPropagation();
                      console.log('🗑️ Delete button pressed');
                      handleRemoveCourt(court.id);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.track} pointerEvents="none" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ground Pricing</Text>
          <Text style={styles.sectionSubtitle}>
            Pricing is set individually for each court/field. Optionally set a whole ground rental rate.
          </Text>

          <FormInput
            label="Whole Ground Rental ($)"
            value={formData.pricing?.wholeFacilityRate?.toString() || ''}
            onChangeText={(value) =>
              updateNestedField('pricing', 'wholeFacilityRate', value ? parseFloat(value) : 0)
            }
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
          <Text style={styles.helperText}>
            Optional: Price to rent the entire ground (all courts at once)
          </Text>
        </View>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <FormButton
            title="Update Ground"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
          />
        </View>

        {/* Delete Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText}>Delete Ground</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Court Modal */}
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
        <View style={styles.modalOverlay}>
          <View style={styles.addCourtModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCourtId ? 'Edit Court/Field' : 'Add Court/Field'}
              </Text>
              <TouchableOpacity onPress={() => {
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
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.addCourtButton]}
                onPress={handleAddCourt}
              >
                <Text style={styles.addCourtButtonText}>
                  {editingCourtId ? 'Update Court' : 'Add Court'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalIcon}>
              <Ionicons name="warning" size={48} color={colors.track} />
            </View>
            
            <Text style={styles.deleteModalTitle}>Delete Ground?</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete this ground? This action cannot be undone and will remove all associated courts and data.
            </Text>

            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelDeleteButton]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelDeleteButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.confirmDeleteButton]}
                onPress={() => {
                  setShowDeleteModal(false);
                  performDelete();
                }}
              >
                <Text style={styles.confirmDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  section: {
    backgroundColor: colors.background,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    backgroundColor: colors.surface,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  courtInfo: {
    flex: 1,
  },
  courtActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  removeButton: {
    padding: Spacing.sm,
  },
  helperText: {
    ...TextStyles.caption,
    color: colors.textTertiary,
    marginTop: -Spacing.sm,
  },
  buttonContainer: {
    padding: Spacing.lg,
  },
  deleteButton: {
    backgroundColor: colors.track,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  addCourtModal: {
    backgroundColor: colors.background,
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: colors.background,
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
    borderBottomColor: colors.border,
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
    borderTopColor: colors.border,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  deleteModalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  deleteModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.chalk,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  deleteModalTitle: {
    ...TextStyles.h2,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  deleteModalMessage: {
    ...TextStyles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.md,
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelDeleteButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelDeleteButtonText: {
    ...TextStyles.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  confirmDeleteButton: {
    backgroundColor: colors.track,
  },
  confirmDeleteButtonText: {
    ...TextStyles.body,
    fontWeight: '600',
    color: colors.textInverse,
  },
});
