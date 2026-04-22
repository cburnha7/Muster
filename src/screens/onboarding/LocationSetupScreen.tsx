import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { fonts, useTheme } from '../../theme';
// Types imported from navigation/types

const TOTAL_STEPS = 5;

export const LocationSetupScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const intents: string[] = route.params?.intents ?? [];
  const sports: string[] = route.params?.sports ?? [];

  const [locationLoading, setLocationLoading] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleUseMyLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setLocationError('Location permission denied');
        setShowManualEntry(true);
        setLocationLoading(false);
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
        setCity(geocode.city || geocode.subregion || '');
        setState(geocode.region || '');
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocationConfirmed(true);
      } else {
        setLocationError('Could not determine your location');
        setShowManualEntry(true);
      }
    } catch {
      setLocationError('Unable to get location');
      setShowManualEntry(true);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleContinue = () => {
    navigation.navigate('PersonaSetup', {
      intents,
      sports,
      ...(city ? { locationCity: city } : {}),
      ...(state ? { locationState: state } : {}),
      ...(latitude != null ? { locationLat: latitude } : {}),
      ...(longitude != null ? { locationLng: longitude } : {}),
    });
  };

  const handleSkip = () => {
    navigation.navigate('PersonaSetup', { intents, sports });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgScreen }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.ink} />
            </TouchableOpacity>

            <View style={styles.progressBar}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    i <= 2 && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>

            <View style={styles.backButton} />
          </View>

          {/* Content */}
          <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.title, { color: colors.ink }]}>Where do you play?</Text>
              <Text style={[styles.subtitle, { color: colors.inkSecondary }]}>
                We'll show you games and facilities nearby
              </Text>

              {/* Location confirmed state */}
              {locationConfirmed && (
                <View style={[styles.confirmedCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.confirmedIconRow}>
                    <View style={styles.confirmedIcon}>
                      <Ionicons
                        name="checkmark-circle"
                        size={32}
                        color={colors.pine}
                      />
                    </View>
                  </View>
                  <Text style={[styles.confirmedText, { color: colors.inkSecondary }]}>Looks like you're in</Text>
                  <Text style={[styles.confirmedLocation, { color: colors.ink }]}>
                    {city}, {state}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setLocationConfirmed(false);
                      setShowManualEntry(true);
                    }}
                    style={styles.changeLink}
                  >
                    <Text style={[styles.changeLinkText, { color: colors.cobalt }]}>Change</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Primary action: Use My Location */}
              {!locationConfirmed && !showManualEntry && (
                <View style={styles.locationActions}>
                  <TouchableOpacity
                    style={[styles.locationButton, { backgroundColor: colors.cobalt }]}
                    onPress={handleUseMyLocation}
                    disabled={locationLoading}
                    activeOpacity={0.85}
                  >
                    {locationLoading ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Ionicons
                        name="location"
                        size={22}
                        color={colors.white}
                        style={styles.locationButtonIcon}
                      />
                    )}
                    <Text style={[styles.locationButtonText, { color: colors.white }]}>
                      {locationLoading ? 'Finding you...' : 'Use My Location'}
                    </Text>
                  </TouchableOpacity>

                  {locationError && (
                    <Text style={[styles.errorText, { color: colors.error }]}>{locationError}</Text>
                  )}

                  <TouchableOpacity
                    onPress={() => setShowManualEntry(true)}
                    style={styles.manualLink}
                  >
                    <Text style={[styles.manualLinkText, { color: colors.cobalt }]}>Enter manually</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Manual entry */}
              {!locationConfirmed && showManualEntry && (
                <View style={styles.manualFields}>
                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.inkSecondary }]}>City</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: colors.bgSubtle, color: colors.ink }]}
                      value={city}
                      onChangeText={setCity}
                      placeholder="San Francisco"
                      placeholderTextColor={colors.inkSecondary}
                      autoCapitalize="words"
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.inkSecondary }]}>State</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: colors.bgSubtle, color: colors.ink }]}
                      value={state}
                      onChangeText={setState}
                      placeholder="CA"
                      placeholderTextColor={colors.inkSecondary}
                      autoCapitalize="characters"
                    />
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setShowManualEntry(false);
                      setLocationError(null);
                    }}
                    style={styles.manualLink}
                  >
                    <Text style={[styles.manualLinkText, { color: colors.cobalt }]}>
                      Use my location instead
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </Animated.View>

          {/* Bottom */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: colors.cobalt }]}
              onPress={handleContinue}
              activeOpacity={0.85}
            >
              <Text style={[styles.continueButtonText, { color: colors.white }]}>Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSkip} style={styles.skipLink}>
              <Text style={[styles.skipLinkText, { color: colors.inkSecondary }]}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressDotActive: {
    width: 24,
    borderRadius: 4,
  },
  inner: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.heading,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fonts.body,
    lineHeight: 24,
    marginBottom: 40,
  },

  // Location actions
  locationActions: {
    alignItems: 'center',
    gap: 20,
  },
  locationButton: {
    flexDirection: 'row',
    borderRadius: 9999,
    paddingVertical: 18,
    paddingHorizontal: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    minHeight: 58,
  },
  locationButtonIcon: {
    marginRight: 10,
  },
  locationButtonText: {
    fontSize: 18,
    fontFamily: fonts.ui,
    letterSpacing: -0.1,
  },
  errorText: {
    fontSize: 14,
    fontFamily: fonts.body,
    textAlign: 'center',
  },
  manualLink: {
    paddingVertical: 8,
  },
  manualLinkText: {
    fontSize: 15,
    fontFamily: fonts.headingSemi,
    textAlign: 'center',
  },

  // Confirmed state
  confirmedCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  confirmedIconRow: {
    marginBottom: 16,
  },
  confirmedIcon: {},
  confirmedText: {
    fontSize: 15,
    fontFamily: fonts.body,
    marginBottom: 4,
  },
  confirmedLocation: {
    fontSize: 22,
    fontFamily: fonts.heading,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  changeLink: {
    paddingVertical: 4,
  },
  changeLinkText: {
    fontSize: 14,
    fontFamily: fonts.headingSemi,
  },

  // Manual entry
  manualFields: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: fonts.label,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  textInput: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: fonts.body,
  },

  // Bottom
  bottomSection: {
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    paddingTop: 12,
    alignItems: 'center',
    gap: 12,
  },
  continueButton: {
    borderRadius: 9999,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
    alignSelf: 'stretch',
  },
  continueButtonText: {
    fontSize: 18,
    fontFamily: fonts.ui,
    letterSpacing: -0.1,
  },
  skipLink: {
    paddingVertical: 8,
  },
  skipLinkText: {
    fontSize: 15,
    fontFamily: fonts.headingSemi,
  },
});
