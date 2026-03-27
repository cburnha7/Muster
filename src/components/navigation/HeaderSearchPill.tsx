import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts } from '../../theme';
import { searchEventBus } from '../../utils/searchEventBus';

/**
 * AirBnB-style search pill rendered in the tab bar header.
 * Navigates to Home and fires a lightweight event that HomeScreen listens for.
 */
export function HeaderSearchPill() {
  const navigation = useNavigation();

  const handlePress = () => {
    (navigation as any).navigate('Home', { screen: 'HomeScreen' });
    setTimeout(() => searchEventBus.emit(), 50);
  };

  return (
    <TouchableOpacity
      style={styles.pill}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Find a game"
    >
      <Ionicons name="search" size={16} color={colors.inkFaint} />
      <Text style={styles.text}>Find a game...</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    flex: 1,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkFaint,
    flex: 1,
  },
});
