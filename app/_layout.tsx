import React, { useEffect } from 'react';
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
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Muster - Find a game. Find your people.';
    }

    const initializeMonitoring = async () => {
      await crashReportingService.initialize();
      await performanceMonitoringService.initialize();
    };

    initializeMonitoring();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.grass} />
      </View>
    );
  }

  if (error) {
    console.warn('Font loading error:', error);
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        crashReportingService.reportError(error, errorInfo);
      }}
    >
      <ReduxProvider>
        <AuthProvider>
          <NotificationProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </NotificationProvider>
        </AuthProvider>
      </ReduxProvider>
    </ErrorBoundary>
  );
}
