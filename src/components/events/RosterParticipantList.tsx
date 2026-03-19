import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { Participant, RosterInfo } from '../../types';

interface RosterParticipantListProps {
  participants: Participant[];
  rosters: RosterInfo[];
}

/**
 * Displays participants grouped by roster for game events.
 * Home roster is listed first; if no home tag, rosters are alphabetical.
 * Confirmed players render normally; unconfirmed/pending are visually muted.
 */
export const RosterParticipantList: React.FC<RosterParticipantListProps> = ({
  participants,
  rosters,
}) => {
  // Order: home first, then away. If no home tag, already alphabetical from backend.
  const sortedRosters = [...rosters].sort((a, b) => {
    if (a.isHome && !b.isHome) return -1;
    if (!a.isHome && b.isHome) return 1;
    return a.name.localeCompare(b.name);
  });

  // Group participants by roster
  const byRoster = new Map<string, Participant[]>();
  const unassigned: Participant[] = [];

  for (const p of participants) {
    if (p.teamId) {
      const list = byRoster.get(p.teamId) ?? [];
      list.push(p);
      byRoster.set(p.teamId, list);
    } else {
      unassigned.push(p);
    }
  }

  const totalCount = participants.length;

  return (
    <View>
      <Text style={styles.sectionTitle}>Players ({totalCount})</Text>

      {sortedRosters.map((roster) => {
        const rosterParticipants = byRoster.get(roster.id) ?? [];
        const confirmed = rosterParticipants.filter((p) => p.status === 'confirmed');
        const pending = rosterParticipants.filter((p) => p.status !== 'confirmed');

        return (
          <View key={roster.id} style={styles.rosterSection}>
            <View style={styles.rosterHeader}>
              <Ionicons name="shield-outline" size={16} color={colors.pine} />
              <Text style={styles.rosterName}>{roster.name}</Text>
              {roster.isHome && (
                <View style={styles.homeBadge}>
                  <Text style={styles.homeBadgeText}>HOME</Text>
                </View>
              )}
              <Text style={styles.rosterCount}>
                {rosterParticipants.length}
              </Text>
            </View>

            {/* Confirmed players */}
            {confirmed.map((p) => (
              <View key={p.userId} style={styles.playerRow}>
                <Ionicons name="person-outline" size={16} color={colors.ink} />
                <Text style={styles.playerName}>
                  {p.user
                    ? `${p.user.firstName} ${p.user.lastName}`
                    : 'Unknown Player'}
                </Text>
              </View>
            ))}

            {/* Pending / unconfirmed players — muted */}
            {pending.map((p) => (
              <View key={p.userId} style={styles.playerRow}>
                <Ionicons name="person-outline" size={16} color={colors.inkFaint} />
                <Text style={styles.playerNameMuted}>
                  {p.user
                    ? `${p.user.firstName} ${p.user.lastName}`
                    : 'Unknown Player'}
                </Text>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>PENDING</Text>
                </View>
              </View>
            ))}

            {rosterParticipants.length === 0 && (
              <Text style={styles.emptyText}>No players yet</Text>
            )}
          </View>
        );
      })}

      {/* Unassigned participants (edge case — no roster match) */}
      {unassigned.length > 0 && (
        <View style={styles.rosterSection}>
          <View style={styles.rosterHeader}>
            <Ionicons name="people-outline" size={16} color={colors.inkFaint} />
            <Text style={styles.rosterName}>Other Players</Text>
            <Text style={styles.rosterCount}>{unassigned.length}</Text>
          </View>
          {unassigned.map((p) => (
            <View key={p.userId} style={styles.playerRow}>
              <Ionicons name="person-outline" size={16} color={colors.inkFaint} />
              <Text style={styles.playerNameMuted}>
                {p.user
                  ? `${p.user.firstName} ${p.user.lastName}`
                  : 'Unknown Player'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.ink,
    marginBottom: 12,
  },
  rosterSection: {
    marginBottom: 16,
    backgroundColor: colors.chalk,
    borderRadius: 10,
    padding: 12,
  },
  rosterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  rosterName: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.ink,
    textTransform: 'uppercase',
    flex: 1,
  },
  homeBadge: {
    backgroundColor: colors.pine + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  homeBadgeText: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.pine,
  },
  rosterCount: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.inkFaint,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 4,
    gap: 8,
  },
  playerName: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    flex: 1,
  },
  playerNameMuted: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkFaint,
    flex: 1,
  },
  pendingBadge: {
    backgroundColor: colors.court + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pendingBadgeText: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.court,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    fontStyle: 'italic',
    paddingLeft: 4,
    paddingVertical: 4,
  },
});
