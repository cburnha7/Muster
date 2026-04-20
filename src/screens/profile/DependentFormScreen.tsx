import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';

import { FormInput } from '../../components/forms/FormInput';
import { FormButton } from '../../components/forms/FormButton';
import { DatePickerInput } from '../../components/forms/DatePickerInput';
import { useAuth } from '../../context/AuthContext';
import { setDependents } from '../../store/slices/contextSlice';
import { API_BASE_URL } from '../../services/api/config';
import { fonts, Spacing, useTheme } from '../../theme';
import { SportType } from '../../types';
import {
  CreateDependentInput,
  UpdateDependentInput,
  DependentProfile,
} from '../../types/dependent';

/**
 * DependentFormScreen
 *
 * Create or edit a dependent account. In create mode (no dependentId param),
 * shows an empty form. In edit mode (dependentId param), pre-fills with
 * existing data fetched from the API.
 *
 * Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3
 */

interface FormErrors {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  sportPreferences?: string;
  general?: string;
}

const SPORT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Baseball', value: SportType.BASEBALL },
  { label: 'Basketball', value: SportType.BASKETBALL },
  { label: 'Flag Football', value: SportType.FLAG_FOOTBALL },
  { label: 'Hockey', value: SportType.HOCKEY },
  { label: 'Kickball', value: SportType.KICKBALL },
  { label: 'Pickleball', value: SportType.PICKLEBALL },
  { label: 'Soccer', value: SportType.SOCCER },
  { label: 'Softball', value: SportType.SOFTBALL },
  { label: 'Tennis', value: SportType.TENNIS },
  { label: 'Volleyball', value: SportType.VOLLEYBALL },
  { label: 'Other', value: SportType.OTHER },
];

/**
 * Returns true if the given date of birth yields an age under 18.
 * A person is considered 18 on their 18th birthday.
 */
function isUnder18(dateOfBirth: string): boolean {
  const dob = new Date(dateOfBirth + 'T00:00:00');
  if (isNaN(dob.getTime())) return false;

  const today = new Date();
  const cutoff = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate()
  );
  // Under 18 means DOB is strictly after the cutoff date (18 years ago today)
  return dob > cutoff;
}

/**
 * Validates a YYYY-MM-DD date string.
 */
function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00');
  if (isNaN(date.getTime())) return false;
  // Verify the parsed date matches the input (catches invalid dates like 2024-02-30)
  const [y, m, d] = value.split('-').map(Number);
  return (
    date.getFullYear() === y &&
    date.getMonth() + 1 === m &&
    date.getDate() === d
  );
}

export function DependentFormScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { user: authUser } = useAuth();

  const params = (route.params as { dependentId?: string }) || {};
  const dependentId = params.dependentId;
  const isEditMode = !!dependentId;

  // Set nav header title dynamically
  React.useEffect(() => {
    navigation.setOptions({
      headerTitle: isEditMode ? 'Edit Dependent' : 'Add Dependent',
    });
  }, [navigation, isEditMode]);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sportPreferences, setSportPreferences] = useState<string[]>([]);
  const [profileImage, setProfileImage] = useState('');
  const [gender, setGender] = useState<string>('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);

  // Fetch existing dependent data in edit mode
  useEffect(() => {
    if (!isEditMode || !authUser?.id) return;

    const fetchDependent = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/dependents/${dependentId}`,
          { headers: { 'X-User-Id': authUser.id } }
        );
        if (!response.ok) throw new Error('Failed to load dependent');
        const data: DependentProfile = await response.json();
        setFirstName(data.firstName);
        setLastName(data.lastName);
        setDateOfBirth(data.dateOfBirth.split('T')[0]); // ISO to YYYY-MM-DD
        setSportPreferences(data.sportPreferences ?? []);
        setProfileImage(data.profileImage ?? '');
        setGender(data.gender ?? '');
      } catch {
        Alert.alert(
          'Error',
          'Could not load dependent details. Please try again.'
        );
        (navigation as any).goBack();
      } finally {
        setIsLoading(false);
      }
    };

    fetchDependent();
  }, [isEditMode, dependentId, authUser?.id]);

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!dateOfBirth.trim()) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else if (!isValidDateString(dateOfBirth)) {
      newErrors.dateOfBirth = 'Enter a valid date (YYYY-MM-DD)';
    } else if (!isUnder18(dateOfBirth)) {
      newErrors.dateOfBirth = 'Dependent must be under 18';
    } else {
      // Also reject future dates
      const dob = new Date(dateOfBirth + 'T00:00:00');
      if (dob > new Date()) {
        newErrors.dateOfBirth = 'Date of birth cannot be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [firstName, lastName, dateOfBirth]);

  // Clear field-level errors as the user types / selects
  useEffect(() => {
    if (errors.firstName && firstName.trim())
      setErrors(prev => ({ ...prev, firstName: undefined }));
  }, [firstName]);
  useEffect(() => {
    if (errors.lastName && lastName.trim())
      setErrors(prev => ({ ...prev, lastName: undefined }));
  }, [lastName]);
  useEffect(() => {
    if (errors.dateOfBirth && dateOfBirth)
      setErrors(prev => ({ ...prev, dateOfBirth: undefined }));
  }, [dateOfBirth]);

  /** Refresh the Redux dependent list so the context switcher picks up changes. */
  const refreshDependents = async () => {
    if (!authUser?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/dependents`, {
        headers: { 'X-User-Id': authUser.id },
      });
      if (res.ok) {
        const data = await res.json();
        dispatch(setDependents(data));
      }
    } catch {
      // Non-critical — the list will refresh next login
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    if (!authUser?.id) {
      Alert.alert('Session Expired', 'Please log in again to add a dependent.');
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      const url = isEditMode
        ? `${API_BASE_URL}/dependents/${dependentId}`
        : `${API_BASE_URL}/dependents`;

      const method = isEditMode ? 'PUT' : 'POST';

      const body: CreateDependentInput | UpdateDependentInput = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth,
        sportPreferences,
        ...(gender ? { gender } : {}),
        ...(profileImage ? { profileImage } : {}),
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': authUser.id,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error(
          'Dependent API error:',
          response.status,
          JSON.stringify(errorData)
        );

        const rawMessage = errorData?.error ?? errorData?.message ?? '';

        // Surface known validation errors inline with user-friendly messages
        if (rawMessage.toLowerCase().includes('under 18')) {
          setErrors(prev => ({
            ...prev,
            dateOfBirth: 'Dependent must be under 18 years old.',
          }));
        } else if (rawMessage.includes('Missing required fields')) {
          setErrors(prev => ({
            ...prev,
            general: 'Please fill in all required fields and try again.',
          }));
        } else {
          setErrors(prev => ({
            ...prev,
            general: 'Something went wrong. Please try again.',
          }));
        }
        return;
      }

      // Refresh the context-switcher list so the new dependent appears immediately
      await refreshDependents();

      Alert.alert(
        isEditMode ? 'Updated' : 'Dependent Added',
        isEditMode
          ? `${firstName}'s profile has been updated.`
          : `${firstName} has been added to your family.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (isEditMode) {
                (navigation as any).goBack();
              } else {
                (navigation as any).reset({
                  index: 0,
                  routes: [{ name: 'Main' }],
                });
              }
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('Dependent submit error:', err);
      console.error(
        'Error details:',
        JSON.stringify(err, Object.getOwnPropertyNames(err))
      );
      if (err?.response) {
        console.error('Error response status:', err.response.status);
        console.error(
          'Error response data:',
          JSON.stringify(err.response.data)
        );
      }
      setErrors({
        general:
          'Could not reach the server. Check your connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSport = (sport: string) => {
    setSportPreferences(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgScreen }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Name fields */}
          <FormInput
            label="First Name"
            placeholder="Enter first name"
            value={firstName}
            onChangeText={setFirstName}
            error={errors.firstName}
            required
            leftIcon="person-outline"
            autoCapitalize="words"
          />

          <FormInput
            label="Last Name"
            placeholder="Enter last name"
            value={lastName}
            onChangeText={setLastName}
            error={errors.lastName}
            required
            leftIcon="person-outline"
            autoCapitalize="words"
          />

          {/* Date of birth */}
          <DatePickerInput
            label="Date of Birth"
            value={dateOfBirth}
            onChange={setDateOfBirth}
            error={errors.dateOfBirth}
            required
            maximumDate={new Date()}
          />

          {/* Gender */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>Gender</Text>
            <View style={styles.chipContainer}>
              {[
                { label: 'Male', value: 'male' },
                { label: 'Female', value: 'female' },
              ].map(opt => {
                const selected = gender === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() =>
                      setGender(gender === opt.value ? '' : opt.value)
                    }
                    activeOpacity={0.7}
                  >
                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={colors.white}
                        style={styles.chipIcon}
                      />
                    )}
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Sport preferences — chip-style multi-select */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>Sport Preferences</Text>
            <View style={styles.chipContainer}>
              {SPORT_OPTIONS.map(sport => {
                const selected = sportPreferences.includes(sport.value);
                return (
                  <TouchableOpacity
                    key={sport.value}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleSport(sport.value)}
                    activeOpacity={0.7}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={sport.label}
                  >
                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={colors.white}
                        style={styles.chipIcon}
                      />
                    )}
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {sport.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.sportPreferences && (
              <Text style={styles.errorText}>{errors.sportPreferences}</Text>
            )}
          </View>

          {/* Profile Photo — tap to pick from library */}
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              fontWeight: '500',
              color: colors.ink,
              marginBottom: 8,
            }}
          >
            Photo (Optional)
          </Text>
          <TouchableOpacity
            style={{
              alignSelf: 'center',
              marginBottom: 16,
            }}
            onPress={async () => {
              try {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'] as ImagePicker.MediaType[],
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.8,
                });
                if (!result.canceled && result.assets[0]) {
                  setProfileImage(result.assets[0].uri);
                }
              } catch {
                Alert.alert('Error', 'Failed to pick image');
              }
            }}
            activeOpacity={0.7}
          >
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={{ width: 100, height: 100, borderRadius: 50 }}
              />
            ) : (
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name="camera-outline"
                  size={32}
                  color={colors.inkFaint}
                />
              </View>
            )}
          </TouchableOpacity>

          {/* General error */}
          {errors.general && (
            <View style={styles.generalErrorContainer}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.generalErrorText}>{errors.general}</Text>
            </View>
          )}

          {/* Submit */}
          <View style={styles.submitContainer}>
            <FormButton
              title={
                isSubmitting
                  ? 'Saving…'
                  : isEditMode
                    ? 'Save Changes'
                    : 'Add Dependent'
              }
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
              leftIcon={isEditMode ? 'save-outline' : 'person-add-outline'}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 8,
    fontFamily: fonts.body,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 14,
    fontFamily: fonts.label,
    color: colors.onSurface,
  },
  chipTextSelected: {
    color: colors.white,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 4,
  },
  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '10',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 8,
  },
  generalErrorText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.error,
  },
  submitContainer: {
    marginTop: Spacing.md,
  },
});
