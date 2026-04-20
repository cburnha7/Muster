import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { syncManager } from '../../services/offline';
import { useNetworkState } from '../../services/network/NetworkService';
import { useTheme } from '../../theme';

export const SyncStatusCard: React.FC = () => {
  const { colors } = useTheme();
  const networkState = useNetworkState();
  const [syncStatus, setSyncStatus] = useState({
    isOnline: false,
    isSyncing: false,
    queueSize: 0,
    autoSyncEnabled: true,
  });
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    const updateStatus = async () => {
      const status = await syncManager.getSyncStatus();
      setSyncStatus(status);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (!networkState.isConnected || syncStatus.isSyncing) return;

    try {
      await syncManager.sync();
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const getStatusColor = () => {
    if (!networkState.isConnected) return colors.error;
    if (syncStatus.isSyncing) return colors.warning;
    if (syncStatus.queueSize > 0) return colors.warning;
    return colors.success;
  };

  const getStatusText = () => {
    if (!networkState.isConnected) return 'Offline';
    if (syncStatus.isSyncing) return 'Syncing...';
    if (syncStatus.queueSize > 0) return `${syncStatus.queueSize} pending`;
    return 'All synced';
  };

  const getStatusIcon = () => {
    if (!networkState.isConnected) return 'cloud-offline-outline';
    if (syncStatus.isSyncing) return 'sync-outline';
    if (syncStatus.queueSize > 0) return 'cloud-upload-outline';
    return 'cloud-done-outline';
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.white, shadowColor: colors.black },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <View
            style={[styles.statusDot, { backgroundColor: getStatusColor() }]}
          />
          <Text style={[styles.statusText, { color: colors.ink }]}>
            {getStatusText()}
          </Text>
        </View>
        <Ionicons name={getStatusIcon()} size={24} color={getStatusColor()} />
      </View>

      {lastSyncTime && (
        <Text style={[styles.lastSyncText, { color: colors.inkMuted }]}>
          Last synced: {lastSyncTime.toLocaleTimeString()}
        </Text>
      )}

      {syncStatus.queueSize > 0 && (
        <Text style={[styles.queueText, { color: colors.inkMuted }]}>
          {syncStatus.queueSize}{' '}
          {syncStatus.queueSize === 1 ? 'action' : 'actions'} waiting to sync
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.syncButton,
          { backgroundColor: colors.cobalt },
          (!networkState.isConnected || syncStatus.isSyncing) && {
            backgroundColor: colors.inkMuted,
          },
        ]}
        onPress={handleManualSync}
        disabled={!networkState.isConnected || syncStatus.isSyncing}
      >
        {syncStatus.isSyncing ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <>
            <Ionicons name="sync-outline" size={18} color={colors.white} />
            <Text style={[styles.syncButtonText, { color: colors.white }]}>
              Sync Now
            </Text>
          </>
        )}
      </TouchableOpacity>

      {!networkState.isConnected && (
        <Text style={[styles.offlineNote, { color: colors.inkMuted }]}>
          Connect to the internet to sync your data
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  lastSyncText: {
    fontSize: 12,
    marginBottom: 8,
  },
  queueText: {
    fontSize: 14,
    marginBottom: 12,
  },
  syncButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  offlineNote: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
