import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../../theme';
import { formatSportType } from '../../utils/formatters';
import { completeOnboarding } from '../../store/slices/authSlice';
import type { OnboardingData } from '../../types/auth';

const TOTAL_STEPS = 5;

export const ProfileFinishScreen: React.FC = () => {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const dispatch = useDispatch();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const intents: string[] = route.params?.intents ?? [];
  const sports: string[] = route.params?.sports ?? [];
  const locationCity: string | undefined = route.params?.locationCity;
  const locationState: string | undefined = route.params?.locationState;
  const locationLat: number | undefined = route.params?.locationLat;
  const locationLng: number | undefined = route.params?.locationLng;
  const personaAction: string | undefined = route.params?.personaAction;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleFinish = async () => {
    setLoading(true);
    setError(null);

    try {
      const data: OnboardingData = {
        intents: intents as OnboardingData['intents'],
        sportPreferences: sports,
        ...(locationCity ? { locationCity } : {}),
        ...(locationState ? { locationState } : {}),
        ...(locationLat != null ? { locationLat } : {}),
        ...(locationLng != null ? { locationLng } : {}),
      };

      await (dispatch as any)(completeOnboarding(data)).unwrap();
      // Navigation happens automatically: RootNavigator re-evaluates
      // user.onboardingComplete and switches to MainTabs
    } catch (err: any) {
      setError(
        err?.message || err || 'Something went wrong. Please try again.'
      );
      setLoading(false);
    }
  };

  // Summary items for the recap
  const summaryItems: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  }[] = [];

  if (intents.length > 0) {
    const intentLabel =
      intents.length === 1
        ? intentDisplayName(intents[0])
        : `${intents.length} roles selected`;
    summaryItems.push({ icon: 'person-outline', label: intentLabel });
  }

  if (sports.length > 0) {
    const sportLabel =
      sports.length === 1 ? capitalize(sports[0]) : `${sports.length} sports`;
    summaryItems.push({ icon: 'basketball-outline', label: sportLabel });
  }

  if (locationCity) {
    summaryItems.push({
      icon: 'location-outline',
      label: locationState ? `${locationCity}, ${locationState}` : locationCity,
    });
  }

  if (personaAction) {
    summaryItems.push({
      icon: 'rocket-outline',
      label: `Next: ${personaAction}`,
    });
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgScreen }]}
    >
      <View style={styles.content}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.backButton} />

          <View style={styles.progressBar}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[styles.progressDot, styles.progressDotActive]}
              />
            ))}
          </View>

          <View style={styles.backButton} />
        </View>

        {/* Content */}
        <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="checkmark-circle"
                size={64}
                color={colors.secondary}
              />
            </View>
            <Text style={styles.title}>You're all set!</Text>
            <Text style={styles.subtitle}>
              Here's a quick recap of your setup
            </Text>
          </View>

          {summaryItems.length > 0 && (
            <View style={styles.summaryCard}>
              {summaryItems.map((item, index) => (
                <View key={index} style={styles.summaryRow}>
                  <View style={styles.summaryIconCircle}>
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </Animated.View>

        {/* Bottom CTA */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[styles.finishButton, loading && styles.finishButtonLoading]}
            onPress={handleFinish}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.finishButtonText}>Let's go</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

function intentDisplayName(intent: string): string {
  const map: Record<string, string> = {
    PLAYER: 'Player',
    CAPTAIN: 'Team Captain',
    GUARDIAN: 'Guardian',
    COMMISSIONER: 'Commissioner',
    FACILITY_OWNER: 'Facility Owner',
  };
  return map[intent] || intent;
}

function capitalize(str: string): string {
  return formatSportType(str);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.outlineVariant,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
    width: 24,
    borderRadius: 4,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  heroIcon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.onSurface,
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.onSurfaceVariant,
    lineHeight: 24,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  summaryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.onSurface,
    flex: 1,
  },
  errorContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.errorContainer,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.onErrorContainer,
    textAlign: 'center',
  },
  bottomSection: {
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    paddingTop: 12,
  },
  finishButton: {
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
  },
  finishButtonLoading: {
    opacity: 0.8,
  },
  finishButtonText: {
    fontSize: 18,
    fontFamily: fonts.ui,
    color: colors.white,
    letterSpacing: -0.1,
  },
});
