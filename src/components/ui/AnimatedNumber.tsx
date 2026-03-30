import React, { useEffect, useRef } from 'react';
import { Animated, TextStyle, StyleProp } from 'react-native';

interface AnimatedNumberProps {
  value: number;
  style?: StyleProp<TextStyle>;
  /** Format function — defaults to toString */
  format?: (n: number) => string;
}

/**
 * Displays a number with a brief scale-pop animation when the value changes.
 * Scales from 1.0 → 1.15 → 1.0 using a spring.
 */
export function AnimatedNumber({ value, style, format }: AnimatedNumberProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value;
      scaleAnim.setValue(1.15);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }).start();
    }
  }, [value, scaleAnim]);

  const display = format ? format(value) : String(value);

  return (
    <Animated.Text style={[style, { transform: [{ scale: scaleAnim }] }]}>
      {display}
    </Animated.Text>
  );
}
