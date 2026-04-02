import React, { useEffect, useState } from 'react';
import { StyleSheet, Platform, View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';

import { ReduxProvider } from './src/store/Provider';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/services/notifications';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/error/ErrorBoundary';
import { useFonts } from './src/hooks/useFonts';

// Prevent splash from auto-hiding on native
if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

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

function AppContent() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <NavigationContainer linking={linking}>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}

export default function App() {
  const { fontsLoaded } = useFonts();
  const [ready, setReady] = useState(false);

  // Hide splash once fonts are done — runs at the TOP level, outside all providers
  useEffect(() => {
    if (fontsLoaded) {
      setReady(true);
      if (Platform.OS !== 'web') {
        SplashScreen.hideAsync().catch(() => {});
      }
    }
  }, [fontsLoaded]);

  // Absolute failsafe — hide splash after 5 seconds no matter what
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Platform.OS !== 'web') {
        SplashScreen.hideAsync().catch(() => {});
      }
      setReady(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return null; // Native splash stays visible
  }

  return (
    <ErrorBoundary>
      <ReduxProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AuthProvider>
      </ReduxProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
