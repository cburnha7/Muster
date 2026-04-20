import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts, useTheme } from '../../theme';
import type { MessagePriority } from '../../types/messaging';

interface SystemMessageProps {
  content: string;
  priority: MessagePriority;
}

export function SystemMessage({ content, priority }: SystemMessageProps) {
  const { colors } = useTheme();
  const isUrgent = priority === 'URGENT';

  return (
    <View style={styles.container}>
      <View style={[styles.line, { backgroundColor: colors.border }, isUrgent && styles.lineUrgent, isUrgent && { backgroundColor: colors.warning + '60' }]} />
      <Text
        style={[styles.text, { color: colors.inkSecondary }, isUrgent && styles.textUrgent, isUrgent && { color: colors.warning }]}
        numberOfLines={2}
      >
        {content}
      </Text>
      <View style={[styles.line, { backgroundColor: colors.border }, isUrgent && styles.lineUrgent, isUrgent && { backgroundColor: colors.warning + '60' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 24,
    gap: 12,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  lineUrgent: {},
  text: {
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: 'center',
    flexShrink: 1,
  },
  textUrgent: {
    fontFamily: fonts.label,
  },
});
