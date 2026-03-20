import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App(): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Muster</Text>
      <Text style={styles.subtitle}>App is loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEEBE3',
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#2D5F3F',
  },
  subtitle: {
    fontSize: 18,
    color: '#1B2A4A',
    marginTop: 12,
  },
});
