import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { LeagueForm } from '../../components/league/LeagueForm';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';

import { LeagueService } from '../../services/api/LeagueService';
import { leagueService } from '../../services/api/LeagueService';
import { SportType, Team, Event, UpdateLeagueData } from '../../types';
import { League, LeagueMembership } from '../../types/league';
import { colors, fonts } from '../../theme';
import { RootState } from '../../store/store';
import { selectUserTeams } from '../../store/slices/teamsSlice';

/** Shape returned by GET /api/leagues/:id/events */
interface LeagueEvent extends Event {
  assignedRosters: Array<{ id: string; name: string }>;
  scheduledStatus?: string;
}

const MAX_UPCOMING_EVENTS = 3;

// Import tab components
import { StandingsTab } from './tabs/StandingsTab';
import { MatchesTab } from './tabs/MatchesTab';
import { PlayersTab } from './tabs/PlayersTab';
import { TeamsTab } from './tabs/TeamsTab';
import { InfoTab } from './tabs/InfoTab';

type TabKey = 'standings' | 'matches' | 'players' | 'teams' | 'info';

export function LeagueDetailsScreen(): React.ReactElement {
  const navigation = useNavigation();
  const route = useRoute();
  const { leagueId } = (route.params as any) || {};

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const userRosters = useSelector(selectUserTeams) as Team[];

  const [league, setLeague] = useState<League | null>(null);
  const [members, setMembers] = useState<LeagueMembership[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<LeagueEvent[]>([]);
  const [joinRequests, setJoinRequests] = useState<LeagueMembership[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [joinRequestActionId, setJoinRequestActionId] = useState<string | null>(null);
  const [joinRequestError, setJoinRequestError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('standings');
  const [isUpdating, setIsUpdating] = useState(false);

  // ── Data loading ────────────────────────────────────────────────
  const loadLeague = useCallback(async (isRefresh = false) => {
    if (!leagueId) return;
    try {
      if (isRefresh) setRefreshing(true);
      else setIsLoading(true);
      setError(null);

      const svc = new LeagueService();
      const [leagueData, membersResponse, eventsData] = await Promise.all([
        svc.getLeagueById(leagueId),
        svc.getMembers(leagueId, 1, 100, true), // includePending for commissioner
        svc.getLeagueEvents(leagueId),
      ]);

      const typedLeague = leagueData as any as League;
      setLeague(typedLeague);
      setMembers(membersResponse.data || []);
      setUpcomingEvents((eventsData as LeagueEvent[]) || []);

      // Load join requests for public team leagues when user is commissioner
      if (
        typedLeague.leagueType === 'team' &&
        typedLeague.visibility === 'public' &&
        currentUser?.id === typedLeague.organizerId
      ) {
        try {
          const requests = await svc.getJoinRequests(leagueId, currentUser.id);
          setJoinRequests(requests || []);
        } catch {
          setJoinRequests([]);
        }
      } else {
        setJoinRequests([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load league');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [leagueId, currentUser]);

  useFocusEffect(useCallback(() => { loadLeague(); }, [loadLeague]));

  // ── Derived state ───────────────────────────────────────────────
  const isOperator = league ? currentUser?.id === league.organizerId : false;
  const isTeamLeague = league?.leagueType === 'team';

  const activeMembers = members.filter((m) => m.status === 'active' || m.status === 'pending');
  const userPickupMembership = members.find(
    (m) => m.memberType === 'user' && m.memberId === currentUser?.id && m.status === 'active'
  );
  const isPickupParticipant = !!userPickupMembership;

  const rosterIdsInLeague = new Set(
    activeMembers.filter((m) => m.memberType === 'roster').map((m) => m.memberId)
  );
  const userOwnedRosters = (userRosters || []).filter((r) => r.captainId === currentUser?.id);
  const eligibleRosters = userOwnedRosters.filter((r) => !rosterIdsInLeague.has(r.id));
  const hasEligibleRoster = eligibleRosters.length > 0;

  // Check if user has a pending roster invitation they can confirm
  const pendingUserRosterInvitations = members.filter(
    (m) => m.status === 'pending' && m.memberType === 'roster' &&
      userOwnedRosters.some((r) => r.id === m.memberId)
  );

  // ── Helpers ─────────────────────────────────────────────────────
  const getSportIcon = (sportType: string) => {
    switch (sportType) {
      case SportType.BASKETBALL: case 'basketball': return 'basketball-outline';
      case SportType.SOCCER: case 'soccer': return 'football-outline';
      case SportType.TENNIS: case 'tennis':
      case SportType.PICKLEBALL: case 'pickleball':
      case SportType.BADMINTON: case 'badminton': return 'tennisball-outline';
      case SportType.VOLLEYBALL: case 'volleyball': return 'american-football-outline';
      case SportType.SOFTBALL: case 'softball':
      case SportType.BASEBALL: case 'baseball': return 'baseball-outline';
      case SportType.FLAG_FOOTBALL: case 'flag_football': return 'flag-outline';
      case SportType.KICKBALL: case 'kickball': return 'football-outline';
      default: return 'fitness-outline';
    }
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return 'TBD';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatEventDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatEventTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // ── Commissioner actions ────────────────────────────────────────
  const handleUpdateLeague = async (data: UpdateLeagueData) => {
    if (!currentUser?.id) return;
    try {
      setIsUpdating(true);
      const updated = await leagueService.updateLeague(leagueId, data, currentUser.id);
      setLeague(updated as any as League);
      Alert.alert('Success', 'League updated successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update league';
      Alert.alert('Error', msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteLeague = () => {
    if (!currentUser?.id || !league) return;
    Alert.alert('Delete League', `Are you sure you want to delete "${league.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            setIsActionLoading(true);
            await leagueService.deleteLeague(leagueId, currentUser.id);
            Alert.alert('Deleted', 'League has been deleted');
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete league');
          } finally {
            setIsActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleRemoveRoster = (memberId: string, rosterName: string) => {
    Alert.alert('Remove Roster', `Remove ${rosterName} from this league?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            if (!currentUser?.id) return;
            await leagueService.leaveLeague(leagueId, memberId, currentUser.id);
            // Optimistic update
            setMembers((prev) => prev.filter((m) => m.memberId !== memberId));
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove roster');
          }
        },
      },
    ]);
  };

  const handleGenerateSchedule = async () => {
    if (!league || !currentUser) return;
    Alert.alert('Generate Schedule', 'This will create shell events for all roster matchups. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Generate',
        onPress: async () => {
          try {
            setIsActionLoading(true);
            const svc = new LeagueService();
            await svc.generateSchedule(league.id, currentUser.id);
            Alert.alert('Schedule Generated', 'Shell events have been created.');
            await loadLeague(true);
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to generate schedule');
          } finally {
            setIsActionLoading(false);
          }
        },
      },
    ]);
  };

  // ── Non-commissioner actions ────────────────────────────────────
  const handleJoinTeamLeague = async () => {
    if (!league || !currentUser || eligibleRosters.length === 0) return;
    const roster = eligibleRosters[0]!;
    try {
      setIsActionLoading(true);
      await leagueService.joinLeagueAsRoster(league.id, roster.id, currentUser.id);
      Alert.alert('Request Sent', `Your roster "${roster.name}" has requested to join.`);
      await loadLeague(true);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send join request');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleJoinPickupLeague = async () => {
    if (!league || !currentUser) return;
    try {
      setIsActionLoading(true);
      await leagueService.joinLeagueAsUser(league.id, currentUser.id);
      await loadLeague(true);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to join league');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStepOut = async () => {
    if (!league || !currentUser) return;
    Alert.alert('Step Out', 'Are you sure you want to leave this league?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Step Out', style: 'destructive',
        onPress: async () => {
          try {
            setIsActionLoading(true);
            await leagueService.stepOutOfLeague(league.id, currentUser.id);
            await loadLeague(true);
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to leave league');
          } finally {
            setIsActionLoading(false);
          }
        },
      },
    ]);
  };

  // ── Join request handlers (commissioner) ────────────────────────
  const handleApproveRequest = async (requestId: string) => {
    if (!currentUser?.id) return;
    try {
      setJoinRequestActionId(requestId);
      setJoinRequestError(null);
      const approved = await leagueService.approveJoinRequest(leagueId, requestId, currentUser.id);
      // Optimistic: move from requests to members
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
      setMembers((prev) => [...prev, { ...approved, status: 'active' } as LeagueMembership]);
    } catch (err) {
      setJoinRequestError(err instanceof Error ? err.message : 'Failed to approve request');
    } finally {
      setJoinRequestActionId(null);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!currentUser?.id) return;
    try {
      setJoinRequestActionId(requestId);
      setJoinRequestError(null);
      await leagueService.declineJoinRequest(leagueId, requestId, currentUser.id);
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      setJoinRequestError(err instanceof Error ? err.message : 'Failed to decline request');
    } finally {
      setJoinRequestActionId(null);
    }
  };

  // ── Invitation confirmation (roster owner) ──────────────────────
  const handleConfirmInvitation = async (membership: LeagueMembership) => {
    if (!currentUser?.id) return;
    try {
      setIsActionLoading(true);
      await leagueService.respondToInvitation(leagueId, membership.id, true, currentUser.id);
      // Optimistic: flip pending → active
      setMembers((prev) =>
        prev.map((m) => (m.id === membership.id ? { ...m, status: 'active' as const } : m))
      );
      Alert.alert('Confirmed', 'Your roster has joined the league.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to confirm invitation');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeclineInvitation = async (membership: LeagueMembership) => {
    if (!currentUser?.id) return;
    Alert.alert('Decline Invitation', 'Are you sure you want to decline this league invitation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsActionLoading(true);
            await leagueService.respondToInvitation(leagueId, membership.id, false, currentUser.id);
            setMembers((prev) => prev.filter((m) => m.id !== membership.id));
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to decline invitation');
          } finally {
            setIsActionLoading(false);
          }
        },
      },
    ]);
  };

  // ── Add roster to league (invited user) ─────────────────────────
  const handleAddRosterToLeague = async (roster: Team) => {
    if (!currentUser?.id || !league) return;
    try {
      setIsActionLoading(true);
      const newMembership = await leagueService.joinLeagueAsRoster(league.id, roster.id, currentUser.id);
      setMembers((prev) => [...prev, newMembership as LeagueMembership]);
      Alert.alert('Roster Added', `"${roster.name}" has been added to the league.`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add roster');
    } finally {
      setIsActionLoading(false);
    }
  };

  // ── Navigation handlers ─────────────────────────────────────────
  const handleEventPress = (event: LeagueEvent) => {
    if (isOperator && event.scheduledStatus === 'unscheduled') {
      (navigation as any).navigate('EditEvent', {
        eventId: event.id,
        leagueId: league?.id,
        sportType: league?.sportType,
        assignedRosters: event.assignedRosters,
      });
    } else {
      (navigation as any).navigate('EventDetails', { eventId: event.id });
    }
  };

  // ── Render helpers ──────────────────────────────────────────────

  const renderJoinRequestQueue = () => {
    if (!isOperator || joinRequests.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Join Requests</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{joinRequests.length}</Text>
          </View>
        </View>
        {joinRequestError && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={16} color={colors.track} />
            <Text style={styles.errorRowText}>{joinRequestError}</Text>
          </View>
        )}
        {joinRequests.map((req) => (
          <View key={req.id} style={styles.requestItem}>
            <View style={styles.requestInfo}>
              <Text style={styles.requestName}>
                {req.memberType === 'roster'
                  ? (req as any).team?.name || 'Unknown Roster'
                  : (req as any).user?.name || 'Unknown Player'}
              </Text>
              <Text style={styles.requestMeta}>
                {req.memberType === 'roster' ? 'Roster' : 'Player'} • Requested {formatDate(req.createdAt)}
              </Text>
            </View>
            <View style={styles.requestActions}>
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => handleApproveRequest(req.id)}
                disabled={joinRequestActionId === req.id}
                accessibilityRole="button"
                accessibilityLabel="Approve"
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={() => handleDeclineRequest(req.id)}
                disabled={joinRequestActionId === req.id}
                accessibilityRole="button"
                accessibilityLabel="Decline"
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderRosterSection = () => {
    const rosterMembers = members.filter((m) => m.memberType === 'roster');
    const playerMembers = members.filter((m) => m.memberType === 'user');
    const allMembers = isTeamLeague ? rosterMembers : playerMembers;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isTeamLeague ? 'League Rosters' : 'League Players'}
          </Text>
          <Text style={styles.countText}>{allMembers.length}</Text>
        </View>
        {allMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={40} color={colors.inkFaint} />
            <Text style={styles.emptyText}>
              {isTeamLeague ? 'No rosters have joined yet' : 'No players have joined yet'}
            </Text>
          </View>
        ) : (
          allMembers.map((m) => {
            const name = m.memberType === 'roster'
              ? (m as any).team?.name || 'Unknown Roster'
              : (m as any).user?.name || 'Unknown Player';
            const isPending = m.status === 'pending';
            const canConfirm = isPending && m.memberType === 'roster' &&
              userOwnedRosters.some((r) => r.id === m.memberId);

            return (
              <View key={m.id} style={styles.memberItem}>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{name}</Text>
                  <View style={styles.memberMeta}>
                    <View style={[styles.statusBadge, isPending ? styles.statusPending : styles.statusActive]}>
                      <Text style={[styles.statusText, isPending ? styles.statusTextPending : styles.statusTextActive]}>
                        {isPending ? 'Pending' : 'Joined'}
                      </Text>
                    </View>
                    {!isPending && (
                      <Text style={styles.memberStats}>
                        {m.matchesPlayed} matches • {m.points} pts
                      </Text>
                    )}
                  </View>
                </View>
                {/* Commissioner can remove */}
                {isOperator && (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemoveRoster(m.memberId, name)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${name}`}
                  >
                    <Ionicons name="close-circle" size={22} color={colors.track} />
                  </TouchableOpacity>
                )}
                {/* Roster owner can confirm pending invitation */}
                {canConfirm && !isOperator && (
                  <View style={styles.confirmActions}>
                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={() => handleConfirmInvitation(m)}
                      disabled={isActionLoading}
                      accessibilityRole="button"
                      accessibilityLabel="Confirm invitation"
                    >
                      <Text style={styles.confirmBtnText}>Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineBtnSmall}
                      onPress={() => handleDeclineInvitation(m)}
                      disabled={isActionLoading}
                      accessibilityRole="button"
                      accessibilityLabel="Decline invitation"
                    >
                      <Text style={styles.declineBtnSmallText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    );
  };

  const renderUpcomingEvents = () => {
    if (upcomingEvents.length === 0 && !isOperator) return null;

    const registrationClosed = league?.registrationCloseDate
      ? new Date(league.registrationCloseDate) < new Date()
      : false;
    const showGenerateBtn = isOperator && registrationClosed && !league?.scheduleGenerated && league?.autoGenerateMatchups !== false;
    const shellEvents = upcomingEvents.filter((e) => e.scheduledStatus === 'unscheduled');
    const scheduledEvents = upcomingEvents.filter((e) => e.scheduledStatus !== 'unscheduled');

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Events</Text>
          <Text style={styles.countText}>{upcomingEvents.length}</Text>
        </View>

        {showGenerateBtn && (
          <TouchableOpacity
            style={styles.generateBtn}
            onPress={handleGenerateSchedule}
            disabled={isActionLoading}
            accessibilityRole="button"
            accessibilityLabel="Generate schedule"
          >
            <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
            <Text style={styles.generateBtnText}>Generate Schedule</Text>
          </TouchableOpacity>
        )}

        {/* Shell matchups for commissioner */}
        {isOperator && shellEvents.length > 0 && (
          <View style={styles.matchupList}>
            <Text style={styles.matchupLabel}>UNSCHEDULED MATCHUPS</Text>
            {shellEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.matchupCard}
                onPress={() => handleEventPress(event)}
                accessibilityRole="button"
                accessibilityLabel={`Schedule ${event.title}`}
              >
                <View style={styles.matchupInfo}>
                  <Text style={styles.matchupTitle}>{event.title}</Text>
                  <Text style={styles.matchupRosters}>
                    {event.assignedRosters?.map((r) => r.name).join(' vs ') || 'TBD'}
                  </Text>
                </View>
                <View style={styles.unscheduledBadge}>
                  <Text style={styles.unscheduledText}>Schedule</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.court} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Scheduled events */}
        {scheduledEvents.slice(0, MAX_UPCOMING_EVENTS).map((event) => (
          <TouchableOpacity
            key={event.id}
            style={styles.eventCard}
            onPress={() => handleEventPress(event)}
            accessibilityRole="button"
            accessibilityLabel={event.title}
          >
            <View style={styles.eventDateCol}>
              <Text style={styles.eventDay}>{formatEventDate(event.startTime)}</Text>
              <Text style={styles.eventTime}>{formatEventTime(event.startTime)}</Text>
            </View>
            <View style={styles.eventDetails}>
              <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
              {event.assignedRosters && event.assignedRosters.length > 0 && (
                <Text style={styles.eventRosters} numberOfLines={1}>
                  {event.assignedRosters.map((r) => r.name).join(' vs ')}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
          </TouchableOpacity>
        ))}

        {upcomingEvents.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color={colors.inkFaint} />
            <Text style={styles.emptyText}>No events yet</Text>
          </View>
        )}

        {/* Commissioner event actions */}
        {isOperator && (
          <View style={styles.eventActions}>
            <TouchableOpacity
              style={styles.createEventBtn}
              onPress={() => (navigation as any).navigate('CreateEvent', {
                leagueId: league?.id,
                sportType: league?.sportType,
                assignedRosters: members
                  .filter((m) => m.memberType === 'roster' && m.status === 'active')
                  .map((m) => ({ id: m.memberId, name: (m as any).team?.name || 'Roster' })),
              })}
              accessibilityRole="button"
              accessibilityLabel="Create new event"
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.grass} />
              <Text style={styles.createEventBtnText}>Create New Event</Text>
            </TouchableOpacity>

            {league?.autoGenerateMatchups && shellEvents.length > 0 && (
              <TouchableOpacity
                style={styles.viewMatchupsBtn}
                onPress={() => setActiveTab('matches' as TabKey)}
                accessibilityRole="button"
                accessibilityLabel="View auto-generated matchups"
              >
                <Ionicons name="list-outline" size={18} color={colors.court} />
                <Text style={styles.viewMatchupsBtnText}>View Auto-Generated Matchups</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderAddRosterOption = () => {
    // Show for invited users who have eligible rosters to add
    if (isOperator || !isTeamLeague || eligibleRosters.length === 0) return null;
    // Only show if user has some connection to the league (pending invitation or active member)
    const userHasConnection = members.some(
      (m) => m.memberType === 'user' && m.memberId === currentUser?.id
    ) || pendingUserRosterInvitations.length > 0;
    if (!userHasConnection && !isPickupParticipant) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add a Roster</Text>
        <Text style={styles.sectionSubtext}>Select one of your rosters to add to this league</Text>
        {eligibleRosters.map((roster) => (
          <TouchableOpacity
            key={roster.id}
            style={styles.addRosterItem}
            onPress={() => handleAddRosterToLeague(roster)}
            disabled={isActionLoading}
            accessibilityRole="button"
            accessibilityLabel={`Add ${roster.name}`}
          >
            <Ionicons name="add-circle-outline" size={22} color={colors.grass} />
            <Text style={styles.addRosterName}>{roster.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderActionBar = () => {
    if (isOperator) return null;
    if (!isAuthenticated || !currentUser) return null;

    // Pickup league: show Join Up / Step Out
    if (!isTeamLeague) {
      if (isPickupParticipant) {
        return (
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.stepOutBtn}
              onPress={handleStepOut}
              disabled={isActionLoading}
              accessibilityRole="button"
              accessibilityLabel="Step Out of league"
            >
              <Text style={styles.stepOutBtnText}>Step Out</Text>
            </TouchableOpacity>
          </View>
        );
      }
      return (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.joinBtn}
            onPress={handleJoinPickupLeague}
            disabled={isActionLoading}
            accessibilityRole="button"
            accessibilityLabel="Join Up"
          >
            <Text style={styles.joinBtnText}>Join Up</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Team league: show Join Up if user has eligible roster
    if (hasEligibleRoster) {
      const userRosterInLeague = members.some(
        (m) => m.memberType === 'roster' && userOwnedRosters.some((r) => r.id === m.memberId)
      );
      if (!userRosterInLeague) {
        return (
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.joinBtn}
              onPress={handleJoinTeamLeague}
              disabled={isActionLoading}
              accessibilityRole="button"
              accessibilityLabel="Join Up with roster"
            >
              <Text style={styles.joinBtnText}>Join Up</Text>
            </TouchableOpacity>
          </View>
        );
      }
    }

    return null;
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {([
        { key: 'standings' as TabKey, label: 'Standings', icon: 'trophy-outline' },
        { key: 'matches' as TabKey, label: 'Matches', icon: 'football-outline' },
        { key: 'players' as TabKey, label: 'Players', icon: 'people-outline' },
        ...(isTeamLeague ? [{ key: 'teams' as TabKey, label: 'Rosters', icon: 'shield-outline' }] : []),
        { key: 'info' as TabKey, label: 'Info', icon: 'information-circle-outline' },
      ] as Array<{ key: TabKey; label: string; icon: string }>).map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          onPress={() => setActiveTab(tab.key)}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === tab.key }}
          accessibilityLabel={tab.label}
        >
          <Ionicons
            name={tab.icon as any}
            size={18}
            color={activeTab === tab.key ? colors.grass : colors.inkFaint}
          />
          <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTabContent = () => {
    if (!league) return null;
    switch (activeTab) {
      case 'standings':
        return <StandingsTab leagueId={leagueId} leagueType={league.leagueType} />;
      case 'matches':
        return <MatchesTab leagueId={leagueId} isOperator={isOperator} />;
      case 'players':
        return <PlayersTab leagueId={leagueId} leagueType={league.leagueType} />;
      case 'teams':
        return <TeamsTab leagueId={leagueId} />;
      case 'info':
        return <InfoTab league={league} />;
      default:
        return null;
    }
  };

  // ── Loading / Error states ──────────────────────────────────────
  if (isLoading && !league) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="League" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <LoadingSpinner />
      </View>
    );
  }

  if (error && !league) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="League" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <ErrorDisplay message={error} onRetry={() => loadLeague()} />
      </View>
    );
  }

  if (!league) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="League" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <ErrorDisplay message="League not found" />
      </View>
    );
  }

  // ── Commissioner view ───────────────────────────────────────────
  if (isOperator) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={league.name} leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadLeague(true)} tintColor={colors.grass} />}
        >
          {/* League edit form — includes Update/Delete at bottom */}
          <View style={styles.formSection}>
            <LeagueForm
              initialData={league}
              onSubmit={handleUpdateLeague}
              onDelete={handleDeleteLeague}
              isEdit={true}
              loading={isUpdating}
            />
          </View>

          {/* Join request queue */}
          {renderJoinRequestQueue()}

          {/* League rosters / players */}
          {renderRosterSection()}

          {/* Upcoming events & shell matchups */}
          {renderUpcomingEvents()}
        </ScrollView>
      </View>
    );
  }

  // ── Non-commissioner view ───────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScreenHeader title={league.name} leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadLeague(true)} tintColor={colors.grass} />}
      >
        {/* Read-only league header */}
        <View style={styles.leagueHeader}>
          <View style={styles.headerTop}>
            <View style={styles.sportBadge}>
              <Ionicons name={getSportIcon(league.sportType) as any} size={20} color={colors.grass} />
            </View>
            <View style={styles.headerTitleArea}>
              <Text style={styles.leagueName}>{league.name}</Text>
              <Text style={styles.leagueType}>
                {league.leagueType === 'team' ? 'Roster League' : 'Pickup League'} •{' '}
                {league.visibility === 'public' ? 'Public' : 'Private'}
              </Text>
            </View>
          </View>
          {league.description ? (
            <Text style={styles.leagueDescription}>{league.description}</Text>
          ) : null}
          <View style={styles.headerStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{activeMembers.length}</Text>
              <Text style={styles.statLabel}>{isTeamLeague ? 'Rosters' : 'Players'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{upcomingEvents.length}</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{league.skillLevel || 'Open'}</Text>
              <Text style={styles.statLabel}>Skill</Text>
            </View>
          </View>
          {league.startDate && (
            <Text style={styles.headerDates}>
              {formatDate(league.startDate)} – {formatDate(league.endDate)}
            </Text>
          )}
        </View>

        {/* Pending roster invitations for roster owners */}
        {pendingUserRosterInvitations.length > 0 && (
          <View style={styles.invitationBanner}>
            <Ionicons name="mail-outline" size={20} color={colors.court} />
            <View style={styles.invitationBannerContent}>
              <Text style={styles.invitationBannerTitle}>Roster Invitation</Text>
              {pendingUserRosterInvitations.map((inv) => {
                const rosterName = userOwnedRosters.find((r) => r.id === inv.memberId)?.name || 'Your roster';
                return (
                  <View key={inv.id} style={styles.invitationRow}>
                    <Text style={styles.invitationText}>
                      {rosterName} has been invited to this league
                    </Text>
                    <View style={styles.invitationActions}>
                      <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={() => handleConfirmInvitation(inv)}
                        disabled={isActionLoading}
                        accessibilityRole="button"
                        accessibilityLabel={`Confirm ${rosterName}`}
                      >
                        <Text style={styles.confirmBtnText}>Confirm</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.declineBtnSmall}
                        onPress={() => handleDeclineInvitation(inv)}
                        disabled={isActionLoading}
                        accessibilityRole="button"
                        accessibilityLabel={`Decline ${rosterName}`}
                      >
                        <Text style={styles.declineBtnSmallText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Add roster option for invited users */}
        {renderAddRosterOption()}

        {/* Tabs */}
        {renderTabBar()}
        {renderTabContent()}
      </ScrollView>

      {/* Bottom action bar */}
      {renderActionBar()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.chalk },
  scrollView: { flex: 1 },
  formSection: { backgroundColor: '#FFFFFF', marginBottom: 12 },
  section: { backgroundColor: '#FFFFFF', marginBottom: 12, paddingBottom: 12 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  sectionTitle: {
    fontFamily: fonts.semibold, fontSize: 18, color: colors.ink,
  },
  sectionSubtext: {
    fontFamily: fonts.body, fontSize: 14, color: colors.inkFaint,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  countText: {
    fontFamily: fonts.semibold, fontSize: 14, color: colors.grass,
  },
  countBadge: {
    backgroundColor: colors.court, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    fontFamily: fonts.label, fontSize: 11, color: '#FFFFFF',
  },
  emptyState: { alignItems: 'center', padding: 24 },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.inkFaint, marginTop: 8 },
  errorRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 6,
  },
  errorRowText: { fontFamily: fonts.body, fontSize: 13, color: colors.track, flex: 1 },
  // Join request styles
  requestItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  requestInfo: { flex: 1, marginRight: 12 },
  requestName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  requestMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint, marginTop: 2 },
  requestActions: { flexDirection: 'row', gap: 8 },
  approveBtn: {
    backgroundColor: colors.grass, borderRadius: 8, width: 34, height: 34,
    alignItems: 'center', justifyContent: 'center',
  },
  declineBtn: {
    backgroundColor: colors.track, borderRadius: 8, width: 34, height: 34,
    alignItems: 'center', justifyContent: 'center',
  },
  // Member list styles
  memberItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  memberInfo: { flex: 1, marginRight: 12 },
  memberName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  memberMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  memberStats: { fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint },
  statusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  statusActive: { backgroundColor: '#EDF7F0' },
  statusPending: { backgroundColor: colors.courtLight },
  statusText: { fontFamily: fonts.label, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusTextActive: { color: colors.grass },
  statusTextPending: { color: colors.ink },
  removeBtn: { padding: 6 },
  // Confirm / decline invitation
  confirmActions: { flexDirection: 'row', gap: 6 },
  confirmBtn: {
    backgroundColor: colors.grass, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6, alignItems: 'center',
  },
  confirmBtnText: { fontFamily: fonts.ui, fontSize: 13, color: '#FFFFFF' },
  declineBtnSmall: {
    borderWidth: 1, borderColor: colors.track, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6, alignItems: 'center',
  },
  declineBtnSmallText: { fontFamily: fonts.ui, fontSize: 13, color: colors.track },
  // Events section
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.grass, borderRadius: 10, marginHorizontal: 16,
    paddingVertical: 12, marginBottom: 12,
  },
  generateBtnText: { fontFamily: fonts.ui, fontSize: 15, color: '#FFFFFF' },
  matchupList: { paddingHorizontal: 16 },
  matchupLabel: {
    fontFamily: fonts.label, fontSize: 11, color: colors.inkFaint,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  matchupCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF8EE', borderRadius: 10, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: colors.courtLight,
  },
  matchupInfo: { flex: 1, marginRight: 12 },
  matchupTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  matchupRosters: { fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint, marginTop: 2 },
  unscheduledBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  unscheduledText: { fontFamily: fonts.label, fontSize: 11, color: colors.court, textTransform: 'uppercase' },
  // Event action buttons
  eventActions: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 8 },
  createEventBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 2, borderColor: colors.grass, borderRadius: 10, paddingVertical: 12,
  },
  createEventBtnText: { fontFamily: fonts.ui, fontSize: 14, color: colors.grass },
  viewMatchupsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 2, borderColor: colors.court, borderRadius: 10, paddingVertical: 12,
  },
  viewMatchupsBtnText: { fontFamily: fonts.ui, fontSize: 14, color: colors.court },
  // Event card styles
  eventCard: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  eventDateCol: { marginRight: 14, alignItems: 'center', minWidth: 60 },
  eventDay: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  eventTime: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint, marginTop: 2 },
  eventDetails: { flex: 1, marginRight: 8 },
  eventTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  eventRosters: { fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint, marginTop: 2 },
  // Add roster option
  addRosterItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  addRosterName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.grass },
  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    marginBottom: 2,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.grass },
  tabLabel: { fontFamily: fonts.label, fontSize: 10, color: colors.inkFaint, textTransform: 'uppercase' },
  tabLabelActive: { color: colors.grass },
  // Action bar (bottom)
  actionBar: {
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  joinBtn: {
    backgroundColor: colors.grass, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center',
  },
  joinBtnText: { fontFamily: fonts.ui, fontSize: 16, color: '#FFFFFF' },
  stepOutBtn: {
    borderWidth: 2, borderColor: colors.track, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center',
  },
  stepOutBtnText: { fontFamily: fonts.ui, fontSize: 16, color: colors.track },
  // Commissioner action buttons
  commissionerActions: {
    paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 32,
  },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 2, borderColor: colors.track, borderRadius: 12, paddingVertical: 14,
  },
  deleteBtnText: { fontFamily: fonts.ui, fontSize: 16, color: colors.track },
  // Read-only league header
  leagueHeader: {
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 16, marginBottom: 12,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sportBadge: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDF7F0',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  headerTitleArea: { flex: 1 },
  leagueName: { fontFamily: fonts.heading, fontSize: 22, color: colors.ink },
  leagueType: { fontFamily: fonts.body, fontSize: 14, color: colors.inkFaint, marginTop: 2 },
  leagueDescription: {
    fontFamily: fonts.body, fontSize: 15, color: colors.ink, lineHeight: 22, marginBottom: 12,
  },
  headerStats: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.chalk, borderRadius: 12, paddingVertical: 12, marginBottom: 8,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  statLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: '#E5E7EB' },
  headerDates: {
    fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint, textAlign: 'center', marginTop: 4,
  },
  // Invitation banner
  invitationBanner: {
    flexDirection: 'row', backgroundColor: '#FFF8EE', paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 12, borderLeftWidth: 4, borderLeftColor: colors.court,
  },
  invitationBannerContent: { flex: 1, marginLeft: 12 },
  invitationBannerTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, marginBottom: 6 },
  invitationRow: { marginBottom: 8 },
  invitationText: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, marginBottom: 6 },
  invitationActions: { flexDirection: 'row', gap: 8 },
});
