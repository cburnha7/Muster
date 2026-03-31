import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';

// Lazy-load heavy providers to catch import-time crashes
let ReduxProvider: React.ComponentType<{ children: React.ReactNode }>;
let AuthProvider: React.ComponentType<{ children: React.ReactNode }>;
let NotificationProvider: React.ComponentType<{ children: React.ReactNode }>;
let NavigationContainer: React.ComponentType<{ children: React.ReactNode; linking?: any }>;
let RootNavigator: React.ComponentType;
let ErrorBoundary: React.ComponentType<{ children: React.ReactNode }>;
let useFontsHook: () => { fontsLoaded: boolean; error: Error | null };
let themeColors: { cream: string };

let GestureHandlerRootView: React.ComponentType<{ style?: any; children: React.ReactNode }>;
let importError: string | null = null;

const imports: string[] = [];
try {
  ReduxProvider = require('./src/store/Provider').ReduxProvider;
  imports.push('ReduxProvider ✓');
} catch (e: any) { importError = `ReduxProvider: ${e?.message}`; }

if (!importError) try {
  AuthProvider = require('./src/context/AuthContext').AuthProvider;
  imports.push('AuthProvider ✓');
} catch (e: any) { importError = `AuthProvider: ${e?.message}`; }

if (!importError) try {
  NotificationProvider = require('./src/services/notifications').NotificationProvider;
  imports.push('NotificationProvider ✓');
} catch (e: any) { importError = `NotificationProvider: ${e?.message}`; }

if (!importError) try {
  NavigationContainer = require('@react-navigation/native').NavigationContainer;
  imports.push('NavigationContainer ✓');
} catch (e: any) { importError = `NavigationContainer: ${e?.message}`; }

if (!importError) try {
  RootNavigator = require('./src/navigation/RootNavigator').RootNavigator;
  imports.push('RootNavigator ✓');
} catch (e: any) { importError = `RootNavigator: ${e?.message}`; }

if (!importError) try {
  ErrorBoundary = require('./src/components/error/ErrorBoundary').ErrorBoundary;
  imports.push('ErrorBoundary ✓');
} catch (e: any) { importError = `ErrorBoundary: ${e?.message}`; }

if (!importError) try {
  useFontsHook = require('./src/hooks/useFonts').useFonts;
  imports.push('useFonts ✓');
} catch (e: any) { importError = `useFonts: ${e?.message}`; }

if (!importError) try {
  themeColors = require('./src/theme').colors;
  imports.push('theme ✓');
} catch (e: any) { importError = `theme: ${e?.message}`; }

if (!importError) try {
  GestureHandlerRootView = require('react-native-gesture-handler').GestureHandlerRootView;
  imports.push('GestureHandler ✓');
} catch (e: any) { importError = `GestureHandler: ${e?.message}`; }

if (importError) {
  console.error('App import error:', importError);
  console.log('Loaded so far:', imports.join(', '));
}

function AppContent() {
  const { fontsLoaded, error } = useFontsHook();
  const cream = themeColors?.cream || '#EEEBE3';

  if (!fontsLoaded) {
    return (
      <View style={[styles.loading, { backgroundColor: cream }]}>
        <ActivityIndicator size="large" color="#2D5F3F" />
        <Text style={styles.loadingText}>Loading fonts...</Text>
      </View>
    );
  }

  if (error) {
    console.warn('Font loading error:', error.message);
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

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: cream }}>
      <NavigationContainer linking={linking}>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}

export default function App() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // If imports failed, show the error visibly
  if (importError) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorTitle}>Startup Error</Text>
        <Text style={styles.errorMessage}>{importError}</Text>
        <Text style={[styles.errorMessage, { marginTop: 16, fontSize: 12, opacity: 0.7 }]}>
          Loaded: {imports.join(', ') || 'none'}
        </Text>
      </View>
    );
  }

  // Show branded splash while mounting
  if (!mounted) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashTitle}>Muster</Text>
        <ActivityIndicator size="large" color="#1B2A4A" style={{ marginTop: 24 }} />
      </View>
    );
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
  splash: {
    flex: 1,
    backgroundColor: '#B8976A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashTitle: {
    fontSize: 64,
    fontWeight: '700',
    color: '#1B2A4A',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7A96',
  },
  error: {
    flex: 1,
    backgroundColor: '#EEEBE3',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#C0392B',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: '#1B2A4A',
    textAlign: 'center',
  },
});
