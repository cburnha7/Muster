import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

const EMOJIS = ['ðŸ‘', 'ðŸ”¥', 'ðŸ˜‚', 'â¤ï¸', 'ðŸ’ª', 'ðŸŽ¯', 'ðŸ‘', 'ðŸ˜¤'] as const;

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onDismiss: () => void;
}

export function ReactionPicker({ onSelect, onDismiss }: ReactionPickerProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={styles.overlay}
      onPress={onDismiss}
      activeOpacity={1}
    >
      <View style={[styles.picker, { backgroundColor: colors.surface, shadowColor: colors.black }]}>
        {EMOJIS.map(emoji => (
          <TouchableOpacity
            key={emoji}
            style={styles.emojiBtn}
            onPress={() => {
              onSelect(emoji);
              onDismiss();
            }}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  picker: {
    flexDirection: 'row',
    borderRadius: 28,
    padding: 6,
    gap: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  emojiBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
});
