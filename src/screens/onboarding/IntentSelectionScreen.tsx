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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, useTheme } from '../../theme';
import type { OnboardingIntent } from '../../navigation/types';

const TOTAL_STEPS = 5;

interface IntentOption {
  key: OnboardingIntent;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

const INTENT_OPTIONS: IntentOption[] = [
  {
    key: 'PLAYER',
    icon: 'basketball-outline',
    title: 'Find games to play',
    subtitle: 'Browse and join pickup games near me',
  },
  {
    key: 'CAPTAIN',
    icon: 'clipboard-outline',
    title: 'Organize my team',
    subtitle: 'Manage rosters and schedule games',
  },
  {
    key: 'GUARDIAN',
    icon: 'people-outline',
    title: "Manage my kid's sports",
    subtitle: 'Schedules, RSVPs, and logistics',
  },
  {
    key: 'COMMISSIONER',
    icon: 'trophy-outline',
    title: 'Run a league',
    subtitle: 'Organize seasons, standings, and playoffs',
  },
  {
    key: 'FACILITY_OWNER',
    icon: 'business-outline',
    title: 'List my facility',
    subtitle: 'Manage courts, bookings, and availability',
  },
];

export const IntentSelectionScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [selected, setSelected] = useState<OnboardingIntent[]>([]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const toggleIntent = (key: OnboardingIntent) => {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleContinue = () => {
    if (selected.length === 0) return;
    navigation.navigate('SportSelection', { intents: selected });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const canContinue = selected.length > 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgScreen }]}
    >
      <View style={styles.content}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>

          <View style={styles.progressBar}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i === 0 && styles.progressDotActive,
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
          >
            <Text style={styles.title}>What brings you to Muster?</Text>
            <Text style={styles.subtitle}>
              Select all that apply. This shapes your experience.
            </Text>

            <View style={styles.cardList}>
              {INTENT_OPTIONS.map(option => {
                const isSelected = selected.includes(option.key);
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.intentCard,
                      isSelected && styles.intentCardSelected,
                    ]}
                    onPress={() => toggleIntent(option.key)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        isSelected && styles.iconContainerSelected,
                      ]}
                    >
                      <Ionicons
                        name={option.icon}
                        size={24}
                        color={isSelected ? colors.white : colors.primary}
                      />
                    </View>
                    <View style={styles.cardTextContainer}>
                      <Text
                        style={[
                          styles.cardTitle,
                          isSelected && styles.cardTitleSelected,
                        ]}
                      >
                        {option.title}
                      </Text>
                      <Text
                        style={[
                          styles.cardSubtitle,
                          isSelected && styles.cardSubtitleSelected,
                        ]}
                      >
                        {option.subtitle}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.checkCircle,
                        isSelected && styles.checkCircleSelected,
                      ]}
                    >
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color={colors.white}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </Animated.View>

        {/* Bottom CTA */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !canContinue && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!canContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

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
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.onSurface,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.onSurfaceVariant,
    lineHeight: 24,
    marginBottom: 32,
  },
  cardList: {
    gap: 12,
  },
  intentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  intentCardSelected: {
    backgroundColor: colors.primary,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: fonts.headingSemi,
    color: colors.onSurface,
    marginBottom: 2,
  },
  cardTitleSelected: {
    color: colors.white,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  cardSubtitleSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  bottomSection: {
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    paddingTop: 12,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 18,
    fontFamily: fonts.ui,
    color: colors.white,
    letterSpacing: -0.1,
  },
});
