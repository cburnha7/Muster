import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface WizardProgressDotsProps {
  total: number;
  current: number;
}

export function WizardProgressDots({ total, current }: WizardProgressDotsProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i <= current ? styles.dotActive : styles.dotInactive, i <= current ? { backgroundColor: colors.primary } : {},
            i < current && styles.dotCompleted, i < current && { backgroundColor: colors.primary }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
  },
  dotCompleted: {
    width: 12,
  },
  dotInactive: {
    width: 12,
  },
});