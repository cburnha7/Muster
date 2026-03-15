import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ReduxProvider } from './src/store/Provider';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/services/notifications';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/error';
import { crashReportingService, performanceMonitoringService } from './src/services/monitoring';
import { loggingService } from './src/services/LoggingService';

export default function App(): JSX.Element {
  useEffect(() => {
    // Initialize monitoring services
    const initializeMonitoring = async () => {
      await crashReportingService.initialize();
      await performanceMonitoringService.initialize();
      loggingService.initialize();
    };

    initializeMonitoring();
    return () => loggingService.destroy();
  }, []);

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