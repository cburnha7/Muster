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
import { useCreateLeague } from './CreateLeagueContext';
import { LeagueWizardState } from './types';
import { fonts, useTheme } from '../../../theme';

interface Props {
  children: React.ReactNode;
  onSubmit: () => void;
}

function canContinue(state: LeagueWizardState, step: number): boolean {
  switch (step) {
    case 0:
      return false; // auto-advance on sport tap
    case 1: {
      // Screen 2 — How: host name, format, game days, frequency, number of games
      const hasHost = state.hostName.trim().length >= 2;
      const hasFormat = state.leagueFormat !== null;
      const hasDays = state.gameDays.length > 0;
      const hasFreq = state.frequency !== null;
      const hasGames = parseInt(state.numberOfGames) > 0;
      const hasGpp =
        state.frequency === 'block' || parseInt(state.gamesPerPeriod) > 0;
      return hasHost && hasFormat && hasDays && hasFreq && hasGames && hasGpp;
    }
    case 2: {
      // Screen 3 — Who: visibility required, private needs exact team count
      const hasTeams = parseInt(state.numberOfTeams) > 0;
      const hasVis = state.visibility !== null;
      if (!hasTeams || !hasVis) return false;
      if (state.visibility === 'private') {
        const required = parseInt(state.numberOfTeams) || 0;
        return state.invitedRosters.length >= required;
      }
      return true;
    }
    case 3:
      // Screen 4 — Schedule Preview: start date required, end date for block
      if (!state.startDate) return false;
      if (state.frequency === 'block' && !state.endDate) return false;
      return true;
    case 4:
      return true; // final step — submit
    default:
      return false;
  }
}

export function LeagueFlowContainer({ children, onSubmit }: Props) {
  const { colors } = useTheme();
  const { state, dispatch } = useCreateLeague();
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
    if (isLastStep) onSubmit();
    else dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <SafeAreaView
      style={[
        styles.root,
        { backgroundColor: colors.white },
        { backgroundColor: colors.bgScreen },
      ]}
    >
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
                styles.button,
                { backgroundColor: colors.pine },
                !enabled && styles.buttonDisabled,
                !enabled && { backgroundColor: colors.inkSoft },
              ]}
              onPress={handlePress}
              disabled={!enabled || state.isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, { color: colors.white }]}>
                {state.isSubmitting
                  ? 'Creating...'
                  : isLastStep
                    ? 'Create League'
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
