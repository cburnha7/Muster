import { UserService } from '../../../src/services/api/UserService';
import { BaseApiService } from '../../../src/services/api/BaseApiService';
import { SportType } from '../../../src/types';

// Mock the BaseApiService
jest.mock('../../../src/services/api/BaseApiService');

describe('UserService', () => {
  let userService: UserService;
  let mockGet: jest.Mock;
  let mockPut: jest.Mock;
  let mockPost: jest.Mock;
  let mockDelete: jest.Mock;
  let mockUploadFile: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock methods
    mockGet = jest.fn();
    mockPut = jest.fn();
    mockPost = jest.fn();
    mockDelete = jest.fn();
    mockUploadFile = jest.fn();

    // Mock BaseApiService methods
    (BaseApiService as jest.Mock).mockImplementation(() => ({
      get: mockGet,
      put: mockPut,
      post: mockPost,
      delete: mockDelete,
      uploadFile: mockUploadFile,
    }));

    userService = new UserService();
  });

  describe('getProfile', () => {
    it('should fetch user profile', async () => {
      const mockProfile = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        preferredSports: [SportType.BASKETBALL],
      };

      mockGet.mockResolvedValue(mockProfile);

      const result = await userService.getProfile();

      expect(mockGet).toHaveBeenCalledWith('/users/profile');
      expect(result).toEqual(mockProfile);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updates = {
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: new Date('1990-01-01'),
        preferredSports: [SportType.BASKETBALL, SportType.SOCCER],
      };

      const mockResponse = {
        id: 'user-1',
        email: 'test@example.com',
        ...updates,
      };

      mockPut.mockResolvedValue(mockResponse);

      const result = await userService.updateProfile(updates);

      expect(mockPut).toHaveBeenCalledWith('/users/profile', {
        ...updates,
        dateOfBirth: '1990-01-01T00:00:00.000Z',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle updates without date of birth', async () => {
      const updates = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const mockResponse = {
        id: 'user-1',
        email: 'test@example.com',
        ...updates,
      };

      mockPut.mockResolvedValue(mockResponse);

      const result = await userService.updateProfile(updates);

      expect(mockPut).toHaveBeenCalledWith('/users/profile', {
        ...updates,
        dateOfBirth: undefined,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('uploadProfileImage', () => {
    it('should upload profile image', async () => {
      const mockFile = new File(['image data'], 'profile.jpg', { type: 'image/jpeg' });
      const mockResponse = {
        imageUrl: 'https://example.com/profile.jpg',
      };

      mockUploadFile.mockResolvedValue(mockResponse);

      const result = await userService.uploadProfileImage(mockFile);

      expect(mockUploadFile).toHaveBeenCalledWith(
        '/users/profile/image',
        expect.any(FormData),
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('should upload profile image with progress callback', async () => {
      const mockFile = new File(['image data'], 'profile.jpg', { type: 'image/jpeg' });
      const mockResponse = {
        imageUrl: 'https://example.com/profile.jpg',
      };
      const onProgress = jest.fn();

      mockUploadFile.mockResolvedValue(mockResponse);

      const result = await userService.uploadProfileImage(mockFile, onProgress);

      expect(mockUploadFile).toHaveBeenCalledWith(
        '/users/profile/image',
        expect.any(FormData),
        onProgress
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getUserBookings', () => {
    it('should fetch user bookings with status filter', async () => {
      const mockResponse = {
        data: [
          {
            id: 'booking-1',
            eventId: 'event-1',
            status: 'confirmed',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await userService.getUserBookings('upcoming', { page: 1, limit: 10 });

      expect(mockGet).toHaveBeenCalledWith('/users/bookings', {
        params: {
          page: 1,
          limit: 10,
          status: 'upcoming',
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch user bookings without filters', async () => {
      const mockResponse = {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await userService.getUserBookings();

      expect(mockGet).toHaveBeenCalledWith('/users/bookings', {
        params: {
          status: undefined,
        },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update notification preferences', async () => {
      const preferences = {
        eventReminders: true,
        eventUpdates: false,
        newEventAlerts: true,
        marketingEmails: false,
        pushNotifications: true,
      };

      mockPut.mockResolvedValue(preferences);

      const result = await userService.updateNotificationPreferences(preferences);

      expect(mockPut).toHaveBeenCalledWith('/users/notifications', preferences);
      expect(result).toEqual(preferences);
    });
  });

  describe('getUserStats', () => {
    it('should fetch user statistics', async () => {
      const mockStats = {
        totalBookings: 15,
        totalEventsOrganized: 5,
        totalTeams: 2,
        favoritesSports: ['basketball', 'soccer'],
        totalSpent: 250.00,
        totalEarned: 100.00,
        averageRating: 4.5,
        reviewCount: 10,
      };

      mockGet.mockResolvedValue(mockStats);

      const result = await userService.getUserStats();

      expect(mockGet).toHaveBeenCalledWith('/users/profile/stats');
      expect(result).toEqual(mockStats);
    });
  });

  describe('getBookingHistory', () => {
    it('should fetch booking history with date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const pagination = { page: 1, limit: 20 };

      const mockResponse = {
        data: [
          {
            id: 'booking-1',
            eventId: 'event-1',
            event: {
              id: 'event-1',
              title: 'Basketball Game',
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await userService.getBookingHistory(startDate, endDate, pagination);

      expect(mockGet).toHaveBeenCalledWith('/users/bookings/history', {
        params: {
          ...pagination,
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-01-31T00:00:00.000Z',
        },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteAccount', () => {
    it('should delete user account with password confirmation', async () => {
      mockDelete.mockResolvedValue(undefined);

      await userService.deleteAccount('password123');

      expect(mockDelete).toHaveBeenCalledWith('/users/profile', {
        data: { password: 'password123' },
      });
    });
  });

  describe('checkUsernameAvailability', () => {
    it('should check if username is available', async () => {
      const mockResponse = { available: true };

      mockGet.mockResolvedValue(mockResponse);

      const result = await userService.checkUsernameAvailability('newusername');

      expect(mockGet).toHaveBeenCalledWith('/users/profile/check-username', {
        params: { username: 'newusername' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should return false for unavailable username', async () => {
      const mockResponse = { available: false };

      mockGet.mockResolvedValue(mockResponse);

      const result = await userService.checkUsernameAvailability('existinguser');

      expect(result).toEqual(mockResponse);
    });
  });
});