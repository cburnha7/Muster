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
import { useCreateRoster } from './CreateRosterContext';
import { fonts, useTheme } from '../../../theme';

interface Props {
  children: React.ReactNode;
  onSubmit: () => void;
}

function canContinue(state: any, step: number): boolean {
  switch (step) {
    case 0:
      return false;
    case 1:
      return state.name.trim().length >= 2 && parseInt(state.maxPlayers) > 0;
    case 2:
      return true;
    default:
      return false;
  }
}

export function RosterFlowContainer({ children, onSubmit }: Props) {
  const { colors } = useTheme();
  const { state, dispatch } = useCreateRoster();
  const navigation = useNavigation();
  const { currentStep } = state;
  const childArray = React.Children.toArray(children);
  const enabled = canContinue(state, currentStep);
  const isLastStep = currentStep === 2;
  const showButton = currentStep > 0;

  const handleBack = () => {
    if (currentStep === 0) navigation.goBack();
    else dispatch({ type: 'PREV_STEP' });
  };

  const handlePress = () => {
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
          <WizardProgressDots current={currentStep} total={3} />
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
              style={[styles.button, { backgroundColor: colors.cobalt }, !enabled && styles.buttonDisabled, !enabled && { backgroundColor: colors.inkSoft }]}
              onPress={handlePress}
              disabled={!enabled || state.isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, { color: colors.white }]}>
                {state.isSubmitting
                  ? 'Creating...'
                  : isLastStep
                    ? 'Create Roster'
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
  root: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: { width: 40, alignItems: 'center' },
  dotsWrapper: { flex: 1 },
  stageContainer: { flex: 1 },
  buttonContainer: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontFamily: fonts.ui, fontSize: 16 },
});
