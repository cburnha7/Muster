import {
  DefaultTheme,
  DarkTheme,
  Theme as NavTheme,
} from '@react-navigation/native';
import { lightColors, darkColors, SemanticColors } from '../theme/tokens';

function buildNavTheme(
  base: typeof DefaultTheme,
  colors: SemanticColors
): NavTheme {
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.cobalt,
      background: colors.background,
      card: colors.surface,
      text: colors.ink,
      border: colors.border,
      notification: colors.error,
    },
  };
}

export const MusterLightTheme = buildNavTheme(DefaultTheme, lightColors);
export const MusterDarkTheme = buildNavTheme(DarkTheme, darkColors);
