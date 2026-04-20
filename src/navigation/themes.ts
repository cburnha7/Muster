import { DefaultTheme, Theme as NavTheme } from '@react-navigation/native';
import { tokenColors } from '../theme/tokens';

export const MusterLightTheme: NavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: tokenColors.cobalt,
    background: tokenColors.background,
    card: tokenColors.surface,
    text: tokenColors.ink,
    border: tokenColors.border,
    notification: tokenColors.error,
  },
};

// Muster is light-mode only — alias for backward compat
export const MusterDarkTheme = MusterLightTheme;
