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
import { useCreateFacility } from './CreateFacilityContext';
import { FacilityWizardState } from './types';
import { colors, fonts } from '../../../theme';

interface FacilityFlowContainerProps {
  children: React.ReactNode;
  onSubmit: () => void;
}

function canContinue(state: FacilityWizardState, step: number): boolean {
  switch (step) {
    case 0:
      return state.name.trim().length >= 2 && state.sportTypes.length > 0;
    case 1:
      return (
        !!state.street.trim() &&
        !!state.city.trim() &&
        !!state.state.trim() &&
        !!state.zipCode.trim()
      );
    case 2:
      return true; // contact is optional
    case 3:
      return true; // courts are optional
    case 4:
      return true; // policies are optional
    default:
      return false;
  }
}

export function FacilityFlowContainer({
  children,
  onSubmit,
}: FacilityFlowContainerProps) {
  const { state, dispatch } = useCreateFacility();
  const navigation = useNavigation();
  const { currentStep } = state;

  const childArray = React.Children.toArray(children);
  const enabled = canContinue(state, currentStep);
  const isLastStep = currentStep === 4;

  const handlePress = () => {
    if (isLastStep) onSubmit();
    else dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.headerRow}>
        <View style={styles.backBtn} />
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

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, !enabled && styles.buttonDisabled]}
            onPress={handlePress}
            disabled={!enabled || state.isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {state.isSubmitting
                ? 'Creating...'
                : isLastStep
                  ? 'Create Ground'
                  : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: { width: 40, alignItems: 'center' as const },
  dotsWrapper: { flex: 1 },
  stageContainer: { flex: 1 },
  buttonContainer: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 },
  button: {
    backgroundColor: colors.pine,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: colors.inkSoft, opacity: 0.5 },
  buttonText: { color: colors.white, fontFamily: fonts.ui, fontSize: 16 },
});
