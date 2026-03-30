import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { colors, fonts } from '../../theme';
import { ALL_SPORTS, SportDefinition } from '../../constants/sports';

const COLS = 3;
const OUTER_PAD = 16; // component owns its horizontal padding
const GAP = 8;

interface SportIconGridProps {
  selected: string | string[];
  onSelect: (sport: string) => void;
  multiSelect?: boolean;
  /** Subset of sport keys to show. If omitted, shows all. */
  sports?: SportDefinition[];
}

export function SportIconGrid({
  selected,
  onSelect,
  multiSelect: _multiSelect = false,
  sports,
}: SportIconGridProps) {
  const { width: screenWidth } = useWindowDimensions();
  const itemWidth = (screenWidth - OUTER_PAD * 2 - GAP * (COLS - 1)) / COLS;

  const options = sports || ALL_SPORTS;
  const selectedSet = new Set(Array.isArray(selected) ? selected : selected ? [selected] : []);

  return (
    <View style={[styles.grid, { paddingHorizontal: OUTER_PAD }]}>
      {options.map((sport) => {
        const isSelected = selectedSet.has(sport.key);
        return (
          <TouchableOpacity
            key={sport.key}
            style={[styles.card, { width: itemWidth }, isSelected && styles.cardSelected]}
            onPress={() => onSelect(sport.key)}
            activeOpacity={0.75}
          >
            <Text style={styles.emoji}>{sport.emoji}</Text>
            <Text
              style={[styles.label, isSelected && styles.labelSelected]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {sport.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  card: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSelected: {
    backgroundColor: colors.primaryContainer,
  },
  emoji: {
    fontSize: 30,
    marginBottom: 5,
    lineHeight: 36,
  },
  label: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.primary,
    fontFamily: fonts.ui,
  },
});
