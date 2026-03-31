import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { WizardProgressDots } from '../../../components/wizard/WizardProgressDots';
import { useCreateRoster } from './CreateRosterContext';
import { colors, fonts } from '../../../theme';

interface Props {
  children: React.ReactNode;
  onSubmit: () => void;
}

function canContinue(state: any, step: number): boolean {
  switch (step) {
    case 0: return false; // auto-advance on sport tap
    case 1: return state.name.trim().length >= 2 && parseInt(state.maxPlayers) > 0;
    case 2: return true; // invites are optional
    default: return false;
  }
}

export function RosterFlowContainer({ children, onSubmit }: Props) {
  const { state, dispatch } = useCreateRoster();
  const { currentStep } = state;
  const childArray = React.Children.toArray(children);
  const enabled = canContinue(state, currentStep);
  const isLastStep = currentStep === 2;
  const showButton = currentStep > 0;

  const handlePress = () => {
    if (isLastStep) onSubmit();
    else dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.dotsContainer}>
        <WizardProgressDots current={currentStep} total={3} />
      </View>
      <View style={styles.stageContainer}>
        {childArray[currentStep]}
      </View>
      {showButton && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, !enabled && styles.buttonDisabled]}
            onPress={handlePress}
            disabled={!enabled || state.isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {state.isSubmitting ? 'Creating...' : isLastStep ? 'Create Roster' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  dotsContainer: { paddingVertical: 12 },
  stageContainer: { flex: 1 },
  buttonContainer: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 },
  button: {
    backgroundColor: colors.cobalt, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: colors.inkSoft, opacity: 0.5 },
  buttonText: { color: colors.white, fontFamily: fonts.ui, fontSize: 16 },
});
