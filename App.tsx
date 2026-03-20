import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ReduxProvider } from './src/store/Provider';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/services/notifications';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/error';
import { crashReportingService, performanceMonitoringService } from './src/services/monitoring';
import { loggingService } from './src/services/LoggingService';
import { useFonts } from './src/hooks/useFonts';
import { colors } from './src/theme';

export default function App(): JSX.Element {
  const { fontsLoaded, error } = useFonts();

  useEffect(() => {
    const initializeMonitoring = async () => {
      await crashReportingService.initialize();
      await performanceMonitoringService.initialize();
      loggingService.initialize();
    };

    initializeMonitoring();
    return () => loggingService.destroy();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cream }}>
        <ActivityIndicator size="large" color={colors.pine} />
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
