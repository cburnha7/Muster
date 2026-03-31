import React, { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { CreateRosterProvider, useCreateRoster } from './create-flow/CreateRosterContext';
import { RosterFlowContainer } from './create-flow/RosterFlowContainer';
import { RosterStep1Sport } from './create-flow/RosterStep1Sport';
import { RosterStep2Details } from './create-flow/RosterStep2Details';
import { RosterStep3Invite } from './create-flow/RosterStep3Invite';
import { WizardSuccessScreen } from '../../components/wizard/WizardSuccessScreen';
import { UpsellModal } from '../../components/paywall/UpsellModal';
import { teamService } from '../../services/api/TeamService';
import { addTeam, joinTeam, selectUserTeams } from '../../store/slices/teamsSlice';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import { useAuth } from '../../context/AuthContext';
import { SportType, SkillLevel } from '../../types';
import { SubscriptionPlan } from '../../types/subscription';
import { getSportEmoji } from '../../constants/sports';

function CreateTeamInner() {
  const { state, dispatch } = useCreateRoster();
  const navigation = useNavigation<any>();
  const reduxDispatch = useDispatch();
  const { user } = useAuth();
  const userTeams = useSelector(selectUserTeams);
  const { allowed: rosterAllowed, requiredPlan } = useFeatureGate('create_roster');
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellPlan, setUpsellPlan] = useState<SubscriptionPlan>('roster');

  const handleSubmit = useCallback(async () => {
    if (!state.name.trim() || !state.sport || !user) return;
    if (userTeams.length >= 1 && !rosterAllowed) {
      setUpsellPlan(requiredPlan);
      setShowUpsell(true);
      return;
    }
    dispatch({ type: 'SUBMIT_START' });
    try {
      const playerIds = state.invitedItems.filter((i) => i.type === 'player').map((i) => i.id);
      const newTeam = await teamService.createTeam({
        name: state.name.trim(),
        description: '',
        sportType: state.sport as SportType,
        sportTypes: [state.sport as SportType],
        skillLevel: SkillLevel.ALL_LEVELS,
        maxMembers: parseInt(state.maxPlayers) || 10,
        isPublic: state.visibility === 'public',
        genderRestriction: state.gender || undefined,
        initialMemberIds: playerIds,
      } as any);
      reduxDispatch(addTeam(newTeam));
      reduxDispatch(joinTeam(newTeam));
      dispatch({ type: 'SUBMIT_SUCCESS', rosterId: newTeam.id });
    } catch (error: any) {
      dispatch({ type: 'SUBMIT_FAIL' });
      Alert.alert('Error', error?.message || 'Failed to create roster.');
    }
  }, [user, state, userTeams, rosterAllowed, requiredPlan, dispatch, reduxDispatch]);

  if (state.showSuccess) {
    const sportLabel = state.sport
      ? state.sport.charAt(0).toUpperCase() + state.sport.slice(1).replace(/_/g, ' ')
      : '';
    return (
      <WizardSuccessScreen
        emoji={state.sport ? getSportEmoji(state.sport) : '\u{1F389}'}
        title={`${state.name.trim()} is live!`}
        subtitle="Your roster has been created"
        summaryRows={[
          { label: 'Sport', value: sportLabel },
          { label: 'Visibility', value: state.visibility === 'public' ? 'Public' : 'Private' },
          { label: 'Max Players', value: state.maxPlayers || '10' },
          ...(state.invitedItems.length > 0
            ? [{ label: 'Invites sent', value: String(state.invitedItems.length) }]
            : []),
        ]}
        actions={[
          {
            label: 'Go to Roster',
            icon: 'arrow-forward',
            onPress: () => {
              if (state.createdRosterId) {
                navigation.replace('TeamDetails', { teamId: state.createdRosterId });
              } else {
                navigation.replace('TeamsList');
              }
            },
            variant: 'primary',
          },
          {
            label: 'Back to Rosters',
            icon: 'list-outline',
            onPress: () => navigation.replace('TeamsList'),
            variant: 'secondary',
          },
        ]}
      />
    );
  }

  return (
    <>
      <RosterFlowContainer onSubmit={handleSubmit}>
        <RosterStep1Sport />
        <RosterStep2Details />
        <RosterStep3Invite />
      </RosterFlowContainer>
      <UpsellModal
        visible={showUpsell}
        onClose={() => setShowUpsell(false)}
        requiredPlan={upsellPlan}
        onUpgrade={() => setShowUpsell(false)}
      />
    </>
  );
}

export function CreateTeamScreen() {
  return (
    <CreateRosterProvider>
      <CreateTeamInner />
    </CreateRosterProvider>
  );
}
