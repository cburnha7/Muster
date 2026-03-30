import { BaseApiService } from '../api/BaseApiService';
import { apiConfig, API_ENDPOINTS } from '../api/config';
import {
  Event,
  Facility,
  Team,
  EventFilters,
  FacilityFilters,
  TeamFilters,
  PaginationParams,
  SearchResult,
  SportType,
  SkillLevel,
} from '../../types';

/**
 * Unified search filters that can be applied across all entity types
 */
export interface UnifiedSearchFilters {
  // Common filters
  query?: string;
  sportType?: SportType;
  skillLevel?: SkillLevel;
  
  // Location-based filters
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
  
  // Price filters
  priceMin?: number;
  priceMax?: number;
  
  // Date filters (for events)
  startDate?: Date;
  endDate?: Date;
  
  // Entity-specific filters
  eventType?: string;
  eventStatus?: string;
  amenities?: string[];
  isPublic?: boolean;
  hasOpenSlots?: boolean;
  
  // Sorting and pagination
  sortBy?: 'relevance' | 'distance' | 'price' | 'rating' | 'date' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Multi-entity search result
 */
export interface MultiSearchResult {
  events: SearchResult<Event>;
  facilities: SearchResult<Facility>;
  teams: SearchResult<Team>;
  totalResults: number;
}

/**
 * Recommendation parameters
 */
export interface RecommendationParams {
  userId?: string;
  limit?: number;
  includeEvents?: boolean;
  includeFacilities?: boolean;
  includeTeams?: boolean;
  basedOn?: 'preferences' | 'history' | 'location' | 'popularity';
}

/**
 * Recommendation result
 */
export interface RecommendationResult {
  events?: Event[];
  facilities?: Facility[];
  teams?: Team[];
  reason: string; // Why these were recommended
  confidence: number; // 0-1 score
}

/**
 * Advanced search service for multi-criteria search, location-based discovery,
 * and personalized recommendations
 */
export class SearchService extends BaseApiService {
  constructor() {
    super(apiConfig);
  }

  /**
   * Search across all entity types (events, facilities, teams)
   */
  async searchAll(
    query: string,
    filters?: UnifiedSearchFilters,
    pagination?: PaginationParams
  ): Promise<MultiSearchResult> {
    const params = {
      query,
      ...filters,
      ...pagination,
      // Convert Date objects to ISO strings
      startDate: filters?.startDate?.toISOString(),
      endDate: filters?.endDate?.toISOString(),
    };

    return this.get<MultiSearchResult>(`${API_ENDPOINTS.SEARCH.BASE}/all`, { params });
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

    return this.get<SearchResult<Event>>(API_ENDPOINTS.EVENTS.BASE, { params });
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

    return this.get<SearchResult<Facility>>(API_ENDPOINTS.FACILITIES.BASE, { params });
  }

  /**
   * Search teams with advanced filters
   */
  async searchTeams(
    query: string,
    filters?: TeamFilters,
    pagination?: PaginationParams
  ): Promise<SearchResult<Team>> {
    const params = {
      query,
      ...filters,
      ...pagination,
    };

    return this.get<SearchResult<Team>>(API_ENDPOINTS.SEARCH.TEAMS, { params });
  }

  /**
   * Location-based discovery - find nearby events, facilities, and teams
   */
  async discoverNearby(
    latitude: number,
    longitude: number,
    radius: number = 10,
    filters?: Omit<UnifiedSearchFilters, 'location'>
  ): Promise<{
    events: Event[];
    facilities: Facility[];
    teams: Team[];
    distance: number; // radius used
  }> {
    const params = {
      latitude,
      longitude,
      radius,
      ...filters,
      // Convert Date objects to ISO strings
      startDate: filters?.startDate?.toISOString(),
      endDate: filters?.endDate?.toISOString(),
    };

    return this.get(`${API_ENDPOINTS.SEARCH.BASE}/nearby`, { params });
  }

  /**
   * Get nearby events
   */
  async getNearbyEvents(
    latitude: number,
    longitude: number,
    radius: number = 10,
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

    return this.get<Event[]>(API_ENDPOINTS.EVENTS.BASE, { params });
  }

  /**
   * Get nearby facilities
   */
  async getNearbyFacilities(
    latitude: number,
    longitude: number,
    radius: number = 10,
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
   * Get nearby teams
   */
  async getNearbyTeams(
    latitude: number,
    longitude: number,
    radius: number = 10,
    filters?: Omit<TeamFilters, 'location'>
  ): Promise<Team[]> {
    const params = {
      latitude,
      longitude,
      radius,
      ...filters,
    };

    return this.get<Team[]>(API_ENDPOINTS.TEAMS.BASE, { params });
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(params?: RecommendationParams): Promise<RecommendationResult> {
    const queryParams = {
      limit: params?.limit || 10,
      includeEvents: params?.includeEvents !== false,
      includeFacilities: params?.includeFacilities !== false,
      includeTeams: params?.includeTeams !== false,
      basedOn: params?.basedOn || 'preferences',
    };

    return this.get<RecommendationResult>(`${API_ENDPOINTS.SEARCH.BASE}/recommendations`, {
      params: queryParams,
    });
  }

  /**
   * Get recommended events based on user preferences and history
   */
  async getRecommendedEvents(limit: number = 10): Promise<Event[]> {
    const params = { limit };
    return this.get<Event[]>(API_ENDPOINTS.EVENTS.BASE, { params });
  }

  /**
   * Get recommended teams based on user preferences
   */
  async getRecommendedTeams(limit: number = 10): Promise<Team[]> {
    const params = { limit };
    return this.get<Team[]>(API_ENDPOINTS.TEAMS.BASE, { params });
  }

  /**
   * Get trending/popular events
   */
  async getTrendingEvents(
    limit: number = 10,
    filters?: EventFilters
  ): Promise<Event[]> {
    const params = {
      ...filters,
      limit,
      sortBy: 'popularity',
      // Convert Date objects to ISO strings
      startDate: filters?.startDate?.toISOString(),
      endDate: filters?.endDate?.toISOString(),
    };

    return this.get<Event[]>(`${API_ENDPOINTS.EVENTS.BASE}/trending`, { params });
  }

  /**
   * Get popular facilities
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

    return this.get<Facility[]>(`${API_ENDPOINTS.FACILITIES.BASE}/popular`, { params });
  }

  /**
   * Get search suggestions/autocomplete
   */
  async getSearchSuggestions(
    query: string,
    type?: 'events' | 'facilities' | 'teams' | 'all'
  ): Promise<{
    suggestions: string[];
    entities: {
      events?: Event[];
      facilities?: Facility[];
      teams?: Team[];
    };
  }> {
    const params = {
      query,
      type: type || 'all',
      limit: 5,
    };

    return this.get(`${API_ENDPOINTS.SEARCH.BASE}/suggestions`, { params });
  }

  /**
   * Get similar events based on an event
   */
  async getSimilarEvents(eventId: string, limit: number = 5): Promise<Event[]> {
    const params = { limit };
    return this.get<Event[]>(`${API_ENDPOINTS.EVENTS.BY_ID(eventId)}/similar`, { params });
  }

  /**
   * Get similar facilities based on a facility
   */
  async getSimilarFacilities(facilityId: string, limit: number = 5): Promise<Facility[]> {
    const params = { limit };
    return this.get<Facility[]>(`${API_ENDPOINTS.FACILITIES.BY_ID(facilityId)}/similar`, {
      params,
    });
  }

  /**
   * Get similar teams based on a team
   */
  async getSimilarTeams(teamId: string, limit: number = 5): Promise<Team[]> {
    const params = { limit };
    return this.get<Team[]>(`${API_ENDPOINTS.TEAMS.BY_ID(teamId)}/similar`, { params });
  }

  /**
   * Advanced filter search with complex criteria
   */
  async advancedSearch(
    filters: UnifiedSearchFilters,
    pagination?: PaginationParams
  ): Promise<MultiSearchResult> {
    const params = {
      ...filters,
      ...pagination,
      // Convert Date objects to ISO strings
      startDate: filters?.startDate?.toISOString(),
      endDate: filters?.endDate?.toISOString(),
    };

    return this.get<MultiSearchResult>(`${API_ENDPOINTS.SEARCH.BASE}/advanced`, { params });
  }

  /**
   * Get search history for the current user
   */
  async getSearchHistory(limit: number = 20): Promise<{
    id: string;
    query: string;
    filters?: any;
    timestamp: Date;
    resultCount: number;
  }[]> {
    const params = { limit };
    return this.get(`${API_ENDPOINTS.SEARCH.BASE}/history`, { params });
  }

  /**
   * Save a search query to history
   */
  async saveSearchToHistory(
    query: string,
    filters?: any,
    resultCount?: number
  ): Promise<void> {
    const data = {
      query,
      filters,
      resultCount,
      timestamp: new Date().toISOString(),
    };

    return this.post(`${API_ENDPOINTS.SEARCH.BASE}/history`, data);
  }

  /**
   * Clear search history
   */
  async clearSearchHistory(): Promise<void> {
    return this.delete(`${API_ENDPOINTS.SEARCH.BASE}/history`);
  }
}

// Create and export singleton instance
export const searchService = new SearchService();
