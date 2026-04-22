import React, { useState, useCallback } from 'react';
import { Alert, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import {
  CreateLeagueProvider,
  useCreateLeague,
} from './create-flow/CreateLeagueContext';
import { LeagueFlowContainer } from './create-flow/LeagueFlowContainer';
import { Step1Sport } from './create-flow/Step1Sport';
import { Step2Config } from './create-flow/Step2Config';
import { Step3Who } from './create-flow/Step3Who';
import { Step4Preview } from './create-flow/Step4Preview';
import { Step4Who as Step5Invite } from './create-flow/Step4Who';
import { WizardSuccessScreen } from '../../components/wizard/WizardSuccessScreen';
import { UpsellModal } from '../../components/paywall/UpsellModal';
import { leagueService } from '../../services/api/LeagueService';
import { selectUser } from '../../store/slices/authSlice';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import { SkillLevel } from '../../types';
import { SubscriptionPlan } from '../../types/subscription';
import { getSportEmoji, getSportLabel } from '../../constants/sports';
import { getSeasonFromDate } from './create-flow/types';
import { useTheme } from '../../theme';

function CreateLeagueInner() {
  const { colors } = useTheme();
  const { state, dispatch } = useCreateLeague();
  const navigation = useNavigation<any>();
  const reduxDispatch = useDispatch();
  const user = useSelector(selectUser);
  const { allowed: leagueAllowed, requiredPlan } =
    useFeatureGate('create_league');
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellPlan, setUpsellPlan] = useState<SubscriptionPlan>('league');

  // Build league name
  const sportLabel = state.sport ? getSportLabel(state.sport) : '';
  const seasonLabel = state.startDate ? getSeasonFromDate(state.startDate) : '';
  const ageGroup = state.maxBirthYear
    ? ` U${new Date().getFullYear() - parseInt(state.maxBirthYear)}`
    : '';
  const leagueName =
    state.hostName.trim() && sportLabel
      ? `${state.hostName.trim()} ${sportLabel} ${seasonLabel}${ageGroup}`.trim()
      : '';

  const formatLabel =
    state.leagueFormat === 'season'
      ? 'Season'
      : state.leagueFormat === 'season_with_playoffs'
        ? 'Season with Playoffs'
        : state.leagueFormat === 'tournament'
          ? 'Tournament'
          : '';

  const handleSubmit = useCallback(async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please log in');
      return;
    }
    if (!leagueAllowed) {
      setUpsellPlan(requiredPlan);
      setShowUpsell(true);
      return;
    }

    dispatch({ type: 'SUBMIT_START' });
    try {
      const data: any = {
        name: leagueName,
        sportType: state.sport,
        skillLevel: state.skillLevel || SkillLevel.ALL_LEVELS,
        leagueType: 'team',
        leagueFormat: state.leagueFormat,
        startDate: state.startDate,
        endDate: state.endDate || undefined,
        seasonGameCount:
          state.gamesPerRound && state.numberOfRounds
            ? parseInt(state.gamesPerRound) * parseInt(state.numberOfRounds)
            : undefined,
        preferredGameDays: state.gameDays,
        preferredTimeWindowStart: state.timeStart || undefined,
        preferredTimeWindowEnd: state.timeEnd || undefined,
        gameFrequency:
          state.frequency === 'block' ? 'all_at_once' : state.frequency,
        trackStandings: state.leagueFormat !== 'tournament',
        visibility: state.visibility || 'public',
        playoffTeamCount: state.playoffTeamCount
          ? parseInt(state.playoffTeamCount)
          : undefined,
        eliminationFormat: state.playoffFormat || undefined,
        ...(state.coverImageUrl ? { coverImageUrl: state.coverImageUrl } : {}),
      };

      const newLeague = await leagueService.createLeague(data, user.id);

      // Invite rosters
      for (const roster of state.invitedRosters) {
        try {
          await leagueService.inviteRoster(newLeague.id, roster.id, user.id);
        } catch (err) {
          console.warn(
            'Failed to invite roster:',
            roster.id,
            (err as Error).message
          );
        }
      }

      dispatch({ type: 'SUBMIT_SUCCESS', leagueId: newLeague.id });
    } catch (error: any) {
      dispatch({ type: 'SUBMIT_FAIL' });
      Alert.alert('Error', error?.message || 'Failed to create league');
    }
  }, [
    user,
    state,
    leagueName,
    leagueAllowed,
    requiredPlan,
    dispatch,
    reduxDispatch,
  ]);

  if (state.showSuccess) {
    return (
      <WizardSuccessScreen
        emoji={state.sport ? getSportEmoji(state.sport) : '🏆'}
        title={`${leagueName} is live!`}
        subtitle="Your league has been created"
        summaryRows={[
          { label: 'Format', value: formatLabel },
          {
            label: 'Visibility',
            value: state.visibility === 'public' ? 'Public' : 'Private',
          },
          ...(state.invitedRosters.length > 0
            ? [
                {
                  label: 'Rosters invited',
                  value: String(state.invitedRosters.length),
                },
              ]
            : []),
        ]}
        actions={[
          {
            label: 'Go to League',
            icon: 'arrow-forward',
            onPress: () => {
              if (state.createdLeagueId) {
                navigation.replace('LeagueDetails', {
                  leagueId: state.createdLeagueId,
                });
              } else {
                navigation.goBack();
              }
            },
            variant: 'primary',
          },
          {
            label: 'Back to Leagues',
            icon: 'list-outline',
            onPress: () => navigation.goBack(),
            variant: 'secondary',
          },
        ]}
      />
    );
  }

  return (
    <>
      <View style={{ flex: 1, backgroundColor: colors.bgScreen }}>
        <LeagueFlowContainer onSubmit={handleSubmit}>
          <Step1Sport />
          <Step2Config />
          <Step3Who />
          <Step4Preview />
          <Step5Invite />
        </LeagueFlowContainer>
      </View>
      <UpsellModal
        visible={showUpsell}
        onClose={() => setShowUpsell(false)}
        requiredPlan={upsellPlan}
        onUpgrade={() => setShowUpsell(false)}
      />
    </>
  );
}

export const CreateLeagueScreen: React.FC = () => {
  return (
    <CreateLeagueProvider>
      <CreateLeagueInner />
    </CreateLeagueProvider>
  );
};
