import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { syncManager } from '../../services/offline';
import { useNetworkState } from '../../services/network/NetworkService';

export const SyncStatusCard: React.FC = () => {
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
    if (!networkState.isConnected) return '#FF3B30';
    if (syncStatus.isSyncing) return '#FF9500';
    if (syncStatus.queueSize > 0) return '#FF9500';
    return '#34C759';
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
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
        <Ionicons name={getStatusIcon()} size={24} color={getStatusColor()} />
      </View>

      {lastSyncTime && (
        <Text style={styles.lastSyncText}>
          Last synced: {lastSyncTime.toLocaleTimeString()}
        </Text>
      )}

      {syncStatus.queueSize > 0 && (
        <Text style={styles.queueText}>
          {syncStatus.queueSize} {syncStatus.queueSize === 1 ? 'action' : 'actions'} waiting to sync
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.syncButton,
          (!networkState.isConnected || syncStatus.isSyncing) && styles.syncButtonDisabled,
        ]}
        onPress={handleManualSync}
        disabled={!networkState.isConnected || syncStatus.isSyncing}
      >
        {syncStatus.isSyncing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="sync-outline" size={18} color="#FFFFFF" />
            <Text style={styles.syncButtonText}>Sync Now</Text>
          </>
        )}
      </TouchableOpacity>

      {!networkState.isConnected && (
        <Text style={styles.offlineNote}>
          Connect to the internet to sync your data
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
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
    color: '#1C1C1E',
  },
  lastSyncText: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 8,
  },
  queueText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  syncButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  offlineNote: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
