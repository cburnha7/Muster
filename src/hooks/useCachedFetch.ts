/**
 * useCachedFetch — Cache-first data fetching with background revalidation.
 *
 * Implements Stale-While-Revalidate:
 * 1. On mount: read from AsyncStorage → render immediately with cached data
 * 2. Fire network request in background (non-blocking)
 * 3. On response: update state + write back to cache
 * 4. On error with cache: keep showing cached data
 * 5. On error without cache: set error state
 *
 * `loading` is only true on the very first load with no cache (skeleton state).
 * Once cache exists, screens render instantly.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { readCache, writeCache } from '../utils/cache';

interface UseCachedFetchOptions {
  /** How long before cached data is considered stale (default: 5 minutes) */
  staleTtlMs?: number;
  /** Skip the fetch entirely (e.g., when userId is not yet available) */
  skip?: boolean;
}

interface UseCachedFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Whether the displayed data came from cache (may be stale) */
  isStale: boolean;
}

export function useCachedFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options?: UseCachedFetchOptions
): UseCachedFetchResult<T> {
  const { staleTtlMs = 5 * 60 * 1000, skip = false } = options ?? {};

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const revalidate = useCallback(async () => {
    if (fetchingRef.current || skip) return;
    fetchingRef.current = true;

    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
        setError(null);
        setIsStale(false);
        setLoading(false);
      }
      // Write to cache in background — don't await
      writeCache(cacheKey, result);
    } catch (err: any) {
      if (mountedRef.current) {
        // Only set error if we have no data to show
        if (!data) {
          setError(err?.message || 'Failed to load');
        }
        setLoading(false);
      }
    } finally {
      fetchingRef.current = false;
    }
  }, [cacheKey, fetcher, skip]);

  // Initial load: cache first, then revalidate
  useEffect(() => {
    if (skip) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const init = async () => {
      // Step 1: Try cache
      const cached = await readCache<T>(cacheKey);

      if (cached && !cancelled) {
        setData(cached.data);
        setLoading(false);

        // Check staleness
        const age = Date.now() - cached.cachedAt;
        setIsStale(age > staleTtlMs);
      }

      // Step 2: Revalidate from network (always, regardless of cache hit)
      if (!cancelled) {
        revalidate();
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, skip]);

  const refresh = useCallback(async () => {
    setError(null);
    await revalidate();
  }, [revalidate]);

  return { data, loading, error, refresh, isStale };
}
