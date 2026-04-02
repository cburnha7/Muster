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

if (Platform.OS !== 'web') { SplashScreen.preventAutoHideAsync().catch(() => {}); }
if (Platform.OS !== 'web') { setTimeout(() => { SplashScreen.hideAsync().catch(() => {}); }, 5000); }

const linking = {
  prefixes: [Linking.createURL('/'), 'https://muster.app', 'muster://'],
  config: { screens: { Main: { screens: { Teams: { screens: { JoinTeam: 'join/:inviteCode' } } } } } },
};

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        await Promise.race([loadFonts(), new Promise(r => setTimeout(r, 3000))]);
      } catch (e: any) {
        console.warn('Startup error:', e);
        setError(String(e?.message || e));
      } finally {
        setAppReady(true);
        if (Platform.OS !== 'web') { SplashScreen.hideAsync().catch(() => {}); }
      }
    }
    prepare();
  }, []);

  if (!appReady) return null;

  if (error) {
    return (
      <View style={styles.err}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#C0392B', marginBottom: 12 }}>Startup Error</Text>
        <Text style={{ fontSize: 13, color: '#333', textAlign: 'center' }}>{error}</Text>
      </View>
    );
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
  try {
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
  } catch (e) { console.warn('Font load failed:', e); }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  err: { flex: 1, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', padding: 32 },
});
