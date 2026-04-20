import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkState } from '../../services/network/NetworkService';
import { useTheme } from '../../theme';

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
  const { colors } = useTheme();
  const networkState = useNetworkState();

  if (networkState.isConnected) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.warningLight,
          borderLeftColor: colors.warning,
        },
        style,
      ]}
    >
      <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.warning }]}>
          {featureName} unavailable offline
        </Text>
        {message && (
          <Text style={[styles.message, { color: colors.warning }]}>
            {message}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderLeftWidth: 4,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 12,
    lineHeight: 18,
  },
});
