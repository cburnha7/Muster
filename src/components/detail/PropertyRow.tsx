/**
 * PropertyRow — read-only label + value row for detail screens.
 *
 * Use for simple "Label: Value" display inside DetailCard or any
 * detail/summary section. Renders horizontally (label left, value right)
 * by default, or stacked (label above, value below).
 *
 * Do NOT use for:
 * - Tappable navigation rows → use MenuRow (D-2)
 * - Toggle rows → use ToggleRow (D-2)
 * - Person rows → use <PersonRow>
 * - Stat grids → use <QuickStatsRow>
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { tokenFontFamily, tokenSpacing } from '../../theme/tokens';

interface PropertyRowProps {
  /** Short label, e.g. "Sport", "Amount", "Status". */
  label: string;
  /** Primary value. String for common case; ReactNode for composition. */
  value: React.ReactNode;
  /** Optional Ionicons name. Renders left of the label at 16px. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** 'horizontal' (default) = label left, value right.
   *  'stacked' = label above, value below. */
  layout?: 'horizontal' | 'stacked';
  /** Show a bottom border separator. Default true. */
  separator?: boolean;
  testID?: string;
}

export function PropertyRow({
  label,
  value,
  icon,
  layout = 'horizontal',
  separator = true,
  testID,
}: PropertyRowProps) {
  const { colors } = useTheme();

  const labelNode = (
    <View style={styles.labelRow}>
      {icon && (
        <Ionicons
          name={icon}
          size={16}
          color={colors.inkSecondary}
          style={styles.icon}
        />
      )}
      <Text style={[styles.label, { color: colors.inkSecondary }]}>
        {label}
      </Text>
    </View>
  );

  const valueNode =
    typeof value === 'string' ? (
      <Text style={[styles.value, { color: colors.ink }]}>{value}</Text>
    ) : (
      value
    );

  if (layout === 'stacked') {
    return (
      <View
        style={[
          styles.containerStacked,
          separator && styles.separator,
          separator && { borderBottomColor: colors.border },
        ]}
        testID={testID}
      >
        {labelNode}
        <View style={styles.stackedValue}>{valueNode}</View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        separator && styles.separator,
        separator && { borderBottomColor: colors.border },
      ]}
      testID={testID}
    >
      {labelNode}
      <View style={styles.valueContainer}>{valueNode}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tokenSpacing.sm,
  },
  containerStacked: {
    paddingVertical: tokenSpacing.sm,
  },
  separator: {
    borderBottomWidth: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: tokenSpacing.xs,
  },
  label: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 15,
  },
  valueContainer: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
  stackedValue: {
    marginTop: tokenSpacing.xs,
  },
});
