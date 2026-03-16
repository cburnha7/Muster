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
import { cacheService } from '../../services/api/CacheService';
import { SportType, Team, Event, UpdateLeagueData, TeamRole } from '../../types';
import { League, LeagueMembership } from '../../types/league';
import { colors, fonts } from '../../theme';
import { RootState } from '../../store/store';
import { selectUserTeams } from '../../store/slices/teamsSlice';
import { loggingService } from '../../services/LoggingService';

/** Shape returned by GET /api/leagues/:id/events */
interface LeagueEvent extends Event {
  assignedRosters: Array<{ id: string; name: string }>;
  scheduledStatus?: string;
}

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
  const { leagueId, readOnly } = (route.params as any) || {};

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const userRosters = useSelector(selectUserTeams) as Team[];

  const [league, setLeague] = useState<League | null>(null);
  const [members, setMembers] = useState<LeagueMembership[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<LeagueEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('standings');
  const [isUpdating, setIsUpdating] = useState(false);

  // ── Data loading ────────────────────────────────────────────────
  const loadLeague = useCallback(async (isRefresh = false) => {
    if (!leagueId) return;
    try {
      if (isRefresh) {
        setRefreshing(true);
        // Clear league cache so we get fresh data from the server
        cacheService.clearBySubstring('leagues');
      } else {
        setIsLoading(true);
      }
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
  const isTeamLeague = league?.leagueType === 'team';

  const activeMembers = members.filter((m) => m.status === 'active' || m.status === 'pending');
  const userPickupMembership = members.find(
    (m) => m.memberType === 'user' && m.memberId === currentUser?.id && m.status === 'active'
  );
  const isPickupParticipant = !!userPickupMembership;

  const rosterIdsInLeague = new Set(
    activeMembers.filter((m) => m.memberType === 'roster').map((m) => m.memberId)
  );
  const userOwnedRosters = (userRosters || []).filter((r) =>
    r.captainId === currentUser?.id ||
    r.members?.some((m) => m.userId === currentUser?.id && m.role === TeamRole.CAPTAIN)
  );
  const eligibleRosters = userOwnedRosters.filter((r) => !rosterIdsInLeague.has(r.id));
  const hasEligibleRoster = eligibleRosters.length > 0;

  // Check if user has a pending roster invitation they can confirm
  // Only the roster Manager/Owner (captainId) can confirm league invitations
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

  const formatDate = (date?: Date | string) => {
    if (!date) return 'TBD';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  // ── Non-commissioner actions ────────────────────────────────────
  const handleJoinTeamLeague = async () => {
    if (!league || !currentUser || eligibleRosters.length === 0) return;
    loggingService.logButton('Join Up (Roster)', 'LeagueDetailsScreen', { leagueId });
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
    loggingService.logButton('Join Up (Pickup)', 'LeagueDetailsScreen', { leagueId });
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
    loggingService.logButton('Step Out', 'LeagueDetailsScreen', { leagueId });
    Alert.alert('Step Out', 'Are you sure you want to leave this league?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Step Out', style: 'destructive',
        onPress: async () => {
          try {
            setIsActionLoading(true);
            await leagueService.stepOutOfLeague(league.id, currentUser.id);
            // Force-clear all league and user caches so refetch gets fresh data
            cacheService.clearBySubstring('leagues');
            cacheService.clearBySubstring('users');
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
      await leagueService.respondToInvitation(leagueId, membership.id, true, currentUser.id);
      // Invalidate users cache so home screen invitations refetch fresh
      cacheService.clearBySubstring('users');
      // Reload league data from server to get the real updated state
      await loadLeague(true);
      Alert.alert('Confirmed', 'Your roster has joined the league.');
      if (readOnly) {
        navigation.goBack();
      }
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
            cacheService.clearBySubstring('users');
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

  // ── Render helpers ──────────────────────────────────────────────

  const renderAddRosterOption = () => {
    // Hide in readOnly mode
    if (readOnly) return null;
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
    // In readOnly mode, show Join Up for pending roster invitations
    if (readOnly && pendingUserRosterInvitations.length > 0) {
      return (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.joinBtn}
            onPress={() => handleConfirmInvitation(pendingUserRosterInvitations[0]!)}
            disabled={isActionLoading}
            accessibilityRole="button"
            accessibilityLabel="Join Up"
          >
            <Text style={styles.joinBtnText}>Join Up</Text>
          </TouchableOpacity>
        </View>
      );
    }

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
        ...(isTeamLeague
          ? [{ key: 'teams' as TabKey, label: 'Rosters', icon: 'shield-outline' }]
          : [{ key: 'players' as TabKey, label: 'Players', icon: 'people-outline' }]),
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
          {/* Pending roster invitations the commissioner can confirm (their own rosters) */}
          {pendingUserRosterInvitations.length > 0 && (
            <View style={styles.commissionerInviteBanner}>
              <Ionicons name="mail-outline" size={20} color={colors.court} />
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
                          accessibilityLabel={`Join Up ${rosterName}`}
                        >
                          <Text style={styles.confirmBtnText}>Join Up</Text>
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

          {/* League edit form — includes Delete/Cancel/Save at bottom */}
          <LeagueForm
            initialData={league}
            onSubmit={handleUpdateLeague}
            onCancel={() => navigation.goBack()}
            onDelete={handleDeleteLeague}
            isEdit={true}
            loading={isUpdating}
            initialRosters={
              members
                .filter((m) => m.memberType === 'roster' && m.team && m.status === 'active')
                .map((m) => ({
                  id: m.team!.id,
                  name: m.team!.name,
                  sportType: m.team!.sportType,
                  memberCount: m.team!.members?.length ?? 0,
                }))
            }
            initialInvitedRosters={
              members
                .filter((m) => m.memberType === 'roster' && m.team && m.status === 'pending')
                .map((m) => ({
                  id: m.team!.id,
                  name: m.team!.name,
                  sportType: m.team!.sportType,
                  memberCount: m.team!.members?.length ?? 0,
                }))
            }
          />
        </ScrollView>
      </View>
    );
  }

  // ── Non-commissioner view ───────────────────────────────────────
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const projectedEndDate = (() => {
    if (!league?.startDate || !league?.seasonLength) return '';
    const len = typeof league.seasonLength === 'number' ? league.seasonLength : parseInt(String(league.seasonLength));
    if (isNaN(len) || len < 1) return '';
    const start = new Date(league.startDate as any);
    if (isNaN(start.getTime())) return '';
    const end = new Date(start);
    if (league.scheduleFrequency === 'monthly') {
      end.setMonth(end.getMonth() + len);
    } else {
      end.setDate(end.getDate() + len * 7);
    }
    return end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  })();

  const ReadOnlyField = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.roField}>
      <Text style={styles.roFieldLabel}>{label}</Text>
      <Text style={styles.roFieldValue}>{value || '—'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title={league.name} leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadLeague(true)} tintColor={colors.grass} />}
      >
        <View style={styles.roForm}>
          {/* League Type + Visibility */}
          <ReadOnlyField label="League Type" value={league.leagueType === 'team' ? 'Roster League' : 'Pickup League'} />
          {league.leagueType === 'team' && (
            <ReadOnlyField label="Visibility" value={league.visibility === 'public' ? 'Public' : 'Private'} />
          )}

          {/* Core fields */}
          <ReadOnlyField label="League Name" value={league.name} />
          <ReadOnlyField label="Description" value={league.description || ''} />
          <ReadOnlyField label="Sport Type" value={league.sportType ? league.sportType.charAt(0).toUpperCase() + league.sportType.slice(1).replace(/_/g, ' ') : ''} />
          <ReadOnlyField label="Skill Level" value={formatSkillLevel(league.skillLevel)} />
          <ReadOnlyField label="Season Name" value={league.seasonName || ''} />

          {/* Season Start Date */}
          <ReadOnlyField label="Season Start Date" value={formatDate(league.startDate)} />

          {/* Schedule Frequency */}
          <ReadOnlyField label="Schedule Frequency" value={league.scheduleFrequency ? league.scheduleFrequency.charAt(0).toUpperCase() + league.scheduleFrequency.slice(1) : '—'} />

          {/* Season Length */}
          <ReadOnlyField
            label={`Season Length${league.scheduleFrequency ? ` (${league.scheduleFrequency === 'weekly' ? 'weeks' : 'months'})` : ''}`}
            value={league.seasonLength != null ? String(league.seasonLength) : ''}
          />

          {/* Projected End Date */}
          <View style={styles.roProjectedEndRow}>
            <Text style={styles.roFieldLabel}>Projected End Date</Text>
            <Text style={styles.roProjectedEndValue}>
              {projectedEndDate || 'Not available'}
            </Text>
          </View>

          {/* Team league schedule fields */}
          {isTeamLeague && (
            <>
              <ReadOnlyField label="Minimum Roster Size" value={league.minimumRosterSize != null ? String(league.minimumRosterSize) : ''} />
              <ReadOnlyField label="Season Game Count" value={league.seasonGameCount != null ? String(league.seasonGameCount) : ''} />
            </>
          )}

          {/* Game Day */}
          <Text style={styles.roFieldLabel}>Game Day</Text>
          <View style={styles.roDayChipsRow}>
            {dayLabels.map((label, idx) => {
              const isSelected = league.preferredGameDays?.includes(idx);
              return (
                <View key={idx} style={[styles.roDayChip, isSelected && styles.roDayChipSelected]}>
                  <Text style={[styles.roDayChipText, isSelected && styles.roDayChipTextSelected]}>{label}</Text>
                </View>
              );
            })}
          </View>

          {/* Time Range */}
          <ReadOnlyField label="Time Range Start" value={league.preferredTimeWindowStart || ''} />
          <ReadOnlyField label="Time Range End" value={league.preferredTimeWindowEnd || ''} />

          {/* Registration Cutoff */}
          <ReadOnlyField label="Registration Cutoff" value={league.registrationCloseDate ? formatDate(league.registrationCloseDate) : ''} />

          {/* Track Standings — display only */}
          <View style={styles.roToggleCard}>
            <View style={styles.roToggleRow}>
              <View style={styles.roToggleInfo}>
                <Text style={styles.roToggleLabel}>Track Standings</Text>
                <Text style={styles.roToggleDescription}>
                  Record wins, draws, and losses to maintain a league standings table
                </Text>
              </View>
              <View style={[styles.roTogglePill, league.trackStandings !== false && styles.roTogglePillActive]}>
                <Text style={[styles.roTogglePillText, league.trackStandings !== false && styles.roTogglePillTextActive]}>
                  {league.trackStandings !== false ? 'On' : 'Off'}
                </Text>
              </View>
            </View>
          </View>

          {/* Points Config — only when tracking standings */}
          {league.trackStandings !== false && league.pointsConfig && (
            <View style={styles.roPointsSection}>
              <ReadOnlyField label="Points for Win" value={String(league.pointsConfig.win)} />
              <ReadOnlyField label="Points for Draw" value={String(league.pointsConfig.draw)} />
              <ReadOnlyField label="Points for Loss" value={String(league.pointsConfig.loss)} />
            </View>
          )}

          {/* Standings table — if tracking standings */}
          {league.trackStandings !== false && (
            <View style={styles.roStandingsSection}>
              <StandingsTab leagueId={leagueId} leagueType={league.leagueType} />
            </View>
          )}

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
                          accessibilityLabel={`Join Up ${rosterName}`}
                        >
                          <Text style={styles.confirmBtnText}>Join Up</Text>
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
        </View>
      </ScrollView>

      {/* Bottom action bar — Join Up for pending invitations */}
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
  commissionerInviteBanner: {
    flexDirection: 'row', backgroundColor: '#FFF8EE', paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 12, borderLeftWidth: 4, borderLeftColor: colors.court,
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
    width: 36, height: 36, borderRadius: 18, backgroundColor: `${colors.court}18`,
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
    backgroundColor: `${colors.court}18`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  invitedBadgeText: {
    fontFamily: fonts.label, fontSize: 11, color: colors.court,
  },
  // ── Read-only form styles (non-commissioner view) ───────────────
  roForm: {
    padding: 16,
  },
  roField: {
    marginBottom: 16,
  },
  roFieldLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 4,
    fontWeight: '600',
  },
  roFieldValueBox: {
    // kept for backwards compat but no longer used by ReadOnlyField
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  roFieldValue: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    marginTop: 2,
  },
  roProjectedEndRow: {
    marginBottom: 16,
  },
  roProjectedEndValue: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.grass,
    marginTop: 4,
  },
  roDayChipsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 4,
    marginBottom: 16,
    marginTop: 4,
  },
  roDayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  roDayChipSelected: {
    backgroundColor: colors.grass,
    borderColor: colors.grass,
  },
  roDayChipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    fontWeight: '600' as const,
  },
  roDayChipTextSelected: {
    color: '#FFFFFF',
  },
  roToggleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roToggleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  roToggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  roToggleLabel: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.ink,
  },
  roToggleDescription: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 2,
  },
  roTogglePill: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#E0E0E0',
  },
  roTogglePillActive: {
    backgroundColor: colors.grass,
  },
  roTogglePillText: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.inkFaint,
  },
  roTogglePillTextActive: {
    color: '#FFFFFF',
  },
  roPointsSection: {
    marginBottom: 8,
  },
  roStandingsSection: {
    marginTop: 8,
    marginBottom: 16,
  },
});
