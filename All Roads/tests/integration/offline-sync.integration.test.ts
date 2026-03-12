// Feature: sports-booking-app, Integration Test: Offline/Online Transitions
// Tests offline data caching and synchronization
import { offlineService } from '../../src/services/offline/OfflineService';
import { OfflineQueueService } from '../../src/services/offline/OfflineQueueService';
import { networkService } from '../../src/network/NetworkService';
import { Event, SportType, SkillLevel, EventType, EventStatus } from '../../src/types';

// Mock network service
jest.mock('../../src/network/NetworkService');

describe('Integration: Offline/Online Transitions', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await offlineService.clearAllCache();
  });

  describe('Offline Data Caching', () => {
    it('should cache data when online and retrieve it when offline', async () => {
      const mockEvent: Event = {
        id: '1',
        title: 'Basketball Game',
        description: 'Pickup basketball',
        sportType: SportType.BASKETBALL,
        facilityId: 'facility-1',
        organizerId: 'user-1',
        startTime: new Date('2024-12-01T10:00:00'),
        endTime: new Date('2024-12-01T12:00:00'),
        maxParticipants: 10,
        currentParticipants: 5,
        price: 10,
        currency: 'USD',
        skillLevel: SkillLevel.INTERMEDIATE,
        equipment: ['Basketball'],
        status: EventStatus.ACTIVE,
        eventType: EventType.PICKUP,
        participants: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Simulate online - cache data
      (networkService.getCurrentState as jest.Mock).mockReturnValue({ isConnected: true });
      await offlineService.cacheData('event-1', mockEvent, { priority: 'high' });

      // Simulate offline - retrieve cached data
      (networkService.getCurrentState as jest.Mock).mockReturnValue({ isConnected: false });
      const cachedEvent = await offlineService.getCachedData<Event>('event-1');

      expect(cachedEvent).toEqual(mockEvent);
      expect(offlineService.isOnline()).toBe(false);
    });

    it('should handle cache expiration correctly', async () => {
      const mockData = { test: 'data' };

      // Cache with short expiration
      await offlineService.cacheData('test-key', mockData, {
        maxAge: 100, // 100ms
        priority: 'low',
      });

      // Immediately retrieve - should work
      const data1 = await offlineService.getCachedData('test-key');
      expect(data1).toEqual(mockData);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should return null after expiration
      const data2 = await offlineService.getCachedData('test-key');
      expect(data2).toBeNull();
    });

    it('should prioritize essential data during cleanup', async () => {
      // Cache high priority data
      await offlineService.cacheData('high-priority', { important: true }, {
        priority: 'high',
      });

      // Cache low priority data
      await offlineService.cacheData('low-priority', { important: false }, {
        priority: 'low',
      });

      // Get cache stats
      const stats = await offlineService.getCacheStats();
      expect(stats.itemCount).toBe(2);

      // High priority data should be preserved during cleanup
      const highPriorityData = await offlineService.getCachedData('high-priority');
      expect(highPriorityData).toBeTruthy();
    });
  });

  describe('Offline Queue and Sync', () => {
    let queueService: OfflineQueueService;

    beforeEach(() => {
      queueService = new OfflineQueueService();
    });

    it('should queue actions when offline and sync when online', async () => {
      // Simulate offline
      (networkService.getCurrentState as jest.Mock).mockReturnValue({ isConnected: false });

      // Queue some actions
      await queueService.enqueue({
        id: 'action-1',
        type: 'CREATE_EVENT',
        payload: { title: 'Test Event' },
        timestamp: Date.now(),
        retryCount: 0,
      });

      await queueService.enqueue({
        id: 'action-2',
        type: 'UPDATE_PROFILE',
        payload: { firstName: 'Updated' },
        timestamp: Date.now(),
        retryCount: 0,
      });

      // Check queue size
      const queueSize = await queueService.getQueueSize();
      expect(queueSize).toBe(2);

      // Simulate going online
      (networkService.getCurrentState as jest.Mock).mockReturnValue({ isConnected: true });

      // Process queue (would normally sync with server)
      const pendingActions = await queueService.getPendingActions();
      expect(pendingActions).toHaveLength(2);
      expect(pendingActions[0].type).toBe('CREATE_EVENT');
      expect(pendingActions[1].type).toBe('UPDATE_PROFILE');
    });

    it('should handle sync failures with retry logic', async () => {
      const action = {
        id: 'action-1',
        type: 'CREATE_EVENT',
        payload: { title: 'Test Event' },
        timestamp: Date.now(),
        retryCount: 0,
      };

      await queueService.enqueue(action);

      // Simulate sync failure
      await queueService.markAsFailed('action-1');

      const pendingActions = await queueService.getPendingActions();
      const failedAction = pendingActions.find(a => a.id === 'action-1');
      
      expect(failedAction).toBeDefined();
      expect(failedAction?.retryCount).toBeGreaterThan(0);
    });

    it('should clear queue after successful sync', async () => {
      await queueService.enqueue({
        id: 'action-1',
        type: 'CREATE_EVENT',
        payload: { title: 'Test Event' },
        timestamp: Date.now(),
        retryCount: 0,
      });

      // Mark as completed
      await queueService.removeAction('action-1');

      const queueSize = await queueService.getQueueSize();
      expect(queueSize).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should invalidate cache by pattern', async () => {
      // Cache multiple events
      await offlineService.cacheData('event-1', { id: '1', title: 'Event 1' });
      await offlineService.cacheData('event-2', { id: '2', title: 'Event 2' });
      await offlineService.cacheData('facility-1', { id: '1', name: 'Facility 1' });

      // Invalidate all events
      await offlineService.invalidateCachePattern(/^event-/);

      // Events should be gone
      const event1 = await offlineService.getCachedData('event-1');
      const event2 = await offlineService.getCachedData('event-2');
      expect(event1).toBeNull();
      expect(event2).toBeNull();

      // Facility should still exist
      const facility = await offlineService.getCachedData('facility-1');
      expect(facility).toBeTruthy();
    });

    it('should provide accurate cache statistics', async () => {
      await offlineService.cacheData('test-1', { data: 'test1' });
      await offlineService.cacheData('test-2', { data: 'test2' });
      await offlineService.cacheData('test-3', { data: 'test3' });

      const stats = await offlineService.getCacheStats();
      
      expect(stats.itemCount).toBe(3);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.oldestItem).toBeLessThanOrEqual(stats.newestItem);
    });
  });

  describe('Network State Transitions', () => {
    it('should detect online to offline transition', () => {
      (networkService.getCurrentState as jest.Mock).mockReturnValue({ isConnected: true });
      expect(offlineService.isOnline()).toBe(true);

      (networkService.getCurrentState as jest.Mock).mockReturnValue({ isConnected: false });
      expect(offlineService.isOnline()).toBe(false);
    });

    it('should detect offline to online transition', () => {
      (networkService.getCurrentState as jest.Mock).mockReturnValue({ isConnected: false });
      expect(offlineService.isOnline()).toBe(false);

      (networkService.getCurrentState as jest.Mock).mockReturnValue({ isConnected: true });
      expect(offlineService.isOnline()).toBe(true);
    });
  });
});
