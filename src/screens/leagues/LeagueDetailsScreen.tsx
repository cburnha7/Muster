import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

import { LeagueForm } from '../../components/league/LeagueForm';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';

import { LeagueService } from '../../services/api/LeagueService';
import { leagueService } from '../../services/api/LeagueService';
import { conversationService } from '../../services/api/ConversationService';
import { userService } from '../../services/api/UserService';
import { cacheService } from '../../services/api/CacheService';
import { Team, UpdateLeagueData, TeamRole } from '../../types';
import { League, LeagueMembership } from '../../types/league';
import { colors, fonts } from '../../theme';
import { LeagueLedger } from '../../components/league/LeagueLedger';
import { RootState } from '../../store/store';
import { selectUserTeams } from '../../store/slices/teamsSlice';
import { loggingService } from '../../services/LoggingService';
import { HeroSection, PersonRow, DetailCard, FixedBottomCTA } from '../../components/detail';
import { getSportColor } from '../../constants/sportColors';

// Import tab components
import { StandingsTab } from './tabs/StandingsTab';
import { MatchesTab } from './tabs/MatchesTab';
import { PlayersTab } from './tabs/PlayersTab';
import { TeamsTab } from './tabs/TeamsTab';

type TabKey = 'standings' | 'matches' | 'players' | 'teams' | 'info';

// ── Local format helpers ─────────────────────────────────────────────────────

function formatDateShort(date?: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(time?: string | null): string {
  if (!time) return '';
  // time may be "HH:MM" or "HH:MM:SS"
  const parts = time.split(':');
  const hours = parseInt(parts[0] ?? '0', 10);
  const minutes = parts[1] ?? '00';
  const period = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${minutes} ${period}`;
}

function buildSeasonSummary(league: League): string {
  const parts: string[] = [];
  if (league.preferredGameDays?.length) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    parts.push('Games on ' + league.preferredGameDays.map((d) => dayNames[d]).join(', '));
  }
  if (league.preferredTimeWindowStart && league.preferredTimeWindowEnd) {
    parts.push(`${formatTime(league.preferredTimeWindowStart)}–${formatTime(league.preferredTimeWindowEnd)}`);
  }
  if (league.startDate) {
    parts.push('Starts ' + formatDateShort(league.startDate));
  }
  if (league.seasonGameCount) {
    parts.push(`${league.seasonGameCount} games`);
  }
  return parts.join(' · ') || 'Schedule TBD';
}

export function LeagueDetailsScreen(): React.ReactElement {
  const navigation = useNavigation();
  const route = useRoute();
  const { leagueId, readOnly } = (route.params as any) || {};

  const currentUser = useSelector((state: RootState) => state.auth?.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth?.isAuthenticated);
  const userRosters = useSelector(selectUserTeams) as Team[];

  const [league, setLeague] = useState<League | null>(null);
  const [members, setMembers] = useState<LeagueMembership[]>([]);
  const [fetchedUserRosters, setFetchedUserRosters] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('standings');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editMode, setEditMode] = useState(false);


  // ── Data loading ────────────────────────────────────────────────
  const loadLeague = useCallback(async (isRefresh = false) => {
    if (!leagueId) return;
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }
      // Always clear caches to ensure fresh data (especially for invitation flows)
      cacheService.clearBySubstring('users');
      cacheService.clearBySubstring('leagues');
      setError(null);

      const svc = new LeagueService();
      const [leagueData, membersResponse, , userTeamsRes] = await Promise.all([
        svc.getLeagueById(leagueId, true),
        svc.getMembers(leagueId, 1, 100, true), // includePending for commissioner
        svc.getLeagueEvents(leagueId),
        currentUser?.id ? userService.getUserTeams() : Promise.resolve({ data: [] }),
      ]);

      const typedLeague = leagueData as any as League;
      setLeague(typedLeague);

      // membersResponse is { leagueType, data, pagination } — extract the data array
      const membersData = (membersResponse as any).data || membersResponse.data || [];
      setMembers(Array.isArray(membersData) ? membersData : []);
      setFetchedUserRosters((userTeamsRes as any)?.data ?? []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load league');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [leagueId, currentUser]);

  useFocusEffect(useCallback(() => { loadLeague(); }, [loadLeague]));


  // ── Derived state ───────────────────────────────────────────────
  const isOperator = league ? (currentUser?.id === league.organizerId && !readOnly) : false;

  const activeMembers = members.filter((m) => m.status === 'active' || m.status === 'pending');

  const rosterIdsInLeague = new Set(
    activeMembers.filter((m) => m.memberType === 'roster').map((m) => m.memberId)
  );
  const allRostersSource = fetchedUserRosters.length ? fetchedUserRosters : (userRosters || []);
  const userOwnedRosters = allRostersSource.filter((r: any) =>
    r.currentUserRole === TeamRole.CAPTAIN ||
    r.captainId === currentUser?.id ||
    r.members?.some((m: any) => m.userId === currentUser?.id && m.role === TeamRole.CAPTAIN)
  );

  const eligibleRosters = userOwnedRosters.filter((r) => !rosterIdsInLeague.has(r.id));
  const hasEligibleRoster = eligibleRosters.length > 0;

  // Check if user has a pending roster invitation they can confirm
  // Only the roster Manager/Owner (captainId) can confirm league invitations
  // Use both members state (from getMembers) and league.memberships (from getLeagueById) for robustness
  const leagueMembershipsData: any[] = (league as any)?.memberships || [];
  const pendingFromMembers = members.filter(
    (m) => m.status === 'pending' && m.memberType === 'roster' &&
      userOwnedRosters.some((r) => r.id === m.memberId)
  );
  const pendingFromLeague = leagueMembershipsData.filter(
    (m: any) => m.status === 'pending' && m.memberType === 'roster' &&
      userOwnedRosters.some((r: Team) => r.id === m.memberId)
  );
  // Prefer members state (has full data), fall back to league.memberships
  const pendingUserRosterInvitations = pendingFromMembers.length > 0
    ? pendingFromMembers
    : pendingFromLeague;

  // ── Helpers ─────────────────────────────────────────────────────
  const formatSkillLevel = (level?: string): string => {
    if (!level) return 'Open';
    switch (level.toLowerCase()) {
      case 'beginner': return 'Beginner';
      case 'intermediate': return 'Intermediate';
      case 'advanced': return 'Advanced';
      case 'all_levels': return 'All Levels';
      default: return level.charAt(0).toUpperCase() + level.slice(1).replace(/_/g, ' ');
    }
  };

  // ── Commissioner actions ────────────────────────────────────────
  const handleUpdateLeague = async (data: UpdateLeagueData) => {
    if (!currentUser?.id) return;
    loggingService.logButton('Update League', 'LeagueDetailsScreen', { leagueId });
    try {
      setIsUpdating(true);
      await leagueService.updateLeague(leagueId, data, currentUser.id);
      Alert.alert('Success', 'League updated successfully');
      (navigation as any).replace('LeaguesBrowser');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update league';
      Alert.alert('Error', msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteLeague = () => {
    if (!currentUser?.id || !league) return;
    loggingService.logButton('Delete League', 'LeagueDetailsScreen', { leagueId });

    const doDelete = async () => {
      try {
        setIsActionLoading(true);
        await leagueService.deleteLeague(leagueId, currentUser.id);
        if (Platform.OS === 'web') {
          window.alert('League has been deleted');
        } else {
          Alert.alert('Deleted', 'League has been deleted');
        }
        navigation.goBack();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to delete league';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Error', msg);
        }
      } finally {
        setIsActionLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete "${league.name}"? This cannot be undone.`)) {
        doDelete();
      }
    } else {
      Alert.alert('Delete League', `Are you sure you want to delete "${league.name}"? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // ── Non-commissioner actions ────────────────────────────────────
  const handleJoinTeamLeague = async () => {
    if (!league || !currentUser || eligibleRosters.length === 0) return;
    loggingService.logButton('Join (Roster)', 'LeagueDetailsScreen', { leagueId });
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

  const handleStepOut = async (teamId?: string) => {
    if (!league || !currentUser) return;
    loggingService.logButton('Leave', 'LeagueDetailsScreen', { leagueId, teamId });

    const doStepOut = async () => {
      try {
        setIsActionLoading(true);
        await leagueService.stepOutOfLeague(league.id, currentUser.id, teamId);
        // Force-clear all league and user caches so refetch gets fresh data
        cacheService.clearBySubstring('leagues');
        cacheService.clearBySubstring('users');
        await loadLeague(true);
      } catch (err) {
        if (Platform.OS === 'web') {
          window.alert(err instanceof Error ? err.message : 'Failed to leave league');
        } else {
          Alert.alert('Error', err instanceof Error ? err.message : 'Failed to leave league');
        }
      } finally {
        setIsActionLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to leave this league?')) {
        await doStepOut();
      }
    } else {
      Alert.alert('Leave', 'Are you sure you want to leave this league?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: doStepOut },
      ]);
    }
  };

  // ── Non-commissioner roster/invitation actions ───────────────────
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

  const handleConfirmInvitation = async (membership: LeagueMembership) => {
    if (!currentUser?.id) return;
    try {
      setIsActionLoading(true);
      console.log('[ConfirmInvitation] Sending:', { leagueId, membershipId: membership.id, memberType: membership.memberType, memberId: membership.memberId, userId: currentUser.id });
      const result = await leagueService.respondToInvitation(leagueId, membership.id, true, currentUser.id);
      console.log('[ConfirmInvitation] Response:', JSON.stringify(result));
      // Invalidate both users and leagues cache so home screen invitations and league data refetch fresh
      cacheService.clearBySubstring('users');
      cacheService.clearBySubstring('leagues');
      // Reload league data from server to get the real updated state
      await loadLeague(true);
      if (Platform.OS === 'web') {
        window.alert('Your roster has joined the league.');
      } else {
        Alert.alert('Joined', 'Your roster has joined the league.');
      }
      if (readOnly) {
        navigation.goBack();
      }
    } catch (err) {
      console.error('[ConfirmInvitation] Error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to confirm invitation';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeclineInvitation = async (membership: LeagueMembership) => {
    if (!currentUser?.id) return;

    const doDecline = async () => {
      try {
        setIsActionLoading(true);
        await leagueService.respondToInvitation(leagueId, membership.id, false, currentUser.id);
        cacheService.clearBySubstring('users');
        cacheService.clearBySubstring('leagues');
        setMembers((prev) => prev.filter((m) => m.id !== membership.id));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to decline invitation';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Error', msg);
        }
      } finally {
        setIsActionLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to decline this league invitation?')) {
        await doDecline();
      }
    } else {
      Alert.alert('Decline Invitation', 'Are you sure you want to decline this league invitation?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Decline', style: 'destructive', onPress: doDecline },
      ]);
    }
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {([
        { key: 'standings' as TabKey, label: 'Standings', icon: 'trophy-outline' },
        { key: 'matches' as TabKey, label: 'Matches', icon: 'football-outline' },
        { key: 'teams' as TabKey, label: 'Rosters', icon: 'shield-outline' },
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
            color={activeTab === tab.key ? colors.cobalt : colors.inkFaint}
          />
          <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── Loading / Error states ──────────────────────────────────────
  if (isLoading && !league) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    );
  }

  if (error && !league) {
    return (
      <View style={styles.container}>
        <ErrorDisplay message={error} onRetry={() => loadLeague()} />
      </View>
    );
  }

  if (!league) {
    return (
      <View style={styles.container}>
        <ErrorDisplay message="League not found" />
      </View>
    );
  }

  // ── Commissioner view (edit mode) ────────────────────────────────
  if (isOperator && editMode) {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadLeague(true)} tintColor={colors.cobalt} />}
        >
          {/* Commissioner: Schedule button — navigate to Scheduling Screen */}
          <TouchableOpacity
            style={styles.scheduleBtn}
            onPress={() => (navigation as any).navigate('LeagueScheduling', { leagueId })}
            accessibilityRole="button"
            accessibilityLabel="Schedule"
          >
            <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
            <Text style={styles.scheduleBtnText}>Schedule</Text>
          </TouchableOpacity>

          {/* League edit form — includes Delete/Cancel/Save at bottom */}
          <LeagueForm
            initialData={league}
            onSubmit={handleUpdateLeague}
            onCancel={() => setEditMode(false)}
            onDelete={handleDeleteLeague}
            isEdit={true}
            loading={isUpdating}
            initialRosters={
              ((league as any).memberships || [])
                .filter((m: any) => m.memberType === 'roster' && m.team && m.status === 'active')
                .map((m: any) => ({
                  id: m.team.id,
                  name: m.team.name,
                  sportType: m.team.sportType,
                  memberCount: m.team._count?.members ?? m.team.members?.length ?? 0,
                }))
            }
            initialInvitedRosters={
              ((league as any).memberships || [])
                .filter((m: any) => m.memberType === 'roster' && m.team && m.status === 'pending')
                .map((m: any) => ({
                  id: m.team.id,
                  name: m.team.name,
                  sportType: m.team.sportType,
                  memberCount: m.team._count?.members ?? m.team.members?.length ?? 0,
                }))
            }
          />

          {/* League financial ledger — visible to commissioner for paid leagues */}
          {(() => {
            const leagueAny = league as any;
            const activeSeason = leagueAny.seasons?.find((s: any) => s.isActive);
            if (leagueAny.pricingType === 'paid' && activeSeason) {
              return (
                <View style={styles.ledgerSection}>
                  <LeagueLedger leagueId={leagueId} seasonId={activeSeason.id} />
                </View>
              );
            }
            return null;
          })()}
        </ScrollView>
      </View>
    );
  }

  // ── Non-commissioner view ───────────────────────────────────────

  // Derive roster lists — prefer league.memberships (from GET /leagues/:id), fall back to members state
  const leagueMemberships: any[] = (league as any)?.memberships || [];
  const allRosterData = leagueMemberships.length > 0
    ? leagueMemberships.filter((m: any) => m.memberType === 'roster')
    : members.filter((m) => m.memberType === 'roster');
  const confirmedRosters = allRosterData.filter((m: any) => m.status === 'active');
  const invitedRosters = allRosterData.filter((m: any) => m.status === 'pending');

  // Labels for HeroSection badges
  const sportLabel = league.sportType
    ? league.sportType.charAt(0).toUpperCase() + league.sportType.slice(1).replace(/_/g, ' ')
    : '';
  const skillLabel = formatSkillLevel(league.skillLevel);
  const formatLabel = (league as any).leagueFormat === 'season' ? 'Season'
    : (league as any).leagueFormat === 'season_with_playoffs' ? 'Season + Playoffs'
    : (league as any).leagueFormat === 'tournament' ? 'Tournament'
    : '';
  const statusLabel = league.isActive ? 'In progress' : 'Registration open';

  // Season summary subline for hero
  const seasonSummaryLine = [
    confirmedRosters.length ? `${confirmedRosters.length} teams` : null,
    league.startDate ? `Starts ${formatDateShort(league.startDate)}` : null,
  ].filter(Boolean).join(' · ') || undefined;

  // hasSeasonInfo: true if buildSeasonSummary has real content
  const hasSeasonInfo = !!(
    league.preferredGameDays?.length ||
    (league.preferredTimeWindowStart && league.preferredTimeWindowEnd) ||
    league.startDate ||
    league.seasonGameCount
  );

  // Max roster count from league config
  const leagueAny = league as any;
  const maxRosters: number | null = leagueAny.maxRosters ?? leagueAny.teamCount ?? null;
  const registrationOpen = !league.isActive;
  const spotsRemaining = maxRosters != null ? maxRosters - confirmedRosters.length : 0;

  // Commissioner info
  const commissioner: { name: string } | null = league.organizer
    ? { name: (league.organizer as any).displayName || (league.organizer as any).name || (league.organizer as any).email || 'Commissioner' }
    : null;

  // User's active roster in the league (for "Leave" logic)
  const userActiveRosterInLeague = members.find(
    (m) => m.memberType === 'roster' && m.status === 'active' &&
      userOwnedRosters.some((r) => r.id === m.memberId)
  );

  // ── FixedBottomCTA logic ─────────────────────────────────────────
  const renderBottomCTA = () => {
    // Commissioner: "Manage league"
    if (isOperator) {
      return (
        <FixedBottomCTA
          label="Manage league"
          onPress={() => setEditMode(true)}
          variant="primary"
          loading={isActionLoading}
        />
      );
    }

    // Has pending invite: "Accept invitation"
    if (pendingUserRosterInvitations.length > 0) {
      return (
        <FixedBottomCTA
          label="Accept invitation"
          onPress={() => handleConfirmInvitation(pendingUserRosterInvitations[0]!)}
          variant="primary"
          loading={isActionLoading}
          secondaryLabel="Decline"
          onSecondaryPress={() => handleDeclineInvitation(pendingUserRosterInvitations[0]!)}
        />
      );
    }

    if (readOnly) return null;
    if (!isAuthenticated || !currentUser) return null;

    // Already registered: "You're registered ✓" with a "Leave" option
    if (userActiveRosterInLeague) {
      return (
        <FixedBottomCTA
          label="You're registered ✓"
          onPress={() => {}}
          variant="confirmed"
          secondaryLabel="Leave league"
          onSecondaryPress={() => handleStepOut(userActiveRosterInLeague.memberId)}
        />
      );
    }

    // Registration open + eligible user: "Register your team"
    if (hasEligibleRoster && registrationOpen) {
      const userRosterInLeague = members.some(
        (m) => m.memberType === 'roster' && userOwnedRosters.some((r) => r.id === m.memberId)
      );
      if (!userRosterInLeague) {
        return (
          <FixedBottomCTA
            label="Register your team"
            onPress={handleJoinTeamLeague}
            variant="primary"
            loading={isActionLoading}
          />
        );
      }
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadLeague(true)} tintColor={colors.cobalt} />}
      >
        {/* Pending roster invitations the commissioner can confirm */}
        {isOperator && pendingUserRosterInvitations.length > 0 && (
          <View style={styles.commissionerInviteBanner}>
            <Ionicons name="mail-outline" size={20} color={colors.gold} />
            <View style={styles.invitationBannerContent}>
              <Text style={styles.invitationBannerTitle}>Your Roster Invitations</Text>
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

        {/* HeroSection — always visible above the tab bar */}
        <HeroSection
          title={league.name}
          sportColor={getSportColor(league.sportType)}
          badges={[
            { label: sportLabel },
            { label: skillLabel },
            { label: formatLabel },
            { label: statusLabel },
          ].filter((b) => b.label && b.label !== '—' && b.label !== '')}
          {...(league.description ? { headline: league.description.slice(0, 80) + (league.description.length > 80 ? '…' : '') } : {})}
          {...(seasonSummaryLine ? { subline: seasonSummaryLine } : {})}
        />

        {/* League Channel Chat button */}
        {(isOperator || userActiveRosterInLeague) && (
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={async () => {
              try {
                const convs = await conversationService.getConversations('LEAGUE_CHANNEL');
                const leagueConv = convs.find((c) => c.entityId === leagueId);
                if (leagueConv) {
                  (navigation as any).navigate('Messages', {
                    screen: 'Chat',
                    params: { conversationId: leagueConv.id, title: league.name ?? 'League Channel', type: 'LEAGUE_CHANNEL' },
                  });
                }
              } catch (e) {
                console.error('Navigate to chat error:', e);
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubbles-outline" size={18} color={colors.cobalt} />
            <Text style={styles.chatBtnText}>League Channel</Text>
          </TouchableOpacity>
        )}

        {/* Tab bar below hero */}
        {renderTabBar()}

        {/* Tab content */}
        {activeTab === 'standings' && (
          <StandingsTab leagueId={leagueId} />
        )}

        {activeTab === 'matches' && (
          <MatchesTab leagueId={leagueId} isOperator={isOperator} />
        )}

        {activeTab === 'players' && (
          <PlayersTab leagueId={leagueId} />
        )}

        {activeTab === 'teams' && (
          <TeamsTab leagueId={leagueId} />
        )}

        {activeTab === 'info' && (
          <>
            {/* Season card — only show if there are real values */}
            {hasSeasonInfo && (
              <DetailCard title="The season" delay={0}>
                <Text style={styles.seasonSummary}>{buildSeasonSummary(league)}</Text>
              </DetailCard>
            )}

            {/* Teams card */}
            <DetailCard title={`Teams (${confirmedRosters.length})`} delay={50}>
              {confirmedRosters.length === 0 ? (
                <Text style={styles.emptyMsg}>No teams registered yet</Text>
              ) : (
                confirmedRosters.map((m: any) => {
                  const team = m.team;
                  const name = team?.name || m.memberId;
                  const playerCount = team?._count?.members ?? team?.playerCount ?? 0;
                  const teamId = team?.id || m.memberId;
                  return (
                    <PersonRow
                      key={m.id}
                      name={name}
                      subtitle={`${playerCount} players`}
                      onPress={() => (navigation as any).navigate('TeamDetails', { teamId })}
                    />
                  );
                })
              )}
              {registrationOpen && maxRosters != null && spotsRemaining > 0 && (
                <Text style={styles.spotsText}>{spotsRemaining} spots remaining</Text>
              )}
            </DetailCard>

            {/* Invited teams — if commissioner */}
            {isOperator && invitedRosters.length > 0 && (
              <DetailCard title="Pending invitations" delay={100}>
                {invitedRosters.map((m: any) => {
                  const team = m.team;
                  const name = team?.name || m.memberId;
                  return (
                    <PersonRow
                      key={m.id}
                      name={name}
                      role="Pending"
                    />
                  );
                })}
              </DetailCard>
            )}

            {/* Commissioner card */}
            {commissioner && (
              <DetailCard title="Commissioner" delay={150}>
                <PersonRow
                  name={commissioner.name}
                  role="Commissioner"
                />
              </DetailCard>
            )}

            {/* Add roster section (if user has eligible rosters not in league) */}
            {eligibleRosters.length > 0 && registrationOpen && !readOnly && (
              <DetailCard title="Join with your team" delay={200}>
                {eligibleRosters.map((r) => (
                  <TouchableOpacity key={r.id} onPress={() => handleAddRosterToLeague(r)} style={styles.joinRosterRow}>
                    <Text style={styles.joinRosterName}>{r.name}</Text>
                  </TouchableOpacity>
                ))}
              </DetailCard>
            )}
          </>
        )}
      </ScrollView>

      {/* Fixed bottom CTA */}
      {renderBottomCTA()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  scrollView: { flex: 1 },
  ledgerSection: { paddingHorizontal: 16, paddingBottom: 24 },
  formSection: { backgroundColor: '#FFFFFF', marginBottom: 12 },
  section: { backgroundColor: '#FFFFFF', marginBottom: 12, paddingBottom: 12 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  sectionTitle: {
    fontFamily: fonts.heading, fontSize: 24, color: colors.ink,
  },
  sectionSubtext: {
    fontFamily: fonts.body, fontSize: 14, color: colors.inkFaint,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  countText: {
    fontFamily: fonts.semibold, fontSize: 14, color: colors.cobalt,
  },
  countBadge: {
    backgroundColor: colors.gold, borderRadius: 10,
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
  errorRowText: { fontFamily: fonts.body, fontSize: 13, color: colors.heart, flex: 1 },
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
    backgroundColor: colors.cobalt, borderRadius: 8, width: 34, height: 34,
    alignItems: 'center', justifyContent: 'center',
  },
  declineBtn: {
    backgroundColor: colors.heart, borderRadius: 8, width: 34, height: 34,
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
  statusPending: { backgroundColor: colors.goldLight },
  statusText: { fontFamily: fonts.label, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusTextActive: { color: colors.cobalt },
  statusTextPending: { color: colors.ink },
  removeBtn: { padding: 6 },
  // Confirm / decline invitation
  confirmActions: { flexDirection: 'row', gap: 6 },
  confirmBtn: {
    backgroundColor: colors.cobalt, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6, alignItems: 'center',
  },
  confirmBtnText: { fontFamily: fonts.ui, fontSize: 13, color: '#FFFFFF' },
  declineBtnSmall: {
    borderWidth: 1, borderColor: colors.heart, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6, alignItems: 'center',
  },
  declineBtnSmallText: { fontFamily: fonts.ui, fontSize: 13, color: colors.heart },
  // Events section
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.cobalt, borderRadius: 10, marginHorizontal: 16,
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
    borderWidth: 1, borderColor: colors.goldLight,
  },
  matchupInfo: { flex: 1, marginRight: 12 },
  matchupTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  matchupRosters: { fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint, marginTop: 2 },
  unscheduledBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  unscheduledText: { fontFamily: fonts.label, fontSize: 11, color: colors.gold, textTransform: 'uppercase' },
  // Event action buttons
  eventActions: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 8 },
  createEventBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 2, borderColor: colors.cobalt, borderRadius: 10, paddingVertical: 12,
  },
  createEventBtnText: { fontFamily: fonts.ui, fontSize: 14, color: colors.cobalt },
  viewMatchupsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 2, borderColor: colors.gold, borderRadius: 10, paddingVertical: 12,
  },
  viewMatchupsBtnText: { fontFamily: fonts.ui, fontSize: 14, color: colors.gold },
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
  addRosterName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.cobalt },
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
  tabActive: { borderBottomColor: colors.cobalt },
  tabLabel: { fontFamily: fonts.label, fontSize: 10, color: colors.inkFaint, textTransform: 'uppercase' },
  tabLabelActive: { color: colors.cobalt },
  // Action bar (bottom) — kept for backwards compat
  actionBar: {
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  joinBtn: {
    backgroundColor: colors.cobalt, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center',
  },
  joinBtnText: { fontFamily: fonts.ui, fontSize: 16, color: '#FFFFFF' },
  stepOutBtn: {
    borderWidth: 2, borderColor: colors.inkFaint, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center',
  },
  stepOutBtnText: { fontFamily: fonts.ui, fontSize: 16, color: colors.ink },
  // Commissioner action buttons
  scheduleBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: colors.cobalt,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    paddingVertical: 14,
  },
  scheduleBtnText: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: '#FFFFFF',
  },
  commissionerActions: {
    paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 32,
  },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 2, borderColor: colors.heart, borderRadius: 12, paddingVertical: 14,
  },
  deleteBtnText: { fontFamily: fonts.ui, fontSize: 16, color: colors.heart },
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
    backgroundColor: colors.white, borderRadius: 12, paddingVertical: 12, marginBottom: 8,
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
    marginBottom: 12, borderLeftWidth: 4, borderLeftColor: colors.gold,
  },
  commissionerInviteBanner: {
    flexDirection: 'row', backgroundColor: '#FFF8EE', paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 12, borderLeftWidth: 4, borderLeftColor: colors.gold,
  },
  invitationBannerContent: { flex: 1, marginLeft: 12 },
  invitationBannerTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, marginBottom: 6 },
  invitationRow: { marginBottom: 8 },
  invitationText: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, marginBottom: 6 },
  invitationActions: { flexDirection: 'row', gap: 8 },
  // Roster list sections (non-commissioner view)
  rosterListSection: {
    backgroundColor: '#FFFFFF', borderRadius: 12, marginHorizontal: 16, marginBottom: 12,
    padding: 16, gap: 8,
  },
  rosterListTitle: {
    fontFamily: fonts.semibold, fontSize: 16, color: colors.ink, marginBottom: 4,
  },
  rosterListSubtext: {
    fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint, marginBottom: 4,
  },
  rosterListEmpty: {
    fontFamily: fonts.body, fontSize: 14, color: colors.inkFaint, paddingVertical: 8,
  },
  rosterListItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  rosterListIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: `${colors.gold}18`,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  rosterListInfo: { flex: 1 },
  rosterListName: {
    fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, flex: 1,
  },
  rosterListPlayerCount: {
    fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint, marginTop: 2,
  },
  rosterListMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  invitedBadge: {
    backgroundColor: `${colors.gold}18`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  invitedBadgeText: {
    fontFamily: fonts.label, fontSize: 11, color: colors.gold,
  },
  // Info tab — new design system styles
  seasonSummary: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
  },
  emptyMsg: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    paddingVertical: 4,
  },
  spotsText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.cobalt,
    marginTop: 8,
  },
  joinRosterRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  joinRosterName: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.cobalt,
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
});
