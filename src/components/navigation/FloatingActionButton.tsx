import React from 'react';
import { TouchableOpacity, StyleSheet, Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface FloatingActionButtonProps {
  icon: string;
  onPress: () => void;
  size?: number;
  backgroundColor?: string;
  iconColor?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  bottom?: number;
  right?: number;
  left?: number;
  disabled?: boolean;
  style?: any;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  onPress,
  size = 56,
  backgroundColor = colors.cobalt,
  iconColor = colors.white,
  position = 'bottom-right',
  bottom = 20,
  right = 20,
  left = 20,
  disabled = false,
  style,
}) => {
  const { colors } = useTheme();
  const getPositionStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      bottom,
    };

    switch (position) {
      case 'bottom-right':
        return { ...baseStyle, right };
      case 'bottom-left':
        return { ...baseStyle, left };
      case 'bottom-center':
        return { ...baseStyle, alignSelf: 'center' as const };
      default:
        return { ...baseStyle, right };
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: disabled ? colors.inkMuted : backgroundColor,
        },
        getPositionStyle(),
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={icon as any}
          size={size * 0.4}
          color={disabled ? colors.inkMuted : iconColor}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
