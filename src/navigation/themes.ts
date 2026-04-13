import {
  DefaultTheme,
  DarkTheme,
  Theme as NavTheme,
} from '@react-navigation/native';
import { brand, lightTokens, darkTokens } from '../theme/colors';

export const MusterLightTheme: NavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: brand.cobalt,
    background: lightTokens.bgScreen,
    card: lightTokens.header,
    text: lightTokens.textPrimary,
    border: lightTokens.headerBorder,
    notification: brand.heart,
  },
};

export const MusterDarkTheme: NavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: brand.cobaltLight,
    background: darkTokens.bgScreen,
    card: darkTokens.header,
    text: darkTokens.textPrimary,
    border: darkTokens.headerBorder,
    notification: brand.heart,
  },
};
