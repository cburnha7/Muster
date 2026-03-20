import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, ViewStyle } from 'react-native';

export interface SaluteOverlayProps {
  /** When true the 🫡 emoji fades in over the bottom-right corner */
  saluted: boolean;
  /** The player's profile photo (or placeholder) to wrap */
  children: React.ReactNode;
  /** Optional size override — defaults to 56 (matches avatar in DebriefScreen) */
  size?: number;
  /** Optional extra styles on the outer wrapper */
  style?: ViewStyle;
}

export function SaluteOverlay({
  saluted,
  children,
  size = 56,
  style,
}: SaluteOverlayProps) {
  const opacity = useRef(new Animated.Value(saluted ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: saluted ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [saluted, opacity]);

  const emojiSize = size * 0.5;

  return (
    <View style={[{ width: size, height: size }, style]}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.badge,
          {
            opacity,
            width: emojiSize,
            height: emojiSize,
            borderRadius: emojiSize / 2,
            bottom: -(emojiSize * 0.15),
            right: -(emojiSize * 0.15),
          },
        ]}
      >
        <Text
          style={[
            styles.emoji,
            { fontSize: emojiSize * 0.7 },
          ]}
        >
          🫡
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    // Grayscale-ish muted look via 50 % opacity on the emoji itself
  },
  emoji: {
    opacity: 0.5,
    // No native grayscale filter in RN — the reduced opacity gives the muted effect
  },
});
