import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';

export function LoadingScreen(): JSX.Element {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.pine} />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cream,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: colors.inkFaint,
  },
});