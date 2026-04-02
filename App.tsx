import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReduxProvider } from './src/store/Provider';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ErrorBoundary } from './src/components/error/ErrorBoundary';

function AuthTest() {
  const { user, isLoading } = useAuth();
  return (
    <View>
      <Text style={styles.status}>Auth loading: {String(isLoading)}</Text>
      <Text style={styles.status}>User: {user ? user.firstName : 'null'}</Text>
    </View>
  );
}

function Step2() {
  const [status, setStatus] = useState('Rendering AuthProvider...');

  return (
    <ErrorBoundary>
      <ReduxProvider>
        <AuthProvider>
          <GestureHandlerRootView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
              <Text style={styles.title}>iOS Debug Step 2</Text>
              <Text style={styles.status}>{status}</Text>
              <AuthTest />
            </ScrollView>
          </GestureHandlerRootView>
        </AuthProvider>
      </ReduxProvider>
    </ErrorBoundary>
  );
}

export default function App() {
  return <Step2 />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scroll: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  status: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 8 },
});
