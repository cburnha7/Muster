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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { FormInput } from '../../components/forms/FormInput';
import { FormButton } from '../../components/forms/FormButton';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, Spacing } from '../../theme';
import { SportType } from '../../types';
import { CreateDependentInput, UpdateDependentInput, DependentProfile } from '../../types/dependent';

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
  { label: 'Basketball', value: SportType.BASKETBALL },
  { label: 'Pickleball', value: SportType.PICKLEBALL },
  { label: 'Tennis', value: SportType.TENNIS },
  { label: 'Soccer', value: SportType.SOCCER },
  { label: 'Softball', value: SportType.SOFTBALL },
  { label: 'Baseball', value: SportType.BASEBALL },
  { label: 'Volleyball', value: SportType.VOLLEYBALL },
  { label: 'Flag Football', value: SportType.FLAG_FOOTBALL },
  { label: 'Kickball', value: SportType.KICKBALL },
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
  const navigation = useNavigation();
  const route = useRoute();
  const { user: authUser } = useAuth();

  const params = (route.params as { dependentId?: string }) || {};
  const dependentId = params.dependentId;
  const isEditMode = !!dependentId;

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sportPreferences, setSportPreferences] = useState<string[]>([]);
  const [profileImage, setProfileImage] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);

  // Fetch existing dependent data in edit mode
  useEffect(() => {
    if (!isEditMode || !authUser?.id) return;

    const fetchDependent = async () => {
      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/dependents/${dependentId}`,
          { headers: { 'X-User-Id': authUser.id } }
        );
        if (!response.ok) throw new Error('Failed to load dependent');
        const data: DependentProfile = await response.json();
        setFirstName(data.firstName);
        setLastName(data.lastName);
        setDateOfBirth(data.dateOfBirth.split('T')[0]); // ISO to YYYY-MM-DD
        setSportPreferences(data.sportPreferences ?? []);
        setProfileImage(data.profileImage ?? '');
      } catch {
        Alert.alert('Error', 'Could not load dependent details. Please try again.');
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

  const handleSubmit = async () => {
    if (!validate() || !authUser?.id) return;

    setIsSubmitting(true);
    try {
      const url = isEditMode
        ? `${process.env.EXPO_PUBLIC_API_URL}/dependents/${dependentId}`
        : `${process.env.EXPO_PUBLIC_API_URL}/dependents`;

      const method = isEditMode ? 'PUT' : 'POST';

      const body: CreateDependentInput | UpdateDependentInput = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth,
        sportPreferences,
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
        const message =
          errorData?.error ?? errorData?.message ?? 'Something went wrong. Please try again.';
        Alert.alert('Error', message);
        return;
      }

      Alert.alert(
        'Success',
        isEditMode
          ? 'Dependent profile updated.'
          : 'Dependent added successfully.',
        [{ text: 'OK', onPress: () => (navigation as any).goBack() }]
      );
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSport = (sport: string) => {
    setSportPreferences((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ScreenHeader
          title={isEditMode ? 'Edit Dependent' : 'Add Dependent'}
          showBack
          onBackPress={() => (navigation as any).goBack()}
        />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={colors.grass} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={isEditMode ? 'Edit Dependent' : 'Add Dependent'}
        showBack
        onBackPress={() => (navigation as any).goBack()}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
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
          <FormInput
            label="Date of Birth"
            placeholder="YYYY-MM-DD"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            error={errors.dateOfBirth}
            required
            leftIcon="calendar-outline"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />

          {/* Sport preferences — chip-style multi-select */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>
              Sport Preferences
            </Text>
            <View style={styles.chipContainer}>
              {SPORT_OPTIONS.map((sport) => {
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
                        color="#FFFFFF"
                        style={styles.chipIcon}
                      />
                    )}
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
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

          {/* Profile image URL (simple text input) */}
          <FormInput
            label="Profile Image URL"
            placeholder="https://example.com/photo.jpg (optional)"
            value={profileImage}
            onChangeText={setProfileImage}
            leftIcon="image-outline"
            autoCapitalize="none"
            keyboardType="url"
          />

          {/* Submit */}
          <View style={styles.submitContainer}>
            <FormButton
              title={isSubmitting ? 'Saving…' : isEditMode ? 'Save Changes' : 'Add Dependent'}
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
    backgroundColor: colors.chalkWarm,
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
    backgroundColor: colors.chalkWarm,
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
    color: colors.ink,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipSelected: {
    backgroundColor: colors.grass,
    borderColor: colors.grass,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 14,
    fontFamily: fonts.label,
    color: colors.ink,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 14,
    color: colors.track,
    marginTop: 4,
  },
  submitContainer: {
    marginTop: Spacing.md,
  },
});
