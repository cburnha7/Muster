import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';

import { ReduxProvider } from './src/store/Provider';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/services/notifications';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/error/ErrorBoundary';
import { useFonts } from './src/hooks/useFonts';
import { colors } from './src/theme';

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

  if (error) {
    console.warn('Font loading error:', error.message);
  }

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.cobalt} />
      </View>
    );
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
  loading: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
