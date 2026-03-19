import { CacheService } from '../../../src/services/api/CacheService';
import * as SecureStore from 'expo-secure-store';

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockGetItemAsync: jest.Mock;
  let mockSetItemAsync: jest.Mock;
  let mockDeleteItemAsync: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Get mock functions
    mockGetItemAsync = SecureStore.getItemAsync as jest.Mock;
    mockSetItemAsync = SecureStore.setItemAsync as jest.Mock;
    mockDeleteItemAsync = SecureStore.deleteItemAsync as jest.Mock;

    // Create cache service instance
    cacheService = new CacheService({
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 10,
      keyPrefix: 'test_cache_',
    });
  });

  describe('set and get', () => {
    it('should store and retrieve data from memory cache', async () => {
      const testData = { id: 1, name: 'Test' };
      
      await cacheService.set('test-key', testData);
      const result = await cacheService.get('test-key');

      expect(result).toEqual(testData);
      expect(mockSetItemAsync).toHaveBeenCalledWith(
        'test_cache_test-key',
        expect.stringContaining('"data":{"id":1,"name":"Test"}')
      );
    });

    it('should return null for non-existent keys', async () => {
      mockGetItemAsync.mockResolvedValue(null);

      const result = await cacheService.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should use custom TTL when provided', async () => {
      const testData = { id: 1, name: 'Test' };
      const customTTL = 10 * 60 * 1000; // 10 minutes

      await cacheService.set('test-key', testData, customTTL);

      expect(mockSetItemAsync).toHaveBeenCalledWith(
        'test_cache_test-key',
        expect.stringContaining(`"ttl":${customTTL}`)
      );
    });
  });

  describe('expiration', () => {
    it('should return null for expired entries', async () => {
      const expiredEntry = {
        data: { id: 1, name: 'Test' },
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
        ttl: 5 * 60 * 1000, // 5 minutes TTL
      };

      mockGetItemAsync.mockResolvedValue(JSON.stringify(expiredEntry));

      const result = await cacheService.get('expired-key');

      expect(result).toBeNull();
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('test_cache_expired-key');
    });

    it('should return data for non-expired entries', async () => {
      const validEntry = {
        data: { id: 1, name: 'Test' },
        timestamp: Date.now() - 2 * 60 * 1000, // 2 minutes ago
        ttl: 5 * 60 * 1000, // 5 minutes TTL
      };

      mockGetItemAsync.mockResolvedValue(JSON.stringify(validEntry));

      const result = await cacheService.get('valid-key');

      expect(result).toEqual({ id: 1, name: 'Test' });
    });
  });

  describe('remove', () => {
    it('should remove data from cache', async () => {
      const testData = { id: 1, name: 'Test' };
      
      await cacheService.set('test-key', testData);
      await cacheService.remove('test-key');

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('test_cache_test-key');
    });
  });

  describe('has', () => {
    it('should return true for existing valid entries', async () => {
      const testData = { id: 1, name: 'Test' };
      
      await cacheService.set('test-key', testData);
      const exists = await cacheService.has('test-key');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent entries', async () => {
      mockGetItemAsync.mockResolvedValue(null);

      const exists = await cacheService.has('non-existent-key');

      expect(exists).toBe(false);
    });

    it('should return false for expired entries', async () => {
      const expiredEntry = {
        data: { id: 1, name: 'Test' },
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
        ttl: 5 * 60 * 1000, // 5 minutes TTL
      };

      mockGetItemAsync.mockResolvedValue(JSON.stringify(expiredEntry));

      const exists = await cacheService.has('expired-key');

      expect(exists).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear memory cache', async () => {
      const testData = { id: 1, name: 'Test' };
      
      await cacheService.set('test-key', testData);
      await cacheService.clear();

      // Should not find the data in memory cache
      mockGetItemAsync.mockResolvedValue(null);
      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const testData1 = { id: 1, name: 'Test1' };
      const testData2 = { id: 2, name: 'Test2' };
      
      await cacheService.set('test-key-1', testData1);
      await cacheService.set('test-key-2', testData2);

      const stats = await cacheService.getStats();

      expect(stats.memoryEntries).toBe(2);
      expect(stats.persistentEntries).toBe(0); // Cannot determine with SecureStore
      expect(stats.totalSize).toBe(0); // Cannot determine with SecureStore
    });
  });

  describe('error handling', () => {
    it('should handle SecureStore errors gracefully on get', async () => {
      mockGetItemAsync.mockRejectedValue(new Error('SecureStore error'));

      const result = await cacheService.get('error-key');

      expect(result).toBeNull();
    });

    it('should handle SecureStore errors gracefully on set', async () => {
      mockSetItemAsync.mockRejectedValue(new Error('SecureStore error'));

      // Should not throw an error
      await expect(cacheService.set('error-key', { test: 'data' })).resolves.toBeUndefined();
    });

    it('should handle SecureStore errors gracefully on remove', async () => {
      mockDeleteItemAsync.mockRejectedValue(new Error('SecureStore error'));

      // Should not throw an error
      await expect(cacheService.remove('error-key')).resolves.toBeUndefined();
    });
  });

  describe('memory cache size limit', () => {
    it('should evict oldest entries when max size is reached', async () => {
      // Create a cache service with small max size
      const smallCacheService = new CacheService({
        defaultTTL: 5 * 60 * 1000,
        maxSize: 2,
        keyPrefix: 'small_cache_',
      });

      // Add entries up to the limit
      await smallCacheService.set('key1', { id: 1 });
      await smallCacheService.set('key2', { id: 2 });
      
      // This should trigger eviction
      await smallCacheService.set('key3', { id: 3 });

      // The oldest entry (key1) should be evicted
      const result1 = await smallCacheService.get('key1');
      const result2 = await smallCacheService.get('key2');
      const result3 = await smallCacheService.get('key3');

      expect(result1).toBeNull(); // Should be evicted
      expect(result2).toEqual({ id: 2 }); // Should still exist
      expect(result3).toEqual({ id: 3 }); // Should exist
    });
  });
});