// Minimal layout — uses Expo Router's Slot to render child routes.
// The actual app content is rendered by app/index.tsx.
import React from 'react';
import { Slot } from 'expo-router';
import { ReduxProvider } from '../src/store/Provider';
import { AuthProvider } from '../src/context/AuthContext';
import { NotificationProvider } from '../src/services/notifications';
import { ErrorBoundary } from '../src/components/error/ErrorBoundary';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ReduxProvider>
        <AuthProvider>
          <NotificationProvider>
            <Slot />
          </NotificationProvider>
        </AuthProvider>
      </ReduxProvider>
    </ErrorBoundary>
  );
}
