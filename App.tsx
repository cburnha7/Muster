import React, { useEffect, useState } from 'react';
import { StyleSheet, Platform, View, Text } from 'react-native';
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

// Prevent auto-hide ONCE at module level
console.log('[App] Module loaded, calling preventAutoHideAsync');
SplashScreen.preventAutoHideAsync().catch((e) => console.warn('[App] preventAutoHideAsync error:', e));

const linking = {
  prefixes: [Linking.createURL('/'), 'https://muster.app', 'muster://'],
  config: { screens: { Main: { screens: { Teams: { screens: { JoinTeam: 'join/:inviteCode' } } } } } },
};

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontError, setFontError] = useState<Error | null>(null);
  const [splashHidden, setSplashHidden] = useState(false);

  // Load fonts
  useEffect(() => {
    console.log('[App] Starting font load');
    loadFonts()
      .then(() => { console.log('[App] Fonts loaded OK'); setFontsLoaded(true); })
      .catch((e) => { console.warn('[App] Font error:', e); setFontError(e); setFontsLoaded(true); });
  }, []);

  // Hide splash — with 3s timeout failsafe
  useEffect(() => {
    const timeout = setTimeout(async () => {
      console.log('[App] Timeout reached, force hiding splash');
      await SplashScreen.hideAsync().catch(() => {});
      setSplashHidden(true);
    }, 3000);

    if (fontsLoaded || fontError) {
      console.log('[App] Fonts resolved, hiding splash. loaded:', fontsLoaded, 'error:', !!fontError);
      clearTimeout(timeout);
      SplashScreen.hideAsync()
        .then(() => { console.log('[App] hideAsync succeeded'); setSplashHidden(true); })
        .catch((e) => { console.warn('[App] hideAsync error:', e); setSplashHidden(true); });
    }

    return () => clearTimeout(timeout);
  }, [fontsLoaded, fontError]);

  console.log('[App] Render. fontsLoaded:', fontsLoaded, 'splashHidden:', splashHidden);

  // Show nothing until splash is hidden (native splash covers the screen)
  if (!splashHidden) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ReduxProvider>
        <AuthProvider>
          <NotificationProvider>
            <GestureHandlerRootView style={styles.root}>
              <NavigationContainer linking={linking}>
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

async function loadFonts() {
  const jakarta = require('@expo-google-fonts/plus-jakarta-sans');
  const inter = require('@expo-google-fonts/inter');
  await Font.loadAsync({
    PlusJakartaSans_400Regular: jakarta.PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium: jakarta.PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold: jakarta.PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold: jakarta.PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold: jakarta.PlusJakartaSans_800ExtraBold,
    Inter_400Regular: inter.Inter_400Regular,
    Inter_500Medium: inter.Inter_500Medium,
    Inter_600SemiBold: inter.Inter_600SemiBold,
    Inter_700Bold: inter.Inter_700Bold,
  });
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
});
