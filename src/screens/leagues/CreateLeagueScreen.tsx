import React, { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { CreateLeagueProvider, useCreateLeague } from './create-flow/CreateLeagueContext';
import { LeagueFlowContainer } from './create-flow/LeagueFlowContainer';
import { Step1Sport } from './create-flow/Step1Sport';
import { Step2Config } from './create-flow/Step2Config';
import { Step3Preview } from './create-flow/Step3Preview';
import { Step4Who } from './create-flow/Step4Who';
import { WizardSuccessScreen } from '../../components/wizard/WizardSuccessScreen';
import { UpsellModal } from '../../components/paywall/UpsellModal';
import { leagueService } from '../../services/api/LeagueService';
import { addLeague } from '../../store/slices/leaguesSlice';
import { selectUser } from '../../store/slices/authSlice';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import { SkillLevel } from '../../types';
import { SubscriptionPlan } from '../../types/subscription';
import { getSportEmoji, getSportLabel } from '../../constants/sports';
import { getSeasonFromDate } from './create-flow/types';

function CreateLeagueInner() {
  const { state, dispatch } = useCreateLeague();
  const navigation = useNavigation<any>();
  const reduxDispatch = useDispatch();
  const user = useSelector(selectUser);
  const { allowed: leagueAllowed, requiredPlan } = useFeatureGate('create_league');
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellPlan, setUpsellPlan] = useState<SubscriptionPlan>('league');

  // Build league name
  const sportLabel = state.sport ? getSportLabel(state.sport) : '';
  const seasonLabel = state.startDate ? getSeasonFromDate(state.startDate) : '';
  const leagueName = state.hostName.trim() && sportLabel
    ? `${state.hostName.trim()} ${sportLabel} ${seasonLabel}`.trim()
    : '';

  const formatLabel =
    state.leagueFormat === 'season' ? 'Season'
    : state.leagueFormat === 'season_with_playoffs' ? 'Season with Playoffs'
    : state.leagueFormat === 'tournament' ? 'Tournament'
    : '';

  const handleSubmit = useCallback(async () => {
    if (!user?.id) { Alert.alert('Error', 'Please log in'); return; }
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
        seasonGameCount: state.gamesPerRound && state.numberOfRounds
          ? parseInt(state.gamesPerRound) * parseInt(state.numberOfRounds)
          : undefined,
        preferredGameDays: state.gameDays,
        preferredTimeWindowStart: state.timeStart || undefined,
        preferredTimeWindowEnd: state.timeEnd || undefined,
        gameFrequency: state.frequency === 'block' ? 'all_at_once' : state.frequency,
        trackStandings: state.leagueFormat !== 'tournament',
        visibility: state.visibility || 'public',
        playoffTeamCount: state.playoffTeamCount ? parseInt(state.playoffTeamCount) : undefined,
        eliminationFormat: state.playoffFormat || undefined,
      };

      const newLeague = await leagueService.createLeague(data, user.id);
      reduxDispatch(addLeague(newLeague as any));

      // Invite rosters
      for (const roster of state.invitedRosters) {
        try {
          await leagueService.inviteRoster(newLeague.id, roster.id, user.id);
        } catch (err) {
          console.warn('Failed to invite roster:', roster.id, (err as Error).message);
        }
      }

      dispatch({ type: 'SUBMIT_SUCCESS', leagueId: newLeague.id });
    } catch (error: any) {
      dispatch({ type: 'SUBMIT_FAIL' });
      Alert.alert('Error', error?.message || 'Failed to create league');
    }
  }, [user, state, leagueName, leagueAllowed, requiredPlan, dispatch, reduxDispatch]);

  if (state.showSuccess) {
    return (
      <WizardSuccessScreen
        emoji={state.sport ? getSportEmoji(state.sport) : '🏆'}
        title={`${leagueName} is live!`}
        subtitle="Your league has been created"
        summaryRows={[
          { label: 'Format', value: formatLabel },
          { label: 'Visibility', value: state.visibility === 'public' ? 'Public' : 'Private' },
          ...(state.invitedRosters.length > 0
            ? [{ label: 'Rosters invited', value: String(state.invitedRosters.length) }]
            : []),
        ]}
        actions={[
          {
            label: 'Go to League',
            icon: 'arrow-forward',
            onPress: () => {
              if (state.createdLeagueId) {
                navigation.replace('LeagueDetails', { leagueId: state.createdLeagueId });
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
      <LeagueFlowContainer onSubmit={handleSubmit}>
        <Step1Sport />
        <Step2Config />
        <Step3Preview />
        <Step4Who />
      </LeagueFlowContainer>
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
