import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, Text, TextInput, StyleSheet, Dimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { searchEventBus } from '../../utils';

const PLACEHOLDERS: Record<string, string> = {
  Home: "Who's in?",
  Teams: 'Looking for a team?',
  Leagues: 'Looking for a league?',
  Facilities: 'Need a spot?',
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
      <Ionicons name="search" size={18} color={colors.inkSoft} />
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: colors.cobalt,
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
    fontSize: 17,
    color: colors.inkSoft,
  },
});
