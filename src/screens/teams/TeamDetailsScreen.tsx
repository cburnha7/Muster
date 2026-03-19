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
  Switch,
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
import { playerDuesService, PlayerDuesStatusItem } from '../../services/api/PlayerDuesService';
import { cacheService } from '../../services/api/CacheService';
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
import { colors, fonts } from '../../theme';
import { DuesStatusBadge, DuesStatus } from '../../components/dues/DuesStatusBadge';
import { loggingService } from '../../services/LoggingService';
interface TeamDetailsScreenProps {
  route: { params: { teamId: string; readOnly?: boolean } };
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
  { label: 'Hockey', value: SportType.HOCKEY },
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
  const { teamId, readOnly } = route.params;
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
  const [formSportTypes, setFormSportTypes] = useState<SportType[]>([]);
  const [formSkillLevel, setFormSkillLevel] = useState<SkillLevel>(SkillLevel.ALL_LEVELS);
  const [formMaxMembers, setFormMaxMembers] = useState('10');
  const [formIsPublic, setFormIsPublic] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Related data
  const [leagues, setLeagues] = useState<any[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  // Dues status (visible to roster manager)
  const [playerDuesMap, setPlayerDuesMap] = useState<Map<string, DuesStatus>>(new Map());
  const [duesAmount, setDuesAmount] = useState<number | null>(null);
  const [activeSeason, setActiveSeason] = useState<any>(null);

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Derived state
  const isMember = team?.members?.some(
    (m) => m.userId === currentUser?.id && m.status === MemberStatus.ACTIVE
  );
  const currentMember = team?.members?.find((m) => m.userId === currentUser?.id);
  const isCaptain = currentMember?.role === TeamRole.CAPTAIN;
  const canManageTeam = !readOnly && (isCaptain || currentMember?.role === TeamRole.CO_CAPTAIN);
  const isPendingInvite = team?.members?.some(
    (m) => m.userId === currentUser?.id && m.status === MemberStatus.PENDING
  );

  const activeMembers = team?.members?.filter((m) => m.status === MemberStatus.ACTIVE) || [];
  const pendingMembers = team?.members?.filter((m) => m.status === MemberStatus.PENDING) || [];
  const allMemberIds = team?.members?.map((m) => m.userId) || [];

  // Sync form state when team loads
  useEffect(() => {
    if (team) {
      setFormName(team.name || '');
      setFormDescription(team.description || '');
      setFormSportType(team.sportType || SportType.BASKETBALL);
      setFormSportTypes(
        team.sportTypes && team.sportTypes.length > 0
          ? team.sportTypes
          : (team.sportType ? [team.sportType] : [SportType.BASKETBALL])
      );
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

  const loadPlayerDuesStatus = useCallback(async () => {
    try {
      // Find the active season for any league this roster belongs to
      const leagueData = await teamService.getTeamLeagues(teamId);
      if (!leagueData || leagueData.length === 0) return;

      // Look for a league with an active season that has dues
      for (const league of leagueData) {
        const seasons = league.seasons || [];
        const active = seasons.find((s: any) => s.isActive && s.duesAmount && s.duesAmount > 0);
        if (active) {
          setActiveSeason(active);
          const result = await playerDuesService.getRosterStatus(teamId, active.id);
          setDuesAmount(result.duesAmount);
          const map = new Map<string, DuesStatus>();
          for (const p of result.players) {
            if (p.paid) {
              map.set(p.playerId, 'paid');
            } else if (p.paymentStatus === 'pending') {
              map.set(p.playerId, 'pending');
            } else {
              map.set(p.playerId, 'unpaid');
            }
          }
          setPlayerDuesMap(map);
          break;
        }
      }
    } catch (err) {
      // Dues status is supplementary — don't block the screen on failure
      console.error('Error loading player dues status:', err);
    }
  }, [teamId]);

  // Initial load
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const load = async () => {
        setIsLoading(true);
        await Promise.all([loadTeamDetails(), loadTeamLeagues(), loadTeamEvents(), loadPlayerDuesStatus()]);
        if (isMounted) setIsLoading(false);
      };
      load();
      return () => { isMounted = false; };
    }, [loadTeamDetails, loadTeamLeagues, loadTeamEvents, loadPlayerDuesStatus])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadTeamDetails(), loadTeamLeagues(), loadTeamEvents(), loadPlayerDuesStatus()]);
    setIsRefreshing(false);
  };

  // ── Form validation ──
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formName.trim()) {
      errs.name = 'Roster name is required';
      loggingService.logValidation('TeamDetailsScreen', 'name', 'required', 'Roster name is required');
    }
    else if (formName.length < 3) {
      errs.name = 'Roster name must be at least 3 characters';
      loggingService.logValidation('TeamDetailsScreen', 'name', 'minLength', 'Roster name must be at least 3 characters');
    }
    else if (formName.length > 50) {
      errs.name = 'Roster name must be less than 50 characters';
      loggingService.logValidation('TeamDetailsScreen', 'name', 'maxLength', 'Roster name must be less than 50 characters');
    }
    if (formDescription && formDescription.length > 500) {
      errs.description = 'Description must be less than 500 characters';
      loggingService.logValidation('TeamDetailsScreen', 'description', 'maxLength', 'Description must be less than 500 characters');
    }
    const maxNum = parseInt(formMaxMembers, 10);
    if (isNaN(maxNum) || maxNum < 2) {
      errs.maxMembers = 'Roster must allow at least 2 players';
      loggingService.logValidation('TeamDetailsScreen', 'maxMembers', 'min', 'Roster must allow at least 2 players');
    }
    else if (maxNum > 100) {
      errs.maxMembers = 'Maximum players cannot exceed 100';
      loggingService.logValidation('TeamDetailsScreen', 'maxMembers', 'max', 'Maximum players cannot exceed 100');
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Update roster ──
  const handleUpdateTeam = async () => {
    if (!validateForm()) return;
    loggingService.logButton('Update Roster', 'TeamDetailsScreen');
    setIsSaving(true);
    try {
      const updates = {
        name: formName.trim(),
        description: formDescription.trim(),
        sportType: (formSportTypes.length > 0 ? formSportTypes[0] : formSportType) ?? SportType.BASKETBALL,
        sportTypes: formSportTypes,
        skillLevel: formSkillLevel,
        maxMembers: parseInt(formMaxMembers, 10),
        isPublic: formIsPublic,
      };
      const updated = await teamService.updateTeam(teamId, updates);
      dispatch(updateTeam(updated));
      (navigation as any).replace('TeamsList');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update roster.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Join / Leave / Delete ──
  const handleJoinTeam = async () => {
    loggingService.logButton('Join', 'TeamDetailsScreen', { teamId });
    try {
      await teamService.joinTeam(teamId);
      dispatch(joinTeamAction(team!));
      // Clear cache so HomeScreen refreshes invitations
      cacheService.clearBySubstring('users');
      cacheService.clearBySubstring('teams');
      await loadTeamDetails();
      Alert.alert('Success', 'You joined the roster.');
      if (readOnly) {
        navigation.goBack();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join roster.');
    }
  };

  const handleDeclineInvitation = async () => {
    loggingService.logButton('Decline Invitation', 'TeamDetailsScreen', { teamId });

    const doDecline = async () => {
      try {
        await teamService.leaveTeam(teamId);
        // Clear cache so HomeScreen refreshes invitations
        cacheService.clearBySubstring('users');
        cacheService.clearBySubstring('teams');
        navigation.goBack();
      } catch (err: any) {
        const msg = err.message || 'Failed to decline invitation.';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Error', msg);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to decline this roster invitation?')) {
        await doDecline();
      }
    } else {
      Alert.alert(
        'Decline Invitation',
        'Are you sure you want to decline this roster invitation?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Decline', style: 'destructive', onPress: doDecline },
        ]
      );
    }
  };

  const handleLeaveTeam = async () => {
    try {
      await teamService.leaveTeam(teamId);
      dispatch(leaveTeamAction(teamId));
      await loadTeamDetails();
      Alert.alert('Done', 'You have left the roster.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to leave roster.');
    }
  };

  const handleDeleteTeam = async () => {
    loggingService.logButton('Delete Roster', 'TeamDetailsScreen', { teamId });
    try {
      await teamService.deleteTeam(teamId);
      dispatch(removeTeam(teamId));
      (navigation as any).replace('TeamsList');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to delete roster.');
    }
  };

  // ── Player management ──
  const handleRemoveMember = async (member: TeamMember) => {
    const isPending = member.status === MemberStatus.PENDING;

    const removeMember = async () => {
      // Optimistic update — remove from UI immediately
      const previousTeam = team;
      setTeam(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.filter(m => m.userId !== member.userId),
        };
      });

      try {
        await teamService.removeFromTeam(teamId, member.userId);
        dispatch(removeTeamMember({ teamId, memberId: member.userId }));
      } catch (err: any) {
        // Revert on failure
        setTeam(previousTeam);
        Alert.alert('Error', err.message || 'Failed to remove player.');
      }
    };

    // For pending invites, remove immediately without confirmation
    if (isPending) {
      await removeMember();
      return;
    }

    Alert.alert(
      'Remove Player',
      `Remove ${member.user?.firstName || 'this player'} from the roster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: removeMember },
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
      const newMember = await teamService.addMemberDirectly(teamId, user.id);
      // Update team state directly for instant UI feedback
      setTeam(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          members: [...prev.members, { ...newMember, user }],
        };
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to invite player.');
      throw err;
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
              {!isPending && canManageTeam && duesAmount != null && playerDuesMap.size > 0 && (
                <DuesStatusBadge status={playerDuesMap.get(member.userId) ?? 'unpaid'} />
              )}
            </View>
            <Text style={styles.memberRole}>{roleLabel}</Text>
          </View>
        </View>
        {canManageTeam && !isCurrentUser && isPending && (
          <View style={styles.memberActions}>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveMember(member)}
            >
              <Ionicons name="close-circle" size={22} color={colors.heart} />
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
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.pine} />
        }
      >
        <View style={styles.form}>
          {/* ── Invitation Banner (when user has pending invite) ── */}
          {isPendingInvite && (
            <View style={styles.invitationBanner}>
              <View style={styles.invitationBannerIcon}>
                <Ionicons name="mail-outline" size={24} color={colors.court} />
              </View>
              <View style={styles.invitationBannerContent}>
                <Text style={styles.invitationBannerTitle}>You've been invited!</Text>
                <Text style={styles.invitationBannerText}>
                  You've been invited to join this roster. Review the details below and decide if you'd like to join.
                </Text>
              </View>
            </View>
          )}

          {/* ── Read-only Roster Header (non-managers and readOnly mode) ── */}
          {!canManageTeam && (
            <View style={styles.readOnlyHeader}>
              <View style={styles.readOnlyHeaderTop}>
                <View style={styles.readOnlySportBadge}>
                  <Ionicons name="shield-outline" size={22} color={colors.pine} />
                </View>
                <View style={styles.readOnlyHeaderInfo}>
                  <Text style={styles.readOnlyName}>{team.name}</Text>
                  <Text style={styles.readOnlyMeta}>
                    {(() => {
                      const sports = team.sportTypes && team.sportTypes.length > 0
                        ? team.sportTypes
                        : (team.sportType ? [team.sportType] : []);
                      const formatted = sports.map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')).join(', ');
                      return formatted;
                    })()} • {team.skillLevel || 'All Levels'}
                  </Text>
                </View>
              </View>
              {team.description ? (
                <Text style={styles.readOnlyDescription}>{team.description}</Text>
              ) : null}
              <View style={styles.readOnlyStats}>
                <View style={styles.readOnlyStatItem}>
                  <Text style={styles.readOnlyStatValue}>{activeMembers.length}</Text>
                  <Text style={styles.readOnlyStatLabel}>Players</Text>
                </View>
                <View style={styles.readOnlyStatDivider} />
                <View style={styles.readOnlyStatItem}>
                  <Text style={styles.readOnlyStatValue}>{team.maxMembers || '—'}</Text>
                  <Text style={styles.readOnlyStatLabel}>Max</Text>
                </View>
                <View style={styles.readOnlyStatDivider} />
                <View style={styles.readOnlyStatItem}>
                  <Text style={styles.readOnlyStatValue}>{formIsPublic ? 'Public' : 'Private'}</Text>
                  <Text style={styles.readOnlyStatLabel}>Visibility</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Editable Roster Information (managers only) ── */}
          {canManageTeam && (
            <>
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

          <View>
            <Text style={styles.sportFieldLabel}>Sports *</Text>
            <View style={styles.sportChipsRow}>
              {sportTypeOptions.map((opt) => {
                const selected = formSportTypes.includes(opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.sportChip, selected && styles.sportChipSelected]}
                    onPress={() => {
                      if (!canManageTeam) return;
                      const updated = selected
                        ? formSportTypes.filter(s => s !== opt.value)
                        : [...formSportTypes, opt.value];
                      setFormSportTypes(updated);
                      if (updated.length > 0) setFormSportType(updated[0] ?? SportType.BASKETBALL);
                    }}
                    disabled={!canManageTeam}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={opt.label}
                  >
                    <Text style={[styles.sportChipText, selected && styles.sportChipTextSelected]}>
                      {opt.label}
                    </Text>
                    {selected && (
                      <Ionicons name="close-circle" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

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

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Public Roster</Text>
              <Text style={styles.toggleDescription}>
                {formIsPublic ? 'Anyone can find and join' : 'Invite only'}
              </Text>
            </View>
            <Switch
              value={formIsPublic}
              onValueChange={(v) => setFormIsPublic(v)}
              trackColor={{ false: '#D1D5DB', true: colors.pineLight }}
              thumbColor={formIsPublic ? colors.pine : '#F4F4F5'}
              disabled={!canManageTeam}
            />
          </View>
            </>
          )}

          {/* ── Invites Section (managers only) ── */}
          {canManageTeam && (
            <View style={styles.addMembersSection}>
              <View style={styles.addMembersHeader}>
                <Text style={styles.addMembersTitle}>Invite Players</Text>
              </View>
              <Text style={styles.addMembersDescription}>
                Search for players and invite them to your roster. They must accept before appearing on the confirmed players list.
              </Text>

              {/* Invited list inside the invite card */}
              {pendingMembers.length > 0 && (
                <View style={styles.pendingMembersContainer}>
                  <Text style={styles.pendingMembersTitle}>
                    Invited ({pendingMembers.length})
                  </Text>
                  {pendingMembers.map((m) => renderMember(m, true))}
                </View>
              )}

              <AddMemberSearch
                onAddMember={handleAddMemberDirectly}
                existingMemberIds={allMemberIds}
              />
            </View>
          )}

          {/* Invited list for non-managers (read-only) */}
          {!canManageTeam && pendingMembers.length > 0 && (
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
            {canManageTeam && duesAmount != null && playerDuesMap.size > 0 && (
              <View style={styles.duesSummaryBanner}>
                <Ionicons name="cash-outline" size={16} color={colors.pine} />
                <Text style={styles.duesSummaryText}>
                  Season dues: ${(duesAmount / 100).toFixed(2)} · {
                    Array.from(playerDuesMap.values()).filter(s => s === 'paid').length
                  }/{playerDuesMap.size} paid
                </Text>
              </View>
            )}
            {activeMembers.length === 0 ? (
              <Text style={styles.emptyText}>No confirmed players yet.</Text>
            ) : (
              activeMembers.map((m) => renderMember(m, false))
            )}
          </View>

          {/* ── Leagues ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Leagues ({leagues.length})</Text>
            {leagues.length === 0 ? (
              <Text style={styles.emptyText}>Not part of any leagues yet.</Text>
            ) : (
              leagues.map((league: any) => {
                const isPending = league.membership?.status === 'pending';
                return (
                  <TouchableOpacity
                    key={league.id}
                    style={[styles.listCard, isPending && styles.listCardPending]}
                    onPress={() => (navigation as any).navigate('Leagues', { screen: 'LeagueDetails', params: { leagueId: league.id, readOnly: true } })}
                  >
                    <View style={styles.listCardContent}>
                      <Ionicons name="trophy-outline" size={20} color={isPending ? colors.court : colors.pine} />
                      <View style={styles.listCardText}>
                        <Text style={styles.listCardTitle}>{league.name}</Text>
                        <Text style={styles.listCardSub}>{league.sportType}</Text>
                      </View>
                    </View>
                    <View style={styles.listCardRight}>
                      {isPending && (
                        <View style={styles.pendingLeagueBadge}>
                          <Text style={styles.pendingLeagueBadgeText}>Pending</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

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
                    <Ionicons name="calendar-outline" size={20} color={colors.pine} />
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
            {readOnly && isPendingInvite && (
              <>
                <FormButton
                  title="Confirm"
                  onPress={handleJoinTeam}
                  leftIcon="add-circle-outline"
                />
                <FormButton
                  title="Decline"
                  onPress={handleDeclineInvitation}
                  variant="outline"
                  leftIcon="close-circle-outline"
                />
              </>
            )}

            {!readOnly && canManageTeam && (
              <FormButton
                title={isSaving ? 'Saving...' : 'Update Roster'}
                onPress={handleUpdateTeam}
                disabled={isSaving}
                loading={isSaving}
              />
            )}

            {!readOnly && !isMember && !currentMember && (
              <FormButton
                title="Join"
                onPress={handleJoinTeam}
                leftIcon="add-circle-outline"
              />
            )}

            {!readOnly && isMember && !isCaptain && (
              <FormButton
                title="Leave"
                onPress={() => setShowLeaveModal(true)}
                variant="muted"
                leftIcon="exit-outline"
              />
            )}

            {!readOnly && isCaptain && (
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
        title="Leave"
        message="Are you sure you want to leave this roster?"
        icon="exit-outline"
        confirmText="Leave"
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
    backgroundColor: colors.cream,
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
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.ink,
    marginBottom: 8,
  },
  // Invitation banner
  invitationBanner: {
    flexDirection: 'row',
    backgroundColor: colors.courtLight + '20',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.courtLight + '40',
    gap: 12,
  },
  invitationBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.courtLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitationBannerContent: {
    flex: 1,
  },
  invitationBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  invitationBannerText: {
    fontSize: 14,
    color: colors.inkFaint,
    lineHeight: 20,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  toggleDescription: {
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 2,
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
    backgroundColor: colors.pine,
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
  duesSummaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EDF7F0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  duesSummaryText: {
    fontSize: 13,
    color: colors.pine,
    fontWeight: '600',
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
  listCardPending: {
    borderColor: colors.courtLight,
    backgroundColor: '#FFF8EE',
  },
  listCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingLeagueBadge: {
    backgroundColor: colors.courtLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pendingLeagueBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Actions
  actionsSection: {
    marginTop: 16,
    gap: 12,
  },
  // Read-only header
  readOnlyHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  readOnlyHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  readOnlySportBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDF7F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  readOnlyHeaderInfo: {
    flex: 1,
  },
  readOnlyName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
  },
  readOnlyMeta: {
    fontSize: 14,
    color: colors.inkFaint,
    marginTop: 2,
  },
  readOnlyDescription: {
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
    marginBottom: 12,
  },
  readOnlyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
    borderRadius: 12,
    paddingVertical: 12,
  },
  readOnlyStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  readOnlyStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
  },
  readOnlyStatLabel: {
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 2,
  },
  readOnlyStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
  },
  sportFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 4,
  },
  sportChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sportChipSelected: {
    backgroundColor: colors.pine,
    borderColor: colors.pine,
  },
  sportChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.inkFaint,
  },
  sportChipTextSelected: {
    color: '#FFFFFF',
  },
});