import React, { useCallback, useRef } from 'react';
import { Pressable, Animated, ViewStyle, StyleProp } from 'react-native';
interface PressableCardProps {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
}

/**
 * Animated pressable wrapper for list cards.
 * Scales to 0.98 on press with subtle opacity change, springs back on release.
 * Drop-in replacement for TouchableOpacity on cards.
 */
function PressableCardInner({
  onPress,
  onLongPress,
  style,
  children,
  disabled,
}: PressableCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const opacity = scaleAnim.interpolate({
    inputRange: [0.98, 1],
    outputRange: [0.95, 1],
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[style, { transform: [{ scale: scaleAnim }], opacity }]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

export const PressableCard = React.memo(PressableCardInner);
