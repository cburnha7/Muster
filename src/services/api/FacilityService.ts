import { BaseApiService } from './BaseApiService';
import { apiConfig, API_ENDPOINTS, TIMEOUT_CONFIG } from './config';
import {
  Facility,
  FacilityPhoto,
  CreateFacilityData,
  UpdateFacilityData,
  FacilityFilters,
  Event,
  PaginatedResponse,
  PaginationParams,
  SearchResult,
  CancellationPolicy,
  CancellationPolicyResponse,
} from '../../types';
import {
  CourtForEvent,
  DateForCourt,
  SlotForDate,
} from '../../screens/events/create-flow/types';

export class FacilityService extends BaseApiService {
  constructor() {
    super(apiConfig);
  }

  /**
   * Get all facilities with optional filtering and pagination
   */
  async getFacilities(
    filters?: FacilityFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Facility>> {
    const params = {
      ...filters,
      ...pagination,
    };

    return this.get<PaginatedResponse<Facility>>(
      API_ENDPOINTS.FACILITIES.BASE,
      { params }
    );
  }

  /**
   * Get a specific facility by ID
   */
  async getFacility(id: string, skipCache: boolean = false): Promise<Facility> {
    return this.get<Facility>(API_ENDPOINTS.FACILITIES.BY_ID(id), {
      cacheOptions: { skipCache },
    });
  }

  /**
   * Check for duplicate facilities at an address
   */
  async checkDuplicates(address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  }): Promise<Facility[]> {
    return this.post<{ duplicates: Facility[] }>(
      `${API_ENDPOINTS.FACILITIES.BASE}/check-duplicates`,
      address
    ).then(response => response.duplicates);
  }

  /**
   * Create a new facility
   */
  async createFacility(facilityData: CreateFacilityData): Promise<Facility> {
    return this.post<Facility>(API_ENDPOINTS.FACILITIES.BASE, facilityData);
  }

  /**
   * Update an existing facility
   */
  async updateFacility(
    id: string,
    updates: UpdateFacilityData
  ): Promise<Facility> {
    return this.put<Facility>(API_ENDPOINTS.FACILITIES.BY_ID(id), updates);
  }

  /**
   * Delete a facility
   */
  async deleteFacility(id: string): Promise<void> {
    return this.delete<void>(API_ENDPOINTS.FACILITIES.BY_ID(id));
  }

  /**
   * Search facilities with advanced filters
   */
  async searchFacilities(
    query: string,
    filters?: FacilityFilters,
    pagination?: PaginationParams
  ): Promise<SearchResult<Facility>> {
    const params = {
      query,
      ...filters,
      ...pagination,
    };

    return this.get<SearchResult<Facility>>(API_ENDPOINTS.FACILITIES.BASE, {
      params,
    });
  }

  /**
   * Get nearby facilities based on location
   */
  async getNearbyFacilities(
    latitude: number,
    longitude: number,
    radius: number = 10, // km
    filters?: Omit<FacilityFilters, 'location'>
  ): Promise<Facility[]> {
    const params = {
      latitude,
      longitude,
      radius,
      ...filters,
    };

    return this.get<Facility[]>(API_ENDPOINTS.FACILITIES.BASE, { params });
  }

  /**
   * Get events at a specific facility
   */
  async getFacilityEvents(
    facilityId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Event>> {
    const params = pagination || {};
    return this.get<PaginatedResponse<Event>>(
      API_ENDPOINTS.FACILITIES.EVENTS(facilityId),
      { params }
    );
  }

  /**
   * Upload facility map (image or PDF)
   */
  async uploadFacilityMap(
    facilityId: string,
    file: { uri: string; name: string; type: string },
    onProgress?: (progress: number) => void
  ): Promise<{ facilityMapUrl: string; facilityMapThumbnailUrl: string }> {
    const formData = new FormData();

    if (
      typeof window !== 'undefined' &&
      typeof window.document !== 'undefined'
    ) {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const fileObj = new File([blob], file.name, { type: file.type });
      formData.append('image', fileObj);
    } else {
      formData.append('image', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);
    }

    return this.uploadFile<{
      facilityMapUrl: string;
      facilityMapThumbnailUrl: string;
    }>(
      `${API_ENDPOINTS.FACILITIES.BY_ID(facilityId)}/map`,
      formData,
      onProgress
    );
  }

  /**
   * Delete facility map
   */
  async deleteFacilityMap(facilityId: string): Promise<void> {
    return this.delete<void>(
      `${API_ENDPOINTS.FACILITIES.BY_ID(facilityId)}/map`
    );
  }

  /**
   * Upload a facility photo
   */
  async uploadFacilityPhoto(
    facilityId: string,
    image: { uri: string; name: string; type: string },
    onProgress?: (p: number) => void
  ): Promise<FacilityPhoto> {
    const formData = new FormData();

    if (
      typeof window !== 'undefined' &&
      typeof window.document !== 'undefined'
    ) {
      // Web: fetch the blob URI and create a proper File object
      const response = await fetch(image.uri);
      const blob = await response.blob();
      const file = new File([blob], image.name, { type: image.type });
      formData.append('photos', file);
    } else {
      // React Native: use the { uri, name, type } pattern
      formData.append('photos', {
        uri: image.uri,
        name: image.name,
        type: image.type,
      } as any);
    }

    return this.uploadFile<FacilityPhoto>(
      `${API_ENDPOINTS.FACILITIES.BY_ID(facilityId)}/photos`,
      formData,
      onProgress
    ).then((result: any) => (Array.isArray(result) ? result[0] : result));
  }

  /**
   * Delete a facility photo
   */
  async deleteFacilityPhoto(
    facilityId: string,
    photoId: string
  ): Promise<void> {
    return this.delete<void>(
      `${API_ENDPOINTS.FACILITIES.BY_ID(facilityId)}/photos/${photoId}`
    );
  }

  /**
   * Get facilities by owner
   */
  async getFacilitiesByOwner(
    ownerId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Facility>> {
    const params = {
      ...pagination,
      ownerId,
    };

    return this.get<PaginatedResponse<Facility>>(
      API_ENDPOINTS.FACILITIES.BASE,
      { params }
    );
  }

  /**
   * Get facility availability for a date range
   */
  async getFacilityAvailability(
    facilityId: string,
    startDate: Date,
    endDate: Date
  ): Promise<
    {
      date: string;
      timeSlots: {
        start: string;
        end: string;
        available: boolean;
        eventId?: string;
      }[];
    }[]
  > {
    const params = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    return this.get(
      `${API_ENDPOINTS.FACILITIES.BY_ID(facilityId)}/availability`,
      { params }
    );
  }

  /**
   * Get facility statistics
   */
  async getFacilityStats(facilityId: string): Promise<{
    totalEvents: number;
    totalBookings: number;
    averageRating: number;
    reviewCount: number;
    utilizationRate: number;
    revenue: number;
  }> {
    return this.get(`${API_ENDPOINTS.FACILITIES.BY_ID(facilityId)}/stats`);
  }

  /**
   * Get facilities by sport type
   */
  async getFacilitiesBySport(
    sportType: string,
    filters?: Omit<FacilityFilters, 'sportTypes'>,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Facility>> {
    const params = {
      ...filters,
      ...pagination,
      sportTypes: [sportType],
    };

    return this.get<PaginatedResponse<Facility>>(
      API_ENDPOINTS.FACILITIES.BASE,
      { params }
    );
  }

  /**
   * Get facilities with specific amenities
   */
  async getFacilitiesWithAmenities(
    amenities: string[],
    filters?: Omit<FacilityFilters, 'amenities'>,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Facility>> {
    const params = {
      ...filters,
      ...pagination,
      amenities,
    };

    return this.get<PaginatedResponse<Facility>>(
      API_ENDPOINTS.FACILITIES.BASE,
      { params }
    );
  }

  /**
   * Check facility name availability
   */
  async checkNameAvailability(
    name: string,
    excludeId?: string
  ): Promise<{ available: boolean }> {
    const params = {
      name,
      excludeId,
    };

    return this.get<{ available: boolean }>(
      `${API_ENDPOINTS.FACILITIES.BASE}/check-name`,
      {
        params,
      }
    );
  }

  /**
   * Get popular facilities based on bookings and ratings
   */
  async getPopularFacilities(
    limit: number = 10,
    filters?: FacilityFilters
  ): Promise<Facility[]> {
    const params = {
      ...filters,
      limit,
      sortBy: 'popularity',
    };

    return this.get<Facility[]>(`${API_ENDPOINTS.FACILITIES.BASE}/popular`, {
      params,
    });
  }

  /**
   * Get authorized facilities for event creation
   * Returns facilities where user is owner OR has confirmed rentals
   */
  async getAuthorizedFacilities(userId: string): Promise<{
    data: (Facility & { isOwned: boolean; hasRentals: boolean })[];
    total: number;
  }> {
    const params = { userId };
    return this.get(`${API_ENDPOINTS.FACILITIES.BASE}/authorized/for-events`, {
      params,
    });
  }

  /**
   * Get available time slots for event creation at a facility
   * Returns slots based on ownership (all available) or rentals (only user's rentals)
   */
  async getAvailableSlots(
    facilityId: string,
    userId: string
  ): Promise<{
    data: Array<{
      id: string;
      date: string;
      startTime: string;
      endTime: string;
      price: number;
      court: {
        id: string;
        name: string;
        sportType: string;
        capacity: number;
      };
      isFromRental: boolean;
      rentalId: string | null;
    }>;
    isOwner: boolean;
    total: number;
  }> {
    const params = { userId };
    return this.get(
      `${API_ENDPOINTS.FACILITIES.BY_ID(facilityId)}/available-slots`,
      { params }
    );
  }
  /**
   * Get courts available for event creation at a facility
   * Filtered by ownership (all courts with slots) or reservations (only rented courts)
   */
  async getCourtsForEvent(
    facilityId: string,
    userId: string,
    sportType?: string
  ): Promise<{ data: CourtForEvent[]; isOwner: boolean }> {
    const params: Record<string, string> = { userId };
    if (sportType) params.sportType = sportType;
    return this.get(API_ENDPOINTS.FACILITIES.COURTS_FOR_EVENT(facilityId), {
      params,
    });
  }

  /**
   * Get available dates for a court (filtered by ownership or reservations)
   */
  async getDatesForCourt(
    facilityId: string,
    courtId: string,
    userId: string
  ): Promise<{ data: DateForCourt[]; isOwner: boolean }> {
    const params = { userId };
    return this.get(API_ENDPOINTS.FACILITIES.COURT_DATES(facilityId, courtId), {
      params,
    });
  }

  /**
   * Get available time slots for a court on a specific date
   */
  async getSlotsForDate(
    facilityId: string,
    courtId: string,
    userId: string,
    date: string
  ): Promise<{ data: SlotForDate[]; isOwner: boolean }> {
    const params = { userId, date };
    return this.get(API_ENDPOINTS.FACILITIES.COURT_SLOTS(facilityId, courtId), {
      params,
    });
  }

  /**
   * Get on-demand court schedule for a date (computed from operating hours + rentals)
   */
  async getCourtSchedule(
    facilityId: string,
    courtId: string,
    userId: string,
    date: string
  ): Promise<{
    courtId: string;
    courtName: string;
    date: string;
    isOwner: boolean;
    slotIncrementMinutes: number;
    minimumBookingMinutes: number;
    schedule: Array<{
      startTime: string;
      endTime: string;
      status: 'available' | 'booked' | 'own_reservation';
      price: number;
    }>;
  }> {
    const params = { userId, date };
    return this.get(`/facilities/${facilityId}/courts/${courtId}/schedule`, {
      params,
      cacheOptions: { skipCache: true },
    });
  }

  /**
   * Get cancellation policy for a facility
   */
  async getCancellationPolicy(
    facilityId: string
  ): Promise<CancellationPolicyResponse> {
    return this.get<CancellationPolicyResponse>(
      API_ENDPOINTS.FACILITIES.CANCELLATION_POLICY(facilityId)
    );
  }

  /**
   * Update cancellation policy for a facility
   */
  async updateCancellationPolicy(
    facilityId: string,
    policy: Omit<CancellationPolicy, 'policyVersion'>
  ): Promise<CancellationPolicyResponse & { id: string }> {
    return this.put<CancellationPolicyResponse & { id: string }>(
      API_ENDPOINTS.FACILITIES.CANCELLATION_POLICY(facilityId),
      policy
    );
  }
}

// Create and export singleton instance
export const facilityService = new FacilityService();
