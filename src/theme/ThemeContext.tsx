import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  lightColors,
  darkColors,
  SemanticColors,
  tokenStatus,
  tokenSport,
  tokenSpacing,
  tokenRadius,
  tokenFontFamily,
  makeShadows,
  getAvatarColor,
} from './tokens';
import { typeScale, TypeKey } from './typography';

const THEME_PREF_KEY = '@muster_dark_mode';

// ─── Theme shape ─────────────────────────────────────────────

export interface Theme {
  isDark: boolean;
  colors: SemanticColors;
  status: typeof tokenStatus;
  sport: typeof tokenSport;
  type: typeof typeScale;
  spacing: typeof tokenSpacing;
  radius: typeof tokenRadius;
  shadow: ReturnType<typeof makeShadows>;
  fonts: typeof tokenFontFamily;
  getAvatarColor: typeof getAvatarColor;
  /** Toggle dark mode on/off. Persists to AsyncStorage. */
  setDarkMode: (dark: boolean) => void;
}

// ─── Context ─────────────────────────────────────────────────

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null

  // null = not yet loaded from storage; use system default
  const [userPref, setUserPref] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_PREF_KEY)
      .then(val => {
        if (val === 'true') setUserPref(true);
        else if (val === 'false') setUserPref(false);
        // else null — follow system
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setDarkMode = useCallback((dark: boolean) => {
    setUserPref(dark);
    AsyncStorage.setItem(THEME_PREF_KEY, String(dark)).catch(() => {});
  }, []);

  // Resolve: user preference wins, then system, then light
  const isDark = userPref !== null ? userPref : systemScheme === 'dark';

  const theme = useMemo<Theme>(() => {
    const colors = isDark ? darkColors : lightColors;
    return {
      isDark,
      colors,
      status: tokenStatus,
      sport: tokenSport,
      type: typeScale,
      spacing: tokenSpacing,
      radius: tokenRadius,
      shadow: makeShadows(isDark),
      fonts: tokenFontFamily,
      getAvatarColor,
      setDarkMode,
    };
  }, [isDark, setDarkMode]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

/** Shorthand: merge a type style with a color */
export function t(theme: Theme, key: TypeKey, color?: string) {
  return { ...theme.type[key], color: color ?? theme.colors.textPrimary };
}
