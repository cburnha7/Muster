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
import { FormButton } from '../../components/forms/FormButton';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';

import { LeagueService } from '../../services/api/LeagueService';
import { leagueService } from '../../services/api/LeagueService';
import { SportType, Team, Event } from '../../types';
import { League, LeagueMembership } from '../../types/league';
import { colors } from '../../theme';
import { RootState } from '../../store/store';
import { selectUserTeams } from '../../store/slices/teamsSlice';

/** Shape returned by GET /api/leagues/:id/events */
interface LeagueEvent extends Event {
  assignedRosters: Array<{ id: string; name: string }>;
}

const MAX_UPCOMING_EVENTS = 3;

// Import tab components - using explicit file extensions
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
  
  // Get current user from Redux store
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  // Get user's rosters (teams they own/captain)
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

  const loadLeague = useCallback(async (isRefresh = false) => {
    if (!leagueId) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const leagueServiceInstance = new LeagueService();
      const [leagueData, membersResponse, eventsData] = await Promise.all([
        leagueServiceInstance.getLeagueById(leagueId),
        leagueServiceInstance.getMembers(leagueId, 1, 100),
        leagueServiceInstance.getLeagueEvents(leagueId),
      ]);
      // Type assertion needed because LeagueService uses types/index League
      // but we need types/league League which has additional properties
      const typedLeague = leagueData as any as League;
      setLeague(typedLeague);
      setMembers(membersResponse.data || []);
      setUpcomingEvents((eventsData as LeagueEvent[]) || []);

      // Load join requests for public team leagues when user is operator
      if (
        typedLeague.leagueType === 'team' &&
        typedLeague.visibility === 'public' &&
        currentUser?.id === typedLeague.organizerId
      ) {
        try {
          const requests = await leagueServiceInstance.getJoinRequests(leagueId, currentUser.id);
          setJoinRequests(requests || []);
        } catch {
          // Non-critical: silently fail join request loading
          setJoinRequests([]);
        }
      } else {
        setJoinRequests([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load league';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [leagueId, currentUser]);

  useFocusEffect(
    useCallback(() => {
      loadLeague();
    }, [loadLeague])
  );

  const getSportIcon = (sportType: string) => {
    switch (sportType) {
      case SportType.BASKETBALL:
      case 'basketball':
        return 'basketball-outline';
      case SportType.SOCCER:
      case 'soccer':
        return 'football-outline';
      case SportType.TENNIS:
      case 'tennis':
      case SportType.PICKLEBALL:
      case 'pickleball':
      case SportType.BADMINTON:
      case 'badminton':
        return 'tennisball-outline';
      case SportType.VOLLEYBALL:
      case 'volleyball':
        return 'american-football-outline';
      case SportType.SOFTBALL:
      case 'softball':
      case SportType.BASEBALL:
      case 'baseball':
        return 'baseball-outline';
      case SportType.FLAG_FOOTBALL:
      case 'flag_football':
        return 'flag-outline';
      case SportType.KICKBALL:
      case 'kickball':
        return 'football-outline';
      default:
        return 'fitness-outline';
    }
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return 'TBD';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // ── Membership helpers ──────────────────────────────────────────────
  // Check if current user is league operator or admin
  const isOperator = league ? currentUser?.id === league.organizerId : false;

  const activeMembers = members.filter((m) => m.status === 'active' || m.status === 'pending');

  // Check if the current user is already a participant in a pickup league
  const userPickupMembership = members.find(
    (m) => m.memberType === 'user' && m.memberId === currentUser?.id && m.status === 'active'
  );
  const isPickupParticipant = !!userPickupMembership;

  // For team leagues: find user's rosters that are NOT already in the league
  const rosterIdsInLeague = new Set(
    activeMembers.filter((m) => m.memberType === 'roster').map((m) => m.memberId)
  );
  const userOwnedRosters = (userRosters || []).filter(
    (r) => r.captainId === currentUser?.id
  );
  const eligibleRosters = userOwnedRosters.filter(
    (r) => !rosterIdsInLeague.has(r.id)
  );
  const hasEligibleRoster = eligibleRosters.length > 0;

  // ── Action handlers ───────────────────────────────────────────────
  const handleJoinTeamLeague = async () => {
    if (!league || !currentUser || eligibleRosters.length === 0) return;

    // If user owns multiple eligible rosters, use the first one for now
    // A roster picker could be added later
    const roster = eligibleRosters[0];

    try {
      setIsActionLoading(true);
      await leagueService.joinLeagueAsRoster(league.id, roster.id, currentUser.id);
      Alert.alert(
        'Request Sent',
        `Your roster "${roster.name}" has requested to join this league.`
      );
      await loadLeague(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send join request';
      Alert.alert('Error', msg);
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
      const msg = err instanceof Error ? err.message : 'Failed to join league';
      Alert.alert('Error', msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStepOut = async () => {
    if (!league || !currentUser) return;

    Alert.alert(
      "I'm Out",
      'Are you sure you want to leave this league?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: "I'm Out",
          style: 'destructive',
          onPress: async () => {
            try {
              setIsActionLoading(true);
              await leagueService.stepOutOfLeague(league.id, currentUser.id);
              await loadLeague(true);
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Failed to leave league';
              Alert.alert('Error', msg);
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAddRosters = () => {
    if (league) {
      (navigation as any).navigate('ManageLeague', {
        leagueId: league.id,
        leagueType: league.leagueType,
        initialTab: 'rosters',
      });
    }
  };

  const handleManageLeague = () => {
    if (league) {
      (navigation as any).navigate('ManageLeague', {
        leagueId: league.id,
        leagueType: league.leagueType,
      });
    }
  };

  // ── Join request handlers ─────────────────────────────────────────
  const handleApproveRequest = async (requestId: string) => {
    if (!league || !currentUser) return;

    try {
      setJoinRequestActionId(requestId);
      setJoinRequestError(null);
      await leagueService.approveJoinRequest(league.id, requestId, currentUser.id);
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
      await loadLeague(true);
    } catch (err: any) {
      // Check for insufficient balance error from the API
      const errorData = err?.response?.data || err?.data;
      if (
        errorData?.error === 'Insufficient roster balance' ||
        (err instanceof Error && err.message.includes('Insufficient roster balance'))
      ) {
        const required = errorData?.required;
        const available = errorData?.available;
        const balanceMsg =
          required != null && available != null
            ? `Insufficient roster balance. Required: $${required}, Available: $${available}`
            : 'Insufficient roster balance to cover the membership fee.';
        setJoinRequestError(balanceMsg);
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to approve request';
        Alert.alert('Error', msg);
      }
    } finally {
      setJoinRequestActionId(null);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!league || !currentUser) return;

    try {
      setJoinRequestActionId(requestId);
      setJoinRequestError(null);
      await leagueService.declineJoinRequest(league.id, requestId, currentUser.id);
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to decline request';
      Alert.alert('Error', msg);
    } finally {
      setJoinRequestActionId(null);
    }
  };

  // ── Event helpers ─────────────────────────────────────────────────
  const formatEventDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatEventTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleEventPress = (eventId: string) => {
    (navigation as any).navigate('EventDetails', { eventId, leagueType: league?.leagueType });
  };

  const handleSeeAllEvents = () => {
    if (league) {
      setActiveTab('matches');
    }
  };

  const isTeamLeague = league?.leagueType === 'team';

  // ── Render join request queue ───────────────────────────────────
  const renderJoinRequestQueue = () => {
    if (
      !league ||
      league.leagueType !== 'team' ||
      league.visibility !== 'public' ||
      !isOperator ||
      joinRequests.length === 0
    ) {
      return null;
    }

    return (
      <View style={styles.joinRequestSection}>
        <Text style={styles.joinRequestSectionTitle}>Pending Join Requests</Text>

        {joinRequestError && (
          <View style={styles.joinRequestErrorBanner}>
            <Ionicons name="alert-circle" size={16} color={colors.track} />
            <Text style={styles.joinRequestErrorText}>{joinRequestError}</Text>
          </View>
        )}

        {joinRequests.map((request) => {
          const rosterName = request.team?.name || 'Unknown Roster';
          const requestDate = formatDate(request.createdAt);
          const isProcessing = joinRequestActionId === request.id;

          return (
            <View key={request.id} style={styles.joinRequestCard}>
              <View style={styles.joinRequestInfo}>
                <Text style={styles.joinRequestRosterName} numberOfLines={1}>
                  {rosterName}
                </Text>
                <Text style={styles.joinRequestDate}>
                  Requested {requestDate}
                </Text>
              </View>

              <View style={styles.joinRequestActions}>
                <TouchableOpacity
                  style={[styles.joinRequestBtn, styles.joinRequestApproveBtn]}
                  onPress={() => handleApproveRequest(request.id)}
                  disabled={isProcessing}
                  activeOpacity={0.7}
                >
                  {isProcessing ? (
                    <LoadingSpinner size={16} />
                  ) : (
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.joinRequestBtn, styles.joinRequestDeclineBtn]}
                  onPress={() => handleDeclineRequest(request.id)}
                  disabled={isProcessing}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={18} color={colors.track} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // ── Render upcoming events ────────────────────────────────────────
  const renderUpcomingEvents = () => {
    if (!league || upcomingEvents.length === 0) return null;

    const displayedEvents = upcomingEvents.slice(0, MAX_UPCOMING_EVENTS);
    const hasMore = upcomingEvents.length > MAX_UPCOMING_EVENTS;

    return (
      <View style={styles.upcomingSection}>
        <View style={styles.upcomingSectionHeader}>
          <Text style={styles.upcomingSectionTitle}>Upcoming Events</Text>
          {hasMore && (
            <TouchableOpacity onPress={handleSeeAllEvents}>
              <Text style={styles.seeAllLink}>See All</Text>
            </TouchableOpacity>
          )}
        </View>

        {displayedEvents.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={styles.eventCard}
            onPress={() => handleEventPress(event.id)}
            activeOpacity={0.7}
          >
            <View style={styles.eventDateBadge}>
              <Text style={styles.eventDateBadgeDay}>
                {new Date(event.startTime).getDate()}
              </Text>
              <Text style={styles.eventDateBadgeMonth}>
                {new Date(event.startTime).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
              </Text>
            </View>

            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle} numberOfLines={1}>
                {event.title}
              </Text>
              <Text style={styles.eventDateTime}>
                {formatEventDate(event.startTime)} · {formatEventTime(event.startTime)}
              </Text>
              {event.facility && (
                <Text style={styles.eventFacility} numberOfLines={1}>
                  <Ionicons name="location-outline" size={12} color={colors.inkFaint} />{' '}
                  {event.facility.name}
                </Text>
              )}
              {isTeamLeague && event.assignedRosters.length > 0 ? (
                <Text style={styles.eventRosters} numberOfLines={1}>
                  {event.assignedRosters.map((r) => r.name).join(' vs ')}
                </Text>
              ) : (
                <Text style={styles.eventOpenGame}>Open Game</Text>
              )}
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // ── Render action bar ─────────────────────────────────────────────
  const renderActionBar = () => {
    if (!league || !isAuthenticated || !currentUser) return null;

    const isTeamLeague = league.leagueType === 'team';
    const isPickupLeague = league.leagueType === 'pickup';
    const isPublic = league.visibility === 'public';
    const isPrivate = league.visibility === 'private';

    // ── Private Team League: "Add Rosters" for owner/admins ──
    if (isTeamLeague && isPrivate) {
      if (isOperator) {
        return (
          <View style={styles.actions}>
            <FormButton
              title="Add Rosters"
              onPress={handleAddRosters}
              leftIcon="people-outline"
              style={styles.actionButton}
            />
          </View>
        );
      }
      // Non-operators see nothing for private team leagues
      return null;
    }

    // Operator gets the manage button via the header settings icon — no bottom bar for other types
    if (isOperator) return null;

    // ── Public Team League: "Join Up" for roster owners not in the league ──
    if (isTeamLeague && isPublic) {
      if (!hasEligibleRoster) return null;

      return (
        <View style={styles.actions}>
          <FormButton
            title="Join Up"
            onPress={handleJoinTeamLeague}
            loading={isActionLoading}
            disabled={isActionLoading}
            leftIcon="add-circle-outline"
            style={styles.actionButton}
          />
        </View>
      );
    }

    // ── Pickup League: "Join Up" / "Step Out" toggle ──
    if (isPickupLeague) {
      if (isPickupParticipant) {
        return (
          <View style={styles.actions}>
            <FormButton
              title="I'm Out"
              onPress={handleStepOut}
              variant="outline"
              loading={isActionLoading}
              disabled={isActionLoading}
              leftIcon="exit-outline"
              style={styles.actionButton}
            />
          </View>
        );
      }

      return (
        <View style={styles.actions}>
          <FormButton
            title="Join Up"
            onPress={handleJoinPickupLeague}
            loading={isActionLoading}
            disabled={isActionLoading}
            leftIcon="add-circle-outline"
            style={styles.actionButton}
          />
        </View>
      );
    }

    return null;
  };

  const renderTabContent = () => {
    if (!leagueId) return null;

    switch (activeTab) {
      case 'standings':
        return <StandingsTab leagueId={leagueId} leagueType={league?.leagueType} />;
      case 'matches':
        return <MatchesTab leagueId={leagueId} />;
      case 'players':
        return <PlayersTab leagueId={leagueId} leagueType={league?.leagueType} />;
      case 'teams':
        return <TeamsTab leagueId={leagueId} />;
      case 'info':
        return <InfoTab league={league} />;
      default:
        return null;
    }
  };

  const tabs: Array<{ key: TabKey; title: string }> = [
    { key: 'standings', title: 'Standings' },
    { key: 'matches', title: 'Matches' },
    { key: 'players', title: 'Players' },
    { key: 'teams', title: 'Rosters' },
    { key: 'info', title: 'Info' },
  ];

  if (isLoading && !league) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="League Details"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <LoadingSpinner />
      </View>
    );
  }

  if (error && !league) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="League Details"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <ErrorDisplay message={error} onRetry={() => loadLeague()} />
      </View>
    );
  }

  if (!league) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="League Details"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <ErrorDisplay message="League not found" onRetry={() => loadLeague()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={league.name}
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        {...(isOperator && {
          rightIcon: 'settings-outline',
          onRightPress: handleManageLeague,
        })}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadLeague(true)}
            colors={[colors.grass]}
            tintColor={colors.grass}
          />
        }
      >
        {/* League Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Ionicons
              name={getSportIcon(league.sportType) as any}
              size={32}
              color={colors.grass}
            />
            <View style={styles.headerInfo}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{league.name}</Text>
                {league.isCertified && (
                  <View style={styles.certifiedBadge}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.court} />
                  </View>
                )}
              </View>
              <Text style={styles.season}>
                {league.seasonName || `${formatDate(league.startDate)} - ${formatDate(league.endDate)}`}
              </Text>
            </View>
          </View>

          {/* League Info Section */}
          {league.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.description}>{league.description}</Text>
            </View>
          )}

          {/* Points System */}
          {league.pointsConfig && (
            <View style={styles.pointsSystemSection}>
              <Text style={styles.sectionTitle}>Points System</Text>
              <View style={styles.pointsRow}>
                <View style={styles.pointItem}>
                  <Text style={styles.pointValue}>{league.pointsConfig.win}</Text>
                  <Text style={styles.pointLabel}>Win</Text>
                </View>
                <View style={styles.pointItem}>
                  <Text style={styles.pointValue}>{league.pointsConfig.draw}</Text>
                  <Text style={styles.pointLabel}>Draw</Text>
                </View>
                <View style={styles.pointItem}>
                  <Text style={styles.pointValue}>{league.pointsConfig.loss}</Text>
                  <Text style={styles.pointLabel}>Loss</Text>
                </View>
              </View>
            </View>
          )}

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{league.memberCount || 0}</Text>
              <Text style={styles.statLabel}>Rosters</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{league.matchCount || 0}</Text>
              <Text style={styles.statLabel}>Matches</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: league.isActive ? colors.grass : '#999' }
              ]}>
                <Text style={styles.statusText}>
                  {league.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Join Request Queue (public Team League, operator only) */}
        {renderJoinRequestQueue()}

        {/* Upcoming Events */}
        {renderUpcomingEvents()}

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  activeTab === tab.key && styles.activeTab,
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === tab.key && styles.activeTabLabel,
                  ]}
                >
                  {tab.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>
      </ScrollView>

      {/* Action Bar */}
      {renderActionBar()}
    </View>
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
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    flex: 1,
  },
  certifiedBadge: {
    marginLeft: 8,
    backgroundColor: '#FFF5E6',
    borderRadius: 16,
    padding: 6,
  },
  season: {
    fontSize: 14,
    color: colors.inkFaint,
  },
  descriptionSection: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  description: {
    fontSize: 14,
    color: colors.inkFaint,
    lineHeight: 20,
  },
  pointsSystemSection: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 8,
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  pointItem: {
    alignItems: 'center',
  },
  pointValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.grass,
  },
  pointLabel: {
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 4,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
  },
  statLabel: {
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // ── Upcoming Events styles ──────────────────────────────────────
  upcomingSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  upcomingSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  upcomingSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  seeAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.grass,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.chalk,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  eventDateBadge: {
    width: 44,
    alignItems: 'center',
    marginRight: 12,
  },
  eventDateBadgeDay: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 24,
  },
  eventDateBadgeMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkFaint,
    letterSpacing: 0.5,
  },
  eventInfo: {
    flex: 1,
    marginRight: 8,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 2,
  },
  eventDateTime: {
    fontSize: 12,
    color: colors.inkFaint,
    marginBottom: 2,
  },
  eventFacility: {
    fontSize: 12,
    color: colors.inkFaint,
    marginBottom: 2,
  },
  eventRosters: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.grass,
  },
  eventOpenGame: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.sky,
  },
  // ── Join Request Queue styles ─────────────────────────────────
  joinRequestSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  joinRequestSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 12,
  },
  joinRequestErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  joinRequestErrorText: {
    fontSize: 13,
    color: colors.track,
    marginLeft: 8,
    flex: 1,
  },
  joinRequestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.chalk,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  joinRequestInfo: {
    flex: 1,
    marginRight: 12,
  },
  joinRequestRosterName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 2,
  },
  joinRequestDate: {
    fontSize: 12,
    color: colors.inkFaint,
  },
  joinRequestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  joinRequestBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinRequestApproveBtn: {
    backgroundColor: colors.grass,
  },
  joinRequestDeclineBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: colors.track,
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.grass,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabLabel: {
    color: colors.grass,
  },
  tabContent: {
    flex: 1,
    minHeight: 400,
  },
  actions: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    width: '100%',
  },
});
