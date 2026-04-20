import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts, useTheme } from '../../theme';

export interface StatItem {
  label: string;
  value: string;
  /** Optional sub-text below the value (e.g. "8 spots left") */
  sub?: string;
  /** 0-1 fill level for a mini progress bar */
  fillRatio?: number;
}

interface QuickStatsRowProps {
  stats: StatItem[];
}

export function QuickStatsRow({ stats }: QuickStatsRowProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.surface, shadowColor: colors.ink }]}>
      {stats.map((stat, i) => (
        <View
          key={i}
          style={[styles.card, i < stats.length - 1 && styles.cardBorder, i < stats.length - 1 && { borderRightColor: colors.border }]}
        >
          <Text style={[styles.value, { color: colors.ink }]}>{stat.value}</Text>
          <Text style={[styles.label, { color: colors.inkSecondary }]}>{stat.label}</Text>
          {stat.fillRatio !== undefined && (
            <View style={[styles.bar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.barFill, { backgroundColor: colors.cobalt },
                  { width: `${Math.min(stat.fillRatio, 1) * 100}%` as any }]}
              />
            </View>
          )}
          {stat.sub ? <Text style={[styles.sub, { color: colors.inkSecondary }]}>{stat.sub}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  cardBorder: {
    borderRightWidth: 1,
  },
  value: {
    fontFamily: fonts.heading,
    fontSize: 20,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  label: {
    fontFamily: fonts.label,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  bar: {
    height: 3,
    width: '80%',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 3,
  },
});