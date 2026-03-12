/**
 * Muster App Icon Component
 * Reusable icon component for consistent branding
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from './brand';

interface MusterIconProps {
  size?: number;
  style?: ViewStyle;
  variant?: 'default' | 'rounded' | 'square';
}

export const MusterIcon: React.FC<MusterIconProps> = ({ 
  size = 64, 
  style,
  variant = 'rounded',
}) => {
  const iconSize = size * 0.6; // Icon is 60% of container size
  
  const borderRadius = variant === 'square' ? 0 
    : variant === 'rounded' ? size * 0.2 
    : size / 2; // circle

  return (
    <View 
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: Brand.colors.grass,
        },
        style,
      ]}
    >
      <Ionicons 
        name="people" 
        size={iconSize} 
        color={Brand.icon.foregroundColor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
