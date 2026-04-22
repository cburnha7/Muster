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
// Types imported from navigation/types

const TOTAL_STEPS = 5;

const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;

interface PersonaConfig {
  title: string;
  description: string;
  actionLabel: string;
  laterLabel: string;
  routeFlag: string;
}

const PERSONA_CONFIGS: Record<string, PersonaConfig> = {
  CAPTAIN: {
    title: 'Ready to create your first team?',
    description:
      'Set up your team now so you can start inviting players and scheduling games right away.',
    actionLabel: 'Set up team',
    laterLabel: "I'll do this later",
    routeFlag: 'createTeam',
  },
  GUARDIAN: {
    title: 'Add your first child',
    description:
      "Add your child's profile so you can manage their sports schedules, RSVPs, and more.",
    actionLabel: 'Add a child',
    laterLabel: "I'll do this later",
    routeFlag: 'addDependent',
  },
  COMMISSIONER: {
    title: 'What kind of league?',
    description:
      'Start setting up your league with seasons, divisions, and scheduling.',
    actionLabel: 'Set up league',
    laterLabel: "I'll do this later",
    routeFlag: 'createLeague',
  },
  FACILITY_OWNER: {
    title: 'Tell us about your facility',
    description:
      'Add your courts and availability so players can find and book your space.',
    actionLabel: 'Add facility',
    laterLabel: "I'll do this later",
    routeFlag: 'createFacility',
  },
};

export const PersonaSetupScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const intents: string[] = route.params?.intents ?? [];
  const sports: string[] = route.params?.sports ?? [];
  const locationCity: string | undefined = route.params?.locationCity;
  const locationState: string | undefined = route.params?.locationState;
  const locationLat: number | undefined = route.params?.locationLat;
  const locationLng: number | undefined = route.params?.locationLng;

  const primaryIntent = intents[0] ?? 'PLAYER';
  const personaConfig = PERSONA_CONFIGS[primaryIntent];
  const isSkillLevelMode = !personaConfig;

  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [postOnboardingRoute, setPostOnboardingRoute] = useState<string | null>(
    null
  );

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const navigateToFinish = (
    routeFlag: string | null,
    _skill: string | null
  ) => {
    navigation.navigate('ProfileFinish', {
      intents,
      sports,
      ...(locationCity ? { locationCity } : {}),
      ...(locationState ? { locationState } : {}),
      ...(locationLat != null ? { locationLat } : {}),
      ...(locationLng != null ? { locationLng } : {}),
      ...(routeFlag ? { personaAction: routeFlag } : {}),
    });
  };

  const handleContinue = () => {
    navigateToFinish(postOnboardingRoute, selectedSkill);
  };

  const handleActionButton = () => {
    if (personaConfig) {
      navigateToFinish(personaConfig.routeFlag, null);
    }
  };

  const handleLater = () => {
    navigateToFinish(null, null);
  };

  const handleSkip = () => {
    navigateToFinish(null, null);
  };

  const handleBack = () => {
    navigation.goBack();
  };

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
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </TouchableOpacity>

          <View style={styles.progressBar}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[styles.progressDot, { backgroundColor: colors.border }, i <= 3 && styles.progressDotActive]}
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
            {/* Skill level picker mode */}
            {isSkillLevelMode && (
              <>
                <Text style={[styles.title, { color: colors.ink }]}>How would you rate yourself?</Text>
                <Text style={[styles.subtitle, { color: colors.inkSecondary }]}>
                  This helps us match you with the right games
                </Text>

                <View style={styles.skillChips}>
                  {SKILL_LEVELS.map(level => {
                    const isSelected = selectedSkill === level;
                    return (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.skillChip,
                          isSelected && styles.skillChipSelected,
                        ]}
                        onPress={() =>
                          setSelectedSkill(isSelected ? null : level)
                        }
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.skillChipText,
                            isSelected && styles.skillChipTextSelected,
                          ]}
                        >
                          {level}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Persona-specific mode */}
            {!isSkillLevelMode && personaConfig && (
              <>
                <Text style={[styles.title, { color: colors.ink }]}>{personaConfig.title}</Text>
                <Text style={[styles.subtitle, { color: colors.inkSecondary }]}>{personaConfig.description}</Text>

                <View style={styles.personaActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.cobalt }]}
                    onPress={handleActionButton}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.white }]}>
                      {personaConfig.actionLabel}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.laterButton, { backgroundColor: colors.surface }]}
                    onPress={handleLater}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.laterButtonText, { color: colors.inkSecondary }]}>
                      {personaConfig.laterLabel}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </Animated.View>

        {/* Bottom */}
        <View style={styles.bottomSection}>
          {isSkillLevelMode && (
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: colors.cobalt }]}
              onPress={handleContinue}
              activeOpacity={0.85}
            >
              <Text style={[styles.continueButtonText, { color: colors.white }]}>Continue</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleSkip} style={styles.skipLink}>
            <Text style={[styles.skipLinkText, { color: colors.inkSecondary }]}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
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

  // Skill level chips
  skillChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  skillChip: {
    borderRadius: 9999,
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  skillChipSelected: {},
  skillChipText: {
    fontSize: 16,
    fontFamily: fonts.headingSemi,
  },
  skillChipTextSelected: {},

  // Persona actions
  personaActions: {
    gap: 16,
  },
  actionButton: {
    borderRadius: 9999,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
  },
  actionButtonText: {
    fontSize: 18,
    fontFamily: fonts.ui,
    letterSpacing: -0.1,
  },
  laterButton: {
    borderRadius: 9999,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
  },
  laterButtonText: {
    fontSize: 18,
    fontFamily: fonts.ui,
    letterSpacing: -0.1,
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
