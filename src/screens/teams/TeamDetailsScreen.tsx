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
  TextInput,
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
  const isManagerRole = isCaptain || currentMember?.role === TeamRole.CO_CAPTAIN;
  const [editMode, setEditMode] = useState(false);
  const canManageTeam = !readOnly && isManagerRole && editMode;
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
      navigation.setOptions({ headerTitle: teamData.name });
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
      // Only submit fields that are currently visible in the progressive flow
      const nameOk = formName.trim().length >= 2;
      const sportOk = nameOk && !!formSportType;
      const maxOk = sportOk && !!formMaxMembers && parseInt(formMaxMembers) > 0;

      const updates: any = { name: formName.trim() };
      if (sportOk) {
        updates.sportType = (formSportTypes.length > 0 ? formSportTypes[0] : formSportType) ?? SportType.BASKETBALL;
        updates.sportTypes = formSportTypes;
        updates.isPublic = formIsPublic;
      }
      if (maxOk) {
        updates.maxMembers = parseInt(formMaxMembers, 10);
        updates.skillLevel = formSkillLevel;
      }

      const updated = await teamService.updateTeam(teamId, updates);
      dispatch(updateTeam(updated));
      setEditMode(false);
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
        <ErrorDisplay message={error || 'Roster not found'} onRetry={loadTeamDetails} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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

          {/* ── Read-only Roster Detail (event-detail style) ── */}
          {!canManageTeam && (
            <View style={styles.readOnlySection}>
              {/* Sport */}
              <View style={styles.detailRow}>
                <Ionicons name="fitness-outline" size={20} color="#666" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Sport</Text>
                  <Text style={styles.detailValue}>
                    {(() => {
                      const sports = team.sportTypes && team.sportTypes.length > 0
                        ? team.sportTypes
                        : (team.sportType ? [team.sportType] : []);
                      return sports.map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')).join(', ');
                    })()}
                  </Text>
                </View>
              </View>

              {/* Manager */}
              <View style={styles.detailRow}>
                <Ionicons name="person-circle-outline" size={20} color="#666" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Manager</Text>
                  <Text style={styles.detailValue}>
                    {(() => {
                      const captainMember = team.members?.find((m) => m.role === TeamRole.CAPTAIN);
                      if (captainMember?.user) return `${captainMember.user.firstName} ${captainMember.user.lastName}`;
                      if (team.captain) return `${team.captain.firstName} ${team.captain.lastName}`;
                      return 'Unknown';
                    })()}
                  </Text>
                </View>
              </View>

              {/* Price */}
              {team.joinFee != null && team.joinFee > 0 && (
                <View style={styles.detailRow}>
                  <Ionicons name="cash-outline" size={20} color="#666" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Join Fee</Text>
                    <Text style={styles.detailValue}>${team.joinFee}</Text>
                  </View>
                </View>
              )}

              {/* Skill Level */}
              <View style={styles.detailRow}>
                <Ionicons name="bar-chart-outline" size={20} color="#666" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Skill Level</Text>
                  <Text style={styles.detailValue}>
                    {(team.skillLevel || 'all_levels').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </Text>
                </View>
              </View>

              {/* Gender */}
              {(team as any).genderRestriction && (
                <View style={styles.detailRow}>
                  <Ionicons name="male-female-outline" size={20} color="#666" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Gender</Text>
                    <Text style={styles.detailValue}>
                      {(team as any).genderRestriction === 'male' ? 'Male Only' : (team as any).genderRestriction === 'female' ? 'Female Only' : 'Open to All'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Members List */}
              <Text style={styles.membersTitle}>Players ({activeMembers.length}/{team.maxMembers})</Text>
              {activeMembers.map((member) => (
                <View key={member.userId} style={styles.memberRow}>
                  {member.user?.profileImage ? (
                    <Image source={{ uri: member.user.profileImage }} style={styles.memberAvatar} />
                  ) : (
                    <View style={styles.memberAvatarFallback}>
                      <Text style={styles.memberAvatarInitial}>
                        {member.user?.firstName?.[0] || '?'}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.memberName}>
                    {member.user ? `${member.user.firstName} ${member.user.lastName}` : 'Unknown'}
                  </Text>
                  {member.role === TeamRole.CAPTAIN && (
                    <View style={styles.captainBadge}>
                      <Text style={styles.captainBadgeText}>Manager</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* ── Editable Roster (progressive disclosure like create) ── */}
          {canManageTeam && (() => {
            // Progressive visibility: downstream hides when upstream changes
            const nameOk = formName.trim().length >= 2;
            const sportOk = nameOk && !!formSportType;
            const visOk = sportOk; // visibility is always shown once sport is set (both buttons visible)
            const visSelected = formIsPublic !== undefined; // always true in edit since it has a value
            const maxOk = visOk && visSelected && !!formMaxMembers && parseInt(formMaxMembers) > 0;
            const skillOk = maxOk;

            return (
              <View style={styles.editSection}>
                <Text style={styles.editStepLabel}>Roster Name</Text>
                <TextInput style={styles.editInput} value={formName} onChangeText={setFormName} placeholder="Roster name" placeholderTextColor={colors.inkFaint} />

                {nameOk && (
                  <>
                    <Text style={styles.editStepLabel}>Sport</Text>
                    <FormSelect label="" options={sportTypeOptions} value={formSportType} onSelect={(o) => { setFormSportType(o.value as SportType); setFormSportTypes([o.value as SportType]); }} placeholder="Select a sport..." />
                  </>
                )}

                {sportOk && (
                  <>
                    <Text style={styles.editStepLabel}>Visibility</Text>
                    <View style={styles.editRow}>
                      <TouchableOpacity style={[styles.editToggle, !formIsPublic && styles.editToggleActive]} onPress={() => setFormIsPublic(false)}>
                        <Ionicons name="lock-closed-outline" size={16} color={!formIsPublic ? '#FFF' : colors.ink} />
                        <Text style={[styles.editToggleText, !formIsPublic && styles.editToggleTextActive]}>Private</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.editToggle, formIsPublic && styles.editToggleActive]} onPress={() => setFormIsPublic(true)}>
                        <Ionicons name="globe-outline" size={16} color={formIsPublic ? '#FFF' : colors.ink} />
                        <Text style={[styles.editToggleText, formIsPublic && styles.editToggleTextActive]}>Public</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {visOk && (
                  <>
                    <Text style={styles.editStepLabel}>Max Players</Text>
                    <TextInput style={styles.editInput} value={formMaxMembers} onChangeText={(v) => { const n = parseInt(v, 10); if (!isNaN(n) || v === '') setFormMaxMembers(v === '' ? '' : String(n)); }} placeholder="e.g. 15" placeholderTextColor={colors.inkFaint} keyboardType="number-pad" />
                  </>
                )}

                {maxOk && (
                  <>
                    <Text style={styles.editStepLabel}>Skill Level</Text>
                    <FormSelect label="" options={skillLevelOptions} value={formSkillLevel} onSelect={(o) => setFormSkillLevel(o.value as SkillLevel)} placeholder="All Levels" />
                  </>
                )}
              </View>
            );
          })()}

          {/* ── Invites Section (managers only, visible when all fields filled) ── */}
          {canManageTeam && formName.trim().length >= 2 && !!formSportType && !!formMaxMembers && parseInt(formMaxMembers) > 0 && (
            <View style={styles.addMembersSection}>
              <Text style={styles.editStepLabel}>Invite Players</Text>
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
            {/* Edit button — shown to managers when in read-only view */}
            {!readOnly && isManagerRole && !editMode && (
              <FormButton
                title="Edit"
                onPress={() => setEditMode(true)}
                variant="outline"
                leftIcon="create-outline"
              />
            )}

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
  // ── Read-only detail styles (event-detail style) ──
  readOnlySection: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
  detailValue: {
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.ink,
    marginTop: 1,
  },
  membersTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
    marginTop: 16,
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  memberAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.pine + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarInitial: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.pine,
  },
  memberName: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  captainBadge: {
    backgroundColor: '#E8A030',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  captainBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: fonts.label,
  },
  // ── Edit mode styles (matches create roster) ──
  editSection: {
    gap: 0,
  },
  editStepLabel: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.cream,
  },
  editRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.cream,
    gap: 6,
  },
  editToggleActive: {
    backgroundColor: colors.pine,
    borderColor: colors.pine,
  },
  editToggleText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.ink,
  },
  editToggleTextActive: {
    color: '#FFFFFF',
  },
});