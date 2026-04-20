import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { fonts, useTheme } from '../../theme';
import { ALL_SPORTS, SportDefinition } from '../../constants/sports';

const COLS = 3;
const GAP = 10;

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
  const { colors } = useTheme();
  const options = sports || ALL_SPORTS;
  const selectedSet = new Set(
    Array.isArray(selected) ? selected : selected ? [selected] : []
  );

  return (
    <View style={styles.grid}>
      {options.map(sport => {
        const isSelected = selectedSet.has(sport.key);
        return (
          <View key={sport.key} style={styles.cellWrapper}>
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.surface }, isSelected && styles.cardSelected, isSelected && { backgroundColor: colors.cobalt }]}
              onPress={() => onSelect(sport.key)}
              activeOpacity={0.75}
            >
              <Text style={styles.emoji}>{sport.emoji}</Text>
              <Text
                style={[styles.label, { color: colors.ink }, isSelected && styles.labelSelected, isSelected && { color: colors.white }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {sport.label}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -GAP / 2,
  },
  cellWrapper: {
    width: `${100 / COLS}%` as any,
    paddingHorizontal: GAP / 2,
    paddingVertical: GAP / 2,
  },
  card: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSelected: {},
  emoji: {
    fontSize: 32,
    marginBottom: 6,
    lineHeight: 38,
  },
  label: {
    fontFamily: fonts.label,
    fontSize: 13,
    textAlign: 'center',
  },
  labelSelected: {
    fontFamily: fonts.ui,
  },
});
