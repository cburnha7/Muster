import React, { useState, useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  TextInput,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, useTheme } from '../../theme';
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
  const { colors: themeColors } = useTheme();
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
        style={[styles.pillActive, { backgroundColor: themeColors.bgCard }]}
      >
        <Ionicons name="search" size={17} color={themeColors.textSecondary} />
        <TextInput
          ref={inputRef}
          style={[styles.activeInput, { color: themeColors.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={themeColors.textSecondary}
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
            <Ionicons name="close-circle" size={17} color={colors.outline} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.pill, { backgroundColor: themeColors.bgInput }]}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={placeholder}
    >
      <Ionicons name="search" size={17} color={themeColors.textSecondary} />
      <Text
        style={[styles.text, { color: themeColors.textSecondary }]}
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
    backgroundColor: colors.surfaceContainer,
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    gap: 8,
  },
  pillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    gap: 8,
    borderWidth: 2,
    borderColor: 'rgba(0, 82, 255, 0.25)',
  },
  activeInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
    padding: 0,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.outline,
    flex: 1,
  },
});
