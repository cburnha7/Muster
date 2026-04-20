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
import { ThemeProvider } from './src/theme';
import { MusterLightTheme } from './src/navigation/themes';

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
        // Load both old fonts (backward compat) and new design system fonts
        const jakarta = require('@expo-google-fonts/plus-jakarta-sans');
        const inter = require('@expo-google-fonts/inter');
        const fraunces = require('@expo-google-fonts/fraunces');
        const dmSans = require('@expo-google-fonts/dm-sans');
        const nunito = require('@expo-google-fonts/nunito');
        await Promise.race([
          Font.loadAsync({
            // Legacy fonts (backward compat during migration)
            PlusJakartaSans_400Regular: jakarta.PlusJakartaSans_400Regular,
            PlusJakartaSans_500Medium: jakarta.PlusJakartaSans_500Medium,
            PlusJakartaSans_600SemiBold: jakarta.PlusJakartaSans_600SemiBold,
            PlusJakartaSans_700Bold: jakarta.PlusJakartaSans_700Bold,
            PlusJakartaSans_800ExtraBold: jakarta.PlusJakartaSans_800ExtraBold,
            Inter_400Regular: inter.Inter_400Regular,
            Inter_500Medium: inter.Inter_500Medium,
            Inter_600SemiBold: inter.Inter_600SemiBold,
            Inter_700Bold: inter.Inter_700Bold,
            DMSans_400Regular: dmSans.DMSans_400Regular,
            DMSans_500Medium: dmSans.DMSans_500Medium,
            DMSans_600SemiBold: dmSans.DMSans_600SemiBold,
            DMSans_700Bold: dmSans.DMSans_700Bold,
            // Design system fonts
            Fraunces_700Bold: fraunces.Fraunces_700Bold,
            Fraunces_700Bold_Italic: fraunces.Fraunces_700Bold_Italic,
            Fraunces_900Black: fraunces.Fraunces_900Black,
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
                  <NavigationContainer
                    linking={linking as any}
                    theme={MusterLightTheme}
                  >
                    <RootNavigator />
                  </NavigationContainer>
                  <StatusBar style="dark" />
                </GestureHandlerRootView>
              </NotificationProvider>
            </AuthProvider>
          </ReduxProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
