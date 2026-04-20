import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts } from '../../theme';
import { tokenColors } from '../../theme/tokens';
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
              style={[styles.card, isSelected && styles.cardSelected]}
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
    backgroundColor: tokenColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSelected: {
    backgroundColor: colors.primary,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 6,
    lineHeight: 38,
  },
  label: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.onSurface,
    textAlign: 'center',
  },
  labelSelected: {
    color: tokenColors.white,
    fontFamily: fonts.ui,
  },
});
