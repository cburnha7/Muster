import React, { useState, useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  TextInput,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../../theme';
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

export function HeaderSearchPill({
  routeName = 'Home',
}: HeaderSearchPillProps) {
  const { colors } = useTheme();
  const placeholder = PLACEHOLDERS[routeName] || 'Search...';
  const isHome = routeName === 'Home' || routeName === 'Profile';
  const [active, setActive] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const unsub = searchEventBus.subscribeClose(() => {
      setActive(false);
      setQuery('');
      searchEventBus.emitQuery('');
    });
    return unsub;
  }, []);

  useEffect(() => {
    setActive(false);
    setQuery('');
  }, [routeName]);

  const handlePress = () => {
    setActive(true);
    setTimeout(() => inputRef.current?.focus(), 100);
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
      <View
        style={[styles.pillActive, { backgroundColor: colors.surface, borderColor: colors.cobalt, shadowColor: colors.cobalt }, { backgroundColor: colors.bgCard }]}
      >
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          ref={inputRef}
          style={[styles.activeInput, { color: colors.ink }, { color: colors.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={handleChangeText}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => handleChangeText('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={20} color={colors.inkSecondary} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.pill, { backgroundColor: colors.bgSubtle, borderColor: colors.border, shadowColor: colors.black }, { backgroundColor: colors.bgInput }]}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={placeholder}
    >
      <Ionicons name="search" size={20} color={colors.textSecondary} />
      <Text
        style={[styles.text, { color: colors.inkSecondary }, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {placeholder}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  pillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  activeInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 17,
    padding: 0,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 17,
    flex: 1,
  },
});
