import { BaseApiService, defaultApiConfig } from './BaseApiService';
import {
  League,
  CreateLeagueData,
  UpdateLeagueData,
  LeagueFilters,
  TeamStanding,
  PlayerRanking,
  LeagueMembership,
  LeagueDocument,
  BoardMember
} from '../../types/league';
import { PaginatedResponse } from '../../types';

export class LeagueService extends BaseApiService {
  constructor() {
    super(defaultApiConfig);
  }

  /**
   * Get all leagues with filtering and pagination
   */
  async getLeagues(
    filters?: LeagueFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<League>> {
    const params = {
      ...filters,
      page,
      limit
    };

    return this.get<PaginatedResponse<League>>('/leagues', {
      params,
      cacheOptions: { ttl: 60000 } // Cache for 1 minute
    });
  }

  /**
   * Get league by ID
   */
  async getLeagueById(id: string): Promise<League> {
    return this.get<League>(`/leagues/${id}`, {
      cacheOptions: { ttl: 30000 } // Cache for 30 seconds
    });
  }

  /**
   * Create new league
   */
  async createLeague(data: CreateLeagueData, userId: string): Promise<League> {
    return this.post<League>('/leagues', {
      ...data,
      organizerId: userId
    });
  }

  /**
   * Update league
   */
  async updateLeague(id: string, data: UpdateLeagueData, userId: string): Promise<League> {
    return this.put<League>(`/leagues/${id}`, {
      ...data,
      userId
    });
  }

  /**
   * Delete league
   */
  async deleteLeague(id: string, userId: string): Promise<void> {
    return this.delete<void>(`/leagues/${id}`, {
      data: { userId }
    });
  }

  /**
   * Get league standings
   */
  async getStandings(leagueId: string, seasonId?: string): Promise<TeamStanding[]> {
    const params = seasonId ? { seasonId } : {};
    return this.get<TeamStanding[]>(`/leagues/${leagueId}/standings`, {
      params,
      cacheOptions: { ttl: 5000 } // Cache for 5 seconds (standings update frequently)
    });
  }

  /**
   * Get player rankings
   */
  async getPlayerRankings(
    leagueId: string,
    seasonId?: string,
    sortBy: string = 'performanceScore',
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<PlayerRanking>> {
    const params = {
      seasonId,
      sortBy,
      page,
      limit
    };

    return this.get<PaginatedResponse<PlayerRanking>>(`/leagues/${leagueId}/player-rankings`, {
      params,
      cacheOptions: { ttl: 10000 } // Cache for 10 seconds
    });
  }

  /**
   * Join league with a team
   */
  async joinLeague(leagueId: string, teamId: string, userId: string): Promise<LeagueMembership> {
    return this.post<LeagueMembership>(`/leagues/${leagueId}/join`, {
      teamId,
      userId
    });
  }

  /**
   * Leave league
   */
  async leaveLeague(leagueId: string, teamId: string, userId: string): Promise<void> {
    return this.post<void>(`/leagues/${leagueId}/leave`, {
      teamId,
      userId
    });
  }

  /**
   * Get league members
   */
  async getMembers(
    leagueId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<LeagueMembership>> {
    const params = { page, limit };
    return this.get<PaginatedResponse<LeagueMembership>>(`/leagues/${leagueId}/members`, {
      params,
      cacheOptions: { ttl: 30000 } // Cache for 30 seconds
    });
  }

  /**
   * Get league documents
   */
  async getDocuments(leagueId: string): Promise<LeagueDocument[]> {
    return this.get<LeagueDocument[]>(`/leagues/${leagueId}/documents`, {
      cacheOptions: { ttl: 60000 } // Cache for 1 minute
    });
  }

  /**
   * Upload document
   */
  async uploadDocument(
    leagueId: string,
    file: File | Blob,
    documentType: string,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<LeagueDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    formData.append('userId', userId);
    formData.append('leagueId', leagueId);

    return this.uploadFile<LeagueDocument>(`/leagues/${leagueId}/documents`, formData, onProgress);
  }

  /**
   * Delete document
   */
  async deleteDocument(leagueId: string, documentId: string, userId: string): Promise<void> {
    return this.delete<void>(`/leagues/${leagueId}/documents/${documentId}`, {
      data: { userId }
    });
  }

  /**
   * Download document
   */
  async downloadDocument(leagueId: string, documentId: string): Promise<{ url: string; fileName: string; mimeType: string }> {
    return this.get<{ url: string; fileName: string; mimeType: string }>(
      `/leagues/${leagueId}/documents/${documentId}/download`
    );
  }

  /**
   * Certify league
   */
  async certifyLeague(
    leagueId: string,
    bylawsFile: File | Blob,
    boardMembers: BoardMember[],
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<League> {
    const formData = new FormData();
    formData.append('bylaws', bylawsFile);
    formData.append('boardMembers', JSON.stringify(boardMembers));
    formData.append('userId', userId);

    return this.uploadFile<League>(`/leagues/${leagueId}/certify`, formData, onProgress);
  }

  /**
   * Search leagues by name
   */
  async searchLeagues(query: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<League>> {
    return this.getLeagues({ search: query }, page, limit);
  }

  /**
   * Get leagues by sport type
   */
  async getLeaguesBySport(sportType: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<League>> {
    return this.getLeagues({ sportType }, page, limit);
  }

  /**
   * Get certified leagues
   */
  async getCertifiedLeagues(page: number = 1, limit: number = 20): Promise<PaginatedResponse<League>> {
    return this.getLeagues({ isCertified: true }, page, limit);
  }

  /**
   * Get active leagues
   */
  async getActiveLeagues(page: number = 1, limit: number = 20): Promise<PaginatedResponse<League>> {
    return this.getLeagues({ isActive: true }, page, limit);
  }
}

// Export singleton instance
export const leagueService = new LeagueService();
