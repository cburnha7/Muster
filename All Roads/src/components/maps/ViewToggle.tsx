import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

interface ViewToggleProps {
  viewMode: 'list' | 'map';
  onToggle: (mode: 'list' | 'map') => void;
}

export function ViewToggle({ viewMode, onToggle }: ViewToggleProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, viewMode === 'list' && styles.buttonActive]}
        onPress={() => onToggle('list')}
        activeOpacity={0.7}
      >
        <Ionicons
          name="list"
          size={20}
          color={viewMode === 'list' ? colors.chalk : colors.ink}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, viewMode === 'map' && styles.buttonActive]}
        onPress={() => onToggle('map')}
        activeOpacity={0.7}
      >
        <Ionicons
          name="map"
          size={20}
          color={viewMode === 'map' ? colors.chalk : colors.ink}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.chalk,
    borderRadius: 8,
    padding: 2,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  buttonActive: {
    backgroundColor: colors.grass,
  },
});
