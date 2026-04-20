import React, { useEffect, useRef } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import {
  tokenColors,
  tokenSpacing,
  tokenRadius,
  tokenShadow,
  tokenFontFamily,
} from '../../theme/tokens';

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

export function MilestoneOverlay({
  milestone,
  onDismiss,
}: MilestoneOverlayProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 14,
        bounciness: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [scaleAnim, opacityAnim, onDismiss]);

  return (
    <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
      <TouchableOpacity
        style={styles.backdrop}
        onPress={onDismiss}
        activeOpacity={1}
      />
      <Animated.View
        style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
      >
        <Text style={styles.emoji}>{milestone.emoji}</Text>
        <Text style={styles.title}>{milestone.title}</Text>
        <Text style={styles.subtitle}>{milestone.subtitle}</Text>
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={onDismiss}
          activeOpacity={0.8}
        >
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
    backgroundColor: tokenColors.overlay,
  },
  card: {
    backgroundColor: tokenColors.surface,
    borderRadius: tokenRadius.xl,
    paddingVertical: tokenSpacing.xxl,
    paddingHorizontal: tokenSpacing.xl,
    alignItems: 'center',
    width: SCREEN_WIDTH * 0.78,
    ...tokenShadow.modal,
    gap: tokenSpacing.sm,
  },
  emoji: {
    fontSize: 48,
    marginBottom: tokenSpacing.xs,
  },
  title: {
    fontFamily: tokenFontFamily.heading,
    fontSize: 20,
    color: tokenColors.ink,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 15,
    color: tokenColors.inkSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  dismissBtn: {
    marginTop: tokenSpacing.md,
    backgroundColor: tokenColors.cobalt,
    borderRadius: tokenRadius.pill,
    paddingHorizontal: tokenSpacing.xl,
    paddingVertical: tokenSpacing.md,
  },
  dismissText: {
    fontFamily: tokenFontFamily.uiBold,
    fontSize: 15,
    color: tokenColors.white,
  },
});
