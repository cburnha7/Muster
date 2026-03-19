import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, Spacing } from '../../theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const SkeletonForm: React.FC = () => {
  return (
    <View style={styles.formContainer}>
      {/* Title skeleton */}
      <SkeletonLoader width="60%" height={32} style={{ marginBottom: Spacing.md }} />
      
      {/* Subtitle skeleton */}
      <SkeletonLoader width="80%" height={16} style={{ marginBottom: Spacing.xl }} />
      
      {/* Input field skeletons */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.inputSkeleton}>
          <SkeletonLoader width="30%" height={14} style={{ marginBottom: Spacing.xs }} />
          <SkeletonLoader width="100%" height={48} borderRadius={8} />
        </View>
      ))}
      
      {/* Button skeleton */}
      <SkeletonLoader width="100%" height={48} borderRadius={8} style={{ marginTop: Spacing.lg }} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.border,
  },
  formContainer: {
    padding: Spacing.xl,
  },
  inputSkeleton: {
    marginBottom: Spacing.md,
  },
});
