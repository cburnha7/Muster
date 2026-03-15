import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { FormInput } from '../../components/forms/FormInput';
import { FormSelect } from '../../components/forms/FormSelect';
import { FormButton } from '../../components/forms/FormButton';
import { AddMemberSearch } from '../../components/teams/AddMemberSearch';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { teamService } from '../../services/api/TeamService';
import {
  setSelectedTeam,
  updateTeam,
  removeTeam,
  joinTeam as joinTeamAction,
  leaveTeam as leaveTeamAction,
  removeTeamMember,
  updateTeamMemberRole,
} from '../../store/slices/teamsSlice';
import { selectUserTeams } from '../../store/slices/teamsSlice';
import { selectUser } from '../../store/slices/authSlice';
import { Team, TeamMember, TeamRole, MemberStatus, SportType, SkillLevel, User, Event } from '../../types';
import { League } from '../../types/league';
import { colors } from '../../theme';

interface TeamDetailsScreenProps {
  route: { params: { teamId: string } };
}

const sportTypeOptions = [
  { label: 'Basketball', value: SportType.BASKETBALL },
  { label: 'Pickleball', value: SportType.PICKLEBALL },
  { label: 'Tennis', value: SportType.TENNIS },
  { label: 'Soccer', value: SportType.SOCCER },
  { label: 'Softball', value: SportType.SOFTBALL },
  { label: 'Baseball', value: SportType.BASEBALL },
  { label: 'Volleyball', value: SportType.VOLLEYBALL },
  { label: 'Flag Football', value: SportType.FLAG_FOOTBALL },
  { label: 'Kickball', value: SportType.KICKBALL },
  { label: 'Other', value: SportType.OTHER },
];

const skillLevelOptions = [
  { label: 'All Levels', value: SkillLevel.ALL_LEVELS },
  { label: 'Beginner', value: SkillLevel.BEGINNER },
  { label: 'Intermediate', value: SkillLevel.INTERMEDIATE },
  { label: 'Advanced', value: SkillLevel.ADVANCED },
];

const visibilityOptions = [
  { label: 'Public (Anyone can find and join)', value: true },
  { label: 'Private (Invite only)', value: false },
];

export function TeamDetailsScreen({ route }: TeamDetailsScreenProps): JSX.Element {
  const { teamId } = route.params;
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectUser);

  // Loading / error state
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSportType, setFormSportType] = useState<SportType>(SportType.BASKETBALL);
  const [formSkillLevel, setFormSkillLevel] = useState<SkillLevel>(SkillLevel.ALL_LEVELS);
  const [formMaxMembers, setFormMaxMembers] = useState('10');
  const [formIsPublic, setFormIsPublic] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Related data
  const [leagues, setLeagues] = useState<any[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Derived state
  const isMember = team?.members?.some(
    (m) => m.userId === currentUser?.id && m.status === MemberStatus.ACTIVE
  );
  const currentMember = team?.members?.find((m) => m.userId === currentUser?.id);
  const isCaptain = currentMember?.role === TeamRole.CAPTAIN;
  const canManageTeam = isCaptain || currentMember?.role === TeamRole.CO_CAPTAIN;

  const activeMembers = team?.members?.filter((m) => m.status === MemberStatus.ACTIVE) || [];
  const pendingMembers = team?.members?.filter((m) => m.status === MemberStatus.PENDING) || [];
  const allMemberIds = team?.members?.map((m) => m.userId) || [];

  // Sync form state when team loads
  useEffect(() => {
    if (team) {
      setFormName(team.name || '');
      setFormDescription(team.description || '');
      setFormSportType(team.sportType || SportType.BASKETBALL);
      setFormSkillLevel(team.skillLevel || SkillLevel.ALL_LEVELS);
      setFormMaxMembers(String(team.maxMembers || 10));
      setFormIsPublic(team.isPublic ?? true);
    }
  }, [team]);

  const loadTeamDetails = useCallback(async () => {
    try {
      const teamData = await teamService.getTeam(teamId);
      setTeam(teamData);
      dispatch(setSelectedTeam(teamData));
      setError(null);
    } catch (err: any) {
      console.error('Error loading roster details:', err);
      setError(err.message || 'Failed to load roster details');
    }
  }, [teamId, dispatch]);

  const loadTeamLeagues = useCallback(async () => {
    try {
      const data = await teamService.getTeamLeagues(teamId);
      setLeagues(data);
    } catch (err) {
      console.error('Error loading roster leagues:', err);
    }
  }, [teamId]);

  const loadTeamEvents = useCallback(async () => {
    try {
      const data = await teamService.getTeamEvents(teamId);
      setEvents(data);
    } catch (err) {
      console.error('Error loading roster events:', err);
    }
  }, [teamId]);

  // Initial load
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const load = async () => {
        setIsLoading(true);
        await Promise.all([loadTeamDetails(), loadTeamLeagues(), loadTeamEvents()]);
        if (isMounted) setIsLoading(false);
      };
      load();
      return () => { isMounted = false; };
    }, [loadTeamDetails, loadTeamLeagues, loadTeamEvents])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadTeamDetails(), loadTeamLeagues(), loadTeamEvents()]);
    setIsRefreshing(false);
  };

  // ── Form validation ──
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formName.trim()) errs.name = 'Roster name is required';
    else if (formName.length < 3) errs.name = 'Roster name must be at least 3 characters';
    else if (formName.length > 50) errs.name = 'Roster name must be less than 50 characters';
    if (formDescription && formDescription.length > 500) errs.description = 'Description must be less than 500 characters';
    const maxNum = parseInt(formMaxMembers, 10);
    if (isNaN(maxNum) || maxNum < 2) errs.maxMembers = 'Roster must allow at least 2 players';
    else if (maxNum > 100) errs.maxMembers = 'Maximum players cannot exceed 100';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Update roster ──
  const handleUpdateTeam = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const updates = {
        name: formName.trim(),
        description: formDescription.trim(),
        sportType: formSportType,
        skillLevel: formSkillLevel,
        maxMembers: parseInt(formMaxMembers, 10),
        isPublic: formIsPublic,
      };
      const updated = await teamService.updateTeam(teamId, updates);
      setTeam(updated);
      dispatch(updateTeam(updated));
      Alert.alert('Success', 'Roster updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update roster.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Join / Leave / Delete ──
  const handleJoinTeam = async () => {
    try {
      await teamService.joinTeam(teamId);
      dispatch(joinTeamAction(team!));
      await loadTeamDetails();
      Alert.alert('Success', 'You joined the roster.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join roster.');
    }
  };

  const handleLeaveTeam = async () => {
    try {
      await teamService.leaveTeam(teamId);
      dispatch(leaveTeamAction(teamId));
      await loadTeamDetails();
      Alert.alert('Done', 'You stepped out of the roster.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to step out.');
    }
  };

  const handleDeleteTeam = async () => {
    try {
      await teamService.deleteTeam(teamId);
      dispatch(removeTeam(teamId));
      (navigation as any).replace('TeamsList');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to delete roster.');
    }
  };

  // ── Player management ──
  const handleRemoveMember = (member: TeamMember) => {
    Alert.alert(
      'Remove Player',
      `Remove ${member.user?.firstName || 'this player'} from the roster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await teamService.removeFromTeam(teamId, member.userId);
              dispatch(removeTeamMember({ teamId, memberId: member.userId }));
              await loadTeamDetails();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove player.');
            }
          },
        },
      ]
    );
  };

  const handleChangeRole = (member: TeamMember) => {
    const newRole = member.role === TeamRole.CO_CAPTAIN ? TeamRole.MEMBER : TeamRole.CO_CAPTAIN;
    const roleLabel = newRole === TeamRole.CO_CAPTAIN ? 'Co-Captain' : 'Player';
    Alert.alert(
      'Change Role',
      `Set ${member.user?.firstName || 'this player'} as ${roleLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await teamService.updateMemberRole(teamId, member.userId, newRole);
              dispatch(updateTeamMemberRole({ teamId, memberId: member.userId, role: newRole }));
              await loadTeamDetails();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to update role.');
            }
          },
        },
      ]
    );
  };

  const handleAddMemberDirectly = async (user: User) => {
    try {
      await teamService.addMemberDirectly(teamId, user.id);
      await loadTeamDetails();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to invite player.');
      throw err; // Re-throw so AddMemberSearch knows it failed
    }
  };

  // ── Render helpers ──
  const renderMember = (member: TeamMember, isPending: boolean) => {
    const user = member.user;
    const isCurrentUser = member.userId === currentUser?.id;
    const roleLabel =
      member.role === TeamRole.CAPTAIN
        ? 'Captain'
        : member.role === TeamRole.CO_CAPTAIN
        ? 'Co-Captain'
        : 'Player';

    return (
      <View key={member.userId} style={styles.memberItem}>
        <View style={styles.memberInfo}>
          {user?.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.memberAvatar} />
          ) : (
            <View style={[styles.memberAvatar, styles.memberAvatarPlaceholder]}>
              <Text style={styles.memberAvatarText}>
                {user?.firstName?.[0] || '?'}
              </Text>
            </View>
          )}
          <View style={styles.memberDetails}>
            <View style={styles.memberNameRow}>
              <Text style={styles.memberName}>
                {user?.firstName} {user?.lastName}
                {isCurrentUser ? ' (You)' : ''}
              </Text>
              {isPending && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>✉️ Invited</Text>
                </View>
              )}
            </View>
            <Text style={styles.memberRole}>{roleLabel}</Text>
          </View>
        </View>
        {canManageTeam && !isCurrentUser && (
          <View style={styles.memberActions}>
            {!isPending && (
              <TouchableOpacity
                style={styles.roleButton}
                onPress={() => handleChangeRole(member)}
              >
                <Ionicons name="shield-outline" size={18} color={colors.sky} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveMember(member)}
            >
              <Ionicons name="close-circle" size={22} color={colors.track} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ── Loading / Error states ──
  if (isLoading) {
    return <LoadingSpinner message="Loading roster..." />;
  }

  if (error || !team) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Roster" showBack onBackPress={() => navigation.goBack()} />
        <ErrorDisplay message={error || 'Roster not found'} onRetry={loadTeamDetails} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader
        title={canManageTeam ? 'Edit Roster' : 'Roster Details'}
        showBack
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.grass} />
        }
      >
        <View style={styles.form}>
          {/* ── Roster Information ── */}
          <Text style={styles.sectionTitle}>Roster Information</Text>

          <FormInput
            label="Roster Name *"
            value={formName}
            onChangeText={setFormName}
            placeholder="Enter roster name"
            error={formErrors.name}
            maxLength={50}
            editable={canManageTeam}
          />

          <FormInput
            label="Description"
            value={formDescription}
            onChangeText={setFormDescription}
            placeholder="Tell others about your roster"
            multiline
            numberOfLines={4}
            error={formErrors.description}
            maxLength={500}
            editable={canManageTeam}
          />

          <FormSelect
            label="Sport Type *"
            value={formSportType}
            onValueChange={(v) => setFormSportType(v as SportType)}
            options={sportTypeOptions}
            disabled={!canManageTeam}
          />

          <FormSelect
            label="Skill Level *"
            value={formSkillLevel}
            onValueChange={(v) => setFormSkillLevel(v as SkillLevel)}
            options={skillLevelOptions}
            disabled={!canManageTeam}
          />

          <FormInput
            label="Maximum Players *"
            value={formMaxMembers}
            onChangeText={(v) => {
              const num = parseInt(v, 10);
              if (!isNaN(num) || v === '') setFormMaxMembers(v === '' ? '' : String(num));
            }}
            placeholder="Enter maximum number of players"
            keyboardType="numeric"
            error={formErrors.maxMembers}
            editable={canManageTeam}
          />

          <FormSelect
            label="Roster Visibility *"
            value={formIsPublic}
            onValueChange={(v) => setFormIsPublic(v as boolean)}
            options={visibilityOptions}
            disabled={!canManageTeam}
          />

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              {formIsPublic
                ? '🌐 Public rosters can be discovered and joined by anyone'
                : '🔒 Private rosters require an invite code to join'}
            </Text>
          </View>

          {/* ── Invites Section (managers only) ── */}
          {canManageTeam && (
            <View style={styles.addMembersSection}>
              <View style={styles.addMembersHeader}>
                <Text style={styles.addMembersTitle}>Invite Players</Text>
                {!formIsPublic && (
                  <View style={styles.privateBadge}>
                    <Text style={styles.privateBadgeText}>🔒 Private</Text>
                  </View>
                )}
              </View>
              <Text style={styles.addMembersDescription}>
                Search for players and invite them to your roster. They must accept the invite before they appear on the confirmed players list.
              </Text>

              <AddMemberSearch
                onAddMember={handleAddMemberDirectly}
                existingMemberIds={allMemberIds}
              />
            </View>
          )}

          {/* ── Invited (pending) players ── */}
          {pendingMembers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Invited ({pendingMembers.length})
              </Text>
              <Text style={styles.invitedDescription}>
                These players have been invited but haven't joined yet.
              </Text>
              {pendingMembers.map((m) => renderMember(m, true))}
            </View>
          )}

          {/* ── Confirmed Players ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Players ({activeMembers.length})
            </Text>
            {activeMembers.length === 0 ? (
              <Text style={styles.emptyText}>No confirmed players yet.</Text>
            ) : (
              activeMembers.map((m) => renderMember(m, false))
            )}
          </View>

          {/* ── Leagues ── */}
          {leagues.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Leagues ({leagues.length})</Text>
              {leagues.map((league: any) => (
                <TouchableOpacity
                  key={league.id}
                  style={styles.listCard}
                  onPress={() => (navigation as any).navigate('LeagueDetails', { leagueId: league.id })}
                >
                  <View style={styles.listCardContent}>
                    <Ionicons name="trophy-outline" size={20} color={colors.court} />
                    <View style={styles.listCardText}>
                      <Text style={styles.listCardTitle}>{league.name}</Text>
                      <Text style={styles.listCardSub}>{league.sportType}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Upcoming Events ── */}
          {events.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upcoming Events ({events.length})</Text>
              {events.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.listCard}
                  onPress={() => (navigation as any).navigate('EventDetails', { eventId: event.id })}
                >
                  <View style={styles.listCardContent}>
                    <Ionicons name="calendar-outline" size={20} color={colors.grass} />
                    <View style={styles.listCardText}>
                      <Text style={styles.listCardTitle}>{event.title}</Text>
                      <Text style={styles.listCardSub}>
                        {new Date(event.startTime).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Action Buttons ── */}
          <View style={styles.actionsSection}>
            {canManageTeam && (
              <FormButton
                title={isSaving ? 'Saving...' : 'Update Roster'}
                onPress={handleUpdateTeam}
                disabled={isSaving}
                loading={isSaving}
              />
            )}

            {!isMember && !currentMember && (
              <FormButton
                title="Join Up"
                onPress={handleJoinTeam}
                leftIcon="add-circle-outline"
              />
            )}

            {isMember && !isCaptain && (
              <FormButton
                title="Step Out"
                onPress={() => setShowLeaveModal(true)}
                variant="outline"
                leftIcon="exit-outline"
              />
            )}

            {isCaptain && (
              <FormButton
                title="Delete Roster"
                onPress={() => setShowDeleteModal(true)}
                variant="danger"
                leftIcon="trash-outline"
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* ── Modals ── */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Delete Roster"
        message="This will permanently delete the roster and remove all players. This cannot be undone."
        icon="trash-outline"
        variant="danger"
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteTeam}
      />

      <ConfirmModal
        visible={showLeaveModal}
        title="Step Out"
        message="Are you sure you want to step out of this roster?"
        icon="exit-outline"
        confirmText="Step Out"
        cancelText="Cancel"
        onCancel={() => setShowLeaveModal(false)}
        onConfirm={handleLeaveTeam}
      />
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chalk,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  form: {
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 8,
  },
  infoBox: {
    backgroundColor: colors.courtLight + '20',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.courtLight + '40',
  },
  infoText: {
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
  // Invites / Add members section
  addMembersSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addMembersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addMembersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  privateBadge: {
    backgroundColor: colors.courtLight + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  privateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.court,
  },
  addMembersDescription: {
    fontSize: 14,
    color: colors.inkFaint,
    lineHeight: 20,
  },
  pendingMembersContainer: {
    gap: 8,
  },
  pendingMembersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  // Member items
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberAvatarPlaceholder: {
    backgroundColor: colors.grass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  memberDetails: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.ink,
  },
  memberRole: {
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: colors.courtLight + '30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.court,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleButton: {
    padding: 4,
  },
  removeButton: {
    padding: 4,
  },
  // Section
  section: {
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.inkFaint,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  invitedDescription: {
    fontSize: 13,
    color: colors.inkFaint,
    marginBottom: 8,
  },
  // List cards (leagues / events)
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  listCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  listCardText: {
    flex: 1,
  },
  listCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  listCardSub: {
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 2,
  },
  // Actions
  actionsSection: {
    marginTop: 16,
    gap: 12,
  },
});