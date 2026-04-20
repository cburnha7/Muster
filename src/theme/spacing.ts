import { tokenSpacing, tokenRadius, tokenShadow } from './tokens';

export const spacing = tokenSpacing;
export const radius = tokenRadius;

export const makeShadow = (_isDark: boolean) => ({
  card: tokenShadow.card,
  cta: tokenShadow.fab,
  modal: tokenShadow.modal,
});

// Backward-compatible Spacing export
export const Spacing = tokenSpacing;

export type SpacingKey = keyof typeof tokenSpacing;
