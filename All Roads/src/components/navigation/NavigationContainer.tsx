import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer as RNNavigationContainer } from '@react-navigation/native';
import { OfflineIndicator } from './OfflineIndicator';

interface NavigationContainerProps {
  children: React.ReactNode;
  isOffline?: boolean;
}

export const NavigationContainer: React.FC<NavigationContainerProps> = ({
  children,
  isOffline = false,
}) => {
  return (
    <RNNavigationContainer>
      <View style={styles.container}>
        <OfflineIndicator isOffline={isOffline} />
        {children}
      </View>
    </RNNavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});