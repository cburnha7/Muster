import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../../theme';
import { tokenColors } from '../../theme/tokens';
import type { MessagePriority } from '../../types/messaging';

interface SystemMessageProps {
  content: string;
  priority: MessagePriority;
}

export function SystemMessage({ content, priority }: SystemMessageProps) {
  const isUrgent = priority === 'URGENT';

  return (
    <View style={styles.container}>
      <View style={[styles.line, isUrgent && styles.lineUrgent]} />
      <Text
        style={[styles.text, isUrgent && styles.textUrgent]}
        numberOfLines={2}
      >
        {content}
      </Text>
      <View style={[styles.line, isUrgent && styles.lineUrgent]} />
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
    backgroundColor: colors.outlineVariant,
  },
  lineUrgent: {
    backgroundColor: tokenColors.warning + '60',
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    flexShrink: 1,
  },
  textUrgent: {
    color: tokenColors.warning,
    fontFamily: fonts.label,
  },
});
