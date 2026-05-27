import { useWindowDimensions } from 'react-native';

export const CONTENT_MAX_WIDTH = 1200;
export const WIDE_VIEWPORT_THRESHOLD = 600;

/**
 * Returns the responsive content width configuration.
 *
 * On wide viewports (web/tablet, > 600px), content is capped at CONTENT_MAX_WIDTH
 * and centered. On phone-width viewports, content fills the available width.
 *
 * The cap was raised from 540px to 1200px on 2026-05-27 to make the web build
 * feel desktop-native without going edge-to-edge at 1440px+.
 */
export function useContentWidth(maxWidth: number = CONTENT_MAX_WIDTH) {
  const { width } = useWindowDimensions();
  const isWide = width > WIDE_VIEWPORT_THRESHOLD;
  return {
    isWide,
    contentMaxWidth: isWide ? maxWidth : undefined,
    /**
     * Convenience style fragment for direct application:
     *   <View style={[styles.container, contentStyle]}>
     */
    contentStyle: isWide
      ? { maxWidth, width: '100%' as const, alignSelf: 'center' as const }
      : null,
  };
}
