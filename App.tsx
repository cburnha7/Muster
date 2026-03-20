import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from './src/hooks/useFonts';
import { ReduxProvider } from './src/store/Provider';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/services/notifications';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/error/ErrorBoundary';
import { colors } from './src/theme';

function AppContent() {
  const { fontsLoaded, error } = useFonts();

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.cream }} />;
  }

  if (error) {
    console.warn('Font loading error:', error.message);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style="auto" />
    </View>
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
