import AsyncStorage from '@react-native-async-storage/async-storage';
import { networkService } from '../network/NetworkService';

export interface CacheMetadata {
  key: string;
  timestamp: number;
  size: number;
  priority: 'high' | 'medium' | 'low';
  expiresAt?: number;
}

export interface CacheConfig {
  maxAge?: number; // milliseconds
  priority?: 'high' | 'medium' | 'low';
}

class OfflineService {
  private static readonly CACHE_METADATA_KEY = '@cache_metadata';
  private static readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly DEFAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Cache data with metadata for management
   */
  async cacheData<T>(
    key: string,
    data: T,
    config: CacheConfig = {}
  ): Promise<void> {
    try {
      const serializedData = JSON.stringify(data);
      const size = new Blob([serializedData]).size;
      
      const metadata: CacheMetadata = {
        key,
        timestamp: Date.now(),
        size,
        priority: config.priority || 'medium',
        expiresAt: config.maxAge ? Date.now() + config.maxAge : undefined,
      };

      // Store data
      await AsyncStorage.setItem(key, serializedData);
      
      // Update metadata
      await this.updateCacheMetadata(metadata);
      
      // Check if cleanup is needed
      await this.cleanupIfNeeded();
    } catch (error) {
      console.error('Error caching data:', error);
      throw error;
    }
  }

  /**
   * Retrieve cached data
   */
  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const metadata = await this.getCacheMetadata(key);
      
      // Check if cache is expired
      if (metadata?.expiresAt && Date.now() > metadata.expiresAt) {
        await this.invalidateCache(key);
        return null;
      }

      const serializedData = await AsyncStorage.getItem(key);
      if (!serializedData) {
        return null;
      }

      return JSON.parse(serializedData) as T;
    } catch (error) {
      console.error('Error retrieving cached data:', error);
      return null;
    }
  }

  /**
   * Invalidate specific cache entry
   */
  async invalidateCache(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      await this.removeCacheMetadata(key);
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  async invalidateCachePattern(pattern: RegExp): Promise<void> {
    try {
      const allMetadata = await this.getAllCacheMetadata();
      const keysToInvalidate = allMetadata
        .filter(meta => pattern.test(meta.key))
        .map(meta => meta.key);

      await Promise.all(
        keysToInvalidate.map(key => this.invalidateCache(key))
      );
    } catch (error) {
      console.error('Error invalidating cache pattern:', error);
    }
  }

  /**
   * Clear all cached data
   */
  async clearAllCache(): Promise<void> {
    try {
      const allMetadata = await this.getAllCacheMetadata();
      await Promise.all([
        ...allMetadata.map(meta => AsyncStorage.removeItem(meta.key)),
        AsyncStorage.removeItem(OfflineService.CACHE_METADATA_KEY),
      ]);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalSize: number;
    itemCount: number;
    oldestItem: number;
    newestItem: number;
  }> {
    const allMetadata = await this.getAllCacheMetadata();
    
    if (allMetadata.length === 0) {
      return {
        totalSize: 0,
        itemCount: 0,
        oldestItem: 0,
        newestItem: 0,
      };
    }

    const totalSize = allMetadata.reduce((sum, meta) => sum + meta.size, 0);
    const timestamps = allMetadata.map(meta => meta.timestamp);

    return {
      totalSize,
      itemCount: allMetadata.length,
      oldestItem: Math.min(...timestamps),
      newestItem: Math.max(...timestamps),
    };
  }

  /**
   * Check if network is available
   */
  isOnline(): boolean {
    return networkService.getCurrentState().isConnected;
  }

  /**
   * Private: Update cache metadata
   */
  private async updateCacheMetadata(metadata: CacheMetadata): Promise<void> {
    const allMetadata = await this.getAllCacheMetadata();
    const existingIndex = allMetadata.findIndex(m => m.key === metadata.key);

    if (existingIndex >= 0) {
      allMetadata[existingIndex] = metadata;
    } else {
      allMetadata.push(metadata);
    }

    await AsyncStorage.setItem(
      OfflineService.CACHE_METADATA_KEY,
      JSON.stringify(allMetadata)
    );
  }

  /**
   * Private: Get metadata for specific cache entry
   */
  private async getCacheMetadata(key: string): Promise<CacheMetadata | null> {
    const allMetadata = await this.getAllCacheMetadata();
    return allMetadata.find(m => m.key === key) || null;
  }

  /**
   * Private: Remove cache metadata
   */
  private async removeCacheMetadata(key: string): Promise<void> {
    const allMetadata = await this.getAllCacheMetadata();
    const filtered = allMetadata.filter(m => m.key !== key);
    
    await AsyncStorage.setItem(
      OfflineService.CACHE_METADATA_KEY,
      JSON.stringify(filtered)
    );
  }

  /**
   * Private: Get all cache metadata
   */
  private async getAllCacheMetadata(): Promise<CacheMetadata[]> {
    try {
      const serialized = await AsyncStorage.getItem(
        OfflineService.CACHE_METADATA_KEY
      );
      return serialized ? JSON.parse(serialized) : [];
    } catch (error) {
      console.error('Error getting cache metadata:', error);
      return [];
    }
  }

  /**
   * Private: Cleanup cache if needed
   */
  private async cleanupIfNeeded(): Promise<void> {
    const stats = await this.getCacheStats();
    
    if (stats.totalSize > OfflineService.MAX_CACHE_SIZE) {
      await this.performCleanup();
    }
  }

  /**
   * Private: Perform cache cleanup
   */
  private async performCleanup(): Promise<void> {
    const allMetadata = await this.getAllCacheMetadata();
    
    // Sort by priority (low first) and age (oldest first)
    const sorted = allMetadata.sort((a, b) => {
      const priorityOrder = { low: 0, medium: 1, high: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      
      return a.timestamp - b.timestamp;
    });

    // Remove items until we're under the limit
    let currentSize = sorted.reduce((sum, meta) => sum + meta.size, 0);
    const targetSize = OfflineService.MAX_CACHE_SIZE * 0.8; // Clean to 80% capacity

    for (const meta of sorted) {
      if (currentSize <= targetSize) {
        break;
      }

      await this.invalidateCache(meta.key);
      currentSize -= meta.size;
    }
  }
}

// Export singleton instance
export const offlineService = new OfflineService();
