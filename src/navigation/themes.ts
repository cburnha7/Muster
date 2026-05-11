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
      background: colors.bgScreen,
      card: colors.header,
      text: colors.ink,
      border: colors.headerBorder,
      notification: colors.error,
    },
  };
}

export const MusterLightTheme = buildNavTheme(DefaultTheme, lightColors);
export const MusterDarkTheme = buildNavTheme(DarkTheme, darkColors);
