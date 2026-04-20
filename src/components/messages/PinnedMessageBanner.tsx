import React, { useState } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../../theme';

interface PinnedMessageBannerProps {
  content: string;
}

export function PinnedMessageBanner({ content }: PinnedMessageBannerProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: colors.cobalt + '10', borderBottomColor: colors.cobalt + '20' }]} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
      <Ionicons name="pin" size={14} color={colors.cobalt} style={styles.icon} />
      <Text style={[styles.text, { color: colors.ink }]} numberOfLines={expanded ? undefined : 1}>{content}</Text>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.inkSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  icon: { flexShrink: 0 },
  text: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
  },
});