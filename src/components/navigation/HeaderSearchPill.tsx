import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, Text, TextInput, StyleSheet, Dimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { searchEventBus } from '../../utils';

const PLACEHOLDERS: Record<string, string> = {
  Home: "Who's in?",
  Teams: 'Search rosters...',
  Leagues: 'Search leagues...',
  Facilities: 'Search grounds...',
  Profile: "Who's in?",
};

interface HeaderSearchPillProps {
  routeName?: string;
}

export function HeaderSearchPill({ routeName = 'Home' }: HeaderSearchPillProps) {
  const placeholder = PLACEHOLDERS[routeName] || 'Search...';
  const isHome = routeName === 'Home' || routeName === 'Profile';
  const [active, setActive] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Close on tab press
  useEffect(() => {
    const unsub = searchEventBus.subscribeClose(() => {
      setActive(false);
      setQuery('');
      searchEventBus.emitQuery('');
    });
    return unsub;
  }, []);

  // When route changes (switching tabs), deactivate
  useEffect(() => {
    setActive(false);
    setQuery('');
  }, [routeName]);

  const handlePress = () => {
    // Activate the pill and open the modal
    setActive(true);
    setTimeout(() => inputRef.current?.focus(), 100);
    // Tell the screen to open its search panel
    if (isHome) {
      searchEventBus.emit();
    } else {
      searchEventBus.emitTab(routeName);
    }
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    searchEventBus.emitQuery(text);
  };

  if (active) {
    return (
      <View style={styles.pillActive}>
        <Ionicons name="search" size={18} color={colors.inkFaint} />
        <TextInput
          ref={inputRef}
          style={styles.activeInput}
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaint}
          value={query}
          onChangeText={handleChangeText}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleChangeText('')}>
            <Ionicons name="close-circle" size={18} color={colors.inkFaint} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.pill} onPress={handlePress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={placeholder}>
      <Ionicons name="search" size={18} color={colors.inkFaint} />
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
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    alignSelf: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    width: SCREEN_WIDTH * 0.7,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    alignSelf: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: colors.pine,
  },
  activeInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    padding: 0,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.inkFaint,
  },
});
