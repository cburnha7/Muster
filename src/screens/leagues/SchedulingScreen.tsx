import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { ScheduleEventCard } from '../../components/league/ScheduleEventCard';
import { ScheduleEventEditor } from '../../components/league/ScheduleEventEditor';
import {
  ScheduleEvent,
  setEvents,
  addEvent,
  updateEvent,
  removeEvent,
  clearSchedule,
  setGenerating,
  setReviewing,
  setError,
  selectScheduleEvents,
  selectIsGenerating,
  selectScheduleError,
} from '../../store/slices/scheduleSlice';
import {
  useGenerateScheduleMutation,
  useConfirmScheduleMutation,
} from '../../store/api';
import { RosterInfo, ConfirmableEvent, SchedulePreviewEvent } from '../../types/scheduling';
import { LeagueService } from '../../services/api/LeagueService';
import { MatchService } from '../../services/api/MatchService';
import { League, LeagueMembership } from '../../types/league';
import { mapMatchesToScheduleEvents } from './utils/mapMatchesToScheduleEvents';
import { colors, fonts, Spacing, BorderRadius, Shadows } from '../../theme';

// Generate a simple client-side ID
const generateClientId = (): string =>
  `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Map API preview events to Redux ScheduleEvent format
const mapPreviewToScheduleEvents = (
  previewEvents: SchedulePreviewEvent[],
): ScheduleEvent[] =>
  previewEvents.map((pe) => ({
    id: generateClientId(),
    homeRosterId: pe.homeRoster.id,
    homeRosterName: pe.homeRoster.name,
    awayRosterId: pe.awayRoster.id,
    awayRosterName: pe.awayRoster.name,
    scheduledAt: pe.scheduledAt,
    round: pe.round,
    ...(pe.flag ? { flag: pe.flag } : {}),
  }));

// Map Redux events to confirmable format
const mapToConfirmableEvents = (events: ScheduleEvent[]): ConfirmableEvent[] =>
  events.map((e) => ({
    homeRosterId: e.homeRosterId,
    homeRosterName: e.homeRosterName,
    awayRosterId: e.awayRosterId,
    awayRosterName: e.awayRosterName,
    scheduledAt: e.scheduledAt,
    round: e.round,
    ...(e.flag ? { flag: e.flag } : {}),
  }));

const GAME_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

/** Check if a new/edited event conflicts with existing events (same roster playing at overlapping time). */
function findConflict(
  candidate: ScheduleEvent,
  existingEvents: ScheduleEvent[],
): string | null {
  const cStart = new Date(candidate.scheduledAt).getTime();
  const cEnd = cStart + GAME_DURATION_MS;
  const candidateRosters = [candidate.homeRosterId, candidate.awayRosterId];

  for (const existing of existingEvents) {
    if (existing.id === candidate.id) continue; // skip self when editing
    const eStart = new Date(existing.scheduledAt).getTime();
    const eEnd = eStart + GAME_DURATION_MS;
    const overlaps = cStart < eEnd && eStart < cEnd;
    if (!overlaps) continue;

    const conflictingIds = candidateRosters.filter(
      (id) => id === existing.homeRosterId || id === existing.awayRosterId,
    );
    if (conflictingIds.length > 0) {
      // Find the roster name for the message
      const conflictName =
        conflictingIds[0] === existing.homeRosterId
          ? existing.homeRosterName
          : conflictingIds[0] === existing.awayRosterId
            ? existing.awayRosterName
            : conflictingIds[0] === candidate.homeRosterId
              ? candidate.homeRosterName
              : candidate.awayRosterName;
      return `${conflictName} already has a game at that time (${existing.homeRosterName} vs ${existing.awayRosterName}).`;
    }
  }
  return null;
}

export default function SchedulingScreen({ route, navigation }: any): React.ReactElement {
  const { leagueId } = route.params || {};
  const dispatch = useDispatch();

  // Redux state
  const events = useSelector(selectScheduleEvents);
  const isGenerating = useSelector(selectIsGenerating);
  const scheduleError = useSelector(selectScheduleError);

  // Local state
  const [league, setLeague] = useState<League | null>(null);
  const [rosters, setRosters] = useState<RosterInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | undefined>(undefined);

  // RTK Query mutations
  const [generateSchedule] = useGenerateScheduleMutation();
  const [confirmSchedule] = useConfirmScheduleMutation();

  // Load league data and extract rosters
  const loadLeagueData = useCallback(async () => {
    if (!leagueId) return;
    try {
      setIsLoading(true);
      setLoadError(null);
      const svc = new LeagueService();
      const [leagueData, membersResponse] = await Promise.all([
        svc.getLeagueById(leagueId, true),
        svc.getMembers(leagueId, 1, 100),
      ]);
      setLeague(leagueData);

      // Extract active rosters from memberships
      const membersData: LeagueMembership[] =
        (membersResponse as any).data || (membersResponse as any) || [];
      const activeRosters: RosterInfo[] = (Array.isArray(membersData) ? membersData : [])
        .filter((m) => m.memberType === 'roster' && m.status === 'active')
        .map((m) => ({
          id: m.team?.id || m.memberId,
          name: m.team?.name || m.memberId,
        }));
      setRosters(activeRosters);

      // Fetch existing matches for this league
      try {
        const matchSvc = new MatchService();
        const matchesResponse = await matchSvc.getLeagueMatches(leagueId, 1, 100);
        const mappedEvents = mapMatchesToScheduleEvents(matchesResponse.data);
        dispatch(setEvents({ leagueId, events: mappedEvents }));
      } catch (matchErr) {
        // Match fetch failure shows a dismissible banner but does not block the screen
        console.warn('Failed to fetch existing matches:', matchErr);
        dispatch(setError('Failed to load existing games. Tap retry or try again later.'));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load league');
    } finally {
      setIsLoading(false);
    }
  }, [leagueId, dispatch]);

  useEffect(() => {
    loadLeagueData();
  }, [loadLeagueData]);

  // Auto Generate Schedule handler
  const handleAutoGenerate = async () => {
    dispatch(setError(null));
    dispatch(setGenerating(true));
    try {
      const result = await generateSchedule({ leagueId }).unwrap();
      const mapped = mapPreviewToScheduleEvents(result.events);
      dispatch(setEvents({ leagueId, events: mapped }));
      dispatch(setReviewing(true));
    } catch (err: any) {
      const message =
        err?.data?.error || err?.message || 'Failed to generate schedule';
      dispatch(setError(message));
    } finally {
      dispatch(setGenerating(false));
    }
  };

  // Confirm Schedule handler
  const handleConfirmSchedule = async () => {
    if (events.length === 0) return;
    setIsConfirming(true);
    try {
      const confirmable = mapToConfirmableEvents(events);
      await confirmSchedule({ leagueId, events: confirmable }).unwrap();
      dispatch(clearSchedule());
      if (Platform.OS === 'web') {
        window.alert('Schedule confirmed and published.');
      } else {
        Alert.alert('Success', 'Schedule confirmed and published.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
      if (Platform.OS === 'web') {
        navigation.goBack();
      }
    } catch (err: any) {
      const message =
        err?.data?.error || err?.message || 'Failed to confirm schedule';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setIsConfirming(false);
    }
  };

  // Event editing handlers
  const handleAddGame = () => {
    setEditingEvent(undefined);
    setEditorVisible(true);
  };

  const handleEditEvent = (event: ScheduleEvent) => {
    setEditingEvent(event);
    setEditorVisible(true);
  };

  const handleRemoveEvent = (eventId: string) => {
    dispatch(removeEvent(eventId));
  };

  const handleEditorSave = (event: ScheduleEvent) => {
    const conflict = findConflict(event, events);
    if (conflict) {
      if (Platform.OS === 'web') {
        window.alert(conflict);
      } else {
        Alert.alert('Scheduling Conflict', conflict);
      }
      return;
    }
    if (editingEvent) {
      dispatch(updateEvent(event));
    } else {
      dispatch(addEvent(event));
    }
    setEditorVisible(false);
    setEditingEvent(undefined);
  };

  const handleEditorCancel = () => {
    setEditorVisible(false);
    setEditingEvent(undefined);
  };

  // Compute game counts per roster for the summary table
  const rosterGameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rosters) counts.set(r.id, 0);
    for (const e of events) {
      counts.set(e.homeRosterId, (counts.get(e.homeRosterId) ?? 0) + 1);
      counts.set(e.awayRosterId, (counts.get(e.awayRosterId) ?? 0) + 1);
    }
    return rosters.map((r) => ({ ...r, games: counts.get(r.id) ?? 0 }));
  }, [rosters, events]);

  // Roster summary header
  const renderListHeader = () => {
    if (rosters.length === 0) return null;
    return (
      <View style={styles.rosterSummary}>
        <Text style={styles.rosterSummaryTitle}>Rosters</Text>
        <View style={styles.rosterSummaryHeader}>
          <Text style={[styles.rosterSummaryCell, styles.rosterSummaryNameHeader]}>Name</Text>
          <Text style={[styles.rosterSummaryCell, styles.rosterSummaryCountHeader]}>Games</Text>
        </View>
        {rosterGameCounts.map((r) => (
          <View key={r.id} style={styles.rosterSummaryRow}>
            <Text style={[styles.rosterSummaryCell, styles.rosterSummaryName]} numberOfLines={1}>
              {r.name}
            </Text>
            <Text style={[styles.rosterSummaryCell, styles.rosterSummaryCount]}>
              {r.games}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // Render event card
  const renderEventCard = ({ item }: { item: ScheduleEvent }) => (
    <ScheduleEventCard
      event={item}
      rosters={rosters}
      onEdit={handleEditEvent}
      onRemove={handleRemoveEvent}
    />
  );

  // Empty state
  const renderEmptyState = () => {
    if (isGenerating) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="calendar-outline" size={48} color={colors.inkFaint} />
        <Text style={styles.emptyTitle}>No games scheduled yet</Text>
        <Text style={styles.emptySubtext}>
          Tap Auto Generate or add games manually.
        </Text>
      </View>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader
          title="Schedule"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.pine} />
        </View>
      </SafeAreaView>
    );
  }

  // Load error state
  if (loadError || !league) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader
          title="Schedule"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.heart} />
          <Text style={styles.errorTitle}>{loadError || 'League not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadLeagueData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const hasEvents = events.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={league.name}
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
      />

      {/* Error banner */}
      {scheduleError && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={18} color="#FFFFFF" />
          <Text style={styles.errorBannerText}>{scheduleError}</Text>
          <TouchableOpacity
            onPress={() => {
              dispatch(setError(null));
              loadLeagueData();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => dispatch(setError(null))}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Dismiss error"
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Auto Generate button */}
      <View style={styles.generateSection}>
        <TouchableOpacity
          style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
          onPress={handleAutoGenerate}
          disabled={isGenerating}
          accessibilityRole="button"
          accessibilityLabel="Auto Generate Schedule"
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="flash-outline" size={20} color="#FFFFFF" />
          )}
          <Text style={styles.generateButtonText}>
            {isGenerating ? 'Generating...' : 'Auto Generate Schedule'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Event list */}
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEventCard}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContent,
          !hasEvents && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.addGameButton}
          onPress={handleAddGame}
          accessibilityRole="button"
          accessibilityLabel="Add Game"
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.pine} />
          <Text style={styles.addGameButtonText}>Add Game</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.confirmButton,
            !hasEvents && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirmSchedule}
          disabled={!hasEvents || isConfirming}
          accessibilityRole="button"
          accessibilityState={{ disabled: !hasEvents || isConfirming }}
          accessibilityLabel="Confirm Schedule"
        >
          {isConfirming ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Schedule</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Event editor modal */}
      {editorVisible && (
        editingEvent ? (
          <ScheduleEventEditor
            event={editingEvent}
            rosters={rosters}
            onSave={handleEditorSave}
            onCancel={handleEditorCancel}
          />
        ) : (
          <ScheduleEventEditor
            rosters={rosters}
            onSave={handleEditorSave}
            onCancel={handleEditorCancel}
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chalk,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorTitle: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: colors.pine,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: '#FFFFFF',
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.heart,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: '#FFFFFF',
  },

  // Generate section
  generateSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pine,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  generateButtonDisabled: {
    backgroundColor: colors.pineLight,
  },
  generateButtonText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: '#FFFFFF',
  },

  // List
  listContent: {
    paddingBottom: Spacing.lg,
  },
  listContentEmpty: {
    flex: 1,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
    marginTop: Spacing.lg,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },

  // Roster summary table
  rosterSummary: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  rosterSummaryTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.ink,
    marginBottom: Spacing.md,
  },
  rosterSummaryHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.inkFaint + '30',
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  rosterSummaryRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.inkFaint + '15',
  },
  rosterSummaryCell: {
    fontSize: 14,
  },
  rosterSummaryNameHeader: {
    flex: 1,
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rosterSummaryCountHeader: {
    width: 50,
    textAlign: 'center',
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rosterSummaryName: {
    flex: 1,
    fontFamily: fonts.body,
    color: colors.ink,
  },
  rosterSummaryCount: {
    width: 50,
    textAlign: 'center',
    fontFamily: fonts.ui,
    color: colors.ink,
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    gap: Spacing.md,
  },
  addGameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.pine,
    gap: Spacing.xs,
  },
  addGameButtonText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.pine,
  },
  confirmButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pine,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.inkFaint,
  },
  confirmButtonText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
