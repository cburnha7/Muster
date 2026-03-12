import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, ActivityIndicator } from 'react-native';
import { ReduxProvider } from '../src/store/Provider';
import { AuthProvider } from '../src/services/auth';
import { NotificationProvider } from '../src/services/notifications';
import { RootNavigator } from '../src/navigation/RootNavigator';
import { ErrorBoundary } from '../src/components/error';
import { crashReportingService, performanceMonitoringService } from '../src/services/monitoring';
import { useFonts } from '../src/hooks/useFonts';
import { colors } from '../src/theme';

export default function RootLayout(): JSX.Element {
  const { fontsLoaded, error } = useFonts();

  useEffect(() => {
    // Set document title for web
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Muster - Find a game. Find your people.';
    }

    // Initialize monitoring services
    const initializeMonitoring = async () => {
      await crashReportingService.initialize();
      await performanceMonitoringService.initialize();
    };

    initializeMonitoring();
  }, []);

  // Show loading screen while fonts are loading
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.grass} />
      </View>
    );
  }

  // Log font loading error but continue (will fall back to system fonts)
  if (error) {
    console.warn('Font loading error:', error);
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Report errors to crash reporting service
        crashReportingService.reportError(error, errorInfo);
      }}
    >
      <ReduxProvider>
        <AuthProvider>
          <NotificationProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
            <StatusBar style="auto" />
          </NotificationProvider>
        </AuthProvider>
      </ReduxProvider>
    </ErrorBoundary>
  );
}