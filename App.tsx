import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
        const jakarta = require('@expo-google-fonts/plus-jakarta-sans');
        const inter = require('@expo-google-fonts/inter');
        await Promise.race([
          Font.loadAsync({
            PlusJakartaSans_400Regular: jakarta.PlusJakartaSans_400Regular,
            PlusJakartaSans_500Medium: jakarta.PlusJakartaSans_500Medium,
            PlusJakartaSans_600SemiBold: jakarta.PlusJakartaSans_600SemiBold,
            PlusJakartaSans_700Bold: jakarta.PlusJakartaSans_700Bold,
            PlusJakartaSans_800ExtraBold: jakarta.PlusJakartaSans_800ExtraBold,
            Inter_400Regular: inter.Inter_400Regular,
            Inter_500Medium: inter.Inter_500Medium,
            Inter_600SemiBold: inter.Inter_600SemiBold,
            Inter_700Bold: inter.Inter_700Bold,
          }),
          new Promise(r => setTimeout(r, 3000)),
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
      <ReduxProvider>
        <AuthProvider>
          <NotificationProvider>
            <GestureHandlerRootView style={styles.root}>
              <NavigationContainer linking={linking as any}>
                <RootNavigator />
              </NavigationContainer>
              <StatusBar style="dark" />
            </GestureHandlerRootView>
          </NotificationProvider>
        </AuthProvider>
      </ReduxProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
});
