/**
 * Cache utilities for SWR (Stale-While-Revalidate) pattern.
 *
 * All cache keys are prefixed with `muster_cache_` for easy bulk clearing.
 * Data is stored in AsyncStorage as JSON with a `cachedAt` timestamp.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'muster_cache_';

export interface CachedEntry<T> {
  data: T;
  cachedAt: number; // Date.now() when cached
}

/**
 * Read a cached value. Returns null on miss or parse error.
 */
export async function readCache<T>(
  key: string
): Promise<CachedEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry<T>;
    if (!parsed || typeof parsed.cachedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Write a value to cache.
 */
export async function writeCache<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CachedEntry<T> = { data, cachedAt: Date.now() };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Silently fail — cache write should never block the app
  }
}

/**
 * Clear a specific cache key.
 */
export async function clearCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_PREFIX + key);
  } catch {
    // Best effort
  }
}

/**
 * Clear ALL muster cache keys. Called on logout.
 */
export async function clearAllCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(k => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {
    // Best effort
  }
}
