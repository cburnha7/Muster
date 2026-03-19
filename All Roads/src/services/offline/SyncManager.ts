import { offlineQueueService, QueuedAction, SyncResult } from './OfflineQueueService';
import { networkService } from '../network/NetworkService';
import { store } from '../../store/store';

export interface ConflictResolution {
  strategy: 'server-wins' | 'client-wins' | 'merge' | 'manual';
  resolvedData?: any;
}

export interface SyncConflict {
  actionId: string;
  localData: any;
  serverData: any;
  timestamp: number;
}

class SyncManager {
  private autoSyncEnabled = true;
  private syncInterval: NodeJS.Timeout | null = null;
  private conflictHandlers: Map<string, (conflict: SyncConflict) => Promise<ConflictResolution>> = new Map();

  constructor() {
    this.setupAutoSync();
    this.setupNetworkListener();
  }

  /**
   * Start automatic synchronization
   */
  startAutoSync(intervalMs: number = 30000): void {
    this.autoSyncEnabled = true;
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (networkService.getCurrentState().isConnected) {
        this.sync();
      }
    }, intervalMs);
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync(): void {
    this.autoSyncEnabled = false;
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Manually trigger synchronization
   */
  async sync(): Promise<SyncResult> {
    if (!networkService.getCurrentState().isConnected) {
      return {
        success: false,
        processedCount: 0,
        failedCount: 0,
        errors: [{ actionId: 'sync', error: 'No network connection' }],
      };
    }

    return await offlineQueueService.syncQueue(async (action) => {
      await this.executeQueuedAction(action);
    });
  }

  /**
   * Register a conflict handler for specific action types
   */
  registerConflictHandler(
    actionType: string,
    handler: (conflict: SyncConflict) => Promise<ConflictResolution>
  ): void {
    this.conflictHandlers.set(actionType, handler);
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    isSyncing: boolean;
    queueSize: number;
    autoSyncEnabled: boolean;
  }> {
    return {
      isOnline: networkService.getCurrentState().isConnected,
      isSyncing: offlineQueueService.isSyncInProgress(),
      queueSize: await offlineQueueService.getQueueSize(),
      autoSyncEnabled: this.autoSyncEnabled,
    };
  }

  /**
   * Private: Execute a queued action
   */
  private async executeQueuedAction(action: QueuedAction): Promise<void> {
    try {
      // Get the appropriate API service based on action type
      const response = await this.makeApiRequest(action);

      // Check for conflicts
      if (this.hasConflict(action, response)) {
        await this.handleConflict(action, response);
      }
    } catch (error) {
      console.error('Error executing queued action:', error);
      throw error;
    }
  }

  /**
   * Private: Make API request for queued action
   */
  private async makeApiRequest(action: QueuedAction): Promise<any> {
    const { method, endpoint, payload } = action;
    
    // This is a simplified version - in production, you'd use your actual API service
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    const url = `${baseUrl}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (method !== 'GET' && payload) {
      options.body = JSON.stringify(payload);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Private: Check if there's a conflict
   */
  private hasConflict(action: QueuedAction, serverResponse: any): boolean {
    // Simple conflict detection based on timestamps
    if (serverResponse.updatedAt && action.payload.updatedAt) {
      const serverTime = new Date(serverResponse.updatedAt).getTime();
      const localTime = new Date(action.payload.updatedAt).getTime();
      
      // Conflict if server data is newer than local data
      return serverTime > localTime;
    }

    return false;
  }

  /**
   * Private: Handle sync conflict
   */
  private async handleConflict(action: QueuedAction, serverData: any): Promise<void> {
    const conflict: SyncConflict = {
      actionId: action.id,
      localData: action.payload,
      serverData,
      timestamp: Date.now(),
    };

    // Check if there's a registered handler for this action type
    const handler = this.conflictHandlers.get(action.type);

    if (handler) {
      const resolution = await handler(conflict);
      await this.applyConflictResolution(action, resolution);
    } else {
      // Default strategy: server wins for shared resources
      await this.applyDefaultResolution(action, serverData);
    }
  }

  /**
   * Private: Apply conflict resolution
   */
  private async applyConflictResolution(
    action: QueuedAction,
    resolution: ConflictResolution
  ): Promise<void> {
    switch (resolution.strategy) {
      case 'server-wins':
        // Server data takes precedence, discard local changes
        console.log('Conflict resolved: server wins');
        break;

      case 'client-wins':
        // Retry the action to overwrite server data
        await this.makeApiRequest(action);
        break;

      case 'merge':
        // Merge local and server data
        if (resolution.resolvedData) {
          const mergedAction = { ...action, payload: resolution.resolvedData };
          await this.makeApiRequest(mergedAction);
        }
        break;

      case 'manual':
        // Manual resolution required - store conflict for user review
        console.log('Manual conflict resolution required');
        break;
    }
  }

  /**
   * Private: Apply default conflict resolution
   */
  private async applyDefaultResolution(action: QueuedAction, serverData: any): Promise<void> {
    // Default: server wins for shared resources, client wins for personal data
    const isPersonalData = this.isPersonalData(action.type);

    if (isPersonalData) {
      // Retry action to preserve user's changes
      await this.makeApiRequest(action);
    } else {
      // Accept server data
      console.log('Conflict resolved: accepting server data');
    }
  }

  /**
   * Private: Check if action involves personal data
   */
  private isPersonalData(actionType: string): boolean {
    const personalDataTypes = [
      'UPDATE_PROFILE',
      'UPDATE_PREFERENCES',
      'UPDATE_NOTIFICATION_SETTINGS',
    ];

    return personalDataTypes.includes(actionType);
  }

  /**
   * Private: Setup automatic sync on network reconnection
   */
  private setupNetworkListener(): void {
    networkService.subscribe((state) => {
      if (state.isConnected && this.autoSyncEnabled) {
        // Delay sync slightly to ensure connection is stable
        setTimeout(() => {
          this.sync();
        }, 2000);
      }
    });
  }

  /**
   * Private: Setup auto sync
   */
  private setupAutoSync(): void {
    this.startAutoSync();
  }
}

// Export singleton instance
export const syncManager = new SyncManager();
