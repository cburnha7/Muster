import AsyncStorage from '@react-native-async-storage/async-storage';
import { networkService } from '../network/NetworkService';

export interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

export interface SyncResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ actionId: string; error: string }>;
}

class OfflineQueueService {
  private static readonly QUEUE_KEY = '@offline_queue';
  private static readonly MAX_RETRIES = 3;
  private isSyncing = false;
  private syncListeners: Array<(result: SyncResult) => void> = [];

  /**
   * Queue an action for later execution when online
   */
  async queueAction(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    try {
      const queuedAction: QueuedAction = {
        ...action,
        id: this.generateId(),
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: action.maxRetries || OfflineQueueService.MAX_RETRIES,
      };

      const queue = await this.getQueue();
      queue.push(queuedAction);
      await this.saveQueue(queue);

      return queuedAction.id;
    } catch (error) {
      console.error('Error queuing action:', error);
      throw error;
    }
  }

  /**
   * Get all queued actions
   */
  async getQueue(): Promise<QueuedAction[]> {
    try {
      const serialized = await AsyncStorage.getItem(OfflineQueueService.QUEUE_KEY);
      return serialized ? JSON.parse(serialized) : [];
    } catch (error) {
      console.error('Error getting queue:', error);
      return [];
    }
  }

  /**
   * Get queue size
   */
  async getQueueSize(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  /**
   * Clear the entire queue
   */
  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(OfflineQueueService.QUEUE_KEY);
    } catch (error) {
      console.error('Error clearing queue:', error);
    }
  }

  /**
   * Remove specific action from queue
   */
  async removeAction(actionId: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const filtered = queue.filter(action => action.id !== actionId);
      await this.saveQueue(filtered);
    } catch (error) {
      console.error('Error removing action:', error);
    }
  }

  /**
   * Sync all queued actions
   */
  async syncQueue(executeAction: (action: QueuedAction) => Promise<void>): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        processedCount: 0,
        failedCount: 0,
        errors: [{ actionId: 'sync', error: 'Sync already in progress' }],
      };
    }

    if (!networkService.getCurrentState().isConnected) {
      return {
        success: false,
        processedCount: 0,
        failedCount: 0,
        errors: [{ actionId: 'sync', error: 'No network connection' }],
      };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      processedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      const queue = await this.getQueue();
      const sortedQueue = queue.sort((a, b) => a.timestamp - b.timestamp);

      for (const action of sortedQueue) {
        try {
          await executeAction(action);
          await this.removeAction(action.id);
          result.processedCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Increment retry count
          action.retryCount++;

          if (action.retryCount >= action.maxRetries) {
            // Max retries reached, remove from queue
            await this.removeAction(action.id);
            result.failedCount++;
            result.errors.push({
              actionId: action.id,
              error: `Max retries reached: ${errorMessage}`,
            });
          } else {
            // Update action with new retry count
            await this.updateAction(action);
            result.errors.push({
              actionId: action.id,
              error: `Retry ${action.retryCount}/${action.maxRetries}: ${errorMessage}`,
            });
          }
        }
      }

      result.success = result.failedCount === 0;
    } catch (error) {
      console.error('Error syncing queue:', error);
      result.success = false;
      result.errors.push({
        actionId: 'sync',
        error: error instanceof Error ? error.message : 'Unknown sync error',
      });
    } finally {
      this.isSyncing = false;
      this.notifySyncListeners(result);
    }

    return result;
  }

  /**
   * Subscribe to sync events
   */
  onSync(listener: (result: SyncResult) => void): () => void {
    this.syncListeners.push(listener);
    
    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  /**
   * Check if sync is in progress
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Private: Save queue to storage
   */
  private async saveQueue(queue: QueuedAction[]): Promise<void> {
    await AsyncStorage.setItem(
      OfflineQueueService.QUEUE_KEY,
      JSON.stringify(queue)
    );
  }

  /**
   * Private: Update action in queue
   */
  private async updateAction(updatedAction: QueuedAction): Promise<void> {
    const queue = await this.getQueue();
    const index = queue.findIndex(action => action.id === updatedAction.id);
    
    if (index >= 0) {
      queue[index] = updatedAction;
      await this.saveQueue(queue);
    }
  }

  /**
   * Private: Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Private: Notify sync listeners
   */
  private notifySyncListeners(result: SyncResult): void {
    this.syncListeners.forEach(listener => listener(result));
  }
}

// Export singleton instance
export const offlineQueueService = new OfflineQueueService();
