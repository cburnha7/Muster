// Entry screen for Expo Router — renders the full app navigation.
import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from '../src/hooks/useFonts';
import { RootNavigator } from '../src/navigation/RootNavigator';
import { colors } from '../src/theme';

export default function Index() {
  const { fontsLoaded, error } = useFonts();

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.cream }} />;
  }

  if (error) {
    console.warn('Font loading error:', error.message);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <RootNavigator />
      <StatusBar style="auto" />
    </View>
  );
}
