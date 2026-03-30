import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../../theme';
import type { MessagePriority } from '../../types/messaging';

interface SystemMessageProps {
  content: string;
  priority: MessagePriority;
}

export function SystemMessage({ content, priority }: SystemMessageProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.bubble, priority === 'URGENT' && styles.urgentBubble]}>
        <Text style={[styles.text, priority === 'URGENT' && styles.urgentText]}>{content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  bubble: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  urgentBubble: {
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  urgentText: {
    color: '#92400E',
  },
});
