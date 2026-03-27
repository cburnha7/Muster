import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { RosterInvitation, LeagueInvitation, EventInvitation, ReadyToScheduleLeague } from '../../services/api/UserService';
import { Booking } from '../../types';

/** Unified inbox item — every action item maps to one of these */
export interface InboxItem {
  id: string;
  type:
    | 'roster_invitation'
    | 'league_invitation'
    | 'event_invitation'
    | 'schedule_league'
    | 'debrief'
    | 'cancel_request'
    | 'reservation_request';
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  timestamp: number; // for sorting
  onPress: () => void;
  /** Raw data for action buttons */
  data?: any;
}

interface InboxSectionProps {
  rosterInvitations: RosterInvitation[];
  leagueInvitations: LeagueInvitation[];
  eventInvitations: EventInvitation[];
  readyToScheduleLeagues: ReadyToScheduleLeague[];
  debriefEvents: Booking[];
  cancelRequests: any[];
  onRosterInvitationPress: (inv: RosterInvitation) => void;
  onLeagueInvitationPress: (inv: LeagueInvitation) => void;
  onEventInvitationPress: (inv: EventInvitation) => void;
  onScheduleLeaguePress: (league: ReadyToScheduleLeague) => void;
  onDebriefPress: (booking: Booking) => void;
  onApproveCancelRequest: (id: string) => void;
  onDenyCancelRequest: (id: string) => void;
  isCancelLoading: boolean;
}

const TYPE_LABELS: Record<InboxItem['type'], string> = {
  roster_invitation: 'Roster Invitation',
  league_invitation: 'League Invitation',
  event_invitation: 'Event Invitation',
  schedule_league: 'Schedule League',
  debrief: 'Debrief Pending',
  cancel_request: 'Cancel Request',
  reservation_request: 'Reservation Request',
};

export function InboxSection({
  rosterInvitations,
  leagueInvitations,
  eventInvitations,
  readyToScheduleLeagues,
  debriefEvents,
  cancelRequests,
  onRosterInvitationPress,
  onLeagueInvitationPress,
  onEventInvitationPress,
  onScheduleLeaguePress,
  onDebriefPress,
  onApproveCancelRequest,
  onDenyCancelRequest,
  isCancelLoading,
}: InboxSectionProps) {
  // Build unified list
  const items: InboxItem[] = [];

  rosterInvitations.forEach((inv) => {
    items.push({
      id: `roster-${inv.id}`,
      type: 'roster_invitation',
      title: inv.rosterName,
      subtitle: 'You\'ve been invited to join this roster',
      icon: 'people-outline',
      iconColor: colors.pine,
      timestamp: Date.now(),
      onPress: () => onRosterInvitationPress(inv),
    });
  });

  leagueInvitations.forEach((inv) => {
    items.push({
      id: `league-${inv.id}`,
      type: 'league_invitation',
      title: inv.leagueName,
      subtitle: `${inv.rosterName} has been invited`,
      icon: 'trophy-outline',
      iconColor: colors.bronze,
      timestamp: Date.now(),
      onPress: () => onLeagueInvitationPress(inv),
    });
  });

  eventInvitations.forEach((inv) => {
    items.push({
      id: `event-${inv.id}`,
      type: 'event_invitation',
      title: inv.eventTitle,
      subtitle: inv.startTime
        ? new Date(inv.startTime).toLocaleDateString(undefined, { timeZone: 'UTC' })
        : 'Event invitation',
      icon: 'calendar-outline',
      iconColor: colors.pine,
      timestamp: inv.startTime ? new Date(inv.startTime).getTime() : Date.now(),
      onPress: () => onEventInvitationPress(inv),
    });
  });

  readyToScheduleLeagues.forEach((league) => {
    items.push({
      id: `schedule-${league.id}`,
      type: 'schedule_league',
      title: league.name,
      subtitle: 'Ready to schedule games',
      icon: 'calendar-outline',
      iconColor: colors.navy,
      timestamp: Date.now(),
      onPress: () => onScheduleLeaguePress(league),
    });
  });

  debriefEvents.forEach((booking) => {
    items.push({
      id: `debrief-${booking.id}`,
      type: 'debrief',
      title: booking.event?.title || 'Event',
      subtitle: 'Rate and salute players',
      icon: 'chatbubble-ellipses-outline',
      iconColor: colors.heart,
      timestamp: booking.event?.endTime ? new Date(booking.event.endTime).getTime() : Date.now(),
      onPress: () => onDebriefPress(booking),
    });
  });

  cancelRequests.forEach((req: any) => {
    items.push({
      id: `cancel-${req.id}`,
      type: 'cancel_request',
      title: req.event?.title || req.eventTitle || 'Event',
      subtitle: `${req.user?.firstName || 'Player'} wants to step out`,
      icon: 'close-circle-outline',
      iconColor: colors.heart,
      timestamp: req.createdAt ? new Date(req.createdAt).getTime() : Date.now(),
      onPress: () => {},
      data: req,
    });
  });

  // Sort by most recent first
  items.sort((a, b) => b.timestamp - a.timestamp);

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-circle-outline" size={40} color={colors.pine} />
        <Text style={styles.emptyTitle}>You're all caught up.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.card}
          onPress={item.onPress}
          activeOpacity={0.7}
          disabled={item.type === 'cancel_request'}
        >
          <View style={[styles.iconCircle, { backgroundColor: item.iconColor + '15' }]}>
            <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.typeLabel}>{TYPE_LABELS[item.type]}</Text>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.cardSub} numberOfLines={1}>{item.subtitle}</Text>
            {/* Cancel request inline actions */}
            {item.type === 'cancel_request' && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => onApproveCancelRequest(item.data.id)}
                  disabled={isCancelLoading}
                >
                  <Text style={styles.approveBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.denyBtn}
                  onPress={() => onDenyCancelRequest(item.data.id)}
                  disabled={isCancelLoading}
                >
                  <Text style={styles.denyBtnText}>Deny</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          {item.type !== 'cancel_request' && (
            <Ionicons name="chevron-forward" size={20} color={colors.inkFaint} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkFaint,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
  },
  typeLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardTitle: {
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.ink,
  },
  cardSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  approveBtn: {
    backgroundColor: colors.pine,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  approveBtnText: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: '#FFFFFF',
  },
  denyBtn: {
    backgroundColor: colors.heart + '15',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  denyBtnText: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.heart,
  },
});
