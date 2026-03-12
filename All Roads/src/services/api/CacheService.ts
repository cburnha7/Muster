import * as SecureStore from 'expo-secure-store';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface CacheConfig {
  defaultTTL: number; // Default TTL in milliseconds
  maxSize: number; // Maximum number of entries
  keyPrefix: string; // Prefix for cache keys
}

export class CacheService {
  private config: CacheConfig;
  private memoryCache: Map<string, CacheEntry<any>>;

  constructor(config: CacheConfig) {
    this.config = config;
    this.memoryCache = new Map();
    
    // Clean up expired entries periodically
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Every minute
  }

  /**
   * Get data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    // Validate key before using
    if (!key || typeof key !== 'string' || key.trim() === '') {
      console.warn('Invalid cache key provided:', key);
      return null;
    }

    const cacheKey = this.getCacheKey(key);
    
    // Check memory cache only (skip persistent storage to avoid SecureStore issues)
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return memoryEntry.data;
    }

    return null;
  }

  /**
   * Set data in cache
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const cacheKey = this.getCacheKey(key);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
    };

    // Store in memory cache
    this.memoryCache.set(cacheKey, entry);

    // Skip persistent storage to avoid SecureStore issues
    // In production, consider using AsyncStorage instead of SecureStore for cache
    
    // Enforce max size limit
    if (this.memoryCache.size > this.config.maxSize) {
      await this.evictOldestEntries();
    }
  }

  /**
   * Remove data from cache
   */
  async remove(key: string): Promise<void> {
    const cacheKey = this.getCacheKey(key);
    
    // Remove from memory cache
    this.memoryCache.delete(cacheKey);

    // Remove from persistent storage
    try {
      await SecureStore.deleteItemAsync(cacheKey);
    } catch (error) {
      console.warn('Cache remove error:', error);
    }
  }

  /**
   * Clear all cache data
   */
  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Note: SecureStore doesn't have a way to get all keys, so we can't clear all cache entries
    // In a real implementation, you might want to use AsyncStorage or implement a key tracking system
    console.warn('Cache clear: Only memory cache cleared. Persistent cache entries may remain.');
  }

  /**
   * Check if cache entry exists and is valid
   */
  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memoryEntries: number;
    persistentEntries: number;
    totalSize: number;
  }> {
    // Note: With SecureStore, we can't easily get persistent cache stats
    // In a real implementation, you might want to track this separately
    return {
      memoryEntries: this.memoryCache.size,
      persistentEntries: 0, // Cannot determine with SecureStore
      totalSize: 0, // Cannot determine with SecureStore
    };
  }

  /**
   * Get cache key with prefix and sanitization
   * SecureStore requires keys to only contain alphanumeric characters, ".", "-", and "_"
   */
  private getCacheKey(key: string): string {
    // Sanitize the key to only include allowed characters
    const sanitizedKey = key
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid chars with underscore
      .substring(0, 200); // Limit length to avoid issues
    
    return `${this.config.keyPrefix}${sanitizedKey}`;
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Clean up expired entries from memory cache
   */
  private cleanupExpiredEntries(): void {
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
        // Skip persistent storage cleanup to avoid SecureStore issues
      }
    }
  }

  /**
   * Evict oldest entries when cache size limit is reached
   */
  private async evictOldestEntries(): Promise<void> {
    const entries = Array.from(this.memoryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const entriesToRemove = entries.slice(0, Math.floor(this.config.maxSize * 0.1)); // Remove 10%
    
    for (const [key] of entriesToRemove) {
      this.memoryCache.delete(key);
      // Skip persistent storage cleanup to avoid SecureStore issues
    }
  }
}

// Create and export default cache service instance
export const cacheService = new CacheService({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 100, // Maximum 100 entries in memory
  keyPrefix: 'sports_booking_cache_',
});