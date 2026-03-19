/**
 * Platform detection and utilities for cross-platform support
 */

import { Platform, Dimensions } from 'react-native';

/**
 * Platform detection
 */
export const isWeb = Platform.OS === 'web';
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isMobile = isIOS || isAndroid;

/**
 * Get current platform name
 */
export const getPlatform = (): 'web' | 'ios' | 'android' => {
  return Platform.OS as 'web' | 'ios' | 'android';
};

/**
 * Screen size detection for responsive design
 */
export const getScreenSize = () => {
  const { width } = Dimensions.get('window');
  
  if (width < 768) {
    return 'mobile';
  } else if (width < 1024) {
    return 'tablet';
  } else if (width < 1440) {
    return 'desktop';
  } else {
    return 'wide';
  }
};

/**
 * Check if current screen is mobile size
 */
export const isMobileSize = (): boolean => {
  const { width } = Dimensions.get('window');
  return width < 768;
};

/**
 * Check if current screen is tablet size
 */
export const isTabletSize = (): boolean => {
  const { width } = Dimensions.get('window');
  return width >= 768 && width < 1024;
};

/**
 * Check if current screen is desktop size
 */
export const isDesktopSize = (): boolean => {
  const { width } = Dimensions.get('window');
  return width >= 1024;
};

/**
 * Get platform-specific value
 * @example
 * const padding = platformSelect({ web: 20, mobile: 10 });
 */
export const platformSelect = <T>(values: {
  web?: T;
  ios?: T;
  android?: T;
  mobile?: T;
  default?: T;
}): T | undefined => {
  if (isWeb && values.web !== undefined) {
    return values.web;
  }
  if (isIOS && values.ios !== undefined) {
    return values.ios;
  }
  if (isAndroid && values.android !== undefined) {
    return values.android;
  }
  if (isMobile && values.mobile !== undefined) {
    return values.mobile;
  }
  return values.default;
};

/**
 * Get responsive value based on screen size
 * @example
 * const columns = responsiveValue({ mobile: 1, tablet: 2, desktop: 3 });
 */
export const responsiveValue = <T>(values: {
  mobile?: T;
  tablet?: T;
  desktop?: T;
  wide?: T;
  default?: T;
}): T | undefined => {
  const screenSize = getScreenSize();
  
  if (screenSize === 'mobile' && values.mobile !== undefined) {
    return values.mobile;
  }
  if (screenSize === 'tablet' && values.tablet !== undefined) {
    return values.tablet;
  }
  if (screenSize === 'desktop' && values.desktop !== undefined) {
    return values.desktop;
  }
  if (screenSize === 'wide' && values.wide !== undefined) {
    return values.wide;
  }
  return values.default;
};

/**
 * Check if device supports hover (desktop/web with mouse)
 */
export const supportsHover = (): boolean => {
  if (!isWeb) {
    return false;
  }
  
  // Check if device supports hover using media query
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(hover: hover)').matches;
  }
  
  return true; // Assume web supports hover by default
};

/**
 * Check if device supports touch
 */
export const supportsTouch = (): boolean => {
  if (isMobile) {
    return true;
  }
  
  if (isWeb && typeof window !== 'undefined') {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
  
  return false;
};

/**
 * Get safe area insets for web
 * On web, returns default values since safe areas are mobile-specific
 */
export const getSafeAreaInsets = () => {
  if (isWeb) {
    return {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    };
  }
  
  // On mobile, this should be handled by react-native-safe-area-context
  return {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  };
};

/**
 * Platform-specific styles helper
 */
export const platformStyles = {
  /**
   * Add hover effect only on platforms that support it
   */
  hover: (styles: any) => {
    if (supportsHover()) {
      return styles;
    }
    return {};
  },
  
  /**
   * Add touch-specific styles
   */
  touch: (styles: any) => {
    if (supportsTouch()) {
      return styles;
    }
    return {};
  },
  
  /**
   * Web-only styles
   */
  web: (styles: any) => {
    if (isWeb) {
      return styles;
    }
    return {};
  },
  
  /**
   * Mobile-only styles
   */
  mobile: (styles: any) => {
    if (isMobile) {
      return styles;
    }
    return {};
  },
};

/**
 * Get appropriate input type for web
 */
export const getWebInputType = (type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'): string => {
  if (!isWeb) {
    return 'default';
  }
  return type;
};

/**
 * Check if running in browser
 */
export const isBrowser = (): boolean => {
  return isWeb && typeof window !== 'undefined';
};

/**
 * Get user agent (web only)
 */
export const getUserAgent = (): string => {
  if (isBrowser()) {
    return navigator.userAgent;
  }
  return '';
};

/**
 * Detect browser type (web only)
 */
export const getBrowserType = (): 'chrome' | 'firefox' | 'safari' | 'edge' | 'other' => {
  if (!isBrowser()) {
    return 'other';
  }
  
  const ua = getUserAgent().toLowerCase();
  
  if (ua.includes('edg/')) {
    return 'edge';
  }
  if (ua.includes('chrome')) {
    return 'chrome';
  }
  if (ua.includes('firefox')) {
    return 'firefox';
  }
  if (ua.includes('safari') && !ua.includes('chrome')) {
    return 'safari';
  }
  
  return 'other';
};

export default {
  isWeb,
  isIOS,
  isAndroid,
  isMobile,
  getPlatform,
  getScreenSize,
  isMobileSize,
  isTabletSize,
  isDesktopSize,
  platformSelect,
  responsiveValue,
  supportsHover,
  supportsTouch,
  getSafeAreaInsets,
  platformStyles,
  getWebInputType,
  isBrowser,
  getUserAgent,
  getBrowserType,
};
