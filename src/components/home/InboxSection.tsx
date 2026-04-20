import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { tokenColors } from '../../theme/tokens';
import {
  RosterInvitation,
  LeagueInvitation,
  EventInvitation,
  ReadyToScheduleLeague,
} from '../../services/api/UserService';
import { Booking } from '../../types';

interface InboxItem {
  id: string;
  task: string;
  name: string;
  onPress: () => void;
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
}: InboxSectionProps) {
  const items: InboxItem[] = [];

  rosterInvitations.forEach(inv => {
    items.push({
      id: `r-${inv.id}`,
      task: 'Join Team',
      name: inv.rosterName,
      onPress: () => onRosterInvitationPress(inv),
    });
  });
  leagueInvitations.forEach(inv => {
    items.push({
      id: `l-${inv.id}`,
      task: 'Join League',
      name: inv.leagueName,
      onPress: () => onLeagueInvitationPress(inv),
    });
  });
  eventInvitations.forEach(inv => {
    items.push({
      id: `e-${inv.id}`,
      task: 'Join Event',
      name: inv.eventTitle,
      onPress: () => onEventInvitationPress(inv),
    });
  });
  readyToScheduleLeagues.forEach(league => {
    items.push({
      id: `s-${league.id}`,
      task: 'Schedule League',
      name: league.name,
      onPress: () => onScheduleLeaguePress(league),
    });
  });
  debriefEvents.forEach(booking => {
    items.push({
      id: `d-${booking.id}`,
      task: 'Debrief',
      name: booking.event?.title || 'Event',
      onPress: () => onDebriefPress(booking),
    });
  });
  cancelRequests.forEach((req: any) => {
    items.push({
      id: `c-${req.id}`,
      task: 'Confirm Cancellation',
      name: req.event?.title || req.eventTitle || 'Event',
      onPress: () => onApproveCancelRequest(req.id),
    });
  });

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      {items.map(item => (
        <TouchableOpacity
          key={item.id}
          style={styles.card}
          onPress={item.onPress}
          activeOpacity={0.7}
        >
          <View style={styles.cardBody}>
            <Text style={styles.task}>{item.task}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokenColors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardBody: {
    flex: 1,
  },
  task: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  name: {
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.ink,
    marginTop: 1,
  },
});
