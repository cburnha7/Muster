import React, { createContext, useContext, useMemo } from 'react';
import {
  brand,
  statusTokens,
  sportTokens,
  lightTokens,
  darkTokens,
  ThemeTokens,
  getAvatarColor,
} from './colors';
import { typeScale, TypeKey } from './typography';
import { spacing, radius, makeShadow } from './spacing';

export interface Theme {
  isDark: boolean;
  colors: ThemeTokens & typeof brand;
  status: typeof statusTokens;
  sport: typeof sportTokens;
  type: typeof typeScale;
  spacing: typeof spacing;
  radius: typeof radius;
  shadow: ReturnType<typeof makeShadow>;
  getAvatarColor: typeof getAvatarColor;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Muster is a light-mode-only app — always use light tokens
  const isDark = false;

  const theme = useMemo<Theme>(() => {
    const semantic = isDark ? darkTokens : lightTokens;
    return {
      isDark,
      colors: { ...brand, ...semantic },
      status: statusTokens,
      sport: sportTokens,
      type: typeScale,
      spacing,
      radius,
      shadow: makeShadow(isDark),
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

export function t(theme: Theme, key: TypeKey, color?: string) {
  return { ...theme.type[key], color: color ?? theme.colors.textPrimary };
}
