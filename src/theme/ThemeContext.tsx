import React, { createContext, useContext, useMemo } from 'react';
import {
  tokenColors,
  tokenStatus,
  tokenSport,
  tokenSpacing,
  tokenRadius,
  tokenShadow,
  tokenType,
  getAvatarColor,
} from './tokens';
import { brand, lightTokens, ThemeTokens } from './colors';
import { typeScale, TypeKey } from './typography';

export interface Theme {
  isDark: boolean;
  colors: ThemeTokens & typeof brand;
  status: typeof tokenStatus;
  sport: typeof tokenSport;
  type: typeof typeScale;
  spacing: typeof tokenSpacing;
  radius: typeof tokenRadius;
  shadow: typeof tokenShadow;
  getAvatarColor: typeof getAvatarColor;
  /** New token-based accessors */
  token: {
    colors: typeof tokenColors;
    spacing: typeof tokenSpacing;
    radius: typeof tokenRadius;
    shadow: typeof tokenShadow;
    type: typeof tokenType;
  };
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Muster is a light-mode-only app — always use light tokens
  const isDark = false;

  const theme = useMemo<Theme>(() => {
    return {
      isDark,
      colors: { ...brand, ...lightTokens },
      status: tokenStatus,
      sport: tokenSport,
      type: typeScale,
      spacing: tokenSpacing,
      radius: tokenRadius,
      shadow: tokenShadow,
      getAvatarColor,
      token: {
        colors: tokenColors,
        spacing: tokenSpacing,
        radius: tokenRadius,
        shadow: tokenShadow,
        type: tokenType,
      },
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
