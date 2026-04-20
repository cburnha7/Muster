import { tokenSpacing, tokenRadius } from './tokens';

export const spacing = tokenSpacing;
export const radius = tokenRadius;

// Backward-compatible Spacing export
export const Spacing = tokenSpacing;

export type SpacingKey = keyof typeof tokenSpacing;
