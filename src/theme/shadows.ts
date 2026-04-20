import { tokenShadow } from './tokens';

export const Shadows = {
  none: tokenShadow.none,
  sm: tokenShadow.card,
  md: tokenShadow.cardHover,
  lg: tokenShadow.modal,
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 40,
    elevation: 8,
  },
} as const;

export type ShadowKey = keyof typeof Shadows;

export function getShadow(key: ShadowKey) {
  return Shadows[key];
}
