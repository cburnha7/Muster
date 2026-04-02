import React, { useEffect } from 'react';
import { StyleSheet, Platform } from 'react-native';
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

// Keep splash screen visible while fonts load (native only)
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
  const { fontsLoaded, error } = useFonts();

  // Hide splash screen as soon as fonts resolve (loaded or failed or timed out)
  useEffect(() => {
    if (fontsLoaded && Platform.OS !== 'web') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (error) {
    console.warn('Font loading error:', error.message);
  }

  // Return null while loading — native splash stays visible, web is brief blank
  if (!fontsLoaded) {
    return null;
  }

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
