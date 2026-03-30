import React, { useEffect, useRef } from 'react';
import { Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors, fonts } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface MilestoneData {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
}

interface MilestoneOverlayProps {
  milestone: MilestoneData;
  onDismiss: () => void;
}

export function MilestoneOverlay({ milestone, onDismiss }: MilestoneOverlayProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Auto-dismiss after 4 seconds
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [scaleAnim, opacityAnim, onDismiss]);

  return (
    <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
      <TouchableOpacity style={styles.backdrop} onPress={onDismiss} activeOpacity={1} />
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.emoji}>{milestone.emoji}</Text>
        <Text style={styles.title}>{milestone.title}</Text>
        <Text style={styles.subtitle}>{milestone.subtitle}</Text>
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} activeOpacity={0.8}>
          <Text style={styles.dismissText}>Awesome</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
    width: SCREEN_WIDTH * 0.78,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    gap: 8,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.onSurface,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  dismissBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  dismissText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
