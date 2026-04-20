import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { WizardProgressDots } from '../../../components/wizard/WizardProgressDots';
import { useCreateEvent } from './CreateEventContext';
import { canContinue } from './validation';
import { fonts, useTheme } from '../../../theme';

interface EventFlowContainerProps {
  children: React.ReactNode;
  onSubmit: () => void;
}

export function EventFlowContainer({
  children,
  onSubmit,
}: EventFlowContainerProps) {
  const { colors } = useTheme();
  const { state, dispatch } = useCreateEvent();
  const navigation = useNavigation();
  const { currentStep } = state;

  const childArray = React.Children.toArray(children);
  const enabled = canContinue(state, currentStep);
  const isLastStep = currentStep === 4;
  const showButton = currentStep > 0;

  const handleBack = () => {
    if (currentStep === 0) navigation.goBack();
    else dispatch({ type: 'PREV_STEP' });
  };

  const handlePress = () => {
    if (state.isSubmitting) return; // prevent double tap
    if (isLastStep) onSubmit();
    else dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.white }, { backgroundColor: colors.bgScreen }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.dotsWrapper}>
          <WizardProgressDots current={currentStep} total={5} />
        </View>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.stageContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.stageContainer}>{childArray[currentStep]}</View>

        {showButton && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button, { backgroundColor: colors.cobalt },
                (!enabled || state.isSubmitting) && styles.buttonDisabled, (!enabled || state.isSubmitting) && { backgroundColor: colors.inkSoft }]}
              onPress={handlePress}
              disabled={!enabled || state.isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, { color: colors.white }]}>
                {state.isSubmitting
                  ? 'Creating...'
                  : isLastStep
                    ? 'Create Event'
                    : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: {
    width: 40,
    alignItems: 'center',
  },
  dotsWrapper: {
    flex: 1,
  },
  stageContainer: {
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontFamily: fonts.ui,
    fontSize: 16,
  },
});
