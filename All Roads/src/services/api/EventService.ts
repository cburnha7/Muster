import { BaseApiService } from './BaseApiService';
import { apiConfig, API_ENDPOINTS } from './config';
import {
  Event,
  CreateEventData,
  UpdateEventData,
  EventFilters,
  Booking,
  Participant,
  PaginatedResponse,
  PaginationParams,
  SearchResult,
} from '../../types';

export class EventService extends BaseApiService {
  constructor() {
    super(apiConfig);
  }

  /**
   * Get all events with optional filtering and pagination
   * @deprecated Use RTK Query's useGetEventsQuery hook instead for better caching and automatic synchronization
   * @see src/store/api/eventsApi.ts - useGetEventsQuery
   */
  async getEvents(
    filters?: EventFilters,
    pagination?: PaginationParams,
    skipCache: boolean = false
  ): Promise<PaginatedResponse<Event>> {
    if (__DEV__) {
      console.warn(
        '⚠️ EventService.getEvents is deprecated. Use RTK Query\'s useGetEventsQuery hook instead for better caching and automatic synchronization.'
      );
    }
    
    const params = {
      ...filters,
      ...pagination,
      // Convert Date objects to ISO strings for API
      startDate: filters?.startDate?.toISOString(),
      endDate: filters?.endDate?.toISOString(),
    };

    return this.get<PaginatedResponse<Event>>(API_ENDPOINTS.EVENTS.BASE, { 
      params,
      cacheOptions: { skipCache }
    });
  }

  /**
   * Get a specific event by ID
   */
  async getEvent(id: string): Promise<Event> {
    return this.get<Event>(API_ENDPOINTS.EVENTS.BY_ID(id));
  }

  /**
   * Create a new event
   */
  async createEvent(eventData: CreateEventData): Promise<Event> {
    const data = {
      ...eventData,
      // Convert Date objects to ISO strings
      startTime: eventData.startTime.toISOString(),
      endTime: eventData.endTime.toISOString(),
    };

    const result = await this.post<Event>(API_ENDPOINTS.EVENTS.BASE, data);
    
    // Clear events cache after creating
    await this.clearCache();
    
    return result;
  }

  /**
   * Update an existing event
   */
  async updateEvent(id: string, updates: UpdateEventData): Promise<Event> {
    const data = {
      ...updates,
      // Convert Date objects to ISO strings if present
      startTime: updates.startTime?.toISOString(),
      endTime: updates.endTime?.toISOString(),
    };

    return this.put<Event>(API_ENDPOINTS.EVENTS.BY_ID(id), data);
  }

  /**
   * Delete an event (or cancel if it has participants)
   */
  async deleteEvent(id: string, reason?: string): Promise<void> {
    console.log('🗑️ EventService.deleteEvent called with id:', id);
    console.log('📝 Cancellation reason:', reason);
    console.log('📡 Making DELETE request to:', API_ENDPOINTS.EVENTS.BY_ID(id));
    
    try {
      const result = await this.delete<void>(API_ENDPOINTS.EVENTS.BY_ID(id), {
        data: { reason }, // Send reason in request body
      });
      console.log('✅ EventService.deleteEvent completed successfully');
      
      // Clear events cache after deleting/cancelling
      await this.clearCache();
      
      return result;
    } catch (error) {
      console.error('❌ EventService.deleteEvent failed:', error);
      throw error;
    }
  }

  /**
   * Book an event (individual or team booking)
   * @deprecated Use RTK Query's useBookEventMutation hook instead for automatic cache invalidation
   * @see src/store/api/eventsApi.ts - useBookEventMutation
   */
  async bookEvent(eventId: string, userId: string, teamId?: string): Promise<Booking> {
    if (__DEV__) {
      console.warn(
        '⚠️ EventService.bookEvent is deprecated. Use RTK Query\'s useBookEventMutation hook instead for automatic cache invalidation.'
      );
    }
    
    console.log('📞 EventService.bookEvent called');
    console.log('📋 Parameters:', { eventId, userId, teamId });
    
    const data = { userId, ...(teamId && { teamId }) };
    console.log('📦 Request data:', data);
    console.log('🌐 Request URL:', API_ENDPOINTS.EVENTS.BOOK(eventId));
    
    try {
      const result = await this.post<Booking>(API_ENDPOINTS.EVENTS.BOOK(eventId), data);
      console.log('✅ EventService.bookEvent successful');
      console.log('📦 Response:', result);
      
      // Clear cache after booking to ensure fresh data on home/events screens
      await this.clearCache();
      
      return result;
    } catch (error) {
      console.error('❌ EventService.bookEvent failed');
      console.error('❌ Error:', error);
      throw error;
    }
  }

  /**
   * Cancel a booking
   * @deprecated Use RTK Query's useCancelBookingMutation hook instead for automatic cache invalidation
   * @see src/store/api/eventsApi.ts - useCancelBookingMutation
   */
  async cancelBooking(eventId: string, bookingId: string): Promise<void> {
    if (__DEV__) {
      console.warn(
        '⚠️ EventService.cancelBooking is deprecated. Use RTK Query\'s useCancelBookingMutation hook instead for automatic cache invalidation.'
      );
    }
    
    const result = await this.delete<void>(`${API_ENDPOINTS.EVENTS.BY_ID(eventId)}/book/${bookingId}`);
    
    // Clear cache after cancelling booking to ensure fresh data
    await this.clearCache();
    
    return result;
  }

  /**
   * Get participants for an event
   */
  async getEventParticipants(eventId: string, skipCache = false): Promise<Participant[]> {
    if (!eventId) {
      console.error('❌ getEventParticipants called with undefined eventId');
      throw new Error('Event ID is required');
    }
    
    console.log('📋 Fetching participants for event:', eventId);
    return this.get<Participant[]>(
      API_ENDPOINTS.EVENTS.PARTICIPANTS(eventId),
      { cacheOptions: { skipCache } }
    );
  }

  /**
   * Search events with advanced filters
   */
  async searchEvents(
    query: string,
    filters?: EventFilters,
    pagination?: PaginationParams
  ): Promise<SearchResult<Event>> {
    const params = {
      query,
      ...filters,
      ...pagination,
      // Convert Date objects to ISO strings
      startDate: filters?.startDate?.toISOString(),
      endDate: filters?.endDate?.toISOString(),
    };

    return this.get<SearchResult<Event>>(API_ENDPOINTS.SEARCH.EVENTS, { params });
  }

  /**
   * Get nearby events based on location
   */
  async getNearbyEvents(
    latitude: number,
    longitude: number,
    radius: number = 10, // km
    filters?: Omit<EventFilters, 'location'>
  ): Promise<Event[]> {
    const params = {
      latitude,
      longitude,
      radius,
      ...filters,
      // Convert Date objects to ISO strings
      startDate: filters?.startDate?.toISOString(),
      endDate: filters?.endDate?.toISOString(),
    };

    return this.get<Event[]>(API_ENDPOINTS.EVENTS.NEARBY, { params });
  }

  /**
   * Get recommended events for the current user
   */
  async getRecommendedEvents(limit: number = 10): Promise<Event[]> {
    const params = { limit };
    return this.get<Event[]>(API_ENDPOINTS.EVENTS.RECOMMENDED, { params });
  }

  /**
   * Get events by facility
   */
  async getEventsByFacility(
    facilityId: string,
    filters?: Omit<EventFilters, 'facilityId'>,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Event>> {
    const params = {
      ...filters,
      ...pagination,
      facilityId,
      // Convert Date objects to ISO strings
      startDate: filters?.startDate?.toISOString(),
      endDate: filters?.endDate?.toISOString(),
    };

    return this.get<PaginatedResponse<Event>>(API_ENDPOINTS.EVENTS.BASE, { params });
  }

  /**
   * Get events organized by a specific user
   */
  async getEventsByOrganizer(
    organizerId: string,
    filters?: Omit<EventFilters, 'organizerId'>,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Event>> {
    const params = {
      ...filters,
      ...pagination,
      organizerId,
      // Convert Date objects to ISO strings
      startDate: filters?.startDate?.toISOString(),
      endDate: filters?.endDate?.toISOString(),
    };

    return this.get<PaginatedResponse<Event>>(API_ENDPOINTS.EVENTS.BASE, { params });
  }

  /**
   * Get events for a specific team
   */
  async getTeamEvents(
    teamId: string,
    filters?: Omit<EventFilters, 'teamIds'>,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Event>> {
    const params = {
      ...filters,
      ...pagination,
      teamIds: [teamId],
      // Convert Date objects to ISO strings
      startDate: filters?.startDate?.toISOString(),
      endDate: filters?.endDate?.toISOString(),
    };

    return this.get<PaginatedResponse<Event>>(API_ENDPOINTS.EVENTS.BASE, { params });
  }

  /**
   * Check if user can book an event
   */
  async canBookEvent(eventId: string): Promise<{ canBook: boolean; reason?: string }> {
    return this.get<{ canBook: boolean; reason?: string }>(
      `${API_ENDPOINTS.EVENTS.BY_ID(eventId)}/can-book`
    );
  }

  /**
   * Get event statistics
   */
  async getEventStats(eventId: string): Promise<{
    totalParticipants: number;
    confirmedParticipants: number;
    pendingParticipants: number;
    revenue: number;
    averageRating?: number;
  }> {
    return this.get(`${API_ENDPOINTS.EVENTS.BY_ID(eventId)}/stats`);
  }

  /**
   * Submit salutes for event participants
   * This will record the salutes and trigger player rating recalculation
   */
  async submitSalutes(eventId: string, salutedUserIds: string[]): Promise<{
    success: boolean;
    salutesRecorded: number;
    ratingsUpdated: number;
  }> {
    return this.post<{
      success: boolean;
      salutesRecorded: number;
      ratingsUpdated: number;
    }>(`${API_ENDPOINTS.EVENTS.BY_ID(eventId)}/salutes`, {
      salutedUserIds,
    });
  }

  /**
   * Check if current user has submitted salutes for an event
   */
  async checkSaluteStatus(eventId: string): Promise<{
    hasSubmitted: boolean;
    saluteCount: number;
  }> {
    return this.get<{
      hasSubmitted: boolean;
      saluteCount: number;
    }>(`${API_ENDPOINTS.EVENTS.BY_ID(eventId)}/salutes/status`);
  }

  /**
   * Get salutes for an event (who saluted whom)
   */
  async getEventSalutes(eventId: string): Promise<{
    fromUserId: string;
    toUserId: string;
    createdAt: Date;
  }[]> {
    return this.get(`${API_ENDPOINTS.EVENTS.BY_ID(eventId)}/salutes`);
  }

  /**
   * Get user's salutes for a specific event
   */
  async getUserSalutesForEvent(eventId: string): Promise<string[]> {
    const salutes = await this.get<{ toUserId: string }[]>(
      `${API_ENDPOINTS.EVENTS.BY_ID(eventId)}/salutes/me`
    );
    return salutes.map(s => s.toUserId);
  }
}

// Create and export singleton instance
export const eventService = new EventService();