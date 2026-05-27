import { fonts } from '../theme/typography';

/**
 * Shared header options for native stack screens that should render a centered
 * title with no shadow and no back button label. Used by every Layer 1.5
 * detail screen and most Layer 2 add/edit screens that opt into the native
 * stack header (vs. <ScreenHeader>).
 */
export const detailHeader = {
  headerShown: true as const,
  headerBackVisible: false,
  headerBackTitleVisible: false,
  headerTitleAlign: 'center' as const,
  headerShadowVisible: false,
  headerTitleStyle: {
    fontFamily: fonts.headingSemi,
    fontSize: 17,
  },
};
