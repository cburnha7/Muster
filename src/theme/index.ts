// ─── Token system ────────────────────────────────────────────
export {
  lightColors,
  darkColors,
  tokenColors,
  tokenSpacing,
  tokenRadius,
  tokenShadow,
  tokenType,
  tokenFontFamily,
  tokenStatus,
  tokenSport,
  makeShadows,
  avatarColors as tokenAvatarColors,
  getAvatarColor as tokenGetAvatarColor,
} from './tokens';
export type {
  SemanticColors,
  SpacingKey,
  RadiusKey,
  ShadowKey,
  TypeKey as TokenTypeKey,
  SportKey,
} from './tokens';

// ─── Backward-compatible exports ─────────────────────────────
export {
  colors,
  brand,
  statusTokens,
  sportTokens,
  lightTokens,
  darkTokens,
  getAvatarColor,
  avatarColors,
  sportColors,
} from './colors';
export type { ColorKey, ThemeTokens } from './colors';

export { fonts, fontFamilies, typeScale, TextStyles } from './typography';
export type { FontKey, TypeKey, TypeScaleKey } from './typography';

export { spacing, radius, Spacing } from './spacing';

export { BorderRadius, getBorderRadius } from './borderRadius';
export type { BorderRadiusKey } from './borderRadius';

export { Shadows, getShadow } from './shadows';

export { ComponentStyles } from './componentStyles';

export { ThemeProvider, useTheme, t } from './ThemeContext';
export type { Theme } from './ThemeContext';

export { brand as brandConstants, salute, errorCodes } from './brand';
export type { ErrorCode } from './brand';

export { MusterIcon } from './MusterIcon';
