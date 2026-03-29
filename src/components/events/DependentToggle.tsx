import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors, fonts, Spacing } from '../../theme';
import { PersonFilter } from '../../types/eventsCalendar';

interface DependentToggleProps {
  guardian: { id: string; firstName: string };
  dependents: Array<{ id: string; firstName: string }>;
  activeFilter: PersonFilter;
  onFilterChange: (filter: PersonFilter) => void;
  personColors: Map<string, string>;
}

/**
 * Horizontal scrollable row of pill-shaped buttons for switching
 * between family members and a "Whole Crew" aggregate view.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.6, 3.7, 4.6, 4.7
 */
export function DependentToggle({
  guardian,
  dependents,
  activeFilter,
  onFilterChange,
  personColors,
}: DependentToggleProps) {
  // Requirement 3.3: Render nothing when guardian has no dependents
  if (dependents.length === 0) {
    return null;
  }

  const isActive = (filter: PersonFilter): boolean => {
    if (activeFilter.type === 'wholeCrew' && filter.type === 'wholeCrew') {
      return true;
    }
    if (
      activeFilter.type === 'individual' &&
      filter.type === 'individual' &&
      activeFilter.userId === filter.userId
    ) {
      return true;
    }
    return false;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Guardian pill */}
        <TouchableOpacity
          style={[
            styles.pill,
            isActive({ type: 'individual', userId: guardian.id }) &&
              styles.pillActive,
          ]}
          onPress={() =>
            onFilterChange({ type: 'individual', userId: guardian.id })
          }
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.pillText,
              isActive({ type: 'individual', userId: guardian.id }) &&
                styles.pillTextActive,
            ]}
          >
            {guardian.firstName}
          </Text>
        </TouchableOpacity>

        {/* Dependent pills */}
        {dependents.map((dep) => (
          <TouchableOpacity
            key={dep.id}
            style={[
              styles.pill,
              isActive({ type: 'individual', userId: dep.id }) &&
                styles.pillActive,
            ]}
            onPress={() =>
              onFilterChange({ type: 'individual', userId: dep.id })
            }
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                isActive({ type: 'individual', userId: dep.id }) &&
                  styles.pillTextActive,
              ]}
            >
              {dep.firstName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 9999,
    backgroundColor: colors.surface,
  },
  pillActive: {
    backgroundColor: colors.cobalt,
  },
  pillText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.ink,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
});
