/**
 * Animation utilities for consistent animations across the app
 * All animations target 60fps performance
 */

import { Animated, Easing } from 'react-native';

export const AnimationDurations = {
  fast: 150,
  normal: 250,
  slow: 350,
};

export const AnimationEasing = {
  easeOut: Easing.out(Easing.ease),
  easeInOut: Easing.inOut(Easing.ease),
  spring: Easing.elastic(1),
};

/**
 * Fade in animation
 */
export const fadeIn = (
  animatedValue: Animated.Value,
  duration: number = AnimationDurations.normal,
  callback?: () => void
) => {
  Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    easing: AnimationEasing.easeOut,
    useNativeDriver: true,
  }).start(callback);
};

/**
 * Fade out animation
 */
export const fadeOut = (
  animatedValue: Animated.Value,
  duration: number = AnimationDurations.normal,
  callback?: () => void
) => {
  Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: AnimationEasing.easeOut,
    useNativeDriver: true,
  }).start(callback);
};

/**
 * Scale animation
 */
export const scale = (
  animatedValue: Animated.Value,
  toValue: number,
  duration: number = AnimationDurations.normal,
  callback?: () => void
) => {
  Animated.spring(animatedValue, {
    toValue,
    friction: 4,
    tension: 40,
    useNativeDriver: true,
  }).start(callback);
};

/**
 * Slide in from bottom animation
 */
export const slideInFromBottom = (
  animatedValue: Animated.Value,
  duration: number = AnimationDurations.normal,
  callback?: () => void
) => {
  Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: AnimationEasing.easeOut,
    useNativeDriver: true,
  }).start(callback);
};

/**
 * Slide out to bottom animation
 */
export const slideOutToBottom = (
  animatedValue: Animated.Value,
  toValue: number,
  duration: number = AnimationDurations.normal,
  callback?: () => void
) => {
  Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: AnimationEasing.easeOut,
    useNativeDriver: true,
  }).start(callback);
};

/**
 * Shake animation for errors
 */
export const shake = (
  animatedValue: Animated.Value,
  callback?: () => void
) => {
  Animated.sequence([
    Animated.timing(animatedValue, {
      toValue: 10,
      duration: 50,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: -10,
      duration: 50,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: 10,
      duration: 50,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 50,
      useNativeDriver: true,
    }),
  ]).start(callback);
};

/**
 * Pulse animation
 */
export const pulse = (
  animatedValue: Animated.Value,
  callback?: () => void
) => {
  Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1.1,
        duration: 500,
        easing: AnimationEasing.easeInOut,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 500,
        easing: AnimationEasing.easeInOut,
        useNativeDriver: true,
      }),
    ])
  ).start(callback);
};
