import { EventService } from '../../../src/services/api/EventService';
import { BaseApiService } from '../../../src/services/api/BaseApiService';
import { SportType, SkillLevel, EventStatus, EventType } from '../../../src/types';

// Mock the BaseApiService
jest.mock('../../../src/services/api/BaseApiService');

describe('EventService', () => {
  let eventService: EventService;
  let mockGet: jest.Mock;
  let mockPost: jest.Mock;
  let mockPut: jest.Mock;
  let mockDelete: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock methods
    mockGet = jest.fn();
    mockPost = jest.fn();
    mockPut = jest.fn();
    mockDelete = jest.fn();

    // Mock BaseApiService methods
    (BaseApiService as jest.Mock).mockImplementation(() => ({
      get: mockGet,
      post: mockPost,
      put: mockPut,
      delete: mockDelete,
    }));

    eventService = new EventService();
  });

  describe('getEvents', () => {
    it('should fetch events with filters and pagination', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            title: 'Basketball Game',
            sportType: SportType.BASKETBALL,
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

      const filters = {
        sportType: SportType.BASKETBALL,
        skillLevel: SkillLevel.INTERMEDIATE,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const pagination = {
        page: 1,
        limit: 10,
      };

      const result = await eventService.getEvents(filters, pagination);

      expect(mockGet).toHaveBeenCalledWith('/events', {
        params: {
          ...filters,
          ...pagination,
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-01-31T00:00:00.000Z',
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch events without filters', async () => {
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

      const result = await eventService.getEvents();

      expect(mockGet).toHaveBeenCalledWith('/events', {
        params: {
          startDate: undefined,
          endDate: undefined,
        },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getEvent', () => {
    it('should fetch a specific event by ID', async () => {
      const mockEvent = {
        id: '1',
        title: 'Basketball Game',
        sportType: SportType.BASKETBALL,
      };

      mockGet.mockResolvedValue(mockEvent);

      const result = await eventService.getEvent('1');

      expect(mockGet).toHaveBeenCalledWith('/events/1');
      expect(result).toEqual(mockEvent);
    });
  });

  describe('createEvent', () => {
    it('should create a new event', async () => {
      const eventData = {
        title: 'New Basketball Game',
        description: 'A fun basketball game',
        sportType: SportType.BASKETBALL,
        facilityId: 'facility-1',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T12:00:00Z'),
        maxParticipants: 10,
        price: 25,
        currency: 'USD',
        skillLevel: SkillLevel.INTERMEDIATE,
        equipment: ['Basketball'],
        eventType: EventType.PICKUP,
      };

      const mockResponse = {
        id: '1',
        ...eventData,
        status: EventStatus.ACTIVE,
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await eventService.createEvent(eventData);

      expect(mockPost).toHaveBeenCalledWith('/events', {
        ...eventData,
        startTime: '2024-01-15T10:00:00.000Z',
        endTime: '2024-01-15T12:00:00.000Z',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateEvent', () => {
    it('should update an existing event', async () => {
      const updates = {
        title: 'Updated Basketball Game',
        startTime: new Date('2024-01-16T10:00:00Z'),
        maxParticipants: 12,
      };

      const mockResponse = {
        id: '1',
        ...updates,
        sportType: SportType.BASKETBALL,
      };

      mockPut.mockResolvedValue(mockResponse);

      const result = await eventService.updateEvent('1', updates);

      expect(mockPut).toHaveBeenCalledWith('/events/1', {
        ...updates,
        startTime: '2024-01-16T10:00:00.000Z',
        endTime: undefined,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteEvent', () => {
    it('should delete an event', async () => {
      mockDelete.mockResolvedValue(undefined);

      await eventService.deleteEvent('1');

      expect(mockDelete).toHaveBeenCalledWith('/events/1');
    });
  });

  describe('bookEvent', () => {
    it('should book an event for individual participant', async () => {
      const mockBooking = {
        id: 'booking-1',
        userId: 'user-1',
        eventId: 'event-1',
        status: 'confirmed',
      };

      mockPost.mockResolvedValue(mockBooking);

      const result = await eventService.bookEvent('event-1', 'user-1');

      expect(mockPost).toHaveBeenCalledWith('/events/event-1/book', { userId: 'user-1' });
      expect(result).toEqual(mockBooking);
    });

    it('should book an event for a team', async () => {
      const mockBooking = {
        id: 'booking-1',
        teamId: 'team-1',
        eventId: 'event-1',
        status: 'confirmed',
      };

      mockPost.mockResolvedValue(mockBooking);

      const result = await eventService.bookEvent('event-1', 'user-1', 'team-1');

      expect(mockPost).toHaveBeenCalledWith('/events/event-1/book', { userId: 'user-1', teamId: 'team-1' });
      expect(result).toEqual(mockBooking);
    });
  });

  describe('searchEvents', () => {
    it('should search events with query and filters', async () => {
      const mockResponse = {
        results: [
          {
            id: '1',
            title: 'Basketball Game',
            sportType: SportType.BASKETBALL,
          },
        ],
        total: 1,
        query: 'basketball',
      };

      mockGet.mockResolvedValue(mockResponse);

      const filters = {
        sportType: SportType.BASKETBALL,
        startDate: new Date('2024-01-01'),
      };

      const pagination = {
        page: 1,
        limit: 10,
      };

      const result = await eventService.searchEvents('basketball', filters, pagination);

      expect(mockGet).toHaveBeenCalledWith('/search/events', {
        params: {
          query: 'basketball',
          ...filters,
          ...pagination,
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: undefined,
        },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getNearbyEvents', () => {
    it('should get nearby events based on location', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Nearby Basketball Game',
          sportType: SportType.BASKETBALL,
        },
      ];

      mockGet.mockResolvedValue(mockEvents);

      const result = await eventService.getNearbyEvents(40.7128, -74.0060, 5);

      expect(mockGet).toHaveBeenCalledWith('/events/nearby', {
        params: {
          latitude: 40.7128,
          longitude: -74.0060,
          radius: 5,
          startDate: undefined,
          endDate: undefined,
        },
      });
      expect(result).toEqual(mockEvents);
    });

    it('should use default radius when not provided', async () => {
      mockGet.mockResolvedValue([]);

      await eventService.getNearbyEvents(40.7128, -74.0060);

      expect(mockGet).toHaveBeenCalledWith('/events/nearby', {
        params: {
          latitude: 40.7128,
          longitude: -74.0060,
          radius: 10, // default radius
          startDate: undefined,
          endDate: undefined,
        },
      });
    });
  });

  describe('getRecommendedEvents', () => {
    it('should get recommended events', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Recommended Event',
          sportType: SportType.BASKETBALL,
        },
      ];

      mockGet.mockResolvedValue(mockEvents);

      const result = await eventService.getRecommendedEvents(5);

      expect(mockGet).toHaveBeenCalledWith('/events/recommended', {
        params: { limit: 5 },
      });
      expect(result).toEqual(mockEvents);
    });

    it('should use default limit when not provided', async () => {
      mockGet.mockResolvedValue([]);

      await eventService.getRecommendedEvents();

      expect(mockGet).toHaveBeenCalledWith('/events/recommended', {
        params: { limit: 10 },
      });
    });
  });

  describe('canBookEvent', () => {
    it('should check if user can book an event', async () => {
      const mockResponse = {
        canBook: true,
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await eventService.canBookEvent('event-1');

      expect(mockGet).toHaveBeenCalledWith('/events/event-1/can-book');
      expect(result).toEqual(mockResponse);
    });

    it('should return reason when booking is not allowed', async () => {
      const mockResponse = {
        canBook: false,
        reason: 'Event is full',
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await eventService.canBookEvent('event-1');

      expect(result).toEqual(mockResponse);
    });
  });
});