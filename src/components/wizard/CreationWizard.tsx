import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { tokenColors } from '../../theme/tokens';
import { WizardProgressDots } from './WizardProgressDots';

const SCREEN_WIDTH = Dimensions.get('window').width;

export interface WizardStep {
  key: string;
  headline: string;
  subtitle?: string;
  content: React.ReactNode;
  /** Return true if all required fields in this step are filled */
  validate?: () => boolean;
}

interface CreationWizardProps {
  steps: WizardStep[];
  onComplete: () => void;
  onBack?: () => void;
  isSubmitting: boolean;
  submitLabel?: string;
  /** If true, show the success screen (render via successScreen prop) */
  showSuccess: boolean;
  successScreen?: React.ReactNode;
}

export function CreationWizard({
  steps,
  onComplete,
  onBack,
  isSubmitting,
  submitLabel = 'Create',
  showSuccess,
  successScreen,
}: CreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const isLastStep = currentStep === steps.length - 1;
  const step = steps[currentStep];
  const canAdvance = step?.validate ? step.validate() : true;

  const animateTransition = useCallback(
    (direction: 'forward' | 'back', callback: () => void) => {
      const toValue = direction === 'forward' ? -SCREEN_WIDTH : SCREEN_WIDTH;
      Animated.timing(slideAnim, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        callback();
        slideAnim.setValue(
          direction === 'forward' ? SCREEN_WIDTH : -SCREEN_WIDTH
        );
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    },
    [slideAnim]
  );

  const handleNext = useCallback(() => {
    if (!canAdvance) return;
    if (isLastStep) {
      onComplete();
      return;
    }
    animateTransition('forward', () => {
      setCurrentStep(prev => prev + 1);
    });
  }, [canAdvance, isLastStep, onComplete, animateTransition]);

  const handleBack = useCallback(() => {
    if (currentStep === 0) {
      onBack?.();
      return;
    }
    animateTransition('back', () => {
      setCurrentStep(prev => prev - 1);
    });
  }, [currentStep, onBack, animateTransition]);

  if (showSuccess && successScreen) {
    return (
      <SafeAreaView style={styles.container}>{successScreen}</SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top bar: back + progress */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.75}
          >
            <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>

          <WizardProgressDots total={steps.length} current={currentStep} />

          <View style={styles.backButton} />
        </View>

        {/* Step content */}
        <Animated.View
          style={[
            styles.stepContainer,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          {step && (
            <>
              <Text style={styles.headline}>{step.headline}</Text>
              {step.subtitle && (
                <Text style={styles.subtitle}>{step.subtitle}</Text>
              )}
              <View style={styles.stepContent}>{step.content}</View>
            </>
          )}
        </Animated.View>

        {/* Bottom button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[
              styles.continueBtn,
              (!canAdvance || isSubmitting) && styles.continueBtnDisabled,
            ]}
            onPress={handleNext}
            disabled={!canAdvance || isSubmitting}
            activeOpacity={0.7}
          >
            {isSubmitting ? (
              <ActivityIndicator color={tokenColors.white} size="small" />
            ) : (
              <Text style={styles.continueBtnText}>
                {isLastStep ? submitLabel : 'Continue'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Export goToStep helper type for review screens
export type WizardGoToStep = (index: number) => void;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },

  // ── Top bar ───────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Step content ──────────────────────
  stepContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headline: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: colors.onSurface,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurfaceVariant,
    marginBottom: 8,
    lineHeight: 21,
  },
  stepContent: {
    flex: 1,
    paddingTop: 20,
  },

  // ── Bottom bar ────────────────────────
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 8 : 20,
    paddingTop: 12,
  },
  continueBtn: {
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: {
    opacity: 0.4,
  },
  continueBtnText: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: tokenColors.white,
  },
});
