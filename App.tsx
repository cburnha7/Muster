import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReduxProvider } from './src/store/Provider';
import { AuthProvider } from './src/context/AuthContext';
import { ErrorBoundary } from './src/components/error/ErrorBoundary';

function Inner() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Redux + Auth OK ({tick}s)</Text>
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ReduxProvider>
        <AuthProvider>
          <GestureHandlerRootView style={styles.container}>
            <Inner />
          </GestureHandlerRootView>
        </AuthProvider>
      </ReduxProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    color: '#000000',
  },
});
