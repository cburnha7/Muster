/**
 * SSO Onboarding Flow
 *
 * 5-screen wizard for users who signed up via Apple/Google SSO.
 * Collects: Name → Birthday → Location → Contact Info → Profile Photo
 *
 * Uses local state to accumulate form data across screens.
 * Final save happens on Screen 5 complete/skip.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../theme';
import { tokenFontFamily, tokenSpacing, tokenRadius } from '../../theme/tokens';
import { selectUser, completeOnboarding } from '../../store/slices/authSlice';
import type { OnboardingData } from '../../types/auth';

const TOTAL_STEPS = 5;

interface FormData {
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  locationCity: string;
  locationState: string;
  locationLat: number | null;
  locationLng: number | null;
  phoneNumber: string;
  email: string;
  profileImage: string | null;
}

export function SSOOnboardingFlow() {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Pre-populate from SSO token data
  const [form, setForm] = useState<FormData>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    dateOfBirth: null,
    locationCity: '',
    locationState: '',
    locationLat: null,
    locationLng: null,
    phoneNumber: '',
    email: user?.email || '',
    profileImage: null,
  });

  const isAppleRelay = form.email.includes('privaterelay.appleid.com');

  const updateForm = (updates: Partial<FormData>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const animateTransition = (next: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      animateTransition(step + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      animateTransition(step - 1);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const data: OnboardingData = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        ...(form.dateOfBirth
          ? { dateOfBirth: form.dateOfBirth.toISOString() }
          : {}),
        ...(form.phoneNumber.trim()
          ? { phoneNumber: form.phoneNumber.trim() }
          : {}),
        ...(form.email.trim() && !isAppleRelay
          ? { email: form.email.trim() }
          : {}),
        ...(form.profileImage ? { profileImage: form.profileImage } : {}),
        ...(form.locationCity ? { locationCity: form.locationCity } : {}),
        ...(form.locationState ? { locationState: form.locationState } : {}),
        ...(form.locationLat != null ? { locationLat: form.locationLat } : {}),
        ...(form.locationLng != null ? { locationLng: form.locationLng } : {}),
      };

      await (dispatch as any)(completeOnboarding(data)).unwrap();
      // Navigation happens automatically via RootNavigator
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  // ─── Progress dots ─────────────────────────────────────────

  const ProgressDots = () => (
    <View style={s.progressBar}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            s.dot,
            { backgroundColor: i <= step ? colors.cobalt : colors.border },
            i <= step && s.dotActive,
          ]}
        />
      ))}
    </View>
  );

  // ─── Screen 1: Name ────────────────────────────────────────

  const NameScreen = () => {
    const canContinue =
      form.firstName.trim().length > 0 && form.lastName.trim().length > 0;

    return (
      <>
        <Text style={[s.title, { color: colors.ink }]}>What's your name?</Text>
        <Text style={[s.subtitle, { color: colors.inkSecondary }]}>
          You can change this any time in settings
        </Text>

        <View style={s.fieldGroup}>
          <Text style={[s.label, { color: colors.ink }]}>First name</Text>
          <TextInput
            style={[
              s.input,
              {
                backgroundColor: colors.bgSubtle,
                color: colors.ink,
                borderColor: colors.border,
              },
            ]}
            value={form.firstName}
            onChangeText={t => updateForm({ firstName: t })}
            placeholder="First name"
            placeholderTextColor={colors.inkMuted}
            autoCapitalize="words"
            autoFocus
          />
        </View>

        <View style={s.fieldGroup}>
          <Text style={[s.label, { color: colors.ink }]}>Last name</Text>
          <TextInput
            style={[
              s.input,
              {
                backgroundColor: colors.bgSubtle,
                color: colors.ink,
                borderColor: colors.border,
              },
            ]}
            value={form.lastName}
            onChangeText={t => updateForm({ lastName: t })}
            placeholder="Last name"
            placeholderTextColor={colors.inkMuted}
            autoCapitalize="words"
          />
        </View>

        <View style={s.bottom}>
          <TouchableOpacity
            style={[
              s.cta,
              { backgroundColor: colors.cobalt },
              !canContinue && { opacity: 0.5 },
            ]}
            onPress={goNext}
            disabled={!canContinue}
            activeOpacity={0.85}
          >
            <Text style={[s.ctaText, { color: colors.white }]}>Continue</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  // ─── Screen 2: Birthday ────────────────────────────────────

  const BirthdayScreen = () => {
    const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
    const minAge = 13;
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - minAge);

    const canContinue =
      form.dateOfBirth !== null && form.dateOfBirth <= maxDate;

    const formatDate = (d: Date) =>
      d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

    return (
      <>
        <Text style={[s.title, { color: colors.ink }]}>
          When's your birthday?
        </Text>
        <Text style={[s.subtitle, { color: colors.inkSecondary }]}>
          Used to match you with age-appropriate events
        </Text>

        {Platform.OS === 'ios' ? (
          <View
            style={[
              s.datePickerContainer,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <DateTimePicker
              value={form.dateOfBirth || maxDate}
              mode="date"
              display="spinner"
              maximumDate={maxDate}
              minimumDate={new Date(1920, 0, 1)}
              onChange={(_, date) => {
                if (date) updateForm({ dateOfBirth: date });
              }}
              textColor={colors.ink}
            />
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[
                s.dateButton,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setShowPicker(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.inkSecondary}
              />
              <Text
                style={[
                  s.dateButtonText,
                  { color: form.dateOfBirth ? colors.ink : colors.inkMuted },
                ]}
              >
                {form.dateOfBirth
                  ? formatDate(form.dateOfBirth)
                  : 'Select your birthday'}
              </Text>
            </TouchableOpacity>
            {showPicker && (
              <DateTimePicker
                value={form.dateOfBirth || maxDate}
                mode="date"
                display="default"
                maximumDate={maxDate}
                minimumDate={new Date(1920, 0, 1)}
                onChange={(_, date) => {
                  setShowPicker(false);
                  if (date) updateForm({ dateOfBirth: date });
                }}
              />
            )}
          </>
        )}

        <View style={s.bottom}>
          <TouchableOpacity
            style={[
              s.cta,
              { backgroundColor: colors.cobalt },
              !canContinue && { opacity: 0.5 },
            ]}
            onPress={goNext}
            disabled={!canContinue}
            activeOpacity={0.85}
          >
            <Text style={[s.ctaText, { color: colors.white }]}>Continue</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  // ─── Screen 3: Location ────────────────────────────────────

  const LocationScreen = () => {
    const [loading, setLoading] = useState(false);
    const [confirmed, setConfirmed] = useState(!!form.locationCity);
    const [showManual, setShowManual] = useState(false);
    const [locError, setLocError] = useState<string | null>(null);

    const handleUseMyLocation = async () => {
      setLoading(true);
      setLocError(null);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocError('Location permission denied');
          setShowManual(true);
          setLoading(false);
          return;
        }
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const [geocode] = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        if (geocode) {
          updateForm({
            locationCity: geocode.city || geocode.subregion || '',
            locationState: geocode.region || '',
            locationLat: position.coords.latitude,
            locationLng: position.coords.longitude,
          });
          setConfirmed(true);
        } else {
          setLocError('Could not determine your location');
          setShowManual(true);
        }
      } catch {
        setLocError('Unable to get location');
        setShowManual(true);
      } finally {
        setLoading(false);
      }
    };

    return (
      <>
        <Text style={[s.title, { color: colors.ink }]}>Where do you play?</Text>
        <Text style={[s.subtitle, { color: colors.inkSecondary }]}>
          We'll show you games and facilities nearby
        </Text>

        {confirmed ? (
          <View style={[s.confirmedCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="checkmark-circle" size={32} color={colors.pine} />
            <Text style={[s.confirmedLabel, { color: colors.inkSecondary }]}>
              Looks like you're in
            </Text>
            <Text style={[s.confirmedCity, { color: colors.ink }]}>
              {form.locationCity}, {form.locationState}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setConfirmed(false);
                setShowManual(true);
              }}
            >
              <Text style={[s.linkText, { color: colors.cobalt }]}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : !showManual ? (
          <View style={s.locationActions}>
            <TouchableOpacity
              style={[s.cta, { backgroundColor: colors.cobalt }]}
              onPress={handleUseMyLocation}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons
                    name="location"
                    size={20}
                    color={colors.white}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[s.ctaText, { color: colors.white }]}>
                    Use My Location
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {locError && (
              <Text style={[s.errorText, { color: colors.error }]}>
                {locError}
              </Text>
            )}
            <TouchableOpacity onPress={() => setShowManual(true)}>
              <Text style={[s.linkText, { color: colors.cobalt }]}>
                Enter manually
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.fieldGroup}>
            <Text style={[s.label, { color: colors.ink }]}>City</Text>
            <TextInput
              style={[
                s.input,
                {
                  backgroundColor: colors.bgSubtle,
                  color: colors.ink,
                  borderColor: colors.border,
                },
              ]}
              value={form.locationCity}
              onChangeText={t => updateForm({ locationCity: t })}
              placeholder="Portland"
              placeholderTextColor={colors.inkMuted}
              autoCapitalize="words"
            />
            <Text style={[s.label, { color: colors.ink, marginTop: 16 }]}>
              State
            </Text>
            <TextInput
              style={[
                s.input,
                {
                  backgroundColor: colors.bgSubtle,
                  color: colors.ink,
                  borderColor: colors.border,
                },
              ]}
              value={form.locationState}
              onChangeText={t => updateForm({ locationState: t })}
              placeholder="ME"
              placeholderTextColor={colors.inkMuted}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              onPress={() => {
                setShowManual(false);
                setLocError(null);
              }}
              style={{ marginTop: 12 }}
            >
              <Text style={[s.linkText, { color: colors.cobalt }]}>
                Use my location instead
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.bottom}>
          <TouchableOpacity
            style={[s.cta, { backgroundColor: colors.cobalt }]}
            onPress={goNext}
            activeOpacity={0.85}
          >
            <Text style={[s.ctaText, { color: colors.white }]}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goNext} style={s.skipBtn}>
            <Text style={[s.skipText, { color: colors.inkSecondary }]}>
              Skip
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  // ─── Screen 4: Contact Info ────────────────────────────────

  const ContactScreen = () => (
    <>
      <Text style={[s.title, { color: colors.ink }]}>
        How can people reach you?
      </Text>
      <Text style={[s.subtitle, { color: colors.inkSecondary }]}>
        Your info is never shared without permission
      </Text>

      <View style={s.fieldGroup}>
        <Text style={[s.label, { color: colors.ink }]}>Phone number</Text>
        <TextInput
          style={[
            s.input,
            {
              backgroundColor: colors.bgSubtle,
              color: colors.ink,
              borderColor: colors.border,
            },
          ]}
          value={form.phoneNumber}
          onChangeText={t => updateForm({ phoneNumber: t })}
          placeholder="(207) 555-0100"
          placeholderTextColor={colors.inkMuted}
          keyboardType="phone-pad"
        />
      </View>

      <View style={s.fieldGroup}>
        <Text style={[s.label, { color: colors.ink }]}>Email</Text>
        <TextInput
          style={[
            s.input,
            {
              backgroundColor: colors.bgSubtle,
              color: isAppleRelay ? colors.inkMuted : colors.ink,
              borderColor: colors.border,
            },
          ]}
          value={form.email}
          onChangeText={t => {
            if (!isAppleRelay) updateForm({ email: t });
          }}
          placeholder="you@example.com"
          placeholderTextColor={colors.inkMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isAppleRelay}
        />
        {isAppleRelay && (
          <Text style={[s.relayNote, { color: colors.inkSecondary }]}>
            This is an Apple private relay address — you can add a real email
            later in settings
          </Text>
        )}
      </View>

      <View style={s.bottom}>
        <TouchableOpacity
          style={[s.cta, { backgroundColor: colors.cobalt }]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={[s.ctaText, { color: colors.white }]}>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goNext} style={s.skipBtn}>
          <Text style={[s.skipText, { color: colors.inkSecondary }]}>
            Skip for now
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // ─── Screen 5: Profile Photo ───────────────────────────────

  const PhotoScreen = () => {
    const handlePickImage = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        updateForm({ profileImage: result.assets[0].uri });
      }
    };

    return (
      <>
        <Text style={[s.title, { color: colors.ink }]}>Add a photo</Text>
        <Text style={[s.subtitle, { color: colors.inkSecondary }]}>
          Help teammates recognize you
        </Text>

        <View style={s.photoSection}>
          <TouchableOpacity onPress={handlePickImage} style={s.avatarContainer}>
            {form.profileImage ? (
              <Image
                source={{ uri: form.profileImage }}
                style={s.avatarImage}
              />
            ) : (
              <View
                style={[
                  s.avatarPlaceholder,
                  { backgroundColor: colors.bgSubtle },
                ]}
              >
                <Ionicons name="person" size={48} color={colors.inkMuted} />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.cta, { backgroundColor: colors.cobalt, marginTop: 24 }]}
            onPress={handlePickImage}
            activeOpacity={0.85}
          >
            <Ionicons
              name="camera-outline"
              size={20}
              color={colors.white}
              style={{ marginRight: 8 }}
            />
            <Text style={[s.ctaText, { color: colors.white }]}>
              Choose Photo
            </Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={[s.errorBanner, { backgroundColor: colors.errorLight }]}>
            <Text style={[s.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        <View style={s.bottom}>
          <TouchableOpacity
            style={[s.cta, { backgroundColor: colors.cobalt }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={[s.ctaText, { color: colors.white }]}>
                {form.profileImage ? 'Finish' : 'Skip & Finish'}
              </Text>
            )}
          </TouchableOpacity>
          {!form.profileImage && !saving && (
            <TouchableOpacity onPress={handleSave} style={s.skipBtn}>
              <Text style={[s.skipText, { color: colors.inkSecondary }]}>
                Skip for now
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </>
    );
  };

  // ─── Render ────────────────────────────────────────────────

  const screens = [
    NameScreen,
    BirthdayScreen,
    LocationScreen,
    ContactScreen,
    PhotoScreen,
  ];
  const CurrentScreen = screens[step];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.container}>
          {/* Top bar */}
          <View style={s.topBar}>
            {step > 0 ? (
              <TouchableOpacity
                onPress={goBack}
                style={s.backBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="arrow-back" size={24} color={colors.ink} />
              </TouchableOpacity>
            ) : (
              <View style={s.backBtn} />
            )}
            <ProgressDots />
            <View style={s.backBtn} />
          </View>

          {/* Screen content */}
          <Animated.View style={[s.screenContent, { opacity: fadeAnim }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <CurrentScreen />
            </ScrollView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 28 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    borderRadius: 4,
  },
  screenContent: { flex: 1 },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: tokenFontFamily.heading,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: tokenFontFamily.uiRegular,
    lineHeight: 24,
    marginBottom: 40,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: tokenFontFamily.uiSemiBold,
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  input: {
    borderRadius: tokenRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: tokenFontFamily.uiRegular,
  },
  relayNote: {
    fontSize: 13,
    fontFamily: tokenFontFamily.uiRegular,
    lineHeight: 18,
    marginTop: 8,
    fontStyle: 'italic',
  },
  datePickerContainer: {
    borderRadius: tokenRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: tokenRadius.lg,
    borderWidth: 2,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 10,
    marginBottom: 20,
  },
  dateButtonText: {
    fontSize: 16,
    fontFamily: tokenFontFamily.uiRegular,
  },
  bottom: {
    marginTop: 'auto' as any,
    paddingTop: 24,
    alignItems: 'center',
    gap: 12,
  },
  cta: {
    borderRadius: 9999,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
    alignSelf: 'stretch',
    flexDirection: 'row',
  },
  ctaText: {
    fontSize: 18,
    fontFamily: tokenFontFamily.uiBold,
    letterSpacing: -0.1,
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 15,
    fontFamily: tokenFontFamily.uiSemiBold,
  },
  linkText: {
    fontSize: 15,
    fontFamily: tokenFontFamily.uiSemiBold,
    textAlign: 'center',
    paddingVertical: 8,
  },
  locationActions: {
    alignItems: 'center',
    gap: 20,
  },
  confirmedCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  confirmedLabel: {
    fontSize: 15,
    fontFamily: tokenFontFamily.uiRegular,
  },
  confirmedCity: {
    fontSize: 22,
    fontFamily: tokenFontFamily.heading,
    letterSpacing: -0.3,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 160,
    height: 160,
  },
  avatarPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    borderRadius: tokenRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: tokenFontFamily.uiRegular,
    textAlign: 'center',
  },
});
