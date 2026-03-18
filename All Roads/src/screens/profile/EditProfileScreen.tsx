import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { userService } from '../../services/api/UserService';
import { User, UpdateProfileData } from '../../types';
import { FormInput } from '../../components/forms/FormInput';
import { FormButton } from '../../components/forms/FormButton';
import { FormSelect } from '../../components/forms/FormSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { loggingService } from '../../services/LoggingService';import { validateEmail, validatePhoneNumber } from '../../utils/validation';
import { colors } from '../../theme';

const SPORT_OPTIONS = [
  { label: 'Basketball', value: 'basketball' },
  { label: 'Soccer', value: 'soccer' },
  { label: 'Tennis', value: 'tennis' },
  { label: 'Volleyball', value: 'volleyball' },
  { label: 'Badminton', value: 'badminton' },
  { label: 'Other', value: 'other' },
];

export function EditProfileScreen(): JSX.Element {
  const navigation = useNavigation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileImage, setProfileImage] = useState<string | undefined>(undefined);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProfile();
    requestImagePermissions();
  }, []);

  const requestImagePermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload profile images.'
        );
      }
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const profileData = await userService.getProfile();
      setUser(profileData);
      setFirstName(profileData.firstName || '');
      setLastName(profileData.lastName || '');
      setEmail(profileData.email || '');
      setPhoneNumber(profileData.phoneNumber || '');
      setProfileImage(profileData.profileImage);
      setSelectedSports(profileData.preferredSports || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      newErrors.phoneNumber = 'Invalid phone number format';
    }

    // Log each validation failure
    Object.entries(newErrors).forEach(([field, msg]) => {
      loggingService.logValidation('EditProfileScreen', field, 'invalid', msg);
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to pick image: ' + err.message);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploadingImage(true);

      // Create a file object from the URI
      const response = await fetch(uri);
      const blob = await response.blob();
      const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });

      const result = await userService.uploadProfileImage(file);
      setProfileImage(result.imageUrl);
      Alert.alert('Success', 'Profile image updated successfully');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to upload image: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    Alert.alert('Remove Profile Image', 'Are you sure you want to remove your profile image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await userService.deleteProfileImage();
            setProfileImage(undefined);
            Alert.alert('Success', 'Profile image removed');
          } catch (err: any) {
            Alert.alert('Error', 'Failed to remove image: ' + err.message);
          }
        },
      },
    ]);
  };

  const toggleSport = (sport: string) => {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    loggingService.logButton('Save Changes', 'EditProfileScreen');
    try {
      setSaving(true);
      const updates: UpdateProfileData = {
        firstName,
        lastName,
        email,
        phoneNumber: phoneNumber || undefined,
        preferredSports: selectedSports,
      };

      await userService.updateProfile(updates);
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={loadProfile} />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Profile Image Section */}
        <View style={styles.imageSection}>
          <View style={styles.imageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImagePlaceholderText}>
                  {firstName?.[0]?.toUpperCase() || 'U'}
                  {lastName?.[0]?.toUpperCase() || ''}
                </Text>
              </View>
            )}
            {uploadingImage && (
              <View style={styles.uploadingOverlay}>
                <LoadingSpinner />
              </View>
            )}
          </View>
          <View style={styles.imageButtons}>
            <TouchableOpacity
              style={styles.imageButton}
              onPress={handlePickImage}
              disabled={uploadingImage}
            >
              <Text style={styles.imageButtonText}>Change Photo</Text>
            </TouchableOpacity>
            {profileImage && (
              <TouchableOpacity
                style={[styles.imageButton, styles.removeButton]}
                onPress={handleRemoveImage}
                disabled={uploadingImage}
              >
                <Text style={[styles.imageButtonText, styles.removeButtonText]}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <FormInput
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter your first name"
            error={errors.firstName}
          />

          <FormInput
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Enter your last name"
            error={errors.lastName}
          />

          <FormInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <FormInput
            label="Phone Number (Optional)"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            error={errors.phoneNumber}
          />

          {/* Preferred Sports */}
          <View style={styles.sportsSection}>
            <Text style={styles.sportsLabel}>Preferred Sports</Text>
            <View style={styles.sportsList}>
              {SPORT_OPTIONS.map((sport) => (
                <TouchableOpacity
                  key={sport.value}
                  style={[
                    styles.sportTag,
                    selectedSports.includes(sport.value) && styles.sportTagSelected,
                  ]}
                  onPress={() => toggleSport(sport.value)}
                >
                  <Text
                    style={[
                      styles.sportTagText,
                      selectedSports.includes(sport.value) && styles.sportTagTextSelected,
                    ]}
                  >
                    {sport.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Save Button */}
          <FormButton
            title={saving ? 'Saving...' : 'Save Changes'}
            onPress={handleSave}
            disabled={saving}
            style={styles.saveButton}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chalkWarm,
  },
  content: {
    padding: 16,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImagePlaceholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  imageButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  imageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: '#EF4444',
  },
  removeButtonText: {
    color: '#FFFFFF',
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sportsSection: {
    marginTop: 16,
  },
  sportsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  sportsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sportTagSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  sportTagText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  sportTagTextSelected: {
    color: '#3B82F6',
  },
  saveButton: {
    marginTop: 24,
  },
});