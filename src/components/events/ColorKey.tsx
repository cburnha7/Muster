import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts, Spacing, useTheme } from '../../theme';
import { ColorKeyEntry } from '../../types/eventsCalendar';

interface ColorKeyProps {
  entries: ColorKeyEntry[];
}

/**
 * Inline legend showing each person's first name paired with
 * their assigned color. Rendered below the DependentToggle pills.
 *
 * Requirements: 4.6, 4.7
 */
export function ColorKey({ entries }: ColorKeyProps) {
  const { colors } = useTheme();
  // Requirement 4.7: Not rendered when entries array is empty
  if (entries.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {entries.map((entry) => (
        <View key={entry.userId} style={styles.entry}>
          <View
            style={[styles.circle, { backgroundColor: entry.color }]}
          />
          <Text style={[styles.name, { color: colors.inkFaint }]}>{entry.firstName}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  circle: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  name: {
    fontFamily: fonts.label,
    fontSize: 11,
  },
});