import { BaseApiService } from '../../../src/services/api/BaseApiService';
import { authService } from '../../../src/services/auth/AuthService';
import axios, { AxiosError } from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock auth service
jest.mock('../../../src/services/auth/AuthService', () => ({
  authService: {
    getToken: jest.fn(),
    refreshAccessToken: jest.fn(),
  },
}));

// Mock cache service
jest.mock('../../../src/services/api/CacheService', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
    getStats: jest.fn(),
  },
}));

describe('BaseApiService', () => {
  let apiService: BaseApiService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock axios.create
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
      defaults: {
        baseURL: '',
        timeout: 0,
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Create service instance
    apiService = new BaseApiService({
      baseURL: 'http://localhost:3000/api',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableLogging: false,
      enableCaching: true,
    });
  });

  describe('initialization', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3000/api',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should set up request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('HTTP methods', () => {
    beforeEach(() => {
      // Mock successful responses
      mockAxiosInstance.get.mockResolvedValue({ data: { success: true } });
      mockAxiosInstance.post.mockResolvedValue({ data: { created: true } });
      mockAxiosInstance.put.mockResolvedValue({ data: { updated: true } });
      mockAxiosInstance.patch.mockResolvedValue({ data: { patched: true } });
      mockAxiosInstance.delete.mockResolvedValue({ data: { deleted: true } });
    });

    it('should make GET requests', async () => {
      const result = await (apiService as any).get('/test');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual({ success: true });
    });

    it('should make POST requests', async () => {
      const data = { name: 'test' };
      const result = await (apiService as any).post('/test', data);
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', data, undefined);
      expect(result).toEqual({ created: true });
    });

    it('should make PUT requests', async () => {
      const data = { name: 'updated' };
      const result = await (apiService as any).put('/test/1', data);
      
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test/1', data, undefined);
      expect(result).toEqual({ updated: true });
    });

    it('should make PATCH requests', async () => {
      const data = { name: 'patched' };
      const result = await (apiService as any).patch('/test/1', data);
      
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/test/1', data, undefined);
      expect(result).toEqual({ patched: true });
    });

    it('should make DELETE requests', async () => {
      const result = await (apiService as any).delete('/test/1');
      
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test/1', undefined);
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('error handling', () => {
    it('should transform axios errors to API errors', async () => {
      const axiosError = {
        response: {
          status: 400,
          data: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
          },
        },
        message: 'Request failed',
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(axiosError);

      try {
        await (apiService as any).get('/test');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.message).toBe('Invalid input');
        expect(error.timestamp).toBeInstanceOf(Date);
      }
    });

    it('should handle network errors', async () => {
      const networkError = {
        request: {},
        message: 'Network Error',
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(networkError);

      try {
        await (apiService as any).get('/test');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe('NETWORK_ERROR');
        expect(error.message).toBe('Network request failed. Please check your connection.');
      }
    });
  });

  describe('authentication integration', () => {
    it('should add auth token to requests when available', () => {
      (authService.getToken as jest.Mock).mockReturnValue('test-token');

      // Get the request interceptor function
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      
      const config = {
        headers: {},
      };

      requestInterceptor(config);

      expect(config.headers.Authorization).toBe('Bearer test-token');
    });

    it('should not add auth token when not available', () => {
      (authService.getToken as jest.Mock).mockReturnValue(null);

      // Get the request interceptor function
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      
      const config = {
        headers: {},
      };

      requestInterceptor(config);

      expect(config.headers.Authorization).toBeUndefined();
    });
  });

  describe('retry logic', () => {
    it('should retry on server errors', async () => {
      const serverError = {
        response: {
          status: 500,
        },
        config: {
          __retryCount: 0,
        },
      } as AxiosError;

      // Mock the shouldRetry method to return true
      (apiService as any).shouldRetry = jest.fn().mockReturnValue(true);
      (apiService as any).canRetry = jest.fn().mockReturnValue(true);
      (apiService as any).retryRequest = jest.fn().mockResolvedValue({ data: { success: true } });

      mockAxiosInstance.get.mockRejectedValue(serverError);

      // Get the response interceptor error handler
      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      
      const result = await responseInterceptor(serverError);

      expect((apiService as any).shouldRetry).toHaveBeenCalledWith(serverError);
      expect((apiService as any).canRetry).toHaveBeenCalledWith(serverError);
      expect((apiService as any).retryRequest).toHaveBeenCalledWith(serverError);
      expect(result).toEqual({ data: { success: true } });
    });

    it('should not retry on client errors', () => {
      const clientError = {
        response: {
          status: 400,
        },
      } as AxiosError;

      const shouldRetry = (apiService as any).shouldRetry(clientError);
      expect(shouldRetry).toBe(false);
    });

    it('should retry on network errors', () => {
      const networkError = {
        request: {},
      } as AxiosError;

      const shouldRetry = (apiService as any).shouldRetry(networkError);
      expect(shouldRetry).toBe(true);
    });

    it('should retry on 408 and 429 errors', () => {
      const timeoutError = {
        response: {
          status: 408,
        },
      } as AxiosError;

      const rateLimitError = {
        response: {
          status: 429,
        },
      } as AxiosError;

      expect((apiService as any).shouldRetry(timeoutError)).toBe(true);
      expect((apiService as any).shouldRetry(rateLimitError)).toBe(true);
    });
  });

  describe('configuration updates', () => {
    it('should update configuration', () => {
      const newConfig = {
        baseURL: 'http://new-api.com',
        timeout: 60000,
      };

      apiService.updateConfig(newConfig);

      expect(mockAxiosInstance.defaults.baseURL).toBe('http://new-api.com');
      expect(mockAxiosInstance.defaults.timeout).toBe(60000);
    });
  });
});