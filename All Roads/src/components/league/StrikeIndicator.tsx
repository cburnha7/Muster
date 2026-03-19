import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';

const STRIKE_THRESHOLD = 3;

export interface StrikeIndicatorProps {
  strikeCount: number;
  rosterName: string;
  onRemoveRoster?: () => void;
}

export const StrikeIndicator: React.FC<StrikeIndicatorProps> = ({
  strikeCount,
  rosterName,
  onRemoveRoster,
}) => {
  if (strikeCount === 0) return null;

  const isAtThreshold = strikeCount >= STRIKE_THRESHOLD;

  return (
    <View style={styles.container}>
      <View
        style={[styles.badge, isAtThreshold ? styles.badgeDanger : styles.badgeWarning]}
        accessibilityRole="text"
        accessibilityLabel={`${rosterName} has ${strikeCount} ${strikeCount === 1 ? 'strike' : 'strikes'}`}
      >
        <Ionicons
          name="warning"
          size={12}
          color={isAtThreshold ? '#FFFFFF' : colors.ink}
        />
        <Text style={[styles.badgeText, isAtThreshold && styles.badgeTextDanger]}>
          {strikeCount} {strikeCount === 1 ? 'strike' : 'strikes'}
        </Text>
      </View>

      {isAtThreshold && onRemoveRoster && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={onRemoveRoster}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${rosterName} from league`}
        >
          <Text style={styles.removeButtonText}>Remove Roster</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeWarning: {
    backgroundColor: colors.courtLight,
  },
  badgeDanger: {
    backgroundColor: colors.track,
  },
  badgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeTextDanger: {
    color: '#FFFFFF',
  },
  removeButton: {
    backgroundColor: colors.track,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  removeButtonText: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: '#FFFFFF',
  },
});
