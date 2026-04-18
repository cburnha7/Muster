import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
  TextInput,
  Share,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { FormSelect } from '../../components/forms/FormSelect';
import { AddMemberSearch } from '../../components/teams/AddMemberSearch';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { teamService } from '../../services/api/TeamService';
import { conversationService } from '../../services/api/ConversationService';
import { playerDuesService } from '../../services/api/PlayerDuesService';
import { cacheService } from '../../services/api/CacheService';
import {
  setSelectedTeam,
  updateTeam,
  removeTeam,
  joinTeam as joinTeamAction,
  leaveTeam as leaveTeamAction,
} from '../../store/slices/teamsSlice';
import { selectUser } from '../../store/slices/authSlice';
import {
  Team,
  TeamMember,
  TeamRole,
  MemberStatus,
  SportType,
  SkillLevel,
  Event,
  User,
} from '../../types';
import { colors, fonts, useTheme } from '../../theme';
import {
  DuesStatusBadge,
  DuesStatus,
} from '../../components/dues/DuesStatusBadge';
import { PlayerCard } from '../../components/ui/PlayerCard';
import { loggingService } from '../../services/LoggingService';
import {
  HeroSection,
  PersonRow,
  DetailCard,
  FixedBottomCTA,
} from '../../components/detail';
import { getSportColor } from '../../constants/sportColors';
import * as DocumentPicker from 'expo-document-picker';
import { scheduleParserService } from '../../services/ScheduleParserService';
import { API_BASE_URL } from '../../services/api/config';

interface TeamDetailsScreenProps {
  route: { params: { teamId: string; readOnly?: boolean } };
}

const sportTypeOptions = [
  { label: 'Baseball', value: SportType.BASEBALL },
  { label: 'Basketball', value: SportType.BASKETBALL },
  { label: 'Flag Football', value: SportType.FLAG_FOOTBALL },
  { label: 'Hockey', value: SportType.HOCKEY },
  { label: 'Kickball', value: SportType.KICKBALL },
  { label: 'Pickleball', value: SportType.PICKLEBALL },
  { label: 'Soccer', value: SportType.SOCCER },
  { label: 'Softball', value: SportType.SOFTBALL },
  { label: 'Tennis', value: SportType.TENNIS },
  { label: 'Volleyball', value: SportType.VOLLEYBALL },
  { label: 'Other', value: SportType.OTHER },
];

const skillLevelOptions = [
  { label: 'All Levels', value: SkillLevel.ALL_LEVELS },
  { label: 'Beginner', value: SkillLevel.BEGINNER },
  { label: 'Intermediate', value: SkillLevel.INTERMEDIATE },
  { label: 'Advanced', value: SkillLevel.ADVANCED },
];

export function TeamDetailsScreen({ route }: TeamDetailsScreenProps) {
  const { colors: themeColors } = useTheme();
  const { teamId, readOnly } = route.params ?? {};
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectUser);

  // Loading / error state
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSportType, setFormSportType] = useState<SportType>(
    SportType.BASKETBALL
  );
  const [formSportTypes, setFormSportTypes] = useState<SportType[]>([]);
  const [formSkillLevel, setFormSkillLevel] = useState<SkillLevel>(
    SkillLevel.ALL_LEVELS
  );
  const [formMaxMembers, setFormMaxMembers] = useState('10');
  const [formIsPublic, setFormIsPublic] = useState(true);
  const [_formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Related data
  const [leagues, setLeagues] = useState<any[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  // Dues status (visible to roster manager)
  const [playerDuesMap, setPlayerDuesMap] = useState<Map<string, DuesStatus>>(
    new Map()
  );
  const [duesAmount, setDuesAmount] = useState<number | null>(null);
  const [_activeSeason, setActiveSeason] = useState<any>(null);

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conflictEvents, setConflictEvents] = useState<
    { id: string; title: string; startTime: string }[]
  >([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
    dateOfBirth?: string;
    gender?: string;
  } | null>(null);

  // Derived state
  const isMember = team?.members?.some(
    m => m.userId === currentUser?.id && m.status === MemberStatus.ACTIVE
  );
  const currentMember = team?.members?.find(m => m.userId === currentUser?.id);
  const isCaptain = currentMember?.role === TeamRole.CAPTAIN;
  const isManagerRole =
    isCaptain || currentMember?.role === TeamRole.CO_CAPTAIN;
  const [editMode, setEditMode] = useState(false);
  const isPendingInvite = team?.members?.some(
    m => m.userId === currentUser?.id && m.status === MemberStatus.PENDING
  );

  const activeMembers =
    team?.members?.filter(m => m.status === MemberStatus.ACTIVE) || [];
  const pendingMembers =
    team?.members?.filter(m => m.status === MemberStatus.PENDING) || [];
  const allMemberIds = team?.members?.map(m => m.userId) || [];

  // Upcoming events (future only, sorted: unscheduled first, then chronological)
  const upcomingEvents = events
    .filter(e => new Date(e.startTime) >= new Date())
    .sort((a, b) => {
      // Unscheduled (pending) events sort before scheduled
      const aUnscheduled = (a as any).scheduledStatus === 'unscheduled' ? 0 : 1;
      const bUnscheduled = (b as any).scheduledStatus === 'unscheduled' ? 0 : 1;
      if (aUnscheduled !== bUnscheduled) return aUnscheduled - bUnscheduled;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

  // Set header "Edit" button for managers
  useEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        !readOnly && isManagerRole ? (
          <TouchableOpacity
            onPress={() => setEditMode(true)}
            style={{ marginRight: 16 }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontFamily: fonts.ui,
                fontSize: 16,
                color: colors.cobalt,
              }}
            >
              Edit
            </Text>
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, readOnly, isManagerRole]);

  // Sync form state when team loads
  useEffect(() => {
    if (team) {
      setFormName(team.name || '');
      setFormDescription(team.description || '');
      setFormSportType(team.sportType || SportType.BASKETBALL);
      setFormSportTypes(
        team.sportTypes && team.sportTypes.length > 0
          ? team.sportTypes
          : team.sportType
            ? [team.sportType]
            : [SportType.BASKETBALL]
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
        const active = seasons.find(
          (s: any) => s.isActive && s.duesAmount && s.duesAmount > 0
        );
        if (active) {
          setActiveSeason(active);
          const result = await playerDuesService.getRosterStatus(
            teamId,
            active.id
          );
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
        await Promise.all([
          loadTeamDetails(),
          loadTeamLeagues(),
          loadTeamEvents(),
          loadPlayerDuesStatus(),
        ]);
        if (isMounted) setIsLoading(false);
        // Fetch unread count for team chat (best-effort, don't block)
        try {
          const convs = await conversationService.getConversations('TEAM_CHAT');
          const teamConv = convs.find(c => c.entityId === teamId);
          if (teamConv && isMounted)
            setChatUnreadCount(teamConv.unreadCount ?? 0);
        } catch {
          /* non-critical */
        }
      };
      load();
      return () => {
        isMounted = false;
      };
    }, [
      loadTeamDetails,
      loadTeamLeagues,
      loadTeamEvents,
      loadPlayerDuesStatus,
      teamId,
    ])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadTeamDetails(),
      loadTeamLeagues(),
      loadTeamEvents(),
      loadPlayerDuesStatus(),
    ]);
    setIsRefreshing(false);
  };

  // ── Form validation ──
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formName.trim()) {
      errs.name = 'Roster name is required';
      loggingService.logValidation(
        'TeamDetailsScreen',
        'name',
        'required',
        'Roster name is required'
      );
    } else if (formName.length < 3) {
      errs.name = 'Roster name must be at least 3 characters';
      loggingService.logValidation(
        'TeamDetailsScreen',
        'name',
        'minLength',
        'Roster name must be at least 3 characters'
      );
    } else if (formName.length > 50) {
      errs.name = 'Roster name must be less than 50 characters';
      loggingService.logValidation(
        'TeamDetailsScreen',
        'name',
        'maxLength',
        'Roster name must be less than 50 characters'
      );
    }
    if (formDescription && formDescription.length > 500) {
      errs.description = 'Description must be less than 500 characters';
      loggingService.logValidation(
        'TeamDetailsScreen',
        'description',
        'maxLength',
        'Description must be less than 500 characters'
      );
    }
    const maxNum = parseInt(formMaxMembers, 10);
    if (isNaN(maxNum) || maxNum < 2) {
      errs.maxMembers = 'Roster must allow at least 2 players';
      loggingService.logValidation(
        'TeamDetailsScreen',
        'maxMembers',
        'min',
        'Roster must allow at least 2 players'
      );
    } else if (maxNum > 100) {
      errs.maxMembers = 'Maximum players cannot exceed 100';
      loggingService.logValidation(
        'TeamDetailsScreen',
        'maxMembers',
        'max',
        'Maximum players cannot exceed 100'
      );
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
        updates.sportType =
          (formSportTypes.length > 0 ? formSportTypes[0] : formSportType) ??
          SportType.BASKETBALL;
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

  // Accept invitation — same as joining
  const handleConfirmInvite = handleJoinTeam;

  const handleDeclineInvitation = async () => {
    loggingService.logButton('Decline Invitation', 'TeamDetailsScreen', {
      teamId,
    });

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
      if (
        window.confirm(
          'Are you sure you want to decline this roster invitation?'
        )
      ) {
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
      setShowDeleteModal(false);
      // Handle upcoming event conflict
      const data = err?.response?.data || err?.data;
      if (
        data?.error === 'UPCOMING_EVENTS_CONFLICT' &&
        data?.events?.length > 0
      ) {
        setConflictEvents(data.events);
        setShowConflictModal(true);
      } else {
        Alert.alert(
          'Error',
          data?.message || err.message || 'Failed to delete roster.'
        );
      }
    }
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

  // ── Share invite link ──
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const handleShareInviteLink = async () => {
    setIsGeneratingLink(true);
    try {
      const result = await teamService.generateInviteLink(teamId);
      const shareMessage = `Join ${team?.name ?? 'our roster'} on Muster! Tap the link to sign up and join the roster: ${result.link}`;

      await Share.share(
        Platform.OS === 'ios'
          ? { message: shareMessage, url: result.link }
          : { message: shareMessage }
      );
    } catch (err: any) {
      if (err?.message !== 'User did not share') {
        Alert.alert('Error', err?.message || 'Failed to generate invite link.');
      }
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // ── Import Schedule ──
  const handleImportSchedule = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/pdf',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      const ext = file.name?.toLowerCase().split('.').pop() || '';

      if (!['csv', 'xlsx', 'xls', 'pdf'].includes(ext)) {
        Alert.alert(
          'Unsupported File',
          'Please select a CSV, Excel (.xlsx, .xls), or PDF file.'
        );
        return;
      }

      if (ext === 'pdf') {
        // Upload to server for PDF parsing
        const formData = new FormData();
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: 'application/pdf',
        } as any);
        const response = await fetch(`${API_BASE_URL}/schedule/parse-pdf`, {
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const data = await response.json();
        if (!data.success || data.gameRows.length === 0) {
          Alert.alert(
            'Parse Error',
            data.errors?.[0] || 'Could not extract games from this PDF.'
          );
          return;
        }
        (navigation as any).navigate('ScheduleReview', {
          gameRows: data.gameRows,
          team,
        });
      } else {
        // CSV or Excel — parse on frontend
        const fileResponse = await fetch(file.uri);
        if (ext === 'csv') {
          const text = await fileResponse.text();
          const parsed = scheduleParserService.parseCSV(text);
          if (!parsed.success || parsed.gameRows.length === 0) {
            Alert.alert(
              'Parse Error',
              parsed.errors?.[0] || 'Could not extract games from this file.'
            );
            return;
          }
          (navigation as any).navigate('ScheduleReview', {
            gameRows: parsed.gameRows,
            team,
          });
        } else {
          const buffer = await fileResponse.arrayBuffer();
          const parsed = scheduleParserService.parseExcel(buffer);
          if (!parsed.success || parsed.gameRows.length === 0) {
            Alert.alert(
              'Parse Error',
              parsed.errors?.[0] || 'Could not extract games from this file.'
            );
            return;
          }
          (navigation as any).navigate('ScheduleReview', {
            gameRows: parsed.gameRows,
            team,
          });
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to import schedule');
    }
  };

  // ── Open player card ──
  const openPlayerCard = (member: TeamMember) => {
    const user = member.user;
    if (!user) return;
    setSelectedPlayer({
      id: member.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      ...(user.profileImage !== undefined
        ? { profileImage: user.profileImage }
        : {}),
      ...(typeof (user as any).dateOfBirth === 'string'
        ? { dateOfBirth: (user as any).dateOfBirth }
        : {}),
      ...(typeof (user as any).gender === 'string'
        ? { gender: (user as any).gender }
        : {}),
    });
  };

  // ── Derived display values ──
  const sportLabel = (() => {
    const sports =
      team?.sportTypes && team.sportTypes.length > 0
        ? team.sportTypes
        : team?.sportType
          ? [team.sportType]
          : [];
    return (
      sports
        .map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' '))
        .join(', ') || 'Sport'
    );
  })();

  const skillLabel = (team?.skillLevel || 'all_levels')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  const managerName = (() => {
    const captainMember = team?.members?.find(m => m.role === TeamRole.CAPTAIN);
    if (captainMember?.user)
      return `${captainMember.user.firstName} ${captainMember.user.lastName}`;
    if (team?.captain)
      return `${team.captain.firstName} ${team.captain.lastName}`;
    return 'Unknown';
  })();

  const formatDate = (dateStr: string | Date) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });

  // ── Loading / Error states ──
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !team) {
    return (
      <View style={styles.container}>
        <ErrorDisplay
          message={error || 'Roster not found'}
          onRetry={loadTeamDetails}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.bgScreen }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.cobalt}
          />
        }
      >
        {/* ── Invitation Banner ── */}
        {isPendingInvite && (
          <View style={styles.invitationBanner}>
            <View style={styles.invitationBannerIcon}>
              <Ionicons name="mail-outline" size={24} color={colors.gold} />
            </View>
            <View style={styles.invitationBannerContent}>
              <Text style={styles.invitationBannerTitle}>
                You've been invited!
              </Text>
              <Text style={styles.invitationBannerText}>
                You've been invited to join this roster. Review the details
                below and decide if you'd like to join.
              </Text>
            </View>
          </View>
        )}

        {!editMode ? (
          <>
            {/* ── HeroSection ── */}
            <HeroSection
              title={team.name}
              sportColor={getSportColor(team.sportType || team.sportTypes?.[0])}
              badges={[
                { label: sportLabel },
                { label: skillLabel },
                team.isPublic ? { label: 'Public' } : { label: 'Private' },
              ]}
              headline={`${activeMembers.length} / ${team.maxMembers ?? '∞'} players`}
              subline={`Managed by ${managerName}`}
            />

            {/* ── Team Chat button ── */}
            {isMember && (
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={async () => {
                  try {
                    const conv =
                      await conversationService.getOrCreateTeamChat(teamId);
                    (navigation as any).navigate('Messages', {
                      screen: 'Chat',
                      params: {
                        conversationId: conv.id,
                        title: team.name ?? 'Team Chat',
                        type: 'TEAM_CHAT',
                      },
                    });
                  } catch (e) {
                    console.error('Navigate to chat error:', e);
                    Alert.alert(
                      'Error',
                      'Could not open team chat. Please try again.'
                    );
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={18}
                  color={colors.cobalt}
                />
                <Text style={styles.chatBtnText}>
                  Team Chat
                  {chatUnreadCount > 0 ? ` · ${chatUnreadCount} new` : ''}
                </Text>
              </TouchableOpacity>
            )}

            {/* ── Share Invite Link (managers only) ── */}
            {!readOnly && isManagerRole && isMember && (
              <TouchableOpacity
                style={styles.inviteLinkBtn}
                onPress={handleShareInviteLink}
                activeOpacity={0.8}
                disabled={isGeneratingLink}
              >
                <Ionicons name="link-outline" size={18} color={colors.gold} />
                <Text style={styles.inviteLinkBtnText}>
                  {isGeneratingLink
                    ? 'Generating link...'
                    : 'Share Invite Link'}
                </Text>
              </TouchableOpacity>
            )}

            {/* ── Teammates card ── */}
            <DetailCard
              title="Your teammates"
              delay={50}
              {...(!readOnly && isManagerRole
                ? {
                    action: {
                      label: 'Invite',
                      onPress: () => setEditMode(true),
                    },
                  }
                : {})}
            >
              {activeMembers.length <= 1 && (
                <Text style={styles.emptyMsg}>
                  Your roster needs more players — share the code to grow
                </Text>
              )}
              {activeMembers.map(m => {
                const isMe = m.userId === currentUser?.id;
                const showDues =
                  !readOnly &&
                  isManagerRole &&
                  duesAmount != null &&
                  playerDuesMap.size > 0;
                return (
                  <PersonRow
                    key={m.userId}
                    name={
                      m.user
                        ? `${m.user.firstName} ${m.user.lastName}`
                        : 'Unknown'
                    }
                    {...(m.role === TeamRole.CAPTAIN
                      ? { role: 'Captain' }
                      : m.role === TeamRole.CO_CAPTAIN
                        ? { role: 'Co-Captain' }
                        : {})}
                    {...(showDues
                      ? {
                          rightElement: (
                            <DuesStatusBadge
                              status={playerDuesMap.get(m.userId) ?? 'unpaid'}
                            />
                          ),
                        }
                      : !isMe
                        ? {
                            rightElement: (
                              <TouchableOpacity
                                onPress={async () => {
                                  try {
                                    const conv =
                                      await conversationService.getDM(m.userId);
                                    (navigation as any).navigate('Messages', {
                                      screen: 'Chat',
                                      params: {
                                        conversationId: conv.id,
                                        title: m.user
                                          ? `${m.user.firstName} ${m.user.lastName}`
                                          : 'Chat',
                                        type: 'DIRECT_MESSAGE',
                                      },
                                    });
                                  } catch (e: any) {
                                    Alert.alert(
                                      'Cannot message',
                                      e?.data?.error ||
                                        'Could not start conversation'
                                    );
                                  }
                                }}
                                hitSlop={{
                                  top: 10,
                                  bottom: 10,
                                  left: 10,
                                  right: 10,
                                }}
                                activeOpacity={0.75}
                              >
                                <Ionicons
                                  name="chatbubble-outline"
                                  size={18}
                                  color={colors.primary}
                                />
                              </TouchableOpacity>
                            ),
                          }
                        : {})}
                    onPress={() => openPlayerCard(m)}
                  />
                );
              })}
              {pendingMembers.length > 0 && (
                <>
                  <Text style={styles.pendingHeader}>Pending</Text>
                  {pendingMembers.map(m => (
                    <PersonRow
                      key={m.userId}
                      name={
                        m.user
                          ? `${m.user.firstName} ${m.user.lastName}`
                          : 'Unknown'
                      }
                      role="Invited"
                    />
                  ))}
                </>
              )}

              {/* Leave link for regular members (non-captain) */}
              {isMember && !isCaptain && (
                <TouchableOpacity
                  onPress={() => setShowLeaveModal(true)}
                  style={styles.leaveLink}
                  activeOpacity={0.7}
                >
                  <Text style={styles.leaveLinkText}>Leave roster</Text>
                </TouchableOpacity>
              )}
            </DetailCard>

            {/* ── Leagues card ── */}
            {leagues.length > 0 && (
              <DetailCard title="Leagues" delay={100}>
                {leagues.map((league: any) => {
                  const isPending = league.membership?.status === 'pending';
                  return (
                    <TouchableOpacity
                      key={league.id}
                      onPress={() =>
                        (navigation as any).navigate('Leagues', {
                          screen: 'LeagueDetails',
                          params: { leagueId: league.id, readOnly: true },
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.leagueRow,
                          isPending && styles.leagueRowPending,
                        ]}
                      >
                        <Ionicons
                          name="trophy-outline"
                          size={20}
                          color={isPending ? colors.gold : colors.cobalt}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.leagueName}>{league.name}</Text>
                          <Text style={styles.leagueSport}>
                            {league.sportType}
                          </Text>
                        </View>
                        {isPending && (
                          <View style={styles.pendingLeagueBadge}>
                            <Text style={styles.pendingLeagueBadgeText}>
                              Pending
                            </Text>
                          </View>
                        )}
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={colors.onSurfaceVariant}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </DetailCard>
            )}

            {/* ── Upcoming games card ── */}
            <DetailCard title="Upcoming games" delay={150}>
              {upcomingEvents.length === 0 ? (
                <Text style={styles.emptyMsg}>No games scheduled yet</Text>
              ) : (
                upcomingEvents.slice(0, 3).map(event => (
                  <TouchableOpacity
                    key={event.id}
                    onPress={() =>
                      (navigation as any).navigate('EventDetails', {
                        eventId: event.id,
                      })
                    }
                    style={styles.eventRow}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.eventDate}>
                      {formatDate(event.startTime)}
                    </Text>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>
                ))
              )}
            </DetailCard>

            {/* ── Import Schedule for managers ── */}
            {!readOnly && isManagerRole && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginHorizontal: 16,
                  marginTop: 12,
                  marginBottom: 4,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: colors.cobalt + '12',
                }}
                onPress={handleImportSchedule}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={colors.cobalt}
                />
                <Text
                  style={{
                    fontFamily: fonts.label,
                    fontSize: 14,
                    color: colors.cobalt,
                  }}
                >
                  Import Schedule
                </Text>
              </TouchableOpacity>
            )}

            {/* ── Edit / Delete for captain ── */}
            {!readOnly && isCaptain && (
              <View style={styles.ownerActions}>
                <TouchableOpacity
                  style={styles.ownerEditBtn}
                  onPress={() => setEditMode(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.ownerEditBtnText}>Edit Roster</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.ownerDeleteBtn}
                  onPress={() => setShowDeleteModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.ownerDeleteBtnText}>Delete Roster</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          /* ── Edit mode: progressive disclosure form ── */
          <View style={[styles.editSection, { padding: 20 }]}>
            {(() => {
              const nameOk = formName.trim().length >= 2;
              const sportOk = nameOk && !!formSportType;
              const visOk = sportOk;
              const visSelected = formIsPublic !== undefined;
              const maxOk =
                visOk &&
                visSelected &&
                !!formMaxMembers &&
                parseInt(formMaxMembers) > 0;

              return (
                <>
                  <Text style={styles.editStepLabel}>Roster Name</Text>
                  <TextInput
                    style={styles.editInput}
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="Roster name"
                    placeholderTextColor={colors.inkFaint}
                  />

                  {nameOk && (
                    <>
                      <Text style={styles.editStepLabel}>Sport</Text>
                      <FormSelect
                        label=""
                        options={sportTypeOptions}
                        value={formSportType}
                        onSelect={o => {
                          setFormSportType(o.value as SportType);
                          setFormSportTypes([o.value as SportType]);
                        }}
                        placeholder="Select a sport..."
                      />
                    </>
                  )}

                  {sportOk && (
                    <>
                      <Text style={styles.editStepLabel}>Visibility</Text>
                      <View style={styles.editRow}>
                        <TouchableOpacity
                          style={[
                            styles.editToggle,
                            !formIsPublic && styles.editToggleActive,
                          ]}
                          onPress={() => setFormIsPublic(false)}
                          activeOpacity={0.75}
                        >
                          <Ionicons
                            name="lock-closed-outline"
                            size={16}
                            color={!formIsPublic ? '#FFF' : colors.ink}
                          />
                          <Text
                            style={[
                              styles.editToggleText,
                              !formIsPublic && styles.editToggleTextActive,
                            ]}
                          >
                            Private
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.editToggle,
                            formIsPublic && styles.editToggleActive,
                          ]}
                          onPress={() => setFormIsPublic(true)}
                          activeOpacity={0.75}
                        >
                          <Ionicons
                            name="globe-outline"
                            size={16}
                            color={formIsPublic ? '#FFF' : colors.ink}
                          />
                          <Text
                            style={[
                              styles.editToggleText,
                              formIsPublic && styles.editToggleTextActive,
                            ]}
                          >
                            Public
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {visOk && (
                    <>
                      <Text style={styles.editStepLabel}>Max Players</Text>
                      <TextInput
                        style={styles.editInput}
                        value={formMaxMembers}
                        onChangeText={v => {
                          const n = parseInt(v, 10);
                          if (!isNaN(n) || v === '')
                            setFormMaxMembers(v === '' ? '' : String(n));
                        }}
                        placeholder="e.g. 15"
                        placeholderTextColor={colors.inkFaint}
                        keyboardType="number-pad"
                      />
                    </>
                  )}

                  {maxOk && (
                    <>
                      <Text style={styles.editStepLabel}>Skill Level</Text>
                      <FormSelect
                        label=""
                        options={skillLevelOptions}
                        value={formSkillLevel}
                        onSelect={o => setFormSkillLevel(o.value as SkillLevel)}
                        placeholder="All Levels"
                      />
                    </>
                  )}
                </>
              );
            })()}

            {/* ── Invite Players (visible when all fields filled) ── */}
            {formName.trim().length >= 2 &&
              !!formSportType &&
              !!formMaxMembers &&
              parseInt(formMaxMembers) > 0 && (
                <View style={styles.addMembersSection}>
                  <Text style={styles.editStepLabel}>Invite Players</Text>
                  <AddMemberSearch
                    onAddMember={handleAddMemberDirectly}
                    existingMemberIds={allMemberIds}
                  />
                </View>
              )}
          </View>
        )}
      </ScrollView>

      {/* ── Fixed Bottom CTA ── */}
      {!editMode && (
        <>
          {!isMember && !isPendingInvite && (
            <FixedBottomCTA
              label="Join this roster"
              onPress={handleJoinTeam}
              variant="primary"
            />
          )}
          {isPendingInvite && (
            <FixedBottomCTA
              label="Accept invitation"
              onPress={handleConfirmInvite}
              variant="primary"
              secondaryLabel="Decline"
              onSecondaryPress={handleDeclineInvitation}
            />
          )}
        </>
      )}
      {editMode && (
        <FixedBottomCTA
          label="Save changes"
          onPress={handleUpdateTeam}
          variant="primary"
          loading={isSaving}
          secondaryLabel="Cancel"
          onSecondaryPress={() => setEditMode(false)}
        />
      )}

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

      {/* Upcoming event conflict modal */}
      <Modal
        visible={showConflictModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConflictModal(false)}
      >
        <Pressable
          style={styles.conflictBackdrop}
          onPress={() => setShowConflictModal(false)}
        >
          <View style={styles.conflictModal}>
            <Ionicons
              name="warning-outline"
              size={32}
              color={colors.heart}
              style={{ alignSelf: 'center', marginBottom: 12 }}
            />
            <Text style={styles.conflictTitle}>Can't Delete Yet</Text>
            <Text style={styles.conflictMessage}>
              This roster is registered in upcoming events. Remove it from each
              event before deleting.
            </Text>
            {conflictEvents.map(evt => (
              <TouchableOpacity
                key={evt.id}
                style={styles.conflictEventRow}
                onPress={() => {
                  setShowConflictModal(false);
                  (navigation as any).navigate('Home', {
                    screen: 'EventDetails',
                    params: { eventId: evt.id, returnTo: 'Roster' },
                  });
                }}
                activeOpacity={0.7}
              >
                <View style={styles.conflictEventInfo}>
                  <Text style={styles.conflictEventTitle} numberOfLines={1}>
                    {evt.title}
                  </Text>
                  <Text style={styles.conflictEventDate}>
                    {new Date(evt.startTime).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.pine}
                />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.conflictDismissBtn}
              onPress={() => setShowConflictModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.conflictDismissText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

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

      <PlayerCard
        visible={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        player={selectedPlayer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Invitation banner
  invitationBanner: {
    flexDirection: 'row',
    backgroundColor: colors.goldLight + '20',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: colors.goldLight + '40',
    gap: 12,
  },
  invitationBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.goldLight + '30',
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
  // Teammates card
  emptyMsg: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  pendingHeader: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 4,
  },
  // Leave link
  leaveLink: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 6,
  },
  leaveLinkText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.error,
  },
  // Leagues card
  leagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  leagueRowPending: {
    opacity: 0.8,
  },
  leagueName: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.onSurface,
  },
  leagueSport: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  pendingLeagueBadge: {
    backgroundColor: colors.goldLight,
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
  // Events card
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  eventDate: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    width: 48,
  },
  eventTitle: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.onSurface,
    flex: 1,
  },
  // Owner edit/delete actions
  ownerActions: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
  },
  ownerEditBtn: {
    backgroundColor: colors.pine,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ownerEditBtnText: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: '#FFFFFF',
  },
  ownerDeleteBtn: {
    borderWidth: 2,
    borderColor: colors.heart,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ownerDeleteBtnText: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: colors.heart,
  },
  // Invites / Add members section
  addMembersSection: {
    marginTop: 16,
    gap: 12,
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
    borderColor: colors.white,
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
    borderColor: colors.white,
    gap: 6,
  },
  editToggleActive: {
    backgroundColor: colors.cobalt,
    borderColor: colors.cobalt,
  },
  editToggleText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.ink,
  },
  editToggleTextActive: {
    color: '#FFFFFF',
  },
  // Legacy retained for badge rendering compatibility
  pendingBadge: {
    backgroundColor: colors.goldLight + '30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gold,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.cobalt + '12',
    gap: 8,
  },
  chatBtnText: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.cobalt,
  },
  inviteLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.gold + '18',
    gap: 8,
  },
  inviteLinkBtnText: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.gold,
  },
  conflictBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 31, 61, 0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  conflictModal: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    maxHeight: '70%',
  },
  conflictTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  conflictMessage: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: 20,
  },
  conflictEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  conflictEventInfo: { flex: 1, gap: 2 },
  conflictEventTitle: {
    fontFamily: fonts.headingSemi || fonts.heading,
    fontSize: 15,
    color: colors.ink,
  },
  conflictEventDate: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
  },
  conflictDismissBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  conflictDismissText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.ink,
  },
});
