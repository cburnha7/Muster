/**
 * Court Management API Integration Tests
 * 
 * Tests the integration between frontend components and backend API endpoints
 * for court management functionality.
 */

import { courtService } from '../../src/services/api/CourtService';
import { SportType } from '../../src/types';

// Mock the BaseApiService
jest.mock('../../src/services/api/BaseApiService', () => {
  return {
    BaseApiService: class {
      async get(url: string, config?: any) {
        return mockApiCall('GET', url, config);
      }
      async post(url: string, data?: any, config?: any) {
        return mockApiCall('POST', url, { data, ...config });
      }
      async put(url: string, data?: any, config?: any) {
        return mockApiCall('PUT', url, { data, ...config });
      }
      async delete(url: string, config?: any) {
        return mockApiCall('DELETE', url, config);
      }
    },
  };
});

// Mock API responses
let mockApiResponses: { [key: string]: any } = {};

function mockApiCall(method: string, url: string, config?: any) {
  const key = `${method}:${url}`;
  if (mockApiResponses[key]) {
    return Promise.resolve(mockApiResponses[key]);
  }
  return Promise.reject(new Error(`No mock response for ${key}`));
}

describe('Court Management API Integration', () => {
  const facilityId = 'facility-123';
  const courtId = 'court-456';

  beforeEach(() => {
    mockApiResponses = {};
  });

  describe('GET /api/facilities/:id/courts', () => {
    it('should fetch all courts for a facility', async () => {
      const mockCourts = [
        {
          id: 'court-1',
          facilityId,
          name: 'Court 1',
          sportType: SportType.BASKETBALL,
          capacity: 10,
          isIndoor: true,
          isActive: true,
          displayOrder: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'court-2',
          facilityId,
          name: 'Court 2',
          sportType: SportType.TENNIS,
          capacity: 4,
          isIndoor: false,
          isActive: true,
          displayOrder: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockApiResponses[`GET:/facilities/${facilityId}/courts`] = { data: mockCourts };

      const courts = await courtService.getCourts(facilityId);

      expect(courts).toHaveLength(2);
      expect(courts[0].name).toBe('Court 1');
      expect(courts[1].name).toBe('Court 2');
    });

    it('should return empty array when facility has no courts', async () => {
      mockApiResponses[`GET:/facilities/${facilityId}/courts`] = { data: [] };

      const courts = await courtService.getCourts(facilityId);

      expect(courts).toHaveLength(0);
    });
  });

  describe('POST /api/facilities/:id/courts', () => {
    it('should create a new court', async () => {
      const newCourtData = {
        name: 'New Court',
        sportType: SportType.SOCCER,
        capacity: 22,
        isIndoor: false,
        pricePerHour: 50,
      };

      const mockCreatedCourt = {
        id: 'new-court-id',
        facilityId,
        ...newCourtData,
        isActive: true,
        displayOrder: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockApiResponses[`POST:/facilities/${facilityId}/courts`] = { data: mockCreatedCourt };

      const court = await courtService.createCourt(facilityId, newCourtData);

      expect(court.id).toBe('new-court-id');
      expect(court.name).toBe('New Court');
      expect(court.sportType).toBe(SportType.SOCCER);
      expect(court.capacity).toBe(22);
      expect(court.pricePerHour).toBe(50);
    });

    it('should create court with default values', async () => {
      const minimalCourtData = {
        name: 'Minimal Court',
        sportType: SportType.VOLLEYBALL,
      };

      const mockCreatedCourt = {
        id: 'minimal-court-id',
        facilityId,
        name: 'Minimal Court',
        sportType: SportType.VOLLEYBALL,
        capacity: 1,
        isIndoor: false,
        isActive: true,
        displayOrder: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockApiResponses[`POST:/facilities/${facilityId}/courts`] = { data: mockCreatedCourt };

      const court = await courtService.createCourt(facilityId, minimalCourtData);

      expect(court.capacity).toBe(1);
      expect(court.isIndoor).toBe(false);
    });
  });

  describe('PUT /api/facilities/:id/courts/:courtId', () => {
    it('should update court details', async () => {
      const updateData = {
        name: 'Updated Court Name',
        capacity: 15,
        pricePerHour: 75,
      };

      const mockUpdatedCourt = {
        id: courtId,
        facilityId,
        name: 'Updated Court Name',
        sportType: SportType.BASKETBALL,
        capacity: 15,
        isIndoor: true,
        isActive: true,
        pricePerHour: 75,
        displayOrder: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      mockApiResponses[`PUT:/facilities/${facilityId}/courts/${courtId}`] = { data: mockUpdatedCourt };

      const court = await courtService.updateCourt(facilityId, courtId, updateData);

      expect(court.name).toBe('Updated Court Name');
      expect(court.capacity).toBe(15);
      expect(court.pricePerHour).toBe(75);
    });

    it('should toggle court active status', async () => {
      const updateData = { isActive: false };

      const mockUpdatedCourt = {
        id: courtId,
        facilityId,
        name: 'Court 1',
        sportType: SportType.BASKETBALL,
        capacity: 10,
        isIndoor: true,
        isActive: false,
        displayOrder: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      mockApiResponses[`PUT:/facilities/${facilityId}/courts/${courtId}`] = { data: mockUpdatedCourt };

      const court = await courtService.updateCourt(facilityId, courtId, updateData);

      expect(court.isActive).toBe(false);
    });
  });

  describe('DELETE /api/facilities/:id/courts/:courtId', () => {
    it('should delete a court', async () => {
      mockApiResponses[`DELETE:/facilities/${facilityId}/courts/${courtId}`] = { data: undefined };

      await expect(courtService.deleteCourt(facilityId, courtId)).resolves.toBeUndefined();
    });
  });

  describe('Component Integration', () => {
    it('should support ManageGroundScreen workflow', async () => {
      // 1. Load courts
      const mockCourts = [
        {
          id: 'court-1',
          facilityId,
          name: 'Court 1',
          sportType: SportType.BASKETBALL,
          capacity: 10,
          isIndoor: true,
          isActive: true,
          displayOrder: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockApiResponses[`GET:/facilities/${facilityId}/courts`] = { data: mockCourts };
      const courts = await courtService.getCourts(facilityId);
      expect(courts).toHaveLength(1);

      // 2. Update court (toggle active)
      mockApiResponses[`PUT:/facilities/${facilityId}/courts/court-1`] = {
        data: { ...mockCourts[0], isActive: false },
      };
      const updatedCourt = await courtService.updateCourt(facilityId, 'court-1', { isActive: false });
      expect(updatedCourt.isActive).toBe(false);

      // 3. Delete court
      mockApiResponses[`DELETE:/facilities/${facilityId}/courts/court-1`] = { data: undefined };
      await expect(courtService.deleteCourt(facilityId, 'court-1')).resolves.toBeUndefined();
    });

    it('should support AddCourtScreen workflow', async () => {
      const newCourtData = {
        name: 'New Court',
        sportType: SportType.TENNIS,
        capacity: 4,
        isIndoor: false,
        pricePerHour: 40,
      };

      const mockCreatedCourt = {
        id: 'new-court-id',
        facilityId,
        ...newCourtData,
        isActive: true,
        displayOrder: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockApiResponses[`POST:/facilities/${facilityId}/courts`] = { data: mockCreatedCourt };

      const court = await courtService.createCourt(facilityId, newCourtData);

      expect(court.id).toBe('new-court-id');
      expect(court.name).toBe('New Court');
    });

    it('should support EditCourtModal workflow', async () => {
      const updateData = {
        name: 'Updated Court',
        capacity: 12,
      };

      const mockUpdatedCourt = {
        id: courtId,
        facilityId,
        name: 'Updated Court',
        sportType: SportType.BASKETBALL,
        capacity: 12,
        isIndoor: true,
        isActive: true,
        displayOrder: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      mockApiResponses[`PUT:/facilities/${facilityId}/courts/${courtId}`] = { data: mockUpdatedCourt };

      const court = await courtService.updateCourt(facilityId, courtId, updateData);

      expect(court.name).toBe('Updated Court');
      expect(court.capacity).toBe(12);
    });
  });
});
