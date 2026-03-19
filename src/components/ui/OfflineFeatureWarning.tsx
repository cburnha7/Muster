import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkState } from '../../services/network/NetworkService';

interface OfflineFeatureWarningProps {
  featureName: string;
  message?: string;
  style?: any;
}

export const OfflineFeatureWarning: React.FC<OfflineFeatureWarningProps> = ({
  featureName,
  message,
  style,
}) => {
  const networkState = useNetworkState();

  if (networkState.isConnected) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="alert-circle-outline" size={20} color="#FF9500" />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{featureName} unavailable offline</Text>
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  message: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
  },
});
