/**
 * BaseApiService — fetch-based HTTP client.
 *
 * Provides authenticated GET / POST / PUT / PATCH / DELETE / uploadFile
 * methods with:
 *   - JWT Bearer token attachment (from TokenStorage)
 *   - 401 → token refresh → retry (via shared tokenRefreshLock)
 *   - Retry with exponential backoff for 408 and 5xx
 *   - Optional in-memory caching for GET requests
 *
 * All 16 service classes extend this. The protected method signatures
 * are the public contract — do NOT change them without updating every
 * subclass.
 */

import { Platform, Alert } from 'react-native';
import TokenStorage from '../auth/TokenStorage';
import { acquireRefresh, performTokenRefresh } from '../auth/tokenRefreshLock';
import { cacheService, CacheService } from './CacheService';
import { ApiError } from '../../types';
import { store } from '../../store/store';
import { setTokens, clearAuth } from '../../store/slices/authSlice';

export interface ApiServiceConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
  enableCaching: boolean;
}

export interface RetryConfig {
  attempts: number;
  delay: number;
  backoffFactor: number;
}

export interface CacheOptions {
  ttl?: number;
  key?: string;
  skipCache?: boolean;
}

/** Request configuration options for service methods */
export interface RequestConfig {
  params?: Record<string, any>;
  headers?: Record<string, string>;
  data?: any;
  cacheOptions?: CacheOptions;
  [key: string]: any;
}

export class BaseApiService {
  /** @deprecated — kept for backward compat. Use the protected methods. */
  protected client: any;
  private config: ApiServiceConfig;
  private retryConfig: RetryConfig;
  private cache: CacheService;

  constructor(config: ApiServiceConfig) {
    this.config = config;
    this.cache = cacheService;
    this.retryConfig = {
      attempts: config.retryAttempts,
      delay: config.retryDelay,
      backoffFactor: 2,
    };
    // Stub so subclasses that accidentally reference this.client don't crash
    this.client = {
      defaults: { baseURL: config.baseURL, timeout: config.timeout },
    };
  }

  // ── Internal fetch wrapper ─────────────────────────────────────

  private async request<T>(
    method: string,
    url: string,
    body?: any,
    extraHeaders?: Record<string, string>,
    retryCount = 0
  ): Promise<T> {
    const fullUrl = url.startsWith('http')
      ? url
      : `${this.config.baseURL}${url.startsWith('/') ? '' : '/'}${url}`;

    const token =
      store.getState()?.auth?.accessToken ??
      (await TokenStorage.getAccessToken());
    const headers: Record<string, string> = {
      ...(body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    let response: Response;
    try {
      response = await fetch(fullUrl, {
        method,
        headers,
        body:
          body instanceof FormData
            ? body
            : body != null
              ? JSON.stringify(body)
              : undefined,
        signal: controller.signal,
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      // Network error or abort — retry if allowed
      if (retryCount < this.retryConfig.attempts) {
        const delay =
          this.retryConfig.delay *
          Math.pow(this.retryConfig.backoffFactor, retryCount);
        await this.sleep(delay);
        return this.request<T>(method, url, body, extraHeaders, retryCount + 1);
      }
      throw this.buildError(0, err.message || 'Network error', fullUrl);
    } finally {
      clearTimeout(timeoutId);
    }

    // ── 401 → refresh token → retry once ──
    if (response.status === 401 && retryCount === 0) {
      const refreshToken = await TokenStorage.getRefreshToken();
      if (refreshToken) {
        try {
          await acquireRefresh(() => performTokenRefresh(refreshToken));
          // Sync new tokens into Redux so RTK Query picks them up
          const newAccess = await TokenStorage.getAccessToken();
          const newRefresh = await TokenStorage.getRefreshToken();
          if (newAccess && newRefresh) {
            store.dispatch(
              setTokens({ accessToken: newAccess, refreshToken: newRefresh })
            );
          }
          return this.request<T>(method, url, body, extraHeaders, 1);
        } catch {
          // Refresh failed — clear session and signal the app
          await TokenStorage.clearAll();
          store.dispatch(clearAuth());
          if (Platform.OS !== 'web') {
            Alert.alert(
              'Session Expired',
              'Please sign in again to continue.',
              [{ text: 'OK' }]
            );
          } else if (typeof window?.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('auth:sessionExpired'));
          }
          // fall through to throw the 401 error
        }
      }
    }

    // ── Retry on 408 / 5xx ──
    if (
      (response.status === 408 || response.status >= 500) &&
      retryCount < this.retryConfig.attempts
    ) {
      const delay =
        this.retryConfig.delay *
        Math.pow(this.retryConfig.backoffFactor, retryCount);
      await this.sleep(delay);
      return this.request<T>(method, url, body, extraHeaders, retryCount + 1);
    }

    // ── Parse response ──
    if (!response.ok) {
      let errorBody: any = {};
      try {
        errorBody = await response.json();
      } catch {
        // Non-JSON error body
      }
      throw this.buildError(
        response.status,
        errorBody.error || errorBody.message || response.statusText,
        fullUrl,
        errorBody
      );
    }

    // 204 No Content
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const data = await response.json();
    return data as T;
  }

  private buildError(
    status: number,
    message: string,
    url: string,
    details?: any
  ): ApiError {
    const err: any = new Error(message);
    err.status = status;
    err.statusCode = status;
    err.url = url;
    err.details = details;
    err.data = details;
    err.response = { status, data: details };
    return err;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Protected HTTP methods (the public contract for subclasses) ──

  protected async get<T>(
    url: string,
    config?: RequestConfig & { cacheOptions?: CacheOptions }
  ): Promise<T> {
    const cacheOptions = config?.cacheOptions;
    const cacheKey =
      cacheOptions?.key || this.generateCacheKey('GET', url, config?.params);

    if (this.config.enableCaching && !cacheOptions?.skipCache) {
      const cached = await this.cache.get<T>(cacheKey);
      if (cached) return cached;
    }

    // Append query params to URL
    let fullUrl = url;
    if (config?.params) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(config.params)) {
        if (v != null) qs.append(k, String(v));
      }
      const qsStr = qs.toString();
      if (qsStr) fullUrl += (url.includes('?') ? '&' : '?') + qsStr;
    }

    const data = await this.request<T>(
      'GET',
      fullUrl,
      undefined,
      config?.headers
    );

    if (this.config.enableCaching && !cacheOptions?.skipCache) {
      await this.cache.set(cacheKey, data, cacheOptions?.ttl);
    }

    return data;
  }

  protected async post<T>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    const result = await this.request<T>('POST', url, data, config?.headers);
    if (this.config.enableCaching) await this.invalidateRelatedCache(url);
    return result;
  }

  protected async put<T>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    const result = await this.request<T>('PUT', url, data, config?.headers);
    if (this.config.enableCaching) await this.invalidateRelatedCache(url);
    return result;
  }

  protected async patch<T>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    const result = await this.request<T>('PATCH', url, data, config?.headers);
    if (this.config.enableCaching) await this.invalidateRelatedCache(url);
    return result;
  }

  protected async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    const body = config?.data;
    const result = await this.request<T>('DELETE', url, body, config?.headers);
    if (this.config.enableCaching) await this.invalidateRelatedCache(url);
    return result;
  }

  protected async uploadFile<T>(
    url: string,
    file: FormData,
    _onProgress?: (progress: number) => void
  ): Promise<T> {
    // fetch does not support upload progress natively — the callback is ignored
    return this.request<T>('POST', url, file);
  }

  // ── Cache helpers ──────────────────────────────────────────────

  private generateCacheKey(method: string, url: string, params?: any): string {
    const paramsString = params ? JSON.stringify(params) : '';
    return `${method}_${url}_${paramsString}`;
  }

  private async invalidateRelatedCache(url: string): Promise<void> {
    const basePath = url.split('?')[0] ?? url;
    const segments = basePath.split('/').filter(Boolean);
    if (segments.length > 0) {
      const resource = segments[0]!;
      this.cache.clearBySubstring(resource);
    }
  }

  public async clearCache(): Promise<void> {
    this.cache.clear();
  }

  protected async getCacheStats(): Promise<any> {
    return this.cache.getStats();
  }

  public updateConfig(newConfig: Partial<ApiServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (this.client?.defaults) {
      if (newConfig.baseURL) this.client.defaults.baseURL = newConfig.baseURL;
      if (newConfig.timeout) this.client.defaults.timeout = newConfig.timeout;
    }
  }
}

// Default configuration
export const defaultApiConfig: ApiServiceConfig = {
  baseURL: (() => {
    try {
      return require('./config').API_BASE_URL;
    } catch {
      return 'http://localhost:3000/api';
    }
  })(),
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  enableLogging: process.env.NODE_ENV === 'development',
  enableCaching: true,
};
