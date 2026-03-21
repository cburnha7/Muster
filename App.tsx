import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Lazy-load heavy providers to catch import-time crashes
let ReduxProvider: React.ComponentType<{ children: React.ReactNode }>;
let AuthProvider: React.ComponentType<{ children: React.ReactNode }>;
let NotificationProvider: React.ComponentType<{ children: React.ReactNode }>;
let NavigationContainer: React.ComponentType<{ children: React.ReactNode }>;
let RootNavigator: React.ComponentType;
let ErrorBoundary: React.ComponentType<{ children: React.ReactNode }>;
let useFontsHook: () => { fontsLoaded: boolean; error: Error | null };
let themeColors: { cream: string };

let importError: string | null = null;

try {
  ReduxProvider = require('./src/store/Provider').ReduxProvider;
  AuthProvider = require('./src/context/AuthContext').AuthProvider;
  NotificationProvider = require('./src/services/notifications').NotificationProvider;
  NavigationContainer = require('@react-navigation/native').NavigationContainer;
  RootNavigator = require('./src/navigation/RootNavigator').RootNavigator;
  ErrorBoundary = require('./src/components/error/ErrorBoundary').ErrorBoundary;
  useFontsHook = require('./src/hooks/useFonts').useFonts;
  themeColors = require('./src/theme').colors;
} catch (e: any) {
  importError = e?.message || 'Unknown import error';
  console.error('App import error:', e);
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

  return (
    <View style={{ flex: 1, backgroundColor: cream }}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style="dark" />
    </View>
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
