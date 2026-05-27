// Test setup configuration
import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    initialWindowMetrics: {
      insets: inset,
      frame: { x: 0, y: 0, width: 390, height: 844 },
    },
  };
});

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      name: 'Sports Booking App',
      slug: 'sports-booking-app',
    },
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      dispatch: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: (cb: () => void) => {
      // Run the callback once on mount like the real hook
      const React2 = require('react');
      React2.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, []);
    },
    useIsFocused: () => true,
    NavigationContainer: ({ children }: { children: React.ReactNode }) =>
      children,
    getFocusedRouteNameFromRoute: () => undefined,
    createNavigationContainerRef: () => ({ current: null }),
  };
});

// ─── Mock the theme module ───────────────────────────────────
// Components import { useTheme, fonts, ... } from '../../theme'.
// The real ThemeProvider has an async gate (AsyncStorage read) that
// causes components to render null in tests. This mock provides a
// synchronous useTheme() that returns a valid light-mode theme.

jest.mock('../src/theme/ThemeContext', () => {
  const actual = jest.requireActual('../src/theme/ThemeContext');
  const tokens = jest.requireActual('../src/theme/tokens');
  const typography = jest.requireActual('../src/theme/typography');

  const mockTheme = {
    isDark: false,
    themeMode: 'light',
    colors: tokens.lightColors,
    status: tokens.tokenStatus,
    sport: tokens.tokenSport,
    type: typography.typeScale,
    spacing: tokens.tokenSpacing,
    radius: tokens.tokenRadius,
    shadow: tokens.makeShadows(false),
    fonts: tokens.tokenFontFamily,
    getAvatarColor: tokens.getAvatarColor,
    setThemeMode: jest.fn(),
    setDarkMode: jest.fn(),
  };

  return {
    ...actual,
    useTheme: () => mockTheme,
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});
