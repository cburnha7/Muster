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
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../../theme';
import { SportIconGrid } from '../../components/wizard/SportIconGrid';
import type { OnboardingIntent } from '../../navigation/types';

const TOTAL_STEPS = 5;
const HORIZONTAL_PAD = 24;

export const SportSelectionScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [selected, setSelected] = useState<string[]>([]);

  const intents: OnboardingIntent[] = route.params?.intents ?? [];
  const isGuardian = intents.includes('GUARDIAN');

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const toggleSport = (key: string) => {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleContinue = () => {
    if (selected.length === 0) return;
    navigation.navigate('LocationSetup', { intents, sports: selected });
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
                style={[styles.progressDot, i <= 1 && styles.progressDotActive]}
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
            <Text style={styles.title}>
              {isGuardian ? 'Sports your kids play' : 'Sports you play'}
            </Text>
            <Text style={styles.subtitle}>
              We'll personalize your feed and recommendations
            </Text>

            <SportIconGrid
              selected={selected}
              onSelect={toggleSport}
              multiSelect
            />
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
    paddingHorizontal: HORIZONTAL_PAD,
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
