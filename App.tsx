import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';

import { ReduxProvider } from './src/store/Provider';
import { AuthProvider } from './src/context/AuthContext';
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        const fraunces = require('@expo-google-fonts/fraunces');
        const nunito = require('@expo-google-fonts/nunito');
        await Promise.race([
          Font.loadAsync({
            // Fraunces — headings and display text
            Fraunces_700Bold: fraunces.Fraunces_700Bold,
            Fraunces_700Bold_Italic: fraunces.Fraunces_700Bold_Italic,
            Fraunces_900Black: fraunces.Fraunces_900Black,
            // Nunito — UI, body, buttons, labels
            Nunito_400Regular: nunito.Nunito_400Regular,
            Nunito_500Medium: nunito.Nunito_500Medium,
            Nunito_600SemiBold: nunito.Nunito_600SemiBold,
            Nunito_700Bold: nunito.Nunito_700Bold,
          }),
          new Promise(r => setTimeout(r, 5000)),
        ]);
      } catch (e) {
        console.warn('Font load error:', e);
      } finally {
        setReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    }
    prepare();
  }, []);

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <ReduxProvider>
            <AuthProvider>
              <NotificationProvider>
                <GestureHandlerRootView style={styles.root}>
                  <AppNavigation />
                  <StatusBar style="auto" />
                </GestureHandlerRootView>
              </NotificationProvider>
            </AuthProvider>
          </ReduxProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
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
