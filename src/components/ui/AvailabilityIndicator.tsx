import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface Props {
  /** Array of booleans — one per occurrence. true = available, false = unavailable */
  statuses: boolean[];
}

/**
 * Displays availability as colored circles.
 * Single event: one circle with "Available" / "Unavailable" label.
 * Recurring: compact row of circles, one per occurrence.
 */
export function AvailabilityIndicator({ statuses }: Props) {
  const { colors } = useTheme();
  if (statuses.length === 0) return null;

  // Single event — show label
  if (statuses.length === 1) {
    const available = statuses[0];
    return (
      <View style={styles.singleRow}>
        <View
          style={[
            styles.dot,
            { backgroundColor: available ? colors.pine : colors.heart },
          ]}
        />
        <Text
          style={[
            styles.label,
            { color: available ? colors.pine : colors.heart },
          ]}
        >
          {available ? 'Available' : 'Unavailable'}
        </Text>
      </View>
    );
  }

  // Recurring — compact circle row
  return (
    <View style={styles.multiRow}>
      {statuses.map((available, i) => (
        <View
          key={i}
          style={[
            styles.miniDot,
            { backgroundColor: available ? colors.pine : colors.heart },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  singleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 12,
  },
  multiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
