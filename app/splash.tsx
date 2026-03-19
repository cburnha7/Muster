import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { MusterIcon } from '../src/theme/MusterIcon';
import { colors, fonts } from '../src/theme';

export default function SplashScreen() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

    pulse(dot1, 0).start();
    pulse(dot2, 200).start();
    pulse(dot3, 400).start();
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.container}>
      {/* Background emoji — bottom right, half off-screen */}
      <Text style={styles.emoji}>🫡</Text>

      {/* Centre content */}
      <View style={styles.content}>
        <MusterIcon variant="dark" size={100} />
        <Text style={styles.wordmark}>Muster</Text>
        <Text style={styles.tagline}>the Troops.</Text>
      </View>

      {/* Pulsing dots */}
      <View style={styles.dotsRow}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
        ))}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#B8976A',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  emoji: {
    position: 'absolute',
    bottom: -200,
    right: -120,
    fontSize: 400,
    opacity: 0.12,
    // Grayscale via desaturation — RN doesn't support CSS filter,
    // so we rely on the low opacity to wash out colour naturally.
    // On web, add filter if needed.
  },
  content: {
    alignItems: 'center',
    zIndex: 1,
  },
  wordmark: {
    fontFamily: fonts.display, // Fraunces 700
    fontSize: 84,
    color: colors.ink,
    marginTop: 16,
    lineHeight: 90,
  },
  tagline: {
    fontFamily: fonts.displayLight, // Fraunces 300 Italic
    fontSize: 24,
    color: colors.ink,
    opacity: 0.55,
    marginTop: 4,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 80,
    flexDirection: 'row',
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.ink,
  },
});
