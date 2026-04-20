import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
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
}

// ─── Context ─────────────────────────────────────────────────

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const isDark = systemScheme === 'dark';

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
    };
  }, [isDark]);

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
