import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../../theme';

interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A shimmer-animated skeleton placeholder.
 * Pulses between two shades of gray on a 1.5s loop.
 */
export function SkeletonBox({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonBoxProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const backgroundColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surfaceContainer, colors.surfaceContainerHigh],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
}

/** Common skeleton layouts composed from SkeletonBox */

export function SkeletonCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[skeletonStyles.card, style]}>
      <SkeletonBox height={140} borderRadius={14} />
      <View style={skeletonStyles.cardBody}>
        <SkeletonBox width="70%" height={14} />
        <SkeletonBox width="45%" height={12} />
        <SkeletonBox width="55%" height={12} />
      </View>
    </View>
  );
}

export function SkeletonRow({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[skeletonStyles.row, style]}>
      <SkeletonBox width={48} height={48} borderRadius={14} />
      <View style={skeletonStyles.rowBody}>
        <SkeletonBox width="60%" height={14} />
        <SkeletonBox width="80%" height={12} />
      </View>
    </View>
  );
}

export function SkeletonConversationRow({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[skeletonStyles.row, style]}>
      <SkeletonBox width={48} height={48} borderRadius={14} />
      <View style={skeletonStyles.rowBody}>
        <View style={skeletonStyles.rowTopLine}>
          <SkeletonBox width="50%" height={14} />
          <SkeletonBox width={40} height={12} />
        </View>
        <SkeletonBox width="75%" height={12} />
      </View>
    </View>
  );
}

export function SkeletonDetailHero() {
  return (
    <View style={skeletonStyles.heroContainer}>
      <SkeletonBox height={220} borderRadius={0} />
      <View style={skeletonStyles.heroBody}>
        <SkeletonBox width="80%" height={20} />
        <SkeletonBox width="50%" height={14} />
        <View style={skeletonStyles.heroMeta}>
          <SkeletonBox width={100} height={14} />
          <SkeletonBox width={80} height={14} />
        </View>
        <SkeletonBox height={44} borderRadius={22} style={{ marginTop: 12 }} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
    overflow: 'hidden',
    gap: 0,
  },
  cardBody: {
    padding: 14,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowBody: {
    flex: 1,
    gap: 6,
  },
  rowTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroContainer: {
    gap: 0,
  },
  heroBody: {
    padding: 20,
    gap: 10,
  },
  heroMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
});
