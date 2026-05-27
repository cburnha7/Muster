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

// Storage keys.
const THEME_MODE_KEY = '@muster_theme_mode';
const LEGACY_DARK_KEY = '@muster_dark_mode';

export type ThemeMode = 'system' | 'light' | 'dark';

// ─── Theme shape ─────────────────────────────────────────────

export interface Theme {
  /** True if the app is currently rendering in dark mode. */
  isDark: boolean;
  /** Raw user preference. 'system' follows OS; 'light'/'dark' override. */
  themeMode: ThemeMode;
  colors: SemanticColors;
  status: typeof tokenStatus;
  sport: typeof tokenSport;
  type: typeof typeScale;
  spacing: typeof tokenSpacing;
  radius: typeof tokenRadius;
  shadow: ReturnType<typeof makeShadows>;
  fonts: typeof tokenFontFamily;
  getAvatarColor: typeof getAvatarColor;
  /** Set the three-state preference. Persists to AsyncStorage. */
  setThemeMode: (mode: ThemeMode) => void;
  /**
   * Backward-compatible binary setter. true → 'dark', false → 'light'.
   * Prefer setThemeMode for new code.
   */
  setDarkMode: (dark: boolean) => void;
}

// ─── Context ─────────────────────────────────────────────────

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null

  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  // Load persisted preference on mount. Migrates the legacy binary key if
  // present so users who set a dark-mode preference on prior builds keep it.
  useEffect(() => {
    let cancelled = false;

    async function loadPref() {
      try {
        const stored = await AsyncStorage.getItem(THEME_MODE_KEY);
        if (cancelled) return;
        if (stored === 'system' || stored === 'light' || stored === 'dark') {
          setThemeModeState(stored);
          setLoaded(true);
          return;
        }

        // No new-key value — check legacy boolean.
        const legacy = await AsyncStorage.getItem(LEGACY_DARK_KEY);
        if (cancelled) return;
        if (legacy === 'true') {
          setThemeModeState('dark');
          AsyncStorage.setItem(THEME_MODE_KEY, 'dark').catch(() => {});
        } else if (legacy === 'false') {
          setThemeModeState('light');
          AsyncStorage.setItem(THEME_MODE_KEY, 'light').catch(() => {});
        } else {
          setThemeModeState('system');
        }
      } catch {
        if (!cancelled) setThemeModeState('system');
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    loadPref();
    return () => {
      cancelled = true;
    };
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_MODE_KEY, mode).catch(() => {});
  }, []);

  // Backward-compatible binary API.
  const setDarkMode = useCallback(
    (dark: boolean) => {
      setThemeMode(dark ? 'dark' : 'light');
    },
    [setThemeMode]
  );

  // Resolve: explicit user preference wins, else follow system, else light.
  const isDark = useMemo(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return systemScheme === 'dark';
  }, [themeMode, systemScheme]);

  const theme = useMemo<Theme>(() => {
    const colors = isDark ? darkColors : lightColors;
    return {
      isDark,
      themeMode,
      colors,
      status: tokenStatus,
      sport: tokenSport,
      type: typeScale,
      spacing: tokenSpacing,
      radius: tokenRadius,
      shadow: makeShadows(isDark),
      fonts: tokenFontFamily,
      getAvatarColor,
      setThemeMode,
      setDarkMode,
    };
  }, [isDark, themeMode, setThemeMode, setDarkMode]);

  // Avoid rendering with the wrong theme on first paint by waiting for the
  // persisted preference to load.
  if (!loaded) return null;

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
