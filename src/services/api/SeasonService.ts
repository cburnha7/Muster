import { BaseApiService, defaultApiConfig } from './BaseApiService';
import {
  Season,
  CreateSeasonData,
  TeamStanding,
  PaginatedResponse
} from '../../types';

export class SeasonService extends BaseApiService {
  constructor() {
    super(defaultApiConfig);
  }

  /**
   * Get all seasons with filtering and pagination
   */
  async getSeasons(
    filters?: {
      leagueId?: string;
      isActive?: boolean;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Season>> {
    const params = {
      ...filters,
      page,
      limit
    };

    return this.get<PaginatedResponse<Season>>('/seasons', {
      params,
      cacheOptions: { ttl: 60000 } // Cache for 1 minute
    });
  }

  /**
   * Get season by ID
   */
  async getSeasonById(id: string): Promise<Season> {
    return this.get<Season>(`/seasons/${id}`, {
      cacheOptions: { ttl: 30000 } // Cache for 30 seconds
    });
  }

  /**
   * Create new season
   */
  async createSeason(data: CreateSeasonData, userId: string): Promise<Season> {
    return this.post<Season>('/seasons', {
      ...data,
      userId
    });
  }

  /**
   * Update season
   */
  async updateSeason(
    id: string,
    data: Partial<CreateSeasonData> & { isActive?: boolean },
    userId: string
  ): Promise<Season> {
    return this.put<Season>(`/seasons/${id}`, {
      ...data,
      userId
    });
  }

  /**
   * Complete season
   */
  async completeSeason(id: string, userId: string): Promise<Season> {
    return this.post<Season>(`/seasons/${id}/complete`, {
      userId
    });
  }

  /**
   * Get season standings
   */
  async getSeasonStandings(id: string): Promise<TeamStanding[]> {
    return this.get<TeamStanding[]>(`/seasons/${id}/standings`, {
      cacheOptions: { ttl: 5000 } // Cache for 5 seconds
    });
  }

  /**
   * Get seasons for a league
   */
  async getLeagueSeasons(
    leagueId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Season>> {
    return this.getSeasons({ leagueId }, page, limit);
  }

  /**
   * Get active seasons
   */
  async getActiveSeasons(
    leagueId?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Season>> {
    return this.getSeasons({ leagueId, isActive: true }, page, limit);
  }
}

// Export singleton instance
export const seasonService = new SeasonService();
