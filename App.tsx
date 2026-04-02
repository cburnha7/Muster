import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReduxProvider } from './src/store/Provider';

export default function App() {
  const [status, setStatus] = useState('Loading...');
  const [error, setError] = useState('');

  useEffect(() => {
    async function test() {
      try {
        setStatus('Testing AuthProvider import...');
        const { AuthProvider } = require('./src/context/AuthContext');
        setStatus('AuthProvider imported OK. Testing AuthService...');

        const { authService } = require('./src/services/auth/AuthService');
        setStatus('AuthService imported. Testing initialize...');

        await authService.initialize();
        setStatus('AuthService initialized OK!');
      } catch (e: any) {
        setError(e?.message || String(e));
        setStatus('FAILED');
      }
    }
    test();
  }, []);

  return (
    <ReduxProvider>
      <GestureHandlerRootView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>iOS Debug</Text>
          <Text style={styles.status}>{status}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      </GestureHandlerRootView>
    </ReduxProvider>
  );
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
  status: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  error: { fontSize: 14, color: '#C0392B', textAlign: 'center', marginTop: 12 },
});
