import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { WizardProgressDots } from '../../../components/wizard/WizardProgressDots';
import { useCreateLeague } from './CreateLeagueContext';
import { LeagueWizardState } from './types';
import { colors, fonts } from '../../../theme';

interface Props {
  children: React.ReactNode;
  onSubmit: () => void;
}

function canContinue(state: LeagueWizardState, step: number): boolean {
  switch (step) {
    case 0:
      return false; // auto-advance on sport tap
    case 1:
      return (
        state.hostName.trim().length >= 2 &&
        state.leagueFormat !== null &&
        state.frequency !== null &&
        state.startDate !== null &&
        !!state.timeStart &&
        !!state.timeEnd &&
        (state.frequency === 'block'
          ? state.endDate !== null
          : state.gameDays.length > 0) &&
        (state.leagueFormat !== 'tournament'
          ? !!state.gamesPerRound && !!state.numberOfRounds
          : true)
      );
    case 2:
      return true; // preview is read-only
    case 3:
      return state.visibility !== null;
    default:
      return false;
  }
}

export function LeagueFlowContainer({ children, onSubmit }: Props) {
  const { state, dispatch } = useCreateLeague();
  const { currentStep } = state;
  const childArray = React.Children.toArray(children);
  const enabled = canContinue(state, currentStep);
  const isLastStep = currentStep === 3;
  const showButton = currentStep > 0;

  const handlePress = () => {
    if (isLastStep) onSubmit();
    else dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.dotsContainer}>
        <WizardProgressDots current={currentStep} total={4} />
      </View>
      <View style={styles.stageContainer}>{childArray[currentStep]}</View>
      {showButton && (
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
                  ? 'Create League'
                  : 'Continue'}
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
    backgroundColor: colors.cobalt,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: colors.inkSoft, opacity: 0.5 },
  buttonText: { color: colors.white, fontFamily: fonts.ui, fontSize: 16 },
});
