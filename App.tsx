import React from 'react';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';

import { useFonts } from './src/hooks/useFonts';
import { ReduxProvider } from './src/store/Provider';
import { NotificationProvider } from './src/services/notifications';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/error/ErrorBoundary';
import { ThemeProvider, useTheme } from './src/theme';
import { MusterLightTheme, MusterDarkTheme } from './src/navigation/themes';

SplashScreen.preventAutoHideAsync().catch(() => {});

const linking = {
  prefixes: [Linking.createURL('/'), 'https://muster.app', 'muster://'],
  config: {
    screens: {
      Main: {
        screens: {
          Teams: {
            screens: {
              JoinTeam: 'join/:inviteCode',
            },
          },
        },
      },
    },
  },
};

export default function App() {
  useFonts();

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <ReduxProvider>
            <NotificationProvider>
              <GestureHandlerRootView style={styles.root}>
                <AppNavigation />
                <StatusBar style="auto" />
              </GestureHandlerRootView>
            </NotificationProvider>
          </ReduxProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** Inner component that reads theme context for NavigationContainer */
function AppNavigation() {
  const { isDark } = useTheme();
  return (
    <NavigationContainer
      linking={linking as any}
      theme={isDark ? MusterDarkTheme : MusterLightTheme}
    >
      <RootNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
