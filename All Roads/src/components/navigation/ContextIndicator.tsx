import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { colors, fonts, Spacing } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import {
  selectActiveUserId,
  selectDependents,
} from '../../store/slices/contextSlice';

/**
 * ContextIndicator
 *
 * Persistent compact pill/badge that shows which user context is active.
 * Visible at all times when the guardian has at least one dependent.
 * When acting as guardian: subtle pill with guardian's first name.
 * When acting as a dependent: accent-colored pill with dependent's first name.
 * Returns null when no dependents exist (no indicator needed).
 *
 * Requirements: 6.1, 6.2, 6.3
 */
export function ContextIndicator() {
  const { user: guardian } = useAuth();
  const activeUserId = useSelector(selectActiveUserId);
  const dependents = useSelector(selectDependents);

  // No indicator when guardian has no dependents
  if (!guardian || dependents.length === 0) return null;

  const activeDependent = activeUserId
    ? dependents.find((d) => d.id === activeUserId)
    : null;

  const isDependent = !!activeDependent;
  const displayName = activeDependent
    ? activeDependent.firstName
    : guardian.firstName;

  return (
    <View
      style={[styles.pill, isDependent ? styles.dependentPill : styles.guardianPill]}
      accessibilityRole="text"
      accessibilityLabel={`Active account: ${displayName}${isDependent ? ' (dependent)' : ''}`}
    >
      <Ionicons
        name={isDependent ? 'people' : 'person'}
        size={12}
        color={isDependent ? colors.court : colors.inkFaint}
      />
      <Text
        style={[styles.name, isDependent ? styles.dependentName : styles.guardianName]}
        numberOfLines={1}
      >
        {displayName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    maxWidth: 120,
  },
  guardianPill: {
    backgroundColor: `${colors.ink}10`,
  },
  dependentPill: {
    backgroundColor: `${colors.court}20`,
    borderWidth: 1,
    borderColor: `${colors.court}40`,
  },
  name: {
    fontFamily: fonts.label,
    fontSize: 11,
    marginLeft: 4,
    flexShrink: 1,
  },
  guardianName: {
    color: colors.inkFaint,
  },
  dependentName: {
    color: colors.court,
  },
});
