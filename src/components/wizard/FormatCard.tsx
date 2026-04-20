import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { fonts, useTheme } from '../../theme';

interface FormatCardProps {
  emoji: string;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

export function FormatCard({
  emoji,
  title,
  description,
  selected,
  onPress,
}: FormatCardProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }, selected && styles.cardSelected, selected && { borderColor: colors.cobalt, backgroundColor: colors.cobaltLight }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: colors.ink }, selected && styles.titleSelected, selected && { color: colors.cobalt }]}>
          {title}
        </Text>
        <Text style={[styles.description, { color: colors.inkSecondary }]}>{description}</Text>
      </View>
      {selected && (
        <View style={[styles.checkCircle, { backgroundColor: colors.cobalt }]}>
          <Text style={[styles.checkmark, { color: colors.white }]}>"</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {},
  emoji: {
    fontSize: 28,
    marginRight: 14,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.headingSemi,
    fontSize: 15,
    marginBottom: 2,
  },
  titleSelected: {},
  description: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
  },
});
