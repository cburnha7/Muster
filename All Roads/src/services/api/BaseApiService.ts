import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse, 
  AxiosError,
  InternalAxiosRequestConfig 
} from 'axios';
import { authService } from '../auth/AuthService';
import TokenStorage from '../auth/TokenStorage';
import { cacheService, CacheService } from './CacheService';
import { ApiError } from '../../types';

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
  retryCondition?: (error: AxiosError) => boolean;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  key?: string; // Custom cache key
  skipCache?: boolean; // Skip cache for this request
}

export class BaseApiService {
  protected client: AxiosInstance;
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
      retryCondition: this.shouldRetry.bind(this),
    };

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Set up request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor for authentication and logging
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        console.log('🚀 BaseApiService interceptor running');
        
        // Add authentication token - read from TokenStorage for consistency
        let token = await TokenStorage.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('🔐 API Request - Token attached:', token.substring(0, 20) + '...');
        } else {
          console.log('⚠️ API Request - No token available');
        }

        // DEVELOPMENT: Add x-user-id header for mock auth
        // Read user from TokenStorage instead of authService
        const currentUser = await TokenStorage.getUser();
        console.log('👤 Current user from TokenStorage:', currentUser?.email, currentUser?.id);
        if (currentUser && currentUser.id) {
          config.headers['X-User-Id'] = currentUser.id;
          console.log('🔐 API Request - User ID attached:', currentUser.id, currentUser.email);
        } else {
          console.log('⚠️ API Request - No current user');
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId();

        // Log request if enabled
        if (this.config.enableLogging) {
          this.logRequest(config);
        }

        return config;
      },
      (error: AxiosError) => {
        if (this.config.enableLogging) {
          console.error('Request interceptor error:', error);
        }
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling and logging
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log successful response if enabled
        if (this.config.enableLogging) {
          this.logResponse(response);
        }
        return response;
      },
      async (error: AxiosError) => {
        // Log error response if enabled
        if (this.config.enableLogging) {
          this.logError(error);
        }

        // Handle token refresh for 401 errors
        if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
          try {
            const refreshToken = await TokenStorage.getRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }
            const tokens = await authService.refreshToken(refreshToken);
            // Retry the original request with new token from TokenStorage
            if (error.config) {
              error.config.headers.Authorization = `Bearer ${tokens.accessToken}`;
              // Re-attach user ID header
              const currentUser = await TokenStorage.getUser();
              if (currentUser?.id) {
                error.config.headers['X-User-Id'] = currentUser.id;
              }
              return this.client.request(error.config);
            }
          } catch (refreshError: any) {
            // Any refresh failure (missing token or actual failure) — clear session
            console.error('🔒 Token refresh failed, clearing session:', refreshError.message || refreshError);
            await TokenStorage.clearAll();
            
            // Dispatch a global event so the app can redirect to login
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('auth:sessionExpired'));
            }
            
            // Reject with a clear auth error
            return Promise.reject({
              code: 'SESSION_EXPIRED',
              message: 'Your session has expired. Please log in again.',
              status: 401,
            });
          }
        }

        // Handle retry logic for retryable errors
        if (this.shouldRetry(error) && this.canRetry(error)) {
          return this.retryRequest(error);
        }

        // Transform error to our standard format
        const apiError = this.transformError(error);
        return Promise.reject(apiError);
      }
    );
  }

  /**
   * Determine if an error should be retried
   */
  private shouldRetry(error: AxiosError): boolean {
    // Don't retry client errors (4xx) except for specific cases
    if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
      // Retry on 408 (Request Timeout) and 429 (Too Many Requests)
      return error.response.status === 408 || error.response.status === 429;
    }

    // Retry on network errors and server errors (5xx)
    return !error.response || (error.response.status >= 500);
  }

  /**
   * Check if request can be retried (hasn't exceeded max attempts)
   */
  private canRetry(error: AxiosError): boolean {
    const config = error.config as any;
    const retryCount = config.__retryCount || 0;
    return retryCount < this.retryConfig.attempts;
  }

  /**
   * Retry a failed request with exponential backoff
   */
  private async retryRequest(error: AxiosError): Promise<AxiosResponse> {
    const config = error.config as any;
    config.__retryCount = (config.__retryCount || 0) + 1;

    const delay = this.retryConfig.delay * Math.pow(this.retryConfig.backoffFactor, config.__retryCount - 1);
    
    if (this.config.enableLogging) {
      console.log(`Retrying request (attempt ${config.__retryCount}/${this.retryConfig.attempts}) after ${delay}ms`);
    }

    await this.sleep(delay);
    return this.client.request(config);
  }

  /**
   * Transform Axios error to our standard API error format
   */
  private transformError(error: AxiosError): ApiError {
    if (error.response?.data) {
      // Server returned an error response
      const responseData = error.response.data as any;
      return {
        code: responseData.code || `HTTP_${error.response.status}`,
        message: responseData.message || responseData.error || error.message,
        details: responseData.details || error.response.data,
        timestamp: new Date(),
      };
    } else if (error.request) {
      // Network error
      return {
        code: 'NETWORK_ERROR',
        message: 'Network request failed. Please check your connection.',
        details: error.message,
        timestamp: new Date(),
      };
    } else {
      // Request setup error
      return {
        code: 'REQUEST_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: error,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Log outgoing request
   */
  private logRequest(config: InternalAxiosRequestConfig): void {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      headers: config.headers,
      data: config.data,
      params: config.params,
    });
  }

  /**
   * Log successful response
   */
  private logResponse(response: AxiosResponse): void {
    console.log(`✅ API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
    });
  }

  /**
   * Log error response
   */
  private logError(error: AxiosError): void {
    console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      data: error.response?.data,
    });
  }

  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make a GET request with caching support
   */
  protected async get<T>(url: string, config?: AxiosRequestConfig & { cacheOptions?: CacheOptions }): Promise<T> {
    const cacheOptions = config?.cacheOptions;
    const cacheKey = cacheOptions?.key || this.generateCacheKey('GET', url, config?.params);

    // Check cache first if caching is enabled and not skipped
    if (this.config.enableCaching && !cacheOptions?.skipCache) {
      const cachedData = await this.cache.get<T>(cacheKey);
      if (cachedData) {
        if (this.config.enableLogging) {
          console.log(`📦 Cache hit for: GET ${url}`);
        }
        return cachedData;
      }
    }

    const response = await this.client.get<T>(url, config);
    
    // Cache the response if caching is enabled
    if (this.config.enableCaching && !cacheOptions?.skipCache) {
      await this.cache.set(cacheKey, response.data, cacheOptions?.ttl);
    }

    return response.data;
  }

  /**
   * Make a POST request
   */
  protected async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    
    // Invalidate related cache entries for POST requests
    if (this.config.enableCaching) {
      await this.invalidateRelatedCache(url);
    }
    
    return response.data;
  }

  /**
   * Make a PUT request
   */
  protected async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    
    // Invalidate related cache entries for PUT requests
    if (this.config.enableCaching) {
      await this.invalidateRelatedCache(url);
    }
    
    return response.data;
  }

  /**
   * Make a PATCH request
   */
  protected async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    
    // Invalidate related cache entries for PATCH requests
    if (this.config.enableCaching) {
      await this.invalidateRelatedCache(url);
    }
    
    return response.data;
  }

  /**
   * Make a DELETE request
   */
  protected async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    
    // Invalidate related cache entries for DELETE requests
    if (this.config.enableCaching) {
      await this.invalidateRelatedCache(url);
    }
    
    return response.data;
  }

  /**
   * Upload file with progress tracking
   */
  protected async uploadFile<T>(
    url: string, 
    file: FormData, 
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const response = await this.client.post<T>(url, file, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(method: string, url: string, params?: any): string {
    const paramsString = params ? JSON.stringify(params) : '';
    return `${method}_${url}_${paramsString}`;
  }

  /**
   * Invalidate cache entries related to a URL
   */
  private async invalidateRelatedCache(url: string): Promise<void> {
    // This is a simple implementation - in a real app you might want more sophisticated cache invalidation
    const baseResource = url.split('/')[1]; // Get the base resource (e.g., 'events', 'facilities')
    if (baseResource) {
      // Clear cache entries that start with the base resource
      // Note: This is a simplified approach - you might want to implement more granular invalidation
      console.log(`🗑️ Invalidating cache for resource: ${baseResource}`);
    }
  }

  /**
   * Clear all cache
   */
  protected async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  protected async getCacheStats(): Promise<any> {
    return this.cache.getStats();
  }

  /**
   * Update base configuration
   */
  public updateConfig(newConfig: Partial<ApiServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update axios instance defaults
    if (newConfig.baseURL) {
      this.client.defaults.baseURL = newConfig.baseURL;
    }
    if (newConfig.timeout) {
      this.client.defaults.timeout = newConfig.timeout;
    }
  }
}

// Create and export default configuration
export const defaultApiConfig: ApiServiceConfig = {
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  enableLogging: __DEV__, // Enable logging in development mode
  enableCaching: true, // Enable caching by default
};