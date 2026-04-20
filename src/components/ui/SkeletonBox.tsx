import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { tokenSpacing, tokenRadius } from '../../theme/tokens';
import { useTheme } from '../../theme';

interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonBox({
  width = '100%',
  height = 16,
  borderRadius = tokenRadius.sm,
  style,
}: SkeletonBoxProps) {
  const { colors } = useTheme();
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
    outputRange: [colors.border, colors.inkMuted],
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

export function SkeletonCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View
      style={[skeletonStyles.card, { backgroundColor: colors.surface }, style]}
    >
      <SkeletonBox height={140} borderRadius={tokenRadius.lg} />
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
      <SkeletonBox width={48} height={48} borderRadius={tokenRadius.lg} />
      <View style={skeletonStyles.rowBody}>
        <SkeletonBox width="60%" height={14} />
        <SkeletonBox width="80%" height={12} />
      </View>
    </View>
  );
}

export function SkeletonConversationRow({
  style,
}: {
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[skeletonStyles.row, style]}>
      <SkeletonBox width={48} height={48} borderRadius={tokenRadius.lg} />
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
        <SkeletonBox
          height={44}
          borderRadius={tokenRadius.lg}
          style={{ marginTop: tokenSpacing.md }}
        />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    borderRadius: tokenRadius.lg,
    overflow: 'hidden',
    gap: 0,
  },
  cardBody: {
    padding: tokenSpacing.lg,
    gap: tokenSpacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokenSpacing.lg,
    paddingVertical: tokenSpacing.md,
    gap: tokenSpacing.md,
  },
  rowBody: {
    flex: 1,
    gap: tokenSpacing.sm,
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
    padding: tokenSpacing.xl,
    gap: tokenSpacing.sm,
  },
  heroMeta: {
    flexDirection: 'row',
    gap: tokenSpacing.lg,
    marginTop: tokenSpacing.xs,
  },
});
