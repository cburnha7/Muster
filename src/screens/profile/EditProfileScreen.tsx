import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { userService } from '../../services/api/UserService';
import { User, UpdateProfileData } from '../../types';
import { setUser as setReduxUser } from '../../store/slices/authSlice';
import { FormInput } from '../../components/forms/FormInput';
import { FormButton } from '../../components/forms/FormButton';
import { FormSelect, SelectOption } from '../../components/forms/FormSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { loggingService } from '../../services/LoggingService';
import { validateEmail, validatePhoneNumber } from '../../utils/validation';
import { colors, fonts, useTheme } from '../../theme';
import { SportType } from '../../types';

const SPORT_OPTIONS: SelectOption[] = [
  { label: 'Baseball', value: SportType.BASEBALL },
  { label: 'Basketball', value: SportType.BASKETBALL },
  { label: 'Flag Football', value: SportType.FLAG_FOOTBALL },
  { label: 'Hockey', value: SportType.HOCKEY },
  { label: 'Kickball', value: SportType.KICKBALL },
  { label: 'Other', value: SportType.OTHER },
  { label: 'Pickleball', value: SportType.PICKLEBALL },
  { label: 'Soccer', value: SportType.SOCCER },
  { label: 'Softball', value: SportType.SOFTBALL },
  { label: 'Tennis', value: SportType.TENNIS },
  { label: 'Volleyball', value: SportType.VOLLEYBALL },
];

const GENDER_OPTIONS_UNUSED = null; // Gender now uses toggle buttons

export function EditProfileScreen(): JSX.Element {
  const { colors: themeColors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();
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
  const [profileImage, setProfileImage] = useState<string | undefined>(
    undefined
  );
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [gender, setGender] = useState<string>('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [address, setAddress] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const lastNameRef = useRef<any>(null);
  const emailRef = useRef<any>(null);
  const phoneRef = useRef<any>(null);

  useEffect(() => {
    loadProfile();
    requestImagePermissions();
  }, []);

  const requestImagePermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
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
      // Set dynamic header title
      navigation.setOptions({
        headerTitle: `${profileData.firstName} ${profileData.lastName}`,
      });
      setFirstName(profileData.firstName || '');
      setLastName(profileData.lastName || '');
      setEmail(profileData.email || '');
      setPhoneNumber(profileData.phoneNumber || '');
      setProfileImage(profileData.profileImage);
      setSelectedSports(profileData.preferredSports || []);
      setGender((profileData as any).gender || '');
      setDateOfBirth(
        profileData.dateOfBirth
          ? String(profileData.dateOfBirth).split('T')[0]
          : ''
      );
      if (profileData.dateOfBirth) {
        const dateStr = String(profileData.dateOfBirth).split('T')[0];
        const [y, m, dd] = dateStr.split('-');
        setBirthMonth(String(parseInt(m)));
        setBirthDay(String(parseInt(dd)));
        setBirthYear(y);
      }
      setAddress(
        (profileData as any).locationCity && (profileData as any).locationState
          ? `${(profileData as any).locationCity}, ${(profileData as any).locationState}`
          : (profileData as any).locationCity ||
              (profileData as any).address ||
              ''
      );
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
        mediaTypes: ['images'] as ImagePicker.MediaType[],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0]);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to pick image: ' + err.message);
    }
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      setUploadingImage(true);

      let imageData: string;

      if (asset.base64) {
        // Use base64 from image picker (works on all platforms)
        imageData = `data:image/jpeg;base64,${asset.base64}`;
      } else if (Platform.OS === 'web') {
        // Fallback for web: convert blob to base64
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        imageData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // Fallback: send URI (won't persist for other users but won't crash)
        imageData = asset.uri;
      }

      const result = await userService.uploadProfileImageData(imageData);
      setProfileImage(result.imageUrl);
      Alert.alert('Success', 'Profile image updated successfully');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to upload image: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    Alert.alert(
      'Remove Profile Image',
      'Are you sure you want to remove your profile image?',
      [
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
      ]
    );
  };

  const toggleSport = (sport: string) => {
    setSelectedSports(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
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
        gender: gender || undefined,
        dateOfBirth:
          birthYear && birthMonth && birthDay
            ? `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`
            : undefined,
      };

      // Parse address into city/state for the DB
      if (address) {
        const parts = address.split(',').map(s => s.trim());
        if (parts.length >= 2) {
          (updates as any).locationCity = parts[0];
          (updates as any).locationState = parts[1];
        } else {
          (updates as any).locationCity = address.trim();
        }
      }

      await userService.updateProfile(updates);

      // Refresh the profile and update Redux so all screens get the new data
      try {
        const freshProfile = await userService.getProfile();
        dispatch(setReduxUser(freshProfile as any));
      } catch {
        // Non-critical — profile screen will refresh on focus anyway
      }

      navigation.goBack();
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: themeColors.bgScreen }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Profile Image Section */}
          <View style={styles.imageSection}>
            <View style={styles.imageContainer}>
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.profileImage}
                />
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
                activeOpacity={0.75}
              >
                <Text style={styles.imageButtonText}>Change Photo</Text>
              </TouchableOpacity>
              {profileImage && (
                <TouchableOpacity
                  style={[styles.imageButton, styles.removeButton]}
                  onPress={handleRemoveImage}
                  disabled={uploadingImage}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[styles.imageButtonText, styles.removeButtonText]}
                  >
                    Remove
                  </Text>
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
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
            />

            <FormInput
              ref={lastNameRef}
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter your last name"
              error={errors.lastName}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />

            <FormInput
              ref={emailRef}
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
            />

            <FormInput
              ref={phoneRef}
              label="Phone Number (Optional)"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              error={errors.phoneNumber}
              returnKeyType="done"
            />

            {/* Gender toggle */}
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 16,
                fontWeight: '500',
                color: themeColors.textPrimary,
                marginBottom: 8,
                marginTop: 8,
              }}
            >
              Gender
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { label: 'Male', value: 'male' },
                { label: 'Female', value: 'female' },
              ].map(opt => {
                const selected = gender === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: selected
                        ? colors.cobalt
                        : colors.surface,
                      borderWidth: 1.5,
                      borderColor: selected ? colors.cobalt : colors.border,
                      gap: 6,
                    }}
                    onPress={() =>
                      setGender(gender === opt.value ? '' : opt.value)
                    }
                    activeOpacity={0.75}
                  >
                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#FFFFFF"
                      />
                    )}
                    <Text
                      style={{
                        fontFamily: fonts.ui,
                        fontSize: 14,
                        color: selected ? '#FFFFFF' : colors.ink,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Birthday — Month / Day / Year dropdowns */}
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 16,
                fontWeight: '500',
                color: '#333',
                marginBottom: 8,
                marginTop: 8,
              }}
            >
              Birthday
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <FormSelect
                  label=""
                  options={Array.from({ length: 12 }, (_, i) => ({
                    label: new Date(2000, i).toLocaleString('en', {
                      month: 'long',
                    }),
                    value: String(i + 1),
                  }))}
                  value={birthMonth}
                  onSelect={o => setBirthMonth(String(o.value))}
                  placeholder="Month"
                />
              </View>
              <View style={{ flex: 0.6 }}>
                <FormSelect
                  label=""
                  options={Array.from({ length: 31 }, (_, i) => ({
                    label: String(i + 1),
                    value: String(i + 1),
                  }))}
                  value={birthDay}
                  onSelect={o => setBirthDay(String(o.value))}
                  placeholder="Day"
                />
              </View>
              <View style={{ flex: 0.8 }}>
                <FormSelect
                  label=""
                  options={Array.from({ length: 80 }, (_, i) => {
                    const y = new Date().getFullYear() - i;
                    return { label: String(y), value: String(y) };
                  })}
                  value={birthYear}
                  onSelect={o => setBirthYear(String(o.value))}
                  placeholder="Year"
                />
              </View>
            </View>

            {/* Home Address — autocomplete */}
            <FormInput
              label="Home Address"
              value={address}
              onChangeText={text => {
                setAddress(text);
                // Google Places autocomplete
                if (text.length >= 3) {
                  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
                  if (apiKey) {
                    fetch(
                      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&types=address&key=${apiKey}`
                    )
                      .then(r => r.json())
                      .then(data =>
                        setAddressSuggestions(
                          (data.predictions || []).map(
                            (p: any) => p.description
                          )
                        )
                      )
                      .catch(() => setAddressSuggestions([]));
                  }
                } else {
                  setAddressSuggestions([]);
                }
              }}
              placeholder="Start typing your address..."
            />
            {addressSuggestions.length > 0 && (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.outlineVariant,
                  marginTop: -8,
                  marginBottom: 8,
                }}
              >
                {addressSuggestions.slice(0, 5).map((suggestion, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderBottomWidth: idx < 4 ? 1 : 0,
                      borderBottomColor: colors.outlineVariant,
                    }}
                    onPress={() => {
                      setAddress(suggestion);
                      setAddressSuggestions([]);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 14,
                        color: colors.onSurface,
                      }}
                    >
                      {suggestion}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
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
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  profileImagePlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImagePlaceholderText: {
    fontSize: 64,
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
    borderRadius: 90,
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
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  imageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: colors.error,
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
  genderSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  sportsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
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
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  sportTagSelected: {
    backgroundColor: colors.primaryFixed,
    borderColor: colors.primary,
  },
  sportTagText: {
    fontSize: 14,
    color: colors.outline,
    fontWeight: '500',
  },
  sportTagTextSelected: {
    color: colors.primary,
  },
  saveButton: {
    marginTop: 24,
  },
});
