import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts } from '../../theme';
import { searchEventBus } from '../../utils';

const PLACEHOLDERS: Record<string, string> = {
  Home: 'Find a game...',
  Teams: 'Search rosters...',
  Leagues: 'Search leagues...',
  Facilities: 'Search grounds...',
  Profile: 'Find a game...',
};

interface HeaderSearchPillProps {
  routeName?: string;
}

/**
 * Context-aware search pill rendered in the tab bar header.
 * On Home tab: opens the event search modal.
 * On other tabs: focuses the search bar on that tab's list screen.
 */
export function HeaderSearchPill({ routeName = 'Home' }: HeaderSearchPillProps) {
  const navigation = useNavigation();
  const placeholder = PLACEHOLDERS[routeName] || 'Search...';

  const handlePress = () => {
    if (routeName === 'Home' || routeName === 'Profile') {
      (navigation as any).navigate('Home', { screen: 'HomeScreen' });
      setTimeout(() => searchEventBus.emit(), 50);
    } else {
      // Emit a tab-specific focus event so the list screen can focus its search bar
      searchEventBus.emitTab(routeName);
    }
  };

  return (
    <TouchableOpacity
      style={styles.pill}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={placeholder}
    >
      <Ionicons name="search" size={16} color={colors.inkFaint} />
      <Text style={styles.text}>{placeholder}</Text>
    </TouchableOpacity>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    width: SCREEN_WIDTH * 0.7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    alignSelf: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
  },
});
