import React, { useState } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';

interface PinnedMessageBannerProps {
  content: string;
}

export function PinnedMessageBanner({ content }: PinnedMessageBannerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity style={styles.container} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
      <Ionicons name="pin" size={14} color={colors.primary} style={styles.icon} />
      <Text style={styles.text} numberOfLines={expanded ? undefined : 1}>{content}</Text>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.onSurfaceVariant} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
    gap: 8,
  },
  icon: { flexShrink: 0 },
  text: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurface,
  },
});
