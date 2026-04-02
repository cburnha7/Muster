import React from 'react';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';

import { ReduxProvider } from './src/store/Provider';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/services/notifications';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/error/ErrorBoundary';

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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
});
