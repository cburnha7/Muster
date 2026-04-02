import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReduxProvider } from './src/store/Provider';

export default function App() {
  return (
    <ReduxProvider>
      <GestureHandlerRootView style={styles.container}>
        <Text style={styles.text}>Redux OK</Text>
      </GestureHandlerRootView>
    </ReduxProvider>
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
